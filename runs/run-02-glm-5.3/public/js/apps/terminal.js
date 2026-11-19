/* Terminal — sandboxed shell over the allow-listed filesystem API.
 * No shell execution on the host; all commands go through /api/fs/*. */
import { api } from '../core/api.js';
import { wm } from '../core/wm.js';
import { APPS } from '../core/registry.js';
import { openFile } from '../core/open.js';

const HELP = `Available commands:
  ls [-l] [path]     list directory
  cd [path]          change directory
  pwd                print working directory
  cat <file>         print file contents
  echo <text>        print text ( > file to write )
  mkdir <path>       create folder
  touch <file>       create empty file
  rm [-r] <path>     delete file or folder
  mv <from> <to>     move or rename
  cp <from> <to>     copy file
  open <app|file>    open an app or file
  date               current date and time
  whoami             current user
  uname [-a]         system information
  neofetch           system summary
  history            command history
  clear              clear the screen
  help               show this message`;

const LOGO = [
  '   ██████╗ ████████╗ ███████╗',
  '  ██╔═████╗╚══██╔══╝ ██╔════╝',
  '  ██║██╔██║   ██║    ███████╗',
  '  ████╔╝██║   ██║    ╚════██║',
  '  ██████╔╝██║   ██║    ███████║',
  '  ╚═════╝ ╚═╝   ╚═╝    ╚══════╝',
];

