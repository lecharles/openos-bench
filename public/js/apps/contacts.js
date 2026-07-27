// Contacts app
const AppContacts = {
  contacts: [],

  async render(container) {
    await this.loadContacts();
    if (this.contacts.length === 0) this.seedContacts();

    container.innerHTML = `
      <div class="app-toolbar">
        <button class="app-btn primary" id="contacts-add">+ New Contact</button>
        <input type="text" id="contacts-search" class="app-input" placeholder="Search contacts..." style="flex:1;margin-left:8px;">
      </div>
      <div id="contacts-list" class="app-list"></div>
      <div id="contacts-editor" style="display:none;"></div>
    `;

    this.renderList(container);
    this.setupListeners(container);
  },

  async loadContacts() {
    try { const r = await fetch('/api/contacts'); this.contacts = await r.json(); } catch { this.contacts = []; }
  },

  async saveContacts() {
    await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.contacts) });
  },

  seedContacts() {
    this.contacts = [
      { name: 'Alice Chen', phone: '555-0101', email: 'alice@example.com' },
      { name: 'Bob Smith', phone: '555-0102', email: 'bob@example.com' },
      { name: 'Carol Davis', phone: '555-0103', email: 'carol@example.com' },
      { name: 'Dave Wilson', phone: '555-0104', email: 'dave@example.com' },
    ];
    this.saveContacts();
  },

  renderList(container, filter = '') {
    const list = container.querySelector('#contacts-list');
    const filtered = filter ? this.contacts.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())) : this.contacts;
    list.innerHTML = filtered.map((c, i) => `
      <div class="app-list-item contacts-item" data-index="${i}" style="padding:10px 12px;">
        <span style="font-size:28px;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;">👤</span>
        <div>
          <div style="font-weight:500;">${c.name}</div>
          <div style="font-size:12px;color:#666;">${c.phone} · ${c.email}</div>
        </div>
      </div>
    `).join('');
  },

  setupListeners(container) {
    container.querySelector('#contacts-add').addEventListener('click', () => this.showEditor(container, null));
    container.querySelector('#contacts-search').addEventListener('input', (e) => this.renderList(container, e.target.value));

    container.querySelectorAll('.contacts-item').forEach(el => {
      el.addEventListener('click', () => {
        this.showEditor(container, parseInt(el.dataset.index));
      });
    });
  },

  showEditor(container, index) {
    const contact = index !== null ? this.contacts[index] : { name: '', phone: '', email: '' };
    const list = container.querySelector('#contacts-list');
    const editor = container.querySelector('#contacts-editor');
    list.style.display = 'none';
    editor.style.display = 'block';
    editor.innerHTML = `
      <h3>${index !== null ? 'Edit Contact' : 'New Contact'}</h3>
      <div style="margin-top:12px;">
        <label style="display:block;font-size:12px;color:#666;margin-bottom:4px;">Name</label>
        <input type="text" id="cedit-name" class="app-input" value="${contact.name}" style="width:100%;margin-bottom:8px;">
        <label style="display:block;font-size:12px;color:#666;margin-bottom:4px;">Phone</label>
        <input type="text" id="cedit-phone" class="app-input" value="${contact.phone}" style="width:100%;margin-bottom:8px;">
        <label style="display:block;font-size:12px;color:#666;margin-bottom:4px;">Email</label>
        <input type="text" id="cedit-email" class="app-input" value="${contact.email}" style="width:100%;margin-bottom:12px;">
        <button class="app-btn primary" id="cedit-save">Save</button>
        <button class="app-btn" id="cedit-cancel">Cancel</button>
        ${index !== null ? '<button class="app-btn" id="cedit-delete" style="color:#ff3b30;">Delete</button>' : ''}
      </div>
    `;

    editor.querySelector('#cedit-save').addEventListener('click', () => {
      const data = {
        name: editor.querySelector('#cedit-name').value,
        phone: editor.querySelector('#cedit-phone').value,
        email: editor.querySelector('#cedit-email').value,
      };
      if (index !== null) this.contacts[index] = data;
      else this.contacts.push(data);
      this.saveContacts();
      list.style.display = 'block';
      editor.style.display = 'none';
      this.renderList(container);
      this.setupListeners(container);
    });

    editor.querySelector('#cedit-cancel').addEventListener('click', () => {
      list.style.display = 'block';
      editor.style.display = 'none';
    });

    const delBtn = editor.querySelector('#cedit-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        this.contacts.splice(index, 1);
        this.saveContacts();
        list.style.display = 'block';
        editor.style.display = 'none';
        this.renderList(container);
        this.setupListeners(container);
      });
    }
  }
};
