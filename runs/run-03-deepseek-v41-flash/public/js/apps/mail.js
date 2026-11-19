/* Mail — mock inbox with three-pane UI, compose sheet, unread state. */
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/toast.js';
import { toast } from '../core/toast.js';
import { contextMenu } from '../core/menu.js';

const SEED_INBOX = [
  { id: 'm1', from: 'Dana Nguyen', email: 'dana@dyssonance.ai', subject: 'Re: Dock magnification curve', time: 'Today 9:41 AM', unread: true, preview: 'The quadratic falloff feels much smoother. Can we ship it in the nightly?', body: 'Morning!\n\nI tried the new magnification curve last night — the quadratic falloff feels much smoother at the edges. Great call.\n\nCan we ship it in tonight\'s nightly build? Also, small nit: the bounce animation should stop as soon as the window opens.\n\nDana' },
  { id: 'm2', from: 'App Store', email: 'no-reply@appstore.example', subject: 'Weekly report: OpenOS downloads', time: 'Today 8:02 AM', unread: true, preview: 'Your app was downloaded 12,304 times this week. Top territories: US, FR, JP…', body: 'Your app was downloaded 12,304 times this week.\n\nTop territories:\n — United States (4,101)\n — France (2,845)\n — Japan (1,977)\n\nRatings average: 4.9 ★ from 312 ratings.' },
  { id: 'm3', from: 'Linus Torvalds', email: 'linus@kernel.org', subject: 'Re: Terminal sandboxing', time: 'Yesterday 6:12 PM', unread: false, preview: 'The only sane way to sandbox a terminal is to not have a shell at all…', body: 'The only sane way to sandbox a terminal is to not have a shell at all.\n\nYour approach — command whitelist over a filesystem API — is how it should have been done everywhere. Ship it.\n\n— L.' },
  { id: 'm4', from: 'Ada Lovelace', email: 'ada@analyticalengine.org', subject: 'Notes app: first line as title', time: 'Yesterday 2:30 PM', unread: false, preview: 'I noticed your Notes app derives the title from the first line — elegant…', body: 'I noticed your Notes app derives the title from the first line — elegant, and how a notes app should behave.\n\nDo you plan to add folders? Sequencing is everything.\n\nWarmly,\nAda' },
  { id: 'm5', from: 'Grace Hopper', email: 'grace@navy.mil', subject: 'Clock bug? Second hand granularity', time: 'Tue 11:05 AM', unread: false, preview: 'Your second hand ticks at 250ms. Purists will complain. Purists are sometimes right…', body: 'Your second hand ticks at 250ms. Purists will complain. Purists are sometimes right — but 250ms reads smoother than 1000ms, so I\'d keep it.\n\nRear Admiral (ret.) G. Hopper' },
  { id: 'm6', from: 'OpenOS Security', email: 'security@openos.dev', subject: 'Probe blocked: /etc/shadow', time: 'Tue 9:00 AM', unread: true, preview: 'A filesystem probe was blocked by the allow-list. Status: 403. Good.', body: 'A filesystem probe was blocked by the allow-list.\n\nPath: /etc/shadow\nStatus: 403 Forbidden\n\nNo action needed. The allow-list is doing exactly what it was designed to do.' },
  { id: 'm7', from: 'Katherine Johnson', email: 'katherine@nasa.gov', subject: 'Calendar calculations', time: 'Mon 4:44 PM', unread: false, preview: 'Checked your month grid math across leap years — all correct through 2032…', body: 'Checked your month grid math across leap years — all correct through 2032, including the 2028 edge case that most implementations miss.\n\nK.' },
  { id: 'm8', from: 'Guido van Rossum', email: 'guido@python.org', subject: 'There should be one obvious way to open apps', time: 'Mon 10:15 AM', unread: false, preview: 'Dock, Spotlight, Launchpad, Finder — four ways to open the same app…', body: 'Dock, Spotlight, Launchpad, Finder — four ways to open the same app.\n\nNow, in case of ambiguity, refuse the temptation to guess: default to Spotlight. Just kidding. It\'s fine. Really.\n\n— Guido' },
];
const SEED_SENT = [
  { id: 's1', from: 'me', email: 'you@openos.dev', subject: 'RE: Dock magnification curve', time: 'Today 9:55 AM', unread: false, preview: 'Agreed — landing it in tonight\'s build.', body: 'Agreed — landing it in tonight\'s build. I\'ll stop the bounce once the window opens.' },
  { id: 's2', from: 'me', email: 'you@openos.dev', subject: 'Q4 wallpaper directions', time: 'Yesterday 7:20 PM', unread: false, preview: 'Sending the four gradient directions — Horizon is the default.', body: 'Sending the four gradient directions — Horizon is the default. Thoughts on a dark-native one?' },
];