export function mountTerminal(win, payload) {
  let cwd = payload.cwd || '~';
  const history = [];
  let histIdx = -1;
  let healthInfo = null;

  win.body.innerHTML = `
    <div class="term-root" tabindex="0">
      <div class="term-output" id="${win.id}-out" aria-live="polite"></div>
      <div class="term-line">
        <span class="term-prompt" id="${win.id}-prompt"></span>
        <input class="term-input" id="${win.id}-in" autocapitalize="off" autocomplete="off" spellcheck="false" aria-label="Terminal input">
      </div>
    </div>`;
  const $ = (s) => win.body.querySelector(s);
  const out = $(`#${win.id}-out`);
  const input = $(`#${win.id}-in`);
  win.__termState = { get cwd() { return cwd; } };

  api.health().then((h) => { healthInfo = h; }).catch(() => {});
  if (api.HOME) setCwd(api.HOME);

  function setCwd(p) {
    cwd = p;
    const disp = cwd === api.HOME ? '~' : (api.HOME && cwd.startsWith(api.HOME + '/') ? '~' + cwd.slice(api.HOME.length) : cwd);
    $(`#${win.id}-prompt`).textContent = `user@openos ${disp} % `;
  }
  setCwd(cwd);

  function print(text, cls = '') {
    const div = document.createElement('div');
    if (cls) div.className = cls;
    div.textContent = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }
  function printHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }

  print('OpenOS Terminal — sandboxed shell over the filesystem API.', 't-dim');
  print("Type 'help' for available commands.", 't-dim');
  print('');

  async function resolve(p) {
    if (!p) return cwd;
    let path = p.trim();
    if (path === '~') return api.HOME || '~';
    if (path.startsWith('~/')) path = (api.HOME || '~').replace(/\/$/, '') + path.slice(1);
    if (!path.startsWith('/')) {
      path = (cwd === '~' ? (api.HOME || '~') : cwd).replace(/\/$/, '') + '/' + path;
    }
    const parts = [];
    for (const seg of path.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return '/' + parts.join('/');
  }

  async function run(cmdline) {
    const line = cmdline.trim();
    if (!line) return;
    print(`${$(`#${win.id}-prompt`).textContent}${line}`, 't-dim');
    const [cmd, ...args] = line.split(/\s+/);
    try {
      switch (cmd) {
        case 'help': print(HELP); break;
        case 'clear': out.innerHTML = ''; break;
        case 'pwd': print(cwd === '~' ? (api.HOME || '~') : cwd); break;
        case 'date': print(new Date().toString()); break;
        case 'whoami': print('user'); break;
        case 'history': history.forEach((h, i) => print(`${i + 1}  ${h}`)); break;
        case 'uname': print(args[0] === '-a' ? `OpenOS 1.0 openos-browser ${healthInfo?.node || 'node'} x86_64` : 'OpenOS'); break;
        case 'neofetch': {
          printHTML(`<pre style="margin:0;color:#5cc9f5">${LOGO.join('\n')}</pre>`);
          print(`user@openos`, 't-ok');
          print('------------');
          print(`OS: OpenOS 1.0 (browser)`);
          print(`Host: ${healthInfo ? 'bench ' + (healthInfo.uptime / 1000).toFixed(0) + 's uptime' : 'OpenOS'}`);
          print(`Shell: sandboxed-openos-sh`);
          print(`Apps: ${Object.keys(APPS).filter((k) => !APPS[k].hidden).length} installed`);
          print(`Home: ~/`);
          break;
        }
        case 'ls': {
          const long = args.includes('-l');
          const target = args.filter((a) => !a.startsWith('-'))[0];
          const r = await api.fs.list(await resolve(target || ''));
          if (!r.entries.length) break;
          if (long) {
            for (const e of r.entries) {
              print(`${e.isDir ? 'd' : '-'}  ${String(e.size).padStart(8)}  ${new Date(e.mtime || Date.now()).toLocaleDateString()}  ${e.name}`, e.isDir ? 't-dir' : '');
            }
          } else {
            printHTML(`<span class="${'t-dir'}">${r.entries.filter((e) => e.isDir).map((e) => e.name).join('  ')}</span>  ${r.entries.filter((e) => !e.isDir).map((e) => e.name).join('  ')}`.trim());
          }
          break;
        }
        case 'cd': {
          const target = args[0];
          if (!target || target === '~') { setCwd(api.HOME || '~'); break; }
          const p = await resolve(target);
          const r = await api.fs.list(p);
          if (r.entries && !r.error) setCwd(r.path);
          break;
        }
        case 'cat': {
          if (!args[0]) { print('usage: cat <file>', 't-err'); break; }
          const p = await resolve(args[0]);
          const r = await api.fs.readText(p);
          print(r.text);
          break;
        }
        case 'echo': {
          const gt = args.indexOf('>');
          if (gt !== -1) {
            const text = args.slice(0, gt).join(' ');
            const file = args[gt + 1];
            await api.fs.write(await resolve(file), text + '\n');
          } else print(args.join(' '));
          break;
        }
        case 'mkdir': {
          if (!args[0]) { print('usage: mkdir <path>', 't-err'); break; }
          await api.fs.mkdir(await resolve(args[0]));
          print(`created ${args[0]}`, 't-ok');
          break;
        }
        case 'touch': {
          if (!args[0]) { print('usage: touch <file>', 't-err'); break; }
          await api.fs.write(await resolve(args[0]), '');
          print(`created ${args[0]}`, 't-ok');
          break;
        }
        case 'rm': {
          const target = args.filter((a) => !a.startsWith('-'))[0];
          if (!target) { print('usage: rm [-r] <path>', 't-err'); break; }
          await api.fs.delete(await resolve(target));
          print(`removed ${target}`, 't-ok');
          break;
        }
        case 'mv': {
          if (args.length < 2) { print('usage: mv <from> <to>', 't-err'); break; }
          await api.fs.rename(await resolve(args[0]), await resolve(args[1]));
          print(`moved ${args[0]} → ${args[1]}`, 't-ok');
          break;
        }
        case 'cp': {
          if (args.length < 2) { print('usage: cp <from> <to>', 't-err'); break; }
          const src = await api.fs.readText(await resolve(args[0]));
          await api.fs.write(await resolve(args[1]), src.text);
          print(`copied ${args[0]} → ${args[1]}`, 't-ok');
          break;
        }
        case 'open': {
          const target = args[0];
          if (!target) { print('usage: open <app|file>', 't-err'); break; }
          const app = Object.values(APPS).find((a) => a.id === target.toLowerCase() || a.name.toLowerCase() === target.toLowerCase());
          if (app) { wm.open(app.id); print(`opening ${app.name}…`, 't-ok'); break; }
          const p = await resolve(target);
          const st = await api.fs.stat(p);
          openFile(p, st.kind === 'folder' ? 'folder' : st.kind);
          print(`opening ${p}…`, 't-ok');
          break;
        }
        default: print(`openos-sh: command not found: ${cmd}`, 't-err');
      }
    } catch (e) {
      print(String(e.message || e), 't-err');
    }
  }

  input.addEventListener('keydown', async (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const v = input.value;
      input.value = '';
      if (v.trim()) { history.push(v); }
      histIdx = history.length;
      await run(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx > 0) { histIdx--; input.value = history[histIdx] || ''; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx] || ''; }
      else { histIdx = history.length; input.value = ''; }
    }
  });

  win.body.querySelector('.term-root').addEventListener('mousedown', () => setTimeout(() => input.focus(), 0));
  setTimeout(() => input.focus(), 60);
  win.onclose = () => {};
}

export function serializeTerminal(win) {
  return { cwd: win.__termState?.cwd ?? '~' };
}
