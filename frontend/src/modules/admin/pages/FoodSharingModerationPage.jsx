import { useEffect, useState } from "react";
import {
  fetchFoodSharingPostsForModeration,
  moderateFoodSharingPost,
  fetchReportedFoodPosts,
  removeFoodPostAdmin,
} from "../services/adminService";

const STATUS_STYLE = {
  available: { bg: "#f0fdf4", color: "#166534" },
  resolved: { bg: "#fffbeb", color: "#92400e" },
  collected: { bg: "#f0f4ec", color: "#475569" },
  expired: { bg: "#fee2e2", color: "#d97706" },
  removed: { bg: "#fee2e2", color: "#991b1b" },
};

const TABS = [
  { key: "all", label: "All Posts" },
  { key: "reported", label: "Reported" },
];

const FoodSharingModerationPage = () => {
  const [posts, setPosts] = useState([]);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modNote, setModNote] = useState({});

  const load = async () => {
    try {
      const [all, reported] = await Promise.all([
        fetchFoodSharingPostsForModeration(),
        fetchReportedFoodPosts().catch(() => []),
      ]);
      setPosts(all);
      setReportedPosts(reported);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const handleModeration = async (postId, status) => {
    await moderateFoodSharingPost(postId, status, modNote[postId] || "");
    setModNote((p) => ({ ...p, [postId]: "" }));
    await load();
  };

  const handleRemove = async (postId) => {
    if (!window.confirm("Remove this post? This will cancel all active claims.")) return;
    await removeFoodPostAdmin(postId, modNote[postId] || "Removed by admin");
    await load();
  };

  const displayPosts = activeTab === "reported" ? reportedPosts : posts;
  const filtered = filterStatus === "all"
    ? displayPosts
    : displayPosts.filter((p) => p.status === filterStatus);

  return (
    <div className="fsm-page">
      <div className="fsm-header">
        <h2 className="fsm-title">🍽️ Food Sharing Moderation</h2>
        <p className="fsm-subtitle">Review posts, handle reports, and manage food safety</p>
      </div>

      {/* Tabs */}
      <div className="fsm-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`fsm-tab ${activeTab === tab.key ? "fsm-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === "reported" && reportedPosts.length > 0 && (
              <span className="fsm-tab-badge">{reportedPosts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="fsm-filter-row">
        <span className="fsm-filter-label">Filter:</span>
        {["all", "available", "resolved", "expired", "collected", "removed"].map((s) => (
          <button
            key={s}
            className={`fsm-filter-btn ${filterStatus === s ? "fsm-filter-btn--active" : ""}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Posts list */}
      <div className="fsm-list">
        {filtered.length === 0 ? (
          <p className="fsm-empty">No posts to display</p>
        ) : (
          filtered.map((post) => {
            const st = STATUS_STYLE[post.status] || STATUS_STYLE.available;
            const claimCount = (post.claims || []).filter((c) => c.status === "active" || c.status === "completed").length;
            const reportCount = (post.reports || []).length;
            return (
              <div key={post._id} className="fsm-card">
                <div className="fsm-card-header">
                  <div>
                    <h4 className="fsm-card-title">{post.title}</h4>
                    <span className="fsm-card-poster">by {post.user?.name || "Unknown"} ({post.user?.email || ""})</span>
                  </div>
                  <span className="fsm-card-status" style={{ background: st.bg, color: st.color }}>
                    {post.status}
                  </span>
                </div>

                {post.description && <p className="fsm-card-desc">{post.description}</p>}

                <div className="fsm-card-info">
                  <span>📍 {post.pickupLocation}</span>
                  <span>🍽️ {post.totalPortions || post.maxMembers} portions</span>
                  <span>👥 {claimCount} claimed</span>
                  <span>⏰ Expires: {new Date(post.expiryTime).toLocaleString()}</span>
                  {post.foodType && <span>{post.foodType === "veg" ? "🥬" : "🍗"} {post.foodType}</span>}
                  {post.foodSource && <span>📦 {post.foodSource}</span>}
                </div>

                {/* Reports */}
                {reportCount > 0 && (
                  <div className="fsm-reports">
                    <h5 className="fsm-reports-title">🚩 {reportCount} Report{reportCount !== 1 ? "s" : ""}</h5>
                    {post.reports.map((r, i) => (
                      <div key={r._id || i} className="fsm-report-item">
                        <span className="fsm-report-user">{r.user?.name || "User"}</span>
                        <span className="fsm-report-reason">{r.reason}</span>
                        <span className="fsm-report-date">{new Date(r.reportedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Moderation note */}
                <div className="fsm-mod-actions">
                  <input
                    className="fsm-mod-note"
                    placeholder="Moderation note (optional)..."
                    value={modNote[post._id] || ""}
                    onChange={(e) => setModNote((p) => ({ ...p, [post._id]: e.target.value }))}
                  />
                  <div className="fsm-mod-buttons">
                    <button className="fsm-mod-btn fsm-mod-btn--available" onClick={() => handleModeration(post._id, "available")}>Set Available</button>
                    <button className="fsm-mod-btn fsm-mod-btn--expired" onClick={() => handleModeration(post._id, "expired")}>Expire</button>
                    <button className="fsm-mod-btn fsm-mod-btn--collected" onClick={() => handleModeration(post._id, "collected")}>Set Collected</button>
                    <button className="fsm-mod-btn fsm-mod-btn--remove" onClick={() => handleRemove(post._id)}>🗑️ Remove</button>
                  </div>
                </div>

                {post.moderationNote && (
                  <p className="fsm-card-mod-note">📝 Admin note: {post.moderationNote}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FoodSharingModerationPage;
