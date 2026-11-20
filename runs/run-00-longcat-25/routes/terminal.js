'use strict';
// Sandboxed terminal. No shell is ever spawned: commands are interpreted
// against the same allow-listed virtual filesystem the Finder uses, so
// `cd /etc` and friends stop at the 403 boundary.
const fs = require('fs/promises');
const path = require('path');
const { assertSafeVirtual, virtualFromReal, OS_HOME } = require('./fs');

function normVirtual(p) {
  return path.posix.normalize(p);
}

function joinVirtual(cwd, target) {
  if (!target) return cwd;
  if (target.startsWith('/')) return normVirtual(target);
  return normVirtual(path.posix.join(cwd, target));
}

async function listDir(real) {
  const entries = await fs.readdir(real, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(real, e.name);
    let st = null;
    try { st = await fs.stat(full); } catch { /* ignore */ }
    out.push({ name: e.name, isDir: e.isDirectory(), size: st ? st.size : 0, mtime: st ? st.mtime : null });
  }
  out.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
  return out;
}

async function runCommand(rawLine, cwd) {
  const lines = [];
  let action = null;
  let newCwd = cwd;

  const line = rawLine.trim();
  if (!line) return { lines, cwd, action };

  // Redirection support: echo hello > file / >> file
  let redirect = null;
  let redirectAppend = false;
  const redirMatch = line.match(/^(.*?)\s*(>>?)\s*(\S+)\s*$/);
  let body = line;
  if (redirMatch && redirMatch[2]) {
    body = redirMatch[1];
    redirectAppend = redirMatch[2] === '>>';
    redirect = redirMatch[3];
  }

  const tokens = body.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const cmd = (tokens.shift() || '').toLowerCase();
  const args = tokens.map(t => t.replace(/^"|"$/g, ''));

  const resolveArg = async (arg) => {
    const v = joinVirtual(newCwd, arg || '.');
    const real = await assertSafeVirtual(v);
    return { v, real };
  };

  switch (cmd) {
    case 'help':
      lines.push('OpenOS shell — available commands:');
      lines.push('  ls  cd  pwd  cat  echo  touch  mkdir  rm  mv  cp');
      lines.push('  open  clear  neofetch  whoami  date  uname  df');
      break;
    case 'pwd':
      lines.push(newCwd);
      break;
    case 'cd': {
      if (!args[0] || args[0] === '~') {
        newCwd = '/';
        break;
      }
      const { v, real } = await resolveArg(args[0]);
      if (!real) { lines.push(`cd: ${args[0]}: Permission denied`); break; }
      try {
        const st = await fs.stat(real);
        if (!st.isDirectory()) { lines.push(`cd: ${args[0]}: Not a directory`); break; }
        newCwd = v;
      } catch (e) {
        lines.push(`cd: ${args[0]}: No such file or directory`);
      }
      break;
    }
    case 'ls': {
      let target = '.';
      let long = false;
      for (const a of args) {
        if (a === '-l' || a === '-la' || a === '-al') long = true;
        else if (a.startsWith('-')) { /* ignore */ }
        else target = a;
      }
      const { real } = await resolveArg(target);
      if (!real) { lines.push(`ls: ${target}: Permission denied`); break; }
      try {
        const entries = await listDir(real);
        if (!long) {
          lines.push(entries.map(e => e.isDir ? e.name + '/' : e.name).join('  ') || '');
        } else {
          for (const e of entries) {
            const mode = e.isDir ? 'drwxr-xr-x' : '-rw-r--r--';
            const size = String(e.size).padStart(7);
            const date = e.mtime ? e.mtime.toISOString().slice(0, 16).replace('T', ' ') : '';
            lines.push(`${mode}  ${size}  ${date}  ${e.name}`);
          }
        }
      } catch (e) {
        lines.push(`ls: ${target}: No such file or directory`);
      }
      break;
    }
    case 'cat': {
      if (!args.length) { lines.push('cat: missing operand'); break; }
      for (const a of args) {
        const { real } = await resolveArg(a);
        if (!real) { lines.push(`cat: ${a}: Permission denied`); continue; }
        try {
          const st = await fs.stat(real);
          if (st.isDirectory()) { lines.push(`cat: ${a}: Is a directory`); continue; }
          if (st.size > 512 * 1024) { lines.push(`cat: ${a}: File too large`); continue; }
          lines.push(await fs.readFile(real, 'utf8').replace(/\n$/, ''));
        } catch {
          lines.push(`cat: ${a}: No such file or directory`);
        }
      }
      break;
    }
    case 'echo': {
      const text = args.join(' ');
      if (redirect) {
        const { real } = await resolveArg(redirect);
        if (!real) { lines.push(`echo: ${redirect}: Permission denied`); break; }
        try {
          let prev = '';
          if (redirectAppend) { try { prev = await fs.readFile(real, 'utf8'); } catch {} }
          await fs.writeFile(real, prev + text + '\n', 'utf8');
        } catch (e) {
          lines.push(`echo: ${redirect}: ${e.message}`);
        }
      } else {
        lines.push(text);
      }
      break;
    }
    case 'touch': {
      for (const a of args) {
        const { real } = await resolveArg(a);
        if (!real) { lines.push(`touch: ${a}: Permission denied`); continue; }
        try { await fs.writeFile(real, await fs.readFile(real, 'utf8').catch(() => ''), 'utf8'); }
        catch (e) { lines.push(`touch: ${a}: ${e.message}`); }
      }
      break;
    }
    case 'mkdir': {
      for (const a of args) {
        const { real } = await resolveArg(a);
        if (!real) { lines.push(`mkdir: ${a}: Permission denied`); continue; }
        try { await fs.mkdir(real, { recursive: true }); }
        catch (e) { lines.push(`mkdir: ${a}: ${e.message}`); }
      }
      break;
    }
    case 'rm': {
      const recursive = args.includes('-r') || args.includes('-rf') || args.includes('-fr');
      const targets = args.filter(a => !a.startsWith('-'));
      for (const a of targets) {
        const { real } = await resolveArg(a);
        if (!real) { lines.push(`rm: ${a}: Permission denied`); continue; }
        try {
          const st = await fs.lstat(real);
          if (st.isDirectory() && !recursive) { lines.push(`rm: ${a}: is a directory`); continue; }
          await fs.rm(real, { recursive, force: true });
        } catch (e) { lines.push(`rm: ${a}: ${e.message}`); }
      }
      break;
    }
    case 'mv': {
      if (args.length < 2) { lines.push('mv: missing operand'); break; }
      const src = await resolveArg(args[0]);
      const dst = await resolveArg(args[1]);
      if (!src.real || !dst.real) { lines.push('mv: Permission denied'); break; }
      try {
        const st = await fs.stat(dst.real).catch(() => null);
        const to = st && st.isDirectory() ? path.join(dst.real, path.basename(src.real)) : dst.real;
        await fs.rename(src.real, to);
      } catch (e) { lines.push(`mv: ${e.message}`); }
      break;
    }
    case 'cp': {
      const recursive = args.includes('-r');
      const targets = args.filter(a => !a.startsWith('-'));
      if (targets.length < 2) { lines.push('cp: missing operand'); break; }
      const src = await resolveArg(targets[0]);
      const dst = await resolveArg(targets[1]);
      if (!src.real || !dst.real) { lines.push('cp: Permission denied'); break; }
      try {
        const st = await fs.stat(dst.real).catch(() => null);
        const to = st && st.isDirectory() ? path.join(dst.real, path.basename(src.real)) : dst.real;
        await fs.cp(src.real, to, { recursive });
      } catch (e) { lines.push(`cp: ${e.message}`); }
      break;
    }
    case 'open': {
      if (!args[0]) { lines.push('open: missing file'); break; }
      const { v, real } = await resolveArg(args[0]);
      if (!real) { lines.push(`open: ${args[0]}: Permission denied`); break; }
      const st = await fs.stat(real).catch(() => null);
      if (!st) { lines.push(`open: ${args[0]}: No such file`); break; }
      action = { type: st.isDirectory() ? 'reveal' : 'open', path: v };
      lines.push(st.isDirectory() ? `Opening ${v} in Finder…` : `Opening ${v} in Preview…`);
      break;
    }
    case 'clear':
      action = { type: 'clear' };
      break;
    case 'neofetch': {
      const entries = await listDir(OS_HOME).catch(() => []);
      lines.push('        .--.        hermes@openos');
      lines.push('       |o_o |       ----------------');
      lines.push('       |:_/ |       OS: OpenOS 1.0 (browser desktop)');
      lines.push('      //   \\ \\      Shell: openos-sh 1.0 (sandboxed)');
      lines.push('     (|     | )     Host: VPS');
      lines.push('    /\'\\_   _/`\\     Uptime: ' + Math.floor(process.uptime()) + 's');
      lines.push('    \\___)=(___/     Home entries: ' + entries.length);
      break;
    }
    case 'whoami':
      lines.push('hermes');
      break;
    case 'date':
      lines.push(new Date().toString());
      break;
    case 'uname':
      lines.push(args.includes('-a') ? 'OpenOS vps 1.0.0 x86_64' : 'OpenOS');
      break;
    case 'df': {
      try {
        const sfs = await fs.statfs(OS_HOME);
        const total = sfs.blocks * sfs.bsize;
        const free = sfs.bavail * sfs.bsize;
        lines.push('Filesystem  Size  Used  Avail  Use%');
        lines.push(`/  ${Math.round(total / 1e6)}M  -  ${Math.round(free / 1e6)}M  -`);
      } catch { lines.push('df: unavailable'); }
      break;
    }
    case 'history':
      action = { type: 'history' };
      break;
    case 'sudo':
      lines.push('sudo: nice try. this shell is sandboxed.');
      break;
    default:
      lines.push(`${cmd}: command not found`);
  }

  return { lines, cwd: newCwd, action };
}

function terminalRoutes(router) {
  router.post('/api/terminal', async (req, res) => {
    const raw = String((req.body && req.body.command) || '');
    let cwd = String((req.body && req.body.cwd) || '/');
    const realRoot = await assertSafeVirtual(cwd);
    if (!realRoot) cwd = '/';
    cwd = path.posix.normalize(cwd);
    try {
      const out = await runCommand(raw, cwd);
      res.json(out);
    } catch (e) {
      res.json({ lines: [String(e.message || e)], cwd, action: null });
    }
  });
}

module.exports = { terminalRoutes, runCommand };
