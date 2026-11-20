import { el, fmtBytes, esc } from '../core/util.js';
import { FS } from '../core/fsapi.js';
import { launch } from '../core/launch.js';
import { openEntry } from '../core/openwith.js';
import { moveToTrash } from '../core/fileops.js';

const HELP = `Available commands (sandboxed — everything runs against the OpenOS virtual FS API):
  ls [-l] [-a] [path]     list directory
  cd [path]               change directory
  pwd                     print working directory
  cat <file>              print file contents
  echo <text> [> file]    print text, or write it to a file
  touch <file>            create empty file
  mkdir <dir>             create directory
  mv <from> <to>          move / rename
  cp <from> <to>          copy (text files)
  rm [-r] <path>          delete (use 'rm -r' for folders)
  trash <path>            move to the Trash
  open <app|file>         launch an app, or open a file in its default app
  apps                    list launchable apps
  neofetch                system summary
  whoami / date / uname   identity & time & kernel
  history                 command history
  clear                   clear the screen
  help                    this list`;

export default {
  id: 'terminal',
  name: 'Terminal',
  size: { w: 680, h: 440 },
  minW: 420, minH: 260,
  singleton: false,
  keywords: 'shell console command line bash',

  mount(root, api) {
    let cwd = typeof api.params.cwd === 'string' ? api.params.cwd : '';
    const hist = [];
    let hIdx = -1;
    root.classList.add('term');
    const out = el('div', { class: 'term-out', 'data-testid': 'terminal-output' });
    const inrow = el('div', { class: 'term-inrow' });
    const promptEl = el('span', { class: 'prompt' });
    const input = el('input', { 'data-testid': 'terminal-input', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Terminal input' });
    inrow.append(promptEl, input);
    root.append(out, inrow);

    const line = (html) => { const d = el('span', { class: 'term-line', html }); out.append(d); out.scrollTop = out.scrollHeight; return d; };
    const text = (s, cls) => line(cls ? `<span class="${cls}">${esc(s)}</span>` : esc(s));
    const promptStr = () => `<span class="c-green">user@openos</span><span class="c-dim">:</span><span class="c-blue">/${esc(cwd)}</span><span class="c-dim">$</span>`;
    const setPrompt = () => { promptEl.innerHTML = promptStr(); };

    function resolve(p) {
      if (!p) return cwd;
      if (p === '~') return '';
      let base = p.startsWith('/') ? '' : cwd;
      let rel = p.startsWith('/') ? p.slice(1) : p;
      const parts = [];
      for (const seg of rel.split('/')) {
        if (!seg || seg === '.') continue;
        if (seg === '..') parts.pop();
        else parts.push(seg);
      }
      return parts.join('/');
    }

    async function ls(args) {
      const flags = args.filter((a) => a.startsWith('-')).join('');
      const target = resolve(args.find((a) => !a.startsWith('-')) || '');
      try {
        const res = await FS.list(target);
        let entries = res.entries;
        if (!flags.includes('a')) entries = entries.filter((e) => !e.name.startsWith('.'));
        if (!entries.length) return;
        if (flags.includes('l')) {
          for (const e of entries.sort((a, b) => (b.kind === 'dir' ? 1 : 0) - (a.kind === 'dir' ? 1 : 0) || a.name.localeCompare(b.name))) {
            line(`${e.kind === 'dir' ? '<span class="c-blue">drwxr-xr-x</span>' : '<span class="c-dim">-rw-r--r--</span>'}  <span class="c-dim">${String(fmtBytes(e.size || 0)).padStart(9)}</span>  ${e.kind === 'dir' ? `<span class="c-blue">${esc(e.name)}/</span>` : esc(e.name)}`);
          }
        } else {
          line(entries.sort((a, b) => (b.kind === 'dir' ? 1 : 0) - (a.kind === 'dir' ? 1 : 0) || a.name.localeCompare(b.name))
            .map((e) => (e.kind === 'dir' ? `<span class="c-blue">${esc(e.name)}/</span>` : e.image ? `<span class="c-mag">${esc(e.name)}</span>` : esc(e.name)))
            .join('   '));
        }
      } catch (e) { text(`ls: ${args[0] || ''}: ${e.message}`, 'c-red'); }
    }

    async function run(cmdline) {
      line(`${promptStr()} ${esc(cmdline)}`);
      const trimmed = cmdline.trim();
      if (!trimmed) return;
      hist.push(trimmed); hIdx = hist.length;
      // redirect
      let redirect = null;
      const gt = trimmed.split(/\s+>\s+/);
      const body = gt[0];
      if (gt.length > 1) redirect = resolve(gt.slice(1).join(' ').trim());
      const [cmd, ...args] = tokenize(body);
      try {
        switch (cmd) {
          case 'help': text(HELP); break;
          case 'clear': out.innerHTML = ''; break;
          case 'pwd': text('/' + cwd); break;
          case 'ls': await ls(args); break;
          case 'cd': {
            const t = resolve(args[0] || '');
            const st = await FS.list(t);
            void st; cwd = t; setPrompt();
            break;
          }
          case 'cat': {
            if (!args[0]) { text('cat: missing file', 'c-red'); break; }
            const r = await FS.read(resolve(args[0]));
            if (r.binary) text(`cat: ${args[0]}: binary file`, 'c-red');
            else r.content.split('\n').forEach((l) => text(l));
            break;
          }
          case 'echo': {
            const s = args.join(' ').replace(/^["']|["']$/g, '');
            if (redirect) { await FS.write(redirect, s + '\n'); text(`wrote ${s.length + 1} bytes → /${redirect}`, 'c-dim'); }
            else text(s);
            break;
          }
          case 'touch': {
            if (!args[0]) { text('touch: missing operand', 'c-red'); break; }
            const p = resolve(args[0]);
            try { await FS.read(p); } catch { await FS.write(p, ''); }
            break;
          }
          case 'mkdir': {
            if (!args[0]) { text('mkdir: missing operand', 'c-red'); break; }
            await FS.mkdir(resolve(args[0]));
            break;
          }
          case 'mv': {
            if (args.length < 2) { text('mv: missing operand', 'c-red'); break; }
            await FS.move(resolve(args[0]), resolve(args[1]));
            break;
          }
          case 'cp': {
            if (args.length < 2) { text('cp: missing operand', 'c-red'); break; }
            const r = await FS.read(resolve(args[0]));
            await FS.write(resolve(args[1]), r.content || '');
            break;
          }
          case 'rm': {
            const target = args.filter((a) => !a.startsWith('-'))[0];
            if (!target) { text('rm: missing operand', 'c-red'); break; }
            await FS.del(resolve(target));
            break;
          }
          case 'trash': {
            if (!args[0]) { text('trash: missing operand', 'c-red'); break; }
            const p = resolve(args[0]);
            const st = await FS.list(p.split('/').slice(0, -1).join('/')).catch(() => null);
            const entry = st && st.entries.find((e) => e.path === p);
            await moveToTrash(entry || { name: p.split('/').pop(), path: p, kind: 'file' });
            break;
          }
          case 'open': {
            const a0 = args[0];
            if (!a0) { text('open: missing operand', 'c-red'); break; }
            if (launch(a0)) { text(`launching ${a0}…`, 'c-dim'); break; }
            const p = resolve(a0);
            const st = await FS.list(p.split('/').slice(0, -1).join('/')).catch(() => null);
            const entry = st && st.entries.find((e) => e.path === p);
            if (entry) openEntry(entry);
            else text(`open: ${a0}: no such app or file`, 'c-red');
            break;
          }
          case 'apps': text(Object.keys(window.OpenOS.apps).filter((k) => !window.OpenOS.apps[k].hidden).join('  ')); break;
          case 'whoami': text('user'); break;
          case 'date': text(new Date().toString()); break;
          case 'uname': text(args.includes('-a') ? 'OpenOS 1.0.0 srv1321765 x86_64 node ' + (await sys()).node : 'OpenOS'); break;
          case 'uptime': { const s = await sys(); text(`up ${Math.floor(s.serverUptime / 60)} minutes, 1 user, load averages: 0.42 0.38 0.31`); break; }
          case 'history': hist.forEach((c, i) => text(`  ${i + 1}  ${c}`)); break;
          case 'neofetch': await neofetch(); break;
          case 'sudo': text('user is not in the sudoers file. This incident has been reported.', 'c-red'); break;
          case 'exit': api.close(); break;
          default: text(`zsh: command not found: ${cmd}`, 'c-red');
        }
      } catch (e) {
        text(`${cmd}: ${e.message}`, 'c-red');
      }
    }

    const sys = async () => { try { return await (await fetch('/api/system')).json(); } catch { return { node: '?', serverUptime: 0, cpuModel: '?', cpus: 0, memTotal: 0 }; } };

    async function neofetch() {
      const s = await sys();
      const art = [
        '        ████████        ',
        '      ██        ██      ',
        '    ██    ████    ██    ',
        '   ██    ██  ██    ██   ',
        '   ██    ██  ██    ██   ',
        '    ██    ████    ██    ',
        '      ██        ██      ',
        '        ████████        ',
      ];
      const info = [
        [`<span class="c-green">user</span>@<span class="c-green">openos</span>`, ''],
        ['-----------------', ''],
        ['OS', 'OpenOS 1.0 (browser desktop)'],
        ['Kernel', 'node ' + s.node],
        ['Host', s.hostname],
        ['CPU', `${s.cpuModel.replace(/\s+/g, ' ').slice(0, 26)} (${s.cpus})`],
        ['Memory', `${Math.round((s.memTotal - s.memFree) / 1048576)} MiB / ${Math.round(s.memTotal / 1048576)} MiB`],
        ['Shell', 'osh 1.0 (sandboxed)'],
        ['WM', 'OpenWM (composited, blurred)'],
        ['Uptime', `${Math.floor(s.serverUptime / 60)}m`],
      ];
      for (let i = 0; i < Math.max(art.length, info.length); i++) {
        line(`<span class="c-cyan">${esc(art[i] || ' '.repeat(24))}</span>  ${info[i] ? (info[i][1] ? `<span class="c-green">${info[i][0]}</span>: ${esc(info[i][1])}` : info[i][0]) : ''}`);
      }
    }

    function tokenize(s) {
      const out2 = [];
      let cur = '', q = null;
      for (const ch of s) {
        if (q) { if (ch === q) q = null; else cur += ch; }
        else if (ch === '"' || ch === "'") q = ch;
        else if (/\s/.test(ch)) { if (cur) { out2.push(cur); cur = ''; } }
        else cur += ch;
      }
      if (cur) out2.push(cur);
      return out2;
    }

    input.addEventListener('keydown', async (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const v = input.value;
        input.value = '';
        await run(v);
        out.scrollTop = out.scrollHeight;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hIdx > 0) { hIdx--; input.value = hist[hIdx] || ''; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hIdx < hist.length - 1) { hIdx++; input.value = hist[hIdx] || ''; } else { hIdx = hist.length; input.value = ''; }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const parts = input.value.split(/\s+/);
        const last = parts[parts.length - 1] || '';
        try {
          const dirPart = last.includes('/') ? last.slice(0, last.lastIndexOf('/') + 1) : '';
          const base = last.slice(dirPart.length);
          const res = await FS.list(resolve(dirPart));
          const m = res.entries.filter((x) => x.name.startsWith(base));
          if (m.length === 1) parts[parts.length - 1] = dirPart + m[0].name + (m[0].kind === 'dir' ? '/' : '');
          else if (m.length > 1) { line(m.map((x) => x.name).join('   ')); }
        } catch {}
        input.value = parts.join(' ');
      } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); out.innerHTML = ''; }
    });
    root.addEventListener('mousedown', (e) => { if (!window.getSelection().toString()) setTimeout(() => input.focus(), 0); });

    setPrompt();
    line('<span class="c-dim">OpenOS Terminal — sandboxed shell. All file operations go through the</span>');
    line('<span class="c-dim">allow-listed FS API; the host filesystem is unreachable. Type `help`.</span>');
    line('');
    setTimeout(() => input.focus(), 80);
  },
};
