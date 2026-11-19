/* Contacts — server-persisted address book. */
import { api } from '../core/api.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/toast.js';

const COLORS = ['#e0453a', '#e08a00', '#d8a200', '#34a52f', '#0a84ff', '#8944ab', '#f7418f', '#5e8b7e', '#8c8c8e', '#c05640'];

export function mountContacts(win, payload) {
  let contacts = [];
  let selectedId = payload.contactId || null;
  let editing = false;

  win.body.innerHTML = `
    <div class="contacts-root">
      <div class="contacts-list">
        <div class="cl-header">
          <input class="field" id="${win.id}-search" placeholder="Search" aria-label="Search contacts">
          <button class="icon-btn" id="${win.id}-add" aria-label="New contact" title="New contact">${icon('plus', 14)}</button>
        </div>
        <div id="${win.id}-rows" style="flex:1;overflow-y:auto" role="listbox" aria-label="Contacts"></div>
      </div>
      <div class="contact-detail" id="${win.id}-detail"></div>
    </div>`;
  win.__contactsState = { get selectedId() { return selectedId; } };
  const $ = (s) => win.body.querySelector(s);

  async function load() {
    contacts = await api.store.get('contacts').catch(() => []);
    if (!selectedId || !contacts.some((c) => c.id === selectedId)) selectedId = contacts.length ? contacts[0].id : null;
    renderRows();
    renderDetail();
  }
  async function persist() {
    await api.store.put('contacts', contacts).catch((e) => toast({ title: 'Save failed', body: e.message, app: 'contacts' }));
  }

  function colorFor(c) {
    const h = (c.first + c.last).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
    return COLORS[h % COLORS.length];
  }
  function initials(c) { return ((c.first?.[0] || '') + (c.last?.[0] || '')).toUpperCase() || '?'; }

  function renderRows() {
    const q = $(`#${win.id}-search`).value.trim().toLowerCase();
    const filtered = contacts.filter((c) => !q || `${c.first} ${c.last}`.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
    $(`#${win.id}-rows`).innerHTML = filtered.map((c) => `
      <div class="contact-row ${c.id === selectedId ? 'selected' : ''}" data-id="${c.id}" role="option" aria-selected="${c.id === selectedId}">
        <div class="avatar" style="background:${colorFor(c)}">${initials(c)}</div>
        <div style="font-size:13.5px">${escapeHTML(c.first)} ${escapeHTML(c.last)}</div>
      </div>`).join('');
    for (const row of $(`#${win.id}-rows`).querySelectorAll('.contact-row')) {
      row.addEventListener('click', () => { selectedId = row.dataset.id; editing = false; renderRows(); renderDetail(); win.save(); });
    }
  }

  function renderDetail() {
    const d = $(`#${win.id}-detail`);
    const c = contacts.find((x) => x.id === selectedId);
    if (!c) {
      d.innerHTML = `<div class="empty-state">${icon('person', 48)}<div>Select a contact</div></div>`;
      return;
    }
    const field = (key, label, value) => `
      <div class="contact-field">
        <div class="cf-key">${label}</div>
        <div class="cf-val">${editing ? `<input data-key="${key}" value="${escapeHTML(value || '')}" aria-label="${label}">` : escapeHTML(value || '—')}</div>
      </div>`;
    d.innerHTML = `
      <div class="avatar big" style="background:${colorFor(c)}">${initials(c)}</div>
      <div class="cd-name">${escapeHTML(c.first)} ${escapeHTML(c.last)}</div>
      <div class="contact-fields">
        ${field('phone', 'phone', c.phone)}
        ${field('email', 'email', c.email)}
        ${field('city', 'city', c.city)}
        ${field('company', 'company', c.company)}
      </div>
      <div style="display:flex;gap:10px;margin-top:22px">
        <button class="btn secondary small" id="${win.id}-edit">${editing ? 'Done' : 'Edit'}</button>
        <button class="btn secondary small" id="${win.id}-share">${icon('send', 12)} Message</button>
        <button class="btn danger small" id="${win.id}-del">Delete</button>
      </div>`;

    d.querySelector(`#${win.id}-edit`).addEventListener('click', async () => {
      if (editing) {
        for (const inp of d.querySelectorAll('input[data-key]')) c[inp.dataset.key] = inp.value.trim();
        await persist();
        toast({ title: 'Contact saved', body: `${c.first} ${c.last}`, app: 'contacts' });
      }
      editing = !editing;
      renderRows(); renderDetail();
    });
    d.querySelector(`#${win.id}-share`).addEventListener('click', () => toast({ title: 'Message', body: `You would send a message to ${c.first}…`, app: 'mail' }));
    d.querySelector(`#${win.id}-del`).addEventListener('click', async () => {
      contacts = contacts.filter((x) => x.id !== c.id);
      selectedId = contacts.length ? contacts[0].id : null;
      await persist();
      renderRows(); renderDetail();
    });
  }

  $(`#${win.id}-search`).addEventListener('input', renderRows);
  $(`#${win.id}-add`).addEventListener('click', async () => {
    const c = { id: 'c' + Date.now().toString(36), first: 'New', last: 'Contact', phone: '', email: '', city: '', company: '' };
    contacts.unshift(c);
    selectedId = c.id;
    editing = true;
    await persist();
    renderRows(); renderDetail();
    win.save();
  });

  load();
}

export function serializeContacts(win) {
  return { contactId: win.__contactsState?.selectedId ?? null };
}
