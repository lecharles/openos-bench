// llm-adapter — the LLM-swappable contract (Day 2).
//
// All agent apps call POST /api/llm/chat { provider, model, messages, stream }.
// The adapter resolves provider/model from env; the browser never sees raw keys.
// Streaming goes over Socket.IO agent:chunk/agent:done; offline backends yield
// an honest 502 + mock fallback (never fake "Connected").
//
// Config: LLM_PROVIDER=kimi-k3, LLM_MODEL=opencode-go/kimi-k3 (see .env.example).
// To swap models, change env only — this contract stays identical.

const PROVIDER_DEFAULTS = {
    "kimi-k3": "opencode-go/kimi-k3",
    "qwen3.8-flash": "opencode-go/qwen3.8-flash",
    "gpt-5.5": "openai/gpt-5.5",
};

function resolveConfig(overrides = {}) {
    const provider = overrides.provider || process.env.LLM_PROVIDER || "kimi-k3";
    const model = overrides.model || process.env.LLM_MODEL || PROVIDER_DEFAULTS[provider] || provider;
    return { provider, model, stream: overrides.stream !== false };
}

function adapterHealth() {
    const { provider, model } = resolveConfig();
    return {
        status: "ok",
        provider,
        model,
        keyConfigured: Boolean(process.env.OPENCODE_GO_API_KEY || process.env.OPENAI_API_KEY),
        // No key values are ever returned — presence boolean only.
    };
}

module.exports = { resolveConfig, adapterHealth, PROVIDER_DEFAULTS };
