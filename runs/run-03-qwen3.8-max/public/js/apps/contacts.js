import { el, uid, avatarGrad, initials, esc } from '../core/util.js';
import { get, set } from '../core/state.js';

function seed() {
  return [
    { id: uid(), name: 'Alice Nakamura', role: 'Design Lead · Dyssonance', phone: '+1 (415) 555-0134', email: 'alice@dyssonance.ai', address: '2101 Bryant St, San Francisco', birthday: 'Mar 14', notes: 'Loves type systems. Owns three HHKBs.' },
    { id: uid(), name: 'Bruno Costa', role: 'Backend Engineer', phone: '+1 (628) 555-0177', email: 'bruno@dyssonance.ai', address: 'Lisbon, PT (remote)', birthday: 'Jul 2', notes: 'On-call rotation week 3.' },
    { id: uid(), name: 'Chloé Martin', role: 'Podcast · Silicon Carne', phone: '+33 6 55 01 22 88', email: 'chloe@siliconcarne.fm', address: 'Paris 11e', birthday: 'Nov 30', notes: 'Records Tuesdays. Sends the rundown late.' },
    { id: uid(), name: 'Dev Patel', role: 'Landlord · Bryant St loft', phone: '+1 (415) 555-0102', email: 'dev@bryantlofts.com', address: 'SF', birthday: '', notes: 'Rent due the 1st. Prefers text.' },
    { id: uid(), name: 'Elena Petrova', role: 'Investor · Meridian VC', phone: '+1 (212) 555-0190', email: 'elena@meridian.vc', address: 'New York, NY', birthday: '', notes: 'Intro via Alice. Follow up post-demo.' },
    { id: uid(), name: 'Kite Surf Shop Ben', role: 'Windy Day Kites', phone: '+1 (831) 555-0155', email: 'ben@windyday.kite', address: 'Santa Cruz', birthday: '', notes: 'Repairs the 9m strut leak — ask Thursday.' },
  ];
}

export default {
  id: 'contacts',
  name: 'Contacts',
  size: { w: 720, h: 520 },
  minW: 500, minH: 360,
  keywords: 'people address book phone',

  mount(root, api) {
    if (!get('contacts.seeded', false)) { set('contacts.list', seed(), true); set('contacts.seeded', true, true); }
    let selId = get('contacts.list', [])[0]?.id || null;
    let editing = false;
    let search = '';
    root.classList.add('app');
    const side = el('aside', { class: 'app-sidebar ct-list', style: { width: '212px' } });
    const detail = el('div', { class: 'ct-detail' });
    root.append(side, detail);

    const list = () => get('contacts.list', []);
    const save = (l) => set('contacts.list', l, true);
    const cur = () => list().find((c) => c.id === selId);

    const searchIn = el('input', { class: 'os-input', type: 'search', placeholder: 'Search', style: { margin: '2px 2px 8px' } });
    const addBtn = el('button', { class: 'os-btn icon-only', html: '<svg width="13" height="13" viewBox="0 0 16 16"><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' });
    const rows = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } });
    side.append(el('div', { style: { display: 'flex', gap: '6px' } }, searchIn, addBtn), rows);

    function renderList() {
      rows.innerHTML = '';
      const q = search.toLowerCase();
      const shown = [...list()].sort((a, b) => a.name.localeCompare(b.name)).filter((c) => !q || c.name.toLowerCase().includes(q));
      for (const c of shown) {
        const row = el('div', { class: 'side-row' + (c.id === selId ? ' on' : ''), 'data-testid': 'contact-row' },
          el('span', { class: 'ct-ava', style: { background: avatarGrad(c.name) }, text: initials(c.name) }),
          el('span', { text: c.name }));
        row.addEventListener('click', () => { selId = c.id; editing = false; renderList(); renderDetail(); });
        rows.append(row);
      }
      if (!shown.length) rows.append(el('div', { class: 'empty-hint', style: { padding: '16px' } }, 'No contacts'));
    }

    function field(label, key, placeholder) {
      return el('div', { class: 'ct-field' }, el('div', { class: 'fl', text: label }),
        editing ? el('input', { value: cur()?.[key] || '', placeholder, dataset: { key } }) : el('div', { text: cur()?.[key] || '—', style: { color: cur()?.[key] ? '' : 'var(--fg-faint)' } }));
    }

    function renderDetail() {
      detail.innerHTML = '';
      const c = cur();
      if (!c) { detail.append(el('div', { class: 'empty-hint' }, 'Select a contact')); return; }
      detail.append(el('div', { class: 'ct-head' },
        el('div', { class: 'ct-ava', style: { background: avatarGrad(c.name) }, text: initials(c.name) }),
        el('div', {}, el('h2', { text: c.name }), el('div', { class: 'role', text: c.role || '' }),
          el('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } },
            el('button', { class: 'os-btn', text: editing ? 'Cancel' : 'Edit', onclick: () => { if (editing) { editing = false; renderDetail(); } else { editing = true; renderDetail(); } } }),
            editing ? el('button', { class: 'os-btn primary', text: 'Save', onclick: () => {
              detail.querySelectorAll('input[data-key]').forEach((i) => { c[i.dataset.key] = i.value; });
              save(list()); editing = false; renderList(); renderDetail();
            } }) : null,
            editing ? null : el('button', { class: 'os-btn danger', text: 'Delete', onclick: () => {
              if (!confirm(`Delete ${c.name}?`)) return;
              save(list().filter((x) => x.id !== c.id));
              selId = list()[0]?.id || null; renderList(); renderDetail();
            } })))));
      const card = el('div', { class: 'ct-card' },
        field('phone', 'phone', '+1 …'),
        field('email', 'email', 'name@example.com'),
        field('address', 'address', 'Street, City'),
        field('birthday', 'birthday', 'Mon DD'));
      detail.append(card);
      detail.append(el('div', { class: 'ct-card' }, el('div', { class: 'ct-field' }, el('div', { class: 'fl', text: 'notes' }),
        editing ? el('input', { value: c.notes || '', dataset: { key: 'notes' } }) : el('div', { style: { lineHeight: '1.5' }, text: c.notes || '—' }))));
      void esc;
    }

    searchIn.addEventListener('input', () => { search = searchIn.value; renderList(); });
    searchIn.addEventListener('keydown', (e) => e.stopPropagation());
    addBtn.addEventListener('click', () => {
      const c = { id: uid(), name: 'New Contact', role: '', phone: '', email: '', address: '', birthday: '', notes: '' };
      save([...list(), c]);
      selId = c.id; editing = true;
      renderList(); renderDetail();
    });

    renderList(); renderDetail();
  },
};
