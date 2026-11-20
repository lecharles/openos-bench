import { el, uid, fmtRel, avatarGrad, initials, esc } from '../core/util.js';
import { get, set } from '../core/state.js';
import { toast } from '../core/toast.js';
import { launch } from '../core/launch.js';

const h = 3600e3;
function seedMessages() {
  const now = Date.now();
  return [
    { id: 'm1', from: 'Alice Nakamura', email: 'alice@dyssonance.ai', subj: 'OpenOS demo cut — dock magnification looks great', time: now - 0.4 * h, body: 'Watched the latest capture twice.\n\nThe dock magnification curve finally feels like the real thing — springy but not rubbery. Two notes:\n\n1. Genie minimize reads great at 0.4s. Don\'t speed it up.\n2. Spotlight results could show the app icon a touch larger.\n\nApproving this cut for the bench run.', att: null },
    { id: 'm2', from: 'Bench Runner', email: 'bench@openos.dev', subj: 'Probe matrix updated for spec v0', time: now - 1.2 * h, body: 'The frozen probe matrix for spec v0 is live:\n\n• apps render: headless E2E across all 12+ apps\n• interaction probes: 15 (drag, resize, spotlight-launch, rename, trash-restore, theme-persist…)\n• persistence across reload\n• security probe: /etc/shadow → 403\n• human fidelity pass\n\nGood luck tonight.', att: 'probe-matrix-v0.json' },
    { id: 'm3', from: 'Bruno Costa', email: 'bruno@dyssonance.ai', subj: 'fs allow-list edge cases', time: now - 3 * h, body: 'Reviewed the sandbox path resolver.\n\nAbsolute paths outside the allow-list return 403, symlink escapes are realpath-checked, and writes can\'t traverse above the root. One suggestion: keep the 403 (not 404) semantics so probes can distinguish "blocked" from "missing".\n\nLGTM.', att: null },
    { id: 'm4', from: 'Chloé Martin', email: 'chloe@siliconcarne.fm', subj: 'Tuesday rundown — segment 4 swap', time: now - 7 * h, body: 'Salut!\n\nSmall change: we swap segment 4 (Claude vs OpenClaw) with the autoresearch piece — guest prefers that order.\n\nRundown attached, same 7 segments otherwise.\n\nBisous,\nChloé', att: 'rundown-v3.md' },
    { id: 'm5', from: 'Elena Petrova', email: 'elena@meridian.vc', subj: 'Re: intro call follow-up', time: now - 26 * h, body: 'Thanks for the walkthrough yesterday.\n\nThe belief-substrate angle is the interesting part — partners want to see how coherence edges differ from plain RAG retrieval. Can you send the one-pager before Thursday?', body2: '', att: null },
    { id: 'm6', from: 'Dyssonance CI', email: 'ci@dyssonance.ai', subj: 'Build #4821 passed', time: now - 30 * h, body: 'branch: main\ncommit: 9f3ac21 — "translator contract v2"\ntests: 214 passed, 0 failed\ncoverage: 87.4% (+0.6)\n\nArtifacts retained for 7 days.', att: null },
    { id: 'm7', from: 'Ben @ Windy Day Kites', email: 'ben@windyday.kite', subj: 'Strut leak fixed', time: now - 50 * h, body: 'Your 9m is ready — replaced the bladder and pressure-tested at 8psi for 24h. No drop.\n\nSwing by anytime Thu–Sun. Saturday looks like 22 knots on the forecast', att: null },
    { id: 'm8', from: 'Alice Nakamura', email: 'alice@dyssonance.ai', subj: 'Wallpaper palette vote', time: now - 74 * h, body: 'Three candidates for the default wallpaper:\n\nA) Sonoma-style flowing gradient\nB) Big Sur light arcs\nC) Graphite minimal\n\nI\'m A. Bruno says C because "dark mode is a lifestyle". Settle it in standup.', att: null },
  ];
}