export function mountMail(win, payload) {
  const boxes = { inbox: [...SEED_INBOX], sent: [...SEED_SENT], drafts: [], junk: [], trash: [] };
  let current = payload.box || 'inbox';
  let selectedId = null;
  let composing = null;

  const BOX_LABELS = { inbox: 'Inbox', sent: 'Sent', drafts: 'Drafts', junk: 'Junk', trash: 'Trash' };

  win.body.innerHTML = `
    <div class="mail-root">
      <div class="sidebar mail-sidebar" id="${win.id}-boxes"></div>
      <div class="mail-list">
        <div class="mail-list-header">
          <input class="field" placeholder="Search" aria-label="Search mail">
        </div>
        <div id="${win.id}-items" style="flex:1;overflow-y:auto" role="listbox" aria-label="Messages"></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;min-width:0;position:relative">
        <div class="mail-toolbar">
          <button class="btn small" id="${win.id}-compose">${icon('compose', 12)} New Message</button>
          <button class="icon-btn" id="${win.id}-reply" title="Reply" aria-label="Reply">${icon('reply', 13)}</button>
          <button class="icon-btn" id="${win.id}-archive" title="Archive" aria-label="Archive">${icon('archive', 13)}</button>
          <button class="icon-btn" id="${win.id}-trash" title="Delete" aria-label="Delete">${icon('trashS', 13)}</button>
        </div>
        <div class="mail-reader" id="${win.id}-reader"></div>
      </div>
    </div>`;
  win.__mailState = { get box() { return current; } };
  const $ = (s) => win.body.querySelector(s);

  function renderBoxes() {
    $(`#${win.id}-boxes`).innerHTML = Object.entries(BOX_LABELS).map(([id, label]) => `
      <div class="sidebar-item ${id === current ? 'selected' : ''}" data-box="${id}">
        ${icon(id === 'inbox' ? 'docS' : id === 'sent' ? 'send' : id === 'trash' ? 'trashS' : 'archive', 14)}
        <span>${label}</span>
        ${boxes[id].some((m) => m.unread) ? `<span class="si-count" style="background:var(--accent);color:#fff;border-radius:99px;padding:0 7px;font-size:11px">${boxes[id].filter((m) => m.unread).length}</span>` : ''}
      </div>`).join('');
    for (const b of $(`#${win.id}-boxes`).querySelectorAll('[data-box]')) {
      b.addEventListener('click', () => { current = b.dataset.box; selectedId = null; renderBoxes(); renderItems(); renderReader(); win.save(); });
    }
  }

  function renderItems() {
    const list = boxes[current];
    $(`#${win.id}-items`).innerHTML = list.length ? list.map((m) => `
      <div class="mail-item ${m.id === selectedId ? 'selected' : ''}" data-id="${m.id}" role="option" aria-selected="${m.id === selectedId}">
        <div class="mi-top">${m.unread ? '<span class="mi-dot"></span>' : ''}<span class="mi-sender">${escapeHTML(m.from)}</span><span class="mi-time">${escapeHTML(m.time)}</span></div>
        <div class="mi-subject">${escapeHTML(m.subject)}</div>
        <div class="mi-preview">${escapeHTML(m.preview)}</div>
      </div>`).join('') : `<div class="empty-state">No messages</div>`;
    for (const el of $(`#${win.id}-items`).querySelectorAll('.mail-item')) {
      el.addEventListener('click', () => {
        selectedId = el.dataset.id;
        const m = list.find((x) => x.id === selectedId);
        if (m) m.unread = false;
        renderBoxes(); renderItems(); renderReader();
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        contextMenu(e.clientX, e.clientY, [
          { label: 'Open', action: () => el.click() },
          { label: 'Delete', action: () => deleteSelected() },
        ]);
      });
    }
  }

  function renderReader() {
    const r = $(`#${win.id}-reader`);
    const m = boxes[current].find((x) => x.id === selectedId);
    if (!m) { r.innerHTML = `<div class="empty-state" style="height:100%">${icon('mail', 52)}<div>No message selected</div></div>`; return; }
    r.innerHTML = `
      <div class="mr-subject">${escapeHTML(m.subject)}</div>
      <div class="mr-meta"><b>${escapeHTML(m.from)}</b> &lt;${escapeHTML(m.email)}&gt;<br>To: me — ${escapeHTML(m.time)}</div>
      <div class="mr-body">${escapeHTML(m.body)}</div>`;
  }

  function deleteSelected() {
    const box = boxes[current];
    const idx = box.findIndex((x) => x.id === selectedId);
    if (idx === -1) return;
    if (current !== 'trash') boxes.trash.push(box[idx]);
    box.splice(idx, 1);
    selectedId = null;
    renderBoxes(); renderItems(); renderReader();
  }

  function composeMail(to = '', subject = '', quote = null) {
    const sheet = document.createElement('div');
    sheet.className = 'mail-compose';
    sheet.innerHTML = `
      <div class="mc-head"><span>New Message</span><button class="btn small" id="${win.id}-mc-send">Send</button></div>
      <div class="mc-fields">
        <input placeholder="To:" value="${escapeHTML(to)}" data-f="to" aria-label="To">
        <input placeholder="Subject:" value="${escapeHTML(subject)}" data-f="subject" aria-label="Subject">
      </div>
      <textarea placeholder="Write your message…" aria-label="Message body">${quote ? escapeHTML(quote) : ''}</textarea>`;
    win.body.appendChild(sheet);
    composing = sheet;
    sheet.querySelector(`#${win.id}-mc-send`).addEventListener('click', () => {
      const to = sheet.querySelector('[data-f="to"]').value || 'someone';
      boxes.sent.push({ id: 's' + Date.now().toString(36), from: 'me', email: to, subject: sheet.querySelector('[data-f="subject"]').value || '(no subject)', time: 'Now', unread: false, preview: 'Sent from OpenOS Mail', body: sheet.querySelector('textarea').value });
      sheet.remove(); composing = null;
      toast({ title: 'Message sent', body: `To ${to}`, app: 'mail' });
      if (current === 'sent') renderItems();
      renderBoxes();
    });
  }

  $(`#${win.id}-compose`).addEventListener('click', () => composeMail());
  $(`#${win.id}-reply`).addEventListener('click', () => {
    const m = boxes[current].find((x) => x.id === selectedId);
    if (m) composeMail(m.email, `Re: ${m.subject}`, `\n\n> ${m.body.split('\n').join('\n> ')}`);
  });
  $(`#${win.id}-archive`).addEventListener('click', () => toast({ title: 'Archived', body: 'Message moved to Archive (mock)', app: 'mail' }));
  $(`#${win.id}-trash`).addEventListener('click', deleteSelected);

  win.onclose = () => { if (composing) composing.remove(); };

  selectedId = boxes.inbox[0]?.id || null;
  if (selectedId) boxes.inbox[0].unread = false;
  renderBoxes(); renderItems(); renderReader();
}

export function serializeMail(win) {
  return { box: win.__mailState?.box ?? 'inbox' };
}
