import { useState } from "react";

const FOOD_TYPE_SHORT = { veg: "Veg", "non-veg": "Non-Veg", vegan: "Vegan" };
const FOOD_SOURCE_SHORT = { homemade: "Homemade", packed: "Packed", unopened: "Unopened", restaurant: "Restaurant" };

const STATUS_CFG = {
  available: { label: "Available", cls: "fcc-badge--green" },
  resolved: { label: "All Claimed", cls: "fcc-badge--orange" },
  collected: { label: "Collected", cls: "fcc-badge--gray" },
  expired: { label: "Expired", cls: "fcc-badge--red" },
  removed: { label: "Removed", cls: "fcc-badge--red" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function timeLeftStr(dateStr) {
  const left = new Date(dateStr).getTime() - Date.now();
  if (left <= 0) return "Expired";
  const mins = Math.floor(left / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

const FoodShareCard = ({
  post,
  userId,
  onClaim,
  onCancelClaim,
  onCollect,
  onReport,
  onVerifyPickup,
  onExpire,
  onOpenLiveLocation,
  isHistory = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [showVerify, setShowVerify] = useState(false);
  const [claimPortions, setClaimPortions] = useState(1);

  const isOwner = String(post.user?._id || post.user) === String(userId);
  const statusKey = post.status || "available";
  const sCfg = STATUS_CFG[statusKey] || STATUS_CFG.available;
  const activeClaims = (post.claims || []).filter((c) => c.status === "active" || c.status === "completed");
  const myClaim = (post.claims || []).find((c) => String(c.user?._id || c.user) === String(userId) && c.status === "active");
  const myCompletedClaim = (post.claims || []).find((c) => String(c.user?._id || c.user) === String(userId) && c.status === "completed");
  const totalPortions = post.totalPortions || post.maxMembers || 1;
  const claimedP = activeClaims.reduce((s, c) => s + (c.portions || 1), 0);
  const remaining = Math.max(0, totalPortions - claimedP);
  const hasJoined = myClaim || (post.joins || []).some((j) => String(j.user?._id || j.user) === String(userId));
  const isOnWaitlist = (post.waitlist || []).some((w) => String(w.user?._id || w.user) === String(userId));
  const tLeft = post.expiryTime ? new Date(post.expiryTime).getTime() - Date.now() : 0;
  const expiringSoon = tLeft > 0 && tLeft < 60 * 60 * 1000;
  const posterName = post.user?.name || "Student";
  const fillPct = Math.min(100, (claimedP / totalPortions) * 100);

  return (
    <div className="fcc-card">
      <div className="fcc-img-area">
        {post.imageUrl ? <img src={post.imageUrl} alt="" className="fcc-img" /> : <div className="fcc-img-placeholder">IMG</div>}
        <div className="fcc-overlay-badges">
          <span className={`fcc-badge ${sCfg.cls}`}>{sCfg.label}</span>
          {expiringSoon && <span className="fcc-badge fcc-badge--orange">Expiring Soon</span>}
          {post.foodSource && <span className="fcc-badge fcc-badge--blue">{FOOD_SOURCE_SHORT[post.foodSource] || post.foodSource}</span>}
          {post.foodType && <span className="fcc-badge fcc-badge--teal">{FOOD_TYPE_SHORT[post.foodType]}</span>}
        </div>
      </div>

      <div className="fcc-body">
        <h4 className="fcc-title">{post.title}</h4>
        {post.description && <p className="fcc-desc">{post.description}</p>}

        <div className="fcc-meta">
          <span className="fcc-meta-item">[Loc] {post.pickupLocation || "N/A"}</span>
          <span className="fcc-meta-item">
            [Time] Available until {new Date(post.expiryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            <span className={`fcc-time-left ${expiringSoon ? "fcc-time-left--warn" : ""}`}> {timeLeftStr(post.expiryTime)}</span>
          </span>
          <span className="fcc-meta-item">[User] {posterName} · {claimedP} claim{claimedP !== 1 ? "s" : ""}</span>
        </div>

        <div className="fcc-portions">
          <div className="fcc-portions-bar"><div className="fcc-portions-fill" style={{ width: `${fillPct}%` }} /></div>
          <span className="fcc-portions-text">{remaining}/{totalPortions} portions left</span>
        </div>

        <span className="fcc-time-ago">{timeAgo(post.createdAt)}</span>

        {myClaim && (
          <div className="fcc-mycode">
            <span className="fcc-mycode-label">[Code] Pickup Code:</span>
            <span className="fcc-mycode-val">{myClaim.pickupCode}</span>
          </div>
        )}
        {myCompletedClaim && !myClaim && <div className="fcc-mycode fcc-mycode--done">Completed</div>}
        {isOnWaitlist && !myClaim && <div className="fcc-waitlist-tag">On waitlist</div>}
      </div>

      <div className="fcc-footer">
        <button className="fcc-act-btn fcc-act-btn--outline" onClick={() => setExpanded((p) => !p)}>
          {expanded ? "Hide" : "Details"}
        </button>

        {!isHistory && statusKey === "available" && !isOwner && !hasJoined && !isOnWaitlist && (
          <button className="fcc-act-btn fcc-act-btn--green" onClick={() => onClaim(post._id, claimPortions)}>Claim Food</button>
        )}
        {!isHistory && statusKey === "resolved" && !post.singleCollectorOnly && !isOwner && !hasJoined && !isOnWaitlist && (
          <button className="fcc-act-btn fcc-act-btn--orange" onClick={() => onClaim(post._id, 1)}>Waitlist</button>
        )}
        {myClaim && statusKey !== "collected" && (
          <button className="fcc-act-btn fcc-act-btn--red-outline" onClick={() => onCancelClaim(post._id)}>Cancel</button>
        )}
        {hasJoined && !myClaim && !myCompletedClaim && statusKey !== "collected" && <span className="fcc-claimed-hint">Claimed</span>}
        {isOwner && statusKey !== "collected" && statusKey !== "expired" && statusKey !== "removed" && (
          <button className="fcc-act-btn fcc-act-btn--green" onClick={() => onCollect(post._id)}>Collected</button>
        )}

        {post.singleCollectorOnly && (isOwner || myClaim) && (
          <button className="fcc-act-btn fcc-act-btn--outline" onClick={() => onOpenLiveLocation?.(post)}>Live Location</button>
        )}

        {!isOwner && statusKey !== "removed" && (
          <button className="fcc-act-btn fcc-act-btn--icon" title="Report" onClick={() => setShowReport((p) => !p)}>!</button>
        )}
      </div>

      {expanded && (
        <div className="fcc-expanded">
          {(post.allergenTags || []).length > 0 && <div className="fcc-exp-row"><span className="fcc-exp-label">Allergens:</span> {post.allergenTags.join(", ")}</div>}
          {post.spicyLevel && post.spicyLevel !== "none" && <div className="fcc-exp-row"><span className="fcc-exp-label">Spicy:</span> {post.spicyLevel}</div>}
          {post.preparedTime && <div className="fcc-exp-row"><span className="fcc-exp-label">Prepared:</span> {new Date(post.preparedTime).toLocaleString()}</div>}
          {post.consumeBefore && <div className="fcc-exp-row"><span className="fcc-exp-label">Consume before:</span> {new Date(post.consumeBefore).toLocaleString()}</div>}
          {post.pickupInstructions && <div className="fcc-exp-row"><span className="fcc-exp-label">Pickup:</span> {post.pickupInstructions}</div>}
          {post.pickupTimeStart && (
            <div className="fcc-exp-row">
              <span className="fcc-exp-label">Pickup window:</span> {new Date(post.pickupTimeStart).toLocaleString()}
              {post.pickupTimeEnd ? ` - ${new Date(post.pickupTimeEnd).toLocaleString()}` : ""}
            </div>
          )}
          {post.safetyDisclaimer && <div className="fcc-exp-row fcc-exp-row--safe">Safety acknowledged by poster</div>}

          {!isHistory && statusKey === "available" && !isOwner && !hasJoined && remaining > 1 && (
            <div className="fcc-exp-row">
              <span className="fcc-exp-label">Claim portions:</span>
              <input
                type="number"
                min={1}
                max={remaining}
                value={claimPortions}
                onChange={(e) => setClaimPortions(Math.max(1, Math.min(remaining, +e.target.value)))}
                className="fcc-portions-input"
              />
            </div>
          )}

          {isOwner && activeClaims.length > 0 && (
            <div className="fcc-claims-section">
              <strong>Claimed by ({activeClaims.length}):</strong>
              {activeClaims.map((c, i) => (
                <div key={c._id || i} className="fcc-claim-row">
                  <span className="fcc-claim-av">{(c.user?.name || "S")[0].toUpperCase()}</span>
                  <span>{c.user?.name || "Student"} - {c.portions} portion{c.portions !== 1 ? "s" : ""} {c.handoverConfirmed ? "done" : ""}</span>
                </div>
              ))}
            </div>
          )}

          {isOwner && statusKey !== "collected" && statusKey !== "expired" && activeClaims.length > 0 && (
            <div className="fcc-exp-row">
              {showVerify ? (
                <div className="fcc-verify-inline">
                  <input className="fcc-verify-inp" placeholder="Pickup code..." value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} />
                  <button className="fcc-act-btn fcc-act-btn--green" onClick={() => { if (verifyCode.trim()) { onVerifyPickup(post._id, verifyCode); setVerifyCode(""); setShowVerify(false); } }}>Verify</button>
                  <button className="fcc-act-btn fcc-act-btn--outline" onClick={() => setShowVerify(false)}>Cancel</button>
                </div>
              ) : (
                <button className="fcc-act-btn fcc-act-btn--outline" onClick={() => setShowVerify(true)}>Verify Pickup Code</button>
              )}
            </div>
          )}

          {isOwner && statusKey === "available" && (
            <button className="fcc-act-btn fcc-act-btn--outline" onClick={() => onExpire(post._id)} style={{ marginTop: 6 }}>Mark Expired</button>
          )}
          {isOwner && (post.reports || []).length > 0 && <div className="fcc-exp-row fcc-exp-row--warn">Reports: {post.reports.length}</div>}
        </div>
      )}

      {showReport && (
        <div className="fcc-report-area">
          <textarea className="fcc-report-ta" placeholder="Why is this food unsafe?" value={reportReason} onChange={(e) => setReportReason(e.target.value)} rows={2} />
          <div className="fcc-report-btns">
            <button className="fcc-act-btn fcc-act-btn--red" onClick={() => { if (reportReason.trim()) { onReport(post._id, reportReason); setShowReport(false); setReportReason(""); } }}>Submit Report</button>
            <button className="fcc-act-btn fcc-act-btn--outline" onClick={() => { setShowReport(false); setReportReason(""); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodShareCard;

