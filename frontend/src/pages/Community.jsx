import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { Avatar, Badge } from "../components/Logo";
import { Heart, MessageCircle, Star, Send, Users } from "lucide-react";

export default function Community() {
  const { user } = useAuth();
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [commentOpen, setCommentOpen] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [toast, setToast] = useState(null);

  const load = async () => {
    const [p, m] = await Promise.all([api.get("/community/posts"), api.get("/community/members")]);
    setPosts(p.data.posts);
    setMembers(m.data.members);
  };

  useEffect(() => { load(); }, []);

  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const submitPost = async () => {
    if (!newPost.trim()) return;
    await api.post("/community/posts", { body: newPost, post_type: "text" });
    setNewPost("");
    load();
  };

  const toggleLike = async (id) => {
    await api.post(`/community/posts/${id}/like`);
    load();
  };

  const submitComment = async (id) => {
    if (!commentText.trim()) return;
    await api.post(`/community/posts/${id}/comment`, { body: commentText });
    setCommentText("");
    setCommentOpen(null);
    load();
  };

  const sendStar = async (recipientId, name) => {
    try {
      await api.post(`/community/stars/${recipientId}`);
      showToast(`⭐ Star sent to ${name} (+10 points)`);
    } catch (e) {
      showToast(e.response?.data?.detail || "Couldn't send star");
    }
  };

  return (
    <div className="page-shell" data-testid="community-page">
      {toast && <div className="toast" data-testid="community-toast">{toast}</div>}
      <h1 className="page-title">Community</h1>
      <p className="page-sub">Connect with creators · share progress · send stars.</p>

      <div style={{ display: "flex", gap: 4, borderBottom: "0.5px solid var(--border)", marginBottom: 24 }}>
        <button onClick={() => setTab("feed")} style={{
          padding: "12px 18px", background: "none", border: "none",
          borderBottom: tab === "feed" ? "2px solid var(--purple)" : "2px solid transparent",
          color: tab === "feed" ? "var(--purple)" : "var(--text-sec)", fontSize: 13, fontWeight: 500,
        }} data-testid="community-tab-feed">Feed</button>
        <button onClick={() => setTab("members")} style={{
          padding: "12px 18px", background: "none", border: "none",
          borderBottom: tab === "members" ? "2px solid var(--purple)" : "2px solid transparent",
          color: tab === "members" ? "var(--purple)" : "var(--text-sec)", fontSize: 13, fontWeight: 500,
        }} data-testid="community-tab-members">Members</button>
      </div>

      {tab === "feed" && (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Avatar user={user} size={40} />
              <div style={{ flex: 1 }}>
                <textarea className="input" placeholder="Share something with the community…" rows={3} value={newPost} onChange={(e) => setNewPost(e.target.value)} data-testid="post-input" />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button className="btn-primary" onClick={submitPost} disabled={!newPost.trim()} data-testid="post-submit">Post</button>
                </div>
              </div>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 60 }}>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>No posts yet</h3>
              <p style={{ color: "var(--text-sec)", fontSize: 13 }}>Be the first to share something!</p>
            </div>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="feed-post" data-testid={`post-${p.id}`}>
                <div className="feed-author">
                  <Avatar user={p.author} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <strong style={{ fontSize: 14 }}>{p.author?.display_name || "User"}</strong>
                      <Badge type={p.author?.badge} />
                    </div>
                    <div className="feed-meta">@{p.author?.username} · {new Date(p.created_at).toLocaleString()}</div>
                  </div>
                  {p.author?.id && p.author.id !== user?.id && (
                    <button className="btn-secondary" style={{ padding: "5px 12px", fontSize: 11 }} onClick={() => sendStar(p.author.id, p.author.display_name)} data-testid={`send-star-${p.id}`}>
                      <Star size={12} style={{ display: "inline", marginRight: 4 }} fill="currentColor" /> Star
                    </button>
                  )}
                </div>
                <div className="feed-body">{p.body}</div>
                <div className="feed-actions">
                  <button className={`feed-action ${(p.likes || []).includes(user?.id) ? "liked" : ""}`} onClick={() => toggleLike(p.id)} data-testid={`like-${p.id}`}>
                    <Heart size={14} fill={(p.likes || []).includes(user?.id) ? "currentColor" : "none"} /> {(p.likes || []).length}
                  </button>
                  <button className="feed-action" onClick={() => setCommentOpen(commentOpen === p.id ? null : p.id)} data-testid={`comment-toggle-${p.id}`}>
                    <MessageCircle size={14} /> {(p.comments || []).length}
                  </button>
                </div>
                {commentOpen === p.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "0.5px solid var(--border)" }}>
                    {(p.comments || []).map((c) => (
                      <div key={c.id} style={{ marginBottom: 8, padding: 10, background: "var(--surface2)", borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-sec)", marginBottom: 4 }}>{c.author_name}</div>
                        <div style={{ fontSize: 13 }}>{c.body}</div>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className="input" placeholder="Write a comment…" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitComment(p.id)} data-testid={`comment-input-${p.id}`} />
                      <button className="btn-primary" onClick={() => submitComment(p.id)} data-testid={`comment-submit-${p.id}`}><Send size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {tab === "members" && (
        <div className="grid-3">
          {members.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 40, gridColumn: "1/-1" }}>
              <Users size={32} color="var(--text-dim)" style={{ marginBottom: 12 }} />
              <p style={{ color: "var(--text-sec)", fontSize: 13 }}>No other members yet. Invite friends to join!</p>
            </div>
          ) : members.map((m) => (
            <div key={m.id} className="card" data-testid={`member-${m.id}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Avatar user={m} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <strong style={{ fontSize: 14 }}>{m.display_name}</strong>
                    <Badge type={m.badge} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-sec)" }}>@{m.username}</div>
                </div>
              </div>
              {m.bio && <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 10 }}>{m.bio}</div>}
              <button className="btn-secondary" style={{ width: "100%", padding: "6px 12px", fontSize: 12 }} onClick={() => sendStar(m.id, m.display_name)} data-testid={`member-send-star-${m.id}`}>
                <Star size={12} style={{ display: "inline", marginRight: 4 }} fill="currentColor" /> Send star
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