export const COMPOSE_APP = {
  id: 'compose',
  name: 'New Message',
  hidden: true,
  singleton: false,
  size: { w: 560, h: 440 },
  minW: 420, minH: 300,
  mount(root, api) {
    const pre = api.params || {};
    root.classList.add('app');
    const wrap = el('div', { class: 'app-main' });
    root.append(wrap);
    const fields = el('div', { class: 'compose-fields' });
    const toIn = el('input', { value: pre.to || '', placeholder: 'recipient@example.com' });
    const subjIn = el('input', { value: pre.subject || '' });
    fields.append(
      el('div', { class: 'cf' }, el('label', { text: 'To:' }), toIn),
      el('div', { class: 'cf' }, el('label', { text: 'Subject:' }), subjIn));
    const body = el('textarea', { class: 'compose-body', placeholder: 'Write your message…' });
    if (pre.body) body.value = pre.body;
    const bar = el('div', { class: 'app-toolbar', style: { borderTop: '.5px solid var(--border-soft)' } });
    const send = el('button', { class: 'os-btn primary', text: 'Send' });
    bar.append(send, el('div', { class: 'spacer' }), el('span', { style: { fontSize: '11px', color: 'var(--fg-dim)' }, text: 'mock transport — no real mail leaves this machine' }));
    wrap.append(fields, body, bar);
    for (const i of [toIn, subjIn, body]) i.addEventListener('keydown', (e) => e.stopPropagation());
    send.addEventListener('click', () => {
      const sent = get('mail.sent', []);
      sent.unshift({ id: uid(), to: toIn.value || 'unknown', subj: subjIn.value || '(no subject)', body: body.value, time: Date.now() });
      set('mail.sent', sent, true);
      api.close();
      toast('Message sent', `“${subjIn.value || '(no subject)'}” → ${toIn.value || 'unknown'}`, 'mail');
      setTimeout(() => {
        const msgs = get('mail.messages', []);
        const reply = { id: uid(), from: toIn.value || 'Friend', email: toIn.value || 'friend@example.com', subj: 'Re: ' + (subjIn.value || '(no subject)'), time: Date.now(), body: 'Got it — thanks for the note! Reading it now and will get back to you shortly.\n\n(mock auto-reply)', att: null };
        msgs.unshift(reply);
        set('mail.messages', msgs, true);
        import('../core/bus.js').then(({ bus }) => bus.emit('mail', reply));
        toast('New Message', `${reply.from}: ${reply.subj}`, 'mail');
      }, 3200);
    });
    setTimeout(() => toIn.focus(), 60);
  },
};

