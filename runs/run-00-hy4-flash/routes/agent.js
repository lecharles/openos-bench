// Agent proxy routes — Hermes / OpenClaw integration
const agentConfigs = {
  hermes: { url: process.env.HERMES_URL || 'http://127.0.0.1:8400' },
  openclaw: { url: process.env.OPENCLAW_URL || 'http://127.0.0.1:8401' }
};

const FETCH_TIMEOUT = 15000;

function agentRoutes(router) {
  // Chat endpoint
  router.post('/api/agent/:agent/chat', async (req, res) => {
    const { agent } = req.params;
    const cfg = agentConfigs[agent];
    if (!cfg) return res.status(404).json({ error: 'Unknown agent' });
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      const resp = await fetch(cfg.url + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await resp.json();
      res.json(data);
    } catch (e) {
      res.status(502).json({ error: 'Agent unavailable', detail: e.message });
    }
  });

  // Health check
  router.get('/api/agent/:agent/health', async (req, res) => {
    const { agent } = req.params;
    const cfg = agentConfigs[agent];
    if (!cfg) return res.status(404).json({ error: 'Unknown agent' });
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(cfg.url + '/health', { signal: controller.signal });
      clearTimeout(timer);
      const data = await resp.json();
      res.json(data);
    } catch (e) {
      res.status(502).json({ error: 'Agent unavailable', detail: e.message });
    }
  });

  // Status
  router.get('/api/agent/:agent/status', async (req, res) => {
    const { agent } = req.params;
    const cfg = agentConfigs[agent];
    if (!cfg) return res.status(404).json({ error: 'Unknown agent' });
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(cfg.url + '/status', { signal: controller.signal });
      clearTimeout(timer);
      const data = await resp.json();
      res.json(data);
    } catch (e) {
      res.status(502).json({ error: 'Agent unavailable', detail: e.message });
    }
  });

  // Restart
  router.post('/api/agent/:agent/restart', async (req, res) => {
    const { agent } = req.params;
    const cfg = agentConfigs[agent];
    if (!cfg) return res.status(404).json({ error: 'Unknown agent' });
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(cfg.url + '/restart', {
        method: 'POST',
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await resp.json();
      res.json(data);
    } catch (e) {
      res.status(502).json({ error: 'Agent unavailable', detail: e.message });
    }
  });
}

module.exports = { agentRoutes, agentConfigs };
