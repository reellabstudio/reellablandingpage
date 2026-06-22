import { useEffect, useState } from "react";
import api from "../lib/api";
import {
  Instagram,
  Music2,
  Youtube,
  Twitter,
  Facebook,
  X as XIcon,
  Check,
  Link2,
  AlertTriangle,
  Plug,
  Trash2,
} from "lucide-react";

// Platform → display config. OAuth flag controls whether we offer real OAuth or manual handle entry.
const PLATFORMS = [
  { key: "youtube",   label: "YouTube",   Icon: Youtube,   color: "#FF0000", oauth: true,  provider: "Google" },
  { key: "instagram", label: "Instagram", Icon: Instagram, color: "#E1306C", oauth: true,  provider: "Meta" },
  { key: "facebook",  label: "Facebook",  Icon: Facebook,  color: "#1877F2", oauth: true,  provider: "Meta" },
  { key: "tiktok",    label: "TikTok",    Icon: Music2,    color: "#FE2C55", oauth: false, provider: null },
  { key: "x",         label: "X",         Icon: Twitter,   color: "#1D9BF0", oauth: false, provider: null },
];

export default function ConnectorsModal({ onClose, plan = "free", role = "client" }) {
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null); // {platform, handle}
  const [busy, setBusy] = useState(false);
  const studioAccess = role === "ceo" || plan === "studio";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/connectors");
      setConnectors(data.connectors || []);
    } catch (e) {
      setErr(e.response?.data?.detail?.message || e.response?.data?.detail || "Could not load connectors.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Surface OAuth callback result if present in URL
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connector_connected");
    const cErr = params.get("connector_error");
    if (connected) {
      setErr("");
    } else if (cErr) {
      setErr(`OAuth failed: ${cErr.replace(/_/g, " ")}`);
    }
  }, []);

  const byPlatform = (k) => connectors.find((c) => c.platform === k);

  const startOAuth = async (platform) => {
    setErr("");
    if (!studioAccess) {
      setErr("Direct publishing connectors are Studio-only. Upgrade to enable.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.get(`/connectors/oauth/${platform}/start`, {
        params: { return_to: window.location.pathname },
      });
      if (data.setup_required) {
        setErr(
          `${platform} OAuth not yet configured. Admin needs to set ${data.missing.join(", ")}. ` +
            `Use manual handle entry below for now.`
        );
        setEditing({ platform, handle: byPlatform(platform)?.handle || "" });
      } else if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (e) {
      const d = e.response?.data?.detail;
      setErr(typeof d === "string" ? d : d?.message || "Could not start OAuth.");
    }
    setBusy(false);
  };

  const saveManual = async () => {
    if (!editing?.handle?.trim()) return setErr("Enter a handle first.");
    setBusy(true);
    setErr("");
    try {
      await api.post("/connectors", { platform: editing.platform, handle: editing.handle.trim() });
      setEditing(null);
      await load();
    } catch (e) {
      const d = e.response?.data?.detail;
      setErr(typeof d === "string" ? d : d?.message || "Could not save handle.");
    }
    setBusy(false);
  };

  const disconnect = async (platform) => {
    if (!window.confirm(`Disconnect ${platform}?`)) return;
    setBusy(true);
    try {
      await api.delete(`/connectors/${platform}`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Could not disconnect.");
    }
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="connectors-modal">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>
            <Plug size={16} style={{ display: "inline", marginRight: 6, color: "var(--purple-light)" }} />
            Connect publishing platforms
          </div>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: 6 }}
            data-testid="connectors-close"
          >
            <XIcon size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 16, lineHeight: 1.6 }}>
          Link your social accounts to publish directly from ReelLab. YouTube & Meta platforms support full OAuth;
          TikTok and X currently use manual handle entry.
        </p>

        {!studioAccess && (
          <div
            style={{
              padding: 12,
              background: "var(--purple-glow)",
              border: "0.5px solid var(--purple)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text)",
              marginBottom: 16,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
            data-testid="connectors-studio-gate"
          >
            <AlertTriangle size={14} style={{ color: "var(--purple-light)", flexShrink: 0 }} />
            Direct publishing is a Studio plan feature. Upgrade to enable.
          </div>
        )}

        {err && (
          <div
            style={{
              padding: 10,
              background: "var(--coral-light)",
              color: "var(--coral)",
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 14,
            }}
            data-testid="connectors-error"
          >
            {err}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-sec)" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PLATFORMS.map((p) => {
              const conn = byPlatform(p.key);
              const isConnected = !!conn?.connected;
              return (
                <div
                  key={p.key}
                  data-testid={`connector-row-${p.key}`}
                  style={{
                    padding: 14,
                    background: "var(--surface2)",
                    borderRadius: 10,
                    border: `0.5px solid ${isConnected ? p.color + "55" : "var(--border)"}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <p.Icon size={20} style={{ color: p.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-sec)" }}>
                        {isConnected ? (
                          <span>
                            <Check size={11} style={{ display: "inline", color: "var(--teal)", marginRight: 4 }} />
                            {conn.handle}
                            {conn.auth_type === "oauth" && (
                              <span style={{ marginLeft: 6, color: "var(--text-dim)" }}>· OAuth</span>
                            )}
                          </span>
                        ) : p.oauth ? (
                          `OAuth via ${p.provider}`
                        ) : (
                          "Manual handle"
                        )}
                      </div>
                    </div>
                    {isConnected ? (
                      <button
                        className="btn-ghost"
                        disabled={busy}
                        onClick={() => disconnect(p.key)}
                        data-testid={`connector-disconnect-${p.key}`}
                        style={{ color: "var(--coral)", padding: "6px 10px", fontSize: 12 }}
                      >
                        <Trash2 size={12} style={{ display: "inline", marginRight: 4 }} /> Disconnect
                      </button>
                    ) : p.oauth ? (
                      <button
                        className="btn-primary"
                        disabled={busy || !studioAccess}
                        onClick={() => startOAuth(p.key)}
                        data-testid={`connector-oauth-${p.key}`}
                        style={{ padding: "6px 14px", fontSize: 12 }}
                      >
                        <Link2 size={12} style={{ display: "inline", marginRight: 4 }} /> Connect
                      </button>
                    ) : (
                      <button
                        className="btn-secondary"
                        disabled={busy || !studioAccess}
                        onClick={() => setEditing({ platform: p.key, handle: "" })}
                        data-testid={`connector-manual-${p.key}`}
                        style={{ padding: "6px 14px", fontSize: 12 }}
                      >
                        Add handle
                      </button>
                    )}
                  </div>
                  {editing?.platform === p.key && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="input"
                        autoFocus
                        placeholder={`@your-${p.key}-handle`}
                        value={editing.handle}
                        onChange={(e) => setEditing({ ...editing, handle: e.target.value })}
                        data-testid={`connector-input-${p.key}`}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-primary"
                        disabled={busy}
                        onClick={saveManual}
                        data-testid={`connector-save-${p.key}`}
                        style={{ padding: "8px 14px", fontSize: 12 }}
                      >
                        Save
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => setEditing(null)}
                        style={{ padding: "8px 10px", fontSize: 12 }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
