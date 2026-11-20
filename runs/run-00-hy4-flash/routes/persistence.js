// Generic CRUD route factory for JSON-persisted resources
const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function readJSON(filename) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, filename), 'utf8'));
  } catch { return null; }
}

async function writeJSON(filename, data) {
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

function crudRoutes(router, filename, eventName, opts = {}) {
  const { validate } = opts;

  router.get('/api/' + filename.replace('.json', ''), async (req, res) => {
    try {
      const data = await readJSON(filename);
      res.json(data || (opts.defaultValue || []));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/api/' + filename.replace('.json', ''), async (req, res) => {
    try {
      const data = req.body;
      if (validate && !validate(data)) {
        return res.status(400).json({ error: 'Invalid data' });
      }
      await writeJSON(filename, data);
      if (eventName) req.app.get('io')?.emit(eventName, data);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { readJSON, writeJSON, crudRoutes };
