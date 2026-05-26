import { LOGO_ICON } from "../lib/api";

export function Logo({ size = 32, showText = true }) {
  return (
    <div className="rl-logo" data-testid="rl-logo">
      <img src={LOGO_ICON} alt="ReelLab" style={{ width: size, height: size, borderRadius: 9 }} />
      {showText && (
        <span className="rl-logo-text">
          Reel<span>Lab</span>
        </span>
      )}
    </div>
  );
}

export function Badge({ type }) {
  if (type === "blue") return <span className="badge-blue" title="Studio Verified" data-testid="badge-blue">✓</span>;
  if (type === "gold") return <span className="badge-gold" title="Affiliate Verified" data-testid="badge-gold">★</span>;
  return null;
}

export function Avatar({ user, size = 38 }) {
  const initial = (user?.display_name || user?.email || "?").charAt(0).toUpperCase();
  if (user?.photo_url) {
    return <img src={user.photo_url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return (
    <div className="feed-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initial}
    </div>
  );
}