export default {
  id: 'mail',
  name: 'Mail',
  size: { w: 960, h: 600 },
  minW: 640, minH: 420,
  keywords: 'email inbox message',

  mount(root, api) {
    if (!get('mail.seeded', false)) { set('mail.messages', seedMessages(), true); set('mail.seeded', true, true); }
    let mailbox = 'Inbox';
    let selId = null;
    root.classList.add('mail');
    const side = el('aside', { class: 'mail-side' });
    const list = el('div', { class: 'mail-list', 'data-testid': 'mail-list' });
    const read = el('div', { class: 'm-read', 'data-testid': 'mail-read' });
    root.append(side, list, read);

    side.append(el('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
      el('button', { class: 'os-btn primary', style: { flex: '1' }, text: 'Compose', onclick: () => launch('compose', { forceNew: true }) })));
    const BOXES = [['Inbox', 0], ['Drafts', 0], ['Sent', 0], ['Junk', 0], ['Trash', 0]];
    for (const [b] of BOXES) {
      const row = el('div', { class: 'side-row', dataset: { box: b } },
        el('span', { html: boxIcon(b) }), el('span', { text: b }), el('span', { class: 'cnt' }));
      row.addEventListener('click', () => { mailbox = b; selId = null; mark(); renderList(); });
      side.append(row);
    }
    function boxIcon(b) {
      const c = { Inbox: '#0a84ff', Drafts: '#8e8e93', Sent: '#8e8e93', Junk: '#ff9f0a', Trash: '#8e8e93' }[b];
      if (b === 'Inbox') return `<svg viewBox="0 0 16 16"><path d="M2 9h3l1 2h4l1-2h3v3.5A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5z" fill="${c}"/><path d="M2 9 4.5 3h7L14 9" stroke="${c}" stroke-width="1.5" fill="none"/></svg>`;
      if (b === 'Sent') return `<svg viewBox="0 0 16 16"><path d="M2 8l12-5-4 12-2.5-4.5z" fill="${c}"/></svg>`;
      return `<svg viewBox="0 0 16 16"><rect x="2" y="3.5" width="12" height="9" rx="1.6" fill="${c}"/></svg>`;
    }

    const messages = () => get('mail.messages', []);
    const sentMsgs = () => get('mail.sent', []);
    const readSet = () => new Set(get('mail.read', []));

    function currentList() {
      if (mailbox === 'Sent') return sentMsgs().map((m) => ({ ...m, from: 'To: ' + m.to }));
      if (mailbox === 'Inbox') return messages();
      return [];
    }

    function mark() {
      side.querySelectorAll('.side-row').forEach((r) => {
        r.classList.toggle('on', r.dataset.box === mailbox);
        if (r.dataset.box === 'Inbox') {
          const un = messages().filter((m) => !readSet().has(m.id)).length;
          r.querySelector('.cnt').textContent = un ? String(un) : '';
        }
        if (r.dataset.box === 'Sent') r.querySelector('.cnt').textContent = sentMsgs().length ? String(sentMsgs().length) : '';
      });
    }

    function renderList() {
      list.innerHTML = '';
      const msgs = currentList();
      if (!selId && msgs.length) selId = msgs[0].id;
      for (const m of msgs) {
        const unread = mailbox === 'Inbox' && !readSet().has(m.id);
        const row = el('div', { class: 'm-row' + (m.id === selId ? ' on' : ''), dataset: { id: m.id }, 'data-testid': 'mail-row' },
          el('div', { class: 'unread', style: { visibility: unread ? 'visible' : 'hidden' } }),
          el('div', { class: 'ct-ava', style: { background: avatarGrad(m.from) }, text: initials(m.from) }),
          el('div', { class: 'ms' },
            el('div', { class: 'r1' }, el('div', { class: 'from', text: m.from }), el('div', { class: 'time', text: fmtRel(m.time) })),
            el('div', { class: 'subj', style: { fontWeight: unread ? '700' : '500' }, text: m.subj }),
            el('div', { class: 'snip', text: (m.body || '').split('\n')[0] })));
        row.addEventListener('click', () => { selId = m.id; openMsg(m); renderList(); });
        list.append(row);
      }
      if (!msgs.length) list.append(el('div', { class: 'empty-hint' }, 'No messages'));
      mark();
    }

    function openMsg(m) {
      if (mailbox === 'Inbox' && !readSet().has(m.id)) {
        const r = get('mail.read', []); r.push(m.id); set('mail.read', r, true);
      }
      read.innerHTML = '';
      read.append(
        el('h2', { text: m.subj }),
        el('div', { class: 'meta' },
          el('div', { class: 'ct-ava', style: { background: avatarGrad(m.from), width: '40px', height: '40px', fontSize: '15px' }, text: initials(m.from) }),
          el('div', { class: 'who' }, el('b', { text: m.from }), el('span', { text: `${m.email || ''} · ${fmtRel(m.time)}` })),
          el('div', { class: 'spacer' }),
          el('button', { class: 'os-btn', text: 'Reply', onclick: () => launch('compose', { forceNew: true, params: { to: m.email, subject: 'Re: ' + m.subj, body: `\n\n— quoted —\n${(m.body || '').split('\n').map((l) => '> ' + l).join('\n')}` } }) })),
        el('div', { class: 'body', html: (m.body || '').split('\n').map((p) => p.startsWith('>') ? `<p class="quote">${esc(p)}</p>` : p ? `<p>${esc(p)}</p>` : '').join('') }));
      if (m.att) read.append(el('div', { class: 'attach', html: '<svg width="13" height="13" viewBox="0 0 16 16"><path d="M9.5 4.5 5 9a2.5 2.5 0 0 0 3.5 3.5l5-5a4 4 0 0 0-5.7-5.7l-5 5a5.5 5.5 0 0 0 7.8 7.8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>', text: m.att, onclick: () => toast('Download started', `${m.att} (mock)`, 'mail') }));
      mark(); renderListKeep();
    }
    function renderListKeep() {
      list.querySelectorAll('.m-row').forEach((r) => {
        const m = messages().find((x) => x.id === r.dataset.id);
        if (m) {
          const unread = !readSet().has(m.id);
          r.querySelector('.unread').style.visibility = unread ? 'visible' : 'hidden';
          r.querySelector('.subj').style.fontWeight = unread ? '700' : '500';
        }
      });
      mark();
    }

    import('../core/bus.js').then(({ bus }) => {
      const off = bus.on('mail', () => { renderList(); });
      api._off = off;
    });

    renderList();
    if (selId) openMsg(currentList().find((m) => m.id === selId) || {});
  },
  onclose(api) { api._off && api._off(); },

  menus(win) {
    void win;
    return [
      { title: 'File', items: [
        { label: 'New Message', shortcut: '⌘N', action: () => launch('compose', { forceNew: true }) },
      ] },
    ];
  },
};
