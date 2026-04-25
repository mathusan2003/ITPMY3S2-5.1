import { useEffect, useMemo, useState } from "react";
import FoodShareCard from "../components/FoodShareCard";
import {
  createFoodSharePost,
  fetchAvailableFoodPosts,
  fetchMyFoodShareHistory,
  claimFoodPost,
  cancelFoodClaim,
  markFoodCollected,
  reportFoodPost,
  verifyPickupCode,
  updateFoodPostStatus,
  fetchFoodShareLiveLocation,
  updateFoodShareLiveLocation,
} from "../services/foodSharingService";
import { useAuth } from "../../../context/AuthContext";
import FoodShareLiveMap from "../components/FoodShareLiveMap";

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const MAX_DESCRIPTION_WORDS = 20;
const ALLERGEN_OPTIONS = ["Gluten", "Dairy", "Nuts", "Eggs", "Soy", "Shellfish", "Fish"];

const countWords = (value = "") =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const FoodSharePage = () => {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const [posts, setPosts] = useState([]);
  const [history, setHistory] = useState({ posted: [], joined: [] });
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("feed");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFoodType, setFilterFoodType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedLivePost, setSelectedLivePost] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveLocationError, setLiveLocationError] = useState("");
  const [liveWatchId, setLiveWatchId] = useState(null);
  const [isSharingLive, setIsSharingLive] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", imageUrl: "", shareType: "free_food",
    pickupLocation: "", pickupInstructions: "", pickupTimeStart: "", pickupTimeEnd: "",
    totalPortions: 2, availableUntil: "", foodType: "veg", foodSource: "packed",
    preparedTime: "", consumeBefore: "", allergenTags: [], spicyLevel: "none",
    safetyDisclaimer: false,
  });

  const loadAll = async () => {
    try {
      const [feed, mine] = await Promise.all([fetchAvailableFoodPosts(), fetchMyFoodShareHistory()]);
      setPosts(feed);
      setHistory(mine);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not load food sharing posts");
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => () => {
    if (liveWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(liveWatchId);
    }
  }, [liveWatchId]);

  // KPI calculations
  const activePosts = posts.filter((p) => p.status === "available").length;
  const claimedToday = useMemo(() => {
    const today = new Date().toDateString();
    return posts.reduce((n, p) => n + (p.claims || []).filter((c) => (c.status === "active" || c.status === "completed") && new Date(c.claimedAt).toDateString() === today).length, 0);
  }, [posts]);
  const expiringSoon = posts.filter((p) => {
    if (p.status !== "available") return false;
    const left = new Date(p.expiryTime).getTime() - Date.now();
    return left > 0 && left < 60 * 60 * 1000;
  }).length;

  // Notifications (from own posts)
  const notifications = useMemo(() => {
    const notes = [];
    history.posted.forEach((p) => {
      const claimCount = (p.claims || []).filter((c) => c.status === "active").length;
      if (claimCount > 0) notes.push({ icon: "🔵", text: `Your post "${p.title}" was claimed by ${claimCount} student${claimCount > 1 ? "s" : ""}`, time: "Recently" });
      const left = new Date(p.expiryTime).getTime() - Date.now();
      if (left > 0 && left < 30 * 60 * 1000 && p.status === "available") notes.push({ icon: "🟠", text: `Your post "${p.title}" is expiring in ${Math.round(left / 60000)} minutes`, time: "Soon" });
      if (p.status === "collected") notes.push({ icon: "✅", text: `Food from "${p.title}" was marked as collected`, time: "" });
    });
    return notes.slice(0, 5);
  }, [history.posted]);

  // Filter + sort
  const currentRaw = activeTab === "posted" ? history.posted : activeTab === "joined" ? history.joined : posts;
  const filtered = useMemo(() => {
    let list = [...currentRaw];
    if (search) list = list.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));
    if (filterType) list = list.filter((p) => p.shareType === filterType);
    if (filterFoodType) list = list.filter((p) => p.foodType === filterFoodType);
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    if (sortBy === "expiring") list.sort((a, b) => new Date(a.expiryTime) - new Date(b.expiryTime));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [currentRaw, search, filterType, filterFoodType, filterStatus, sortBy]);

  const totalPortionsAvail = posts.reduce((s, p) => {
    if (p.status !== "available") return s;
    const claimed = (p.claims || []).filter((c) => c.status === "active" || c.status === "completed").reduce((a, c) => a + (c.portions || 1), 0);
    return s + Math.max(0, (p.totalPortions || p.maxMembers || 1) - claimed);
  }, 0);
  const activeSharers = [...new Set(posts.filter((p) => p.status === "available").map((p) => String(p.user?._id || p.user)))].length;

  const [formErrors, setFormErrors] = useState({});

  const toLocalISO = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const nowMin = toLocalISO(new Date());

  const validateForm = () => {
    const e = {};
    const now = new Date();
    if (!formData.title.trim()) e.title = "Food title is required";
    else if (formData.title.trim().length < 3) e.title = "Title must be at least 3 characters";
    if (!formData.pickupLocation.trim()) e.pickupLocation = "Pickup location is required";
    if (!formData.totalPortions || Number(formData.totalPortions) < 1) e.totalPortions = "At least 1 portion required";
    else if (Number(formData.totalPortions) > 50) e.totalPortions = "Maximum 50 portions allowed";

    if (!formData.availableUntil) e.availableUntil = "Available until time is required";
    else if (new Date(formData.availableUntil) <= now) e.availableUntil = "Must be a future date/time";

    if (formData.pickupTimeStart && new Date(formData.pickupTimeStart) < now) e.pickupTimeStart = "Pickup start cannot be in the past";
    if (formData.pickupTimeEnd) {
      if (new Date(formData.pickupTimeEnd) < now) e.pickupTimeEnd = "Pickup end cannot be in the past";
      else if (formData.pickupTimeStart && new Date(formData.pickupTimeEnd) <= new Date(formData.pickupTimeStart)) e.pickupTimeEnd = "End time must be after start time";
    }

    if (formData.consumeBefore) {
      if (new Date(formData.consumeBefore) <= now) e.consumeBefore = "Consume before must be a future time";
      else if (formData.availableUntil && new Date(formData.consumeBefore) < new Date(formData.availableUntil)) e.consumeBefore = "Should be after availability end time";
    }

    if (formData.preparedTime && new Date(formData.preparedTime) > now) e.preparedTime = "Prepared time cannot be in the future";

    if (!formData.description.trim()) e.description = "Please add a short description";
    else if (countWords(formData.description) > MAX_DESCRIPTION_WORDS) e.description = `Description must be ${MAX_DESCRIPTION_WORDS} words or less`;
    if (!formData.safetyDisclaimer) e.safetyDisclaimer = "You must confirm food safety";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const handleAllergenToggle = (tag) => setFormData((prev) => ({ ...prev, allergenTags: prev.allergenTags.includes(tag) ? prev.allergenTags.filter((t) => t !== tag) : [...prev.allergenTags, tag] }));
  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return window.alert("Please choose an image file.");
    if (file.size > MAX_UPLOAD_BYTES) return window.alert("Image too large (max 3 MB).");
    const reader = new FileReader();
    reader.onload = () => setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
    reader.readAsDataURL(file);
  };
  const handleCreate = async (e) => {
    e.preventDefault(); setError("");
    if (!validateForm()) return;
    try {
      await createFoodSharePost({ ...formData, maxMembers: formData.totalPortions });
      setFormData({ title: "", description: "", imageUrl: "", shareType: "free_food", pickupLocation: "", pickupInstructions: "", pickupTimeStart: "", pickupTimeEnd: "", totalPortions: 2, availableUntil: "", foodType: "veg", foodSource: "packed", preparedTime: "", consumeBefore: "", allergenTags: [], spicyLevel: "none", safetyDisclaimer: false });
      setShowForm(false); await loadAll();
    } catch (err) { setError(err.response?.data?.message || "Could not create post"); }
  };
  const handleClaim = async (id, p = 1) => { try { await claimFoodPost(id, p); await loadAll(); } catch (err) { setError(err.response?.data?.message || "Claim failed"); } };
  const handleCancelClaim = async (id) => { try { await cancelFoodClaim(id); await loadAll(); } catch (err) { setError(err.response?.data?.message || "Cancel failed"); } };
  const handleCollect = async (id) => { try { await markFoodCollected(id); await loadAll(); } catch (err) { setError(err.response?.data?.message || "Failed"); } };
  const handleReport = async (id, r) => { try { await reportFoodPost(id, r); await loadAll(); window.alert("Report submitted."); } catch (err) { setError(err.response?.data?.message || "Failed"); } };
  const handleVerifyPickup = async (id, c) => { try { await verifyPickupCode(id, c); await loadAll(); window.alert("Pickup verified!"); } catch (err) { setError(err.response?.data?.message || "Invalid code"); } };
  const handleExpire = async (id) => { try { await updateFoodPostStatus(id, "expired"); await loadAll(); } catch (err) { setError(err.response?.data?.message || "Failed"); } };
  const handleOpenLiveLocation = async (post) => {
    setSelectedLivePost(post);
    setLiveLocationError("");
    try {
      const data = await fetchFoodShareLiveLocation(post._id);
      setLiveLocation(data);
    } catch (err) {
      setLiveLocation(null);
      setLiveLocationError(err.response?.data?.message || "Could not load live location");
    }
  };
  const handleRefreshLiveLocation = async () => {
    if (!selectedLivePost?._id) return;
    try {
      const data = await fetchFoodShareLiveLocation(selectedLivePost._id);
      setLiveLocation(data);
    } catch (err) {
      setLiveLocationError(err.response?.data?.message || "Could not refresh live location");
    }
  };
  const handleToggleShareMyLocation = () => {
    if (!selectedLivePost?._id) return;
    if (!navigator.geolocation) {
      setLiveLocationError("Geolocation is not supported in this browser");
      return;
    }
    if (isSharingLive && liveWatchId !== null) {
      navigator.geolocation.clearWatch(liveWatchId);
      setLiveWatchId(null);
      setIsSharingLive(false);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const data = await updateFoodShareLiveLocation(selectedLivePost._id, { lat, lng });
          setLiveLocation(data);
          setLiveLocationError("");
        } catch (err) {
          setLiveLocationError(err.response?.data?.message || "Failed to share live location");
        }
      },
      (geoErr) => {
        setLiveLocationError(geoErr.message || "Location permission denied");
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    setLiveWatchId(watchId);
    setIsSharingLive(true);
  };

  const isHistory = activeTab === "posted" || activeTab === "joined";
  const descriptionWordCount = countWords(formData.description);

  return (
    <div className="fsd-page">
      {/* ── Top Header ── */}
      <div className="fsd-top-header">
        <div className="fsd-top-left">
          <h1 className="fsd-top-title">🍴 Food Sharing</h1>
          <p className="fsd-top-sub">Share extra food with other students and reduce waste</p>
        </div>
        <button className="fsd-share-btn" onClick={() => setShowForm((p) => !p)}>
          {showForm ? "✕ Close Form" : "+ Share Food"}
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div className="fsd-kpi-row">
        <div className="fsd-kpi fsd-kpi--1">
          <span className="fsd-kpi-icon">📊</span>
          <div><p className="fsd-kpi-label">Active Posts</p><p className="fsd-kpi-value">{activePosts}</p></div>
        </div>
        <div className="fsd-kpi fsd-kpi--2">
          <span className="fsd-kpi-icon">🤝</span>
          <div><p className="fsd-kpi-label">Claimed Today</p><p className="fsd-kpi-value">{claimedToday}</p></div>
        </div>
        <div className="fsd-kpi fsd-kpi--3">
          <span className="fsd-kpi-icon">⏰</span>
          <div><p className="fsd-kpi-label">Expiring Soon</p><p className="fsd-kpi-value">{expiringSoon}</p></div>
        </div>
      </div>

      {error && <p className="fs-error">{error}</p>}

      {/* ── Share Form (overlay) ── */}
      {showForm && (
        <form onSubmit={handleCreate} className="fs-form" noValidate>
          <div className="fs-form-banner"><span className="fs-form-banner-icon">🍕</span><div><h3 className="fs-form-title">Share a Food</h3><p className="fs-form-subtitle">Fill in the details to share food with your peers</p></div></div>
          <div className="fs-form-body">
            <div className="fs-form-grid">
              <div className="fs-field"><label className="fs-field-label">🏷️ Food Title <span className="fs-req">*</span></label><input className={`fs-field-input ${formErrors.title ? "fs-field-input--err" : ""}`} name="title" placeholder="e.g. Chicken Rice..." value={formData.title} onChange={handleChange} />{formErrors.title && <span className="fs-field-err">{formErrors.title}</span>}</div>
              <div className="fs-field"><label className="fs-field-label">📦 Share Type</label><select className="fs-field-input" name="shareType" value={formData.shareType} onChange={handleChange}><option value="free_food">Free food</option><option value="paid_food">Paid food</option><option value="shared_cost">Shared-cost</option></select></div>
              <div className="fs-field"><label className="fs-field-label">🍽️ Total Portions <span className="fs-req">*</span></label><input className={`fs-field-input ${formErrors.totalPortions ? "fs-field-input--err" : ""}`} type="number" min={1} max={50} name="totalPortions" value={formData.totalPortions} onChange={handleChange} />{formErrors.totalPortions && <span className="fs-field-err">{formErrors.totalPortions}</span>}</div>
              <div className="fs-field"><label className="fs-field-label">⏰ Available Until <span className="fs-req">*</span></label><input className={`fs-field-input ${formErrors.availableUntil ? "fs-field-input--err" : ""}`} type="datetime-local" name="availableUntil" min={nowMin} value={formData.availableUntil} onChange={handleChange} />{formErrors.availableUntil && <span className="fs-field-err">{formErrors.availableUntil}</span>}</div>
            </div>
            <h4 className="fs-section-title">📍 Pickup Details</h4>
            <div className="fs-form-grid">
              <div className="fs-field"><label className="fs-field-label">📍 Location <span className="fs-req">*</span></label><input className={`fs-field-input ${formErrors.pickupLocation ? "fs-field-input--err" : ""}`} name="pickupLocation" placeholder="e.g. Canteen, Block A..." value={formData.pickupLocation} onChange={handleChange} />{formErrors.pickupLocation && <span className="fs-field-err">{formErrors.pickupLocation}</span>}</div>
              <div className="fs-field"><label className="fs-field-label">📋 Instructions</label><input className="fs-field-input" name="pickupInstructions" placeholder="e.g. Ask at counter 3..." value={formData.pickupInstructions} onChange={handleChange} /></div>
              <div className="fs-field"><label className="fs-field-label">🕐 Pickup Start</label><input className={`fs-field-input ${formErrors.pickupTimeStart ? "fs-field-input--err" : ""}`} type="datetime-local" name="pickupTimeStart" min={nowMin} value={formData.pickupTimeStart} onChange={handleChange} />{formErrors.pickupTimeStart && <span className="fs-field-err">{formErrors.pickupTimeStart}</span>}</div>
              <div className="fs-field"><label className="fs-field-label">🕓 Pickup End</label><input className={`fs-field-input ${formErrors.pickupTimeEnd ? "fs-field-input--err" : ""}`} type="datetime-local" name="pickupTimeEnd" min={formData.pickupTimeStart || nowMin} value={formData.pickupTimeEnd} onChange={handleChange} />{formErrors.pickupTimeEnd && <span className="fs-field-err">{formErrors.pickupTimeEnd}</span>}</div>
            </div>
            <h4 className="fs-section-title">🥗 Food Details & Safety</h4>
            <div className="fs-form-grid">
              <div className="fs-field"><label className="fs-field-label">🥬 Food Type</label><select className="fs-field-input" name="foodType" value={formData.foodType} onChange={handleChange}><option value="veg">Vegetarian</option><option value="non-veg">Non-Vegetarian</option><option value="vegan">Vegan</option></select></div>
              <div className="fs-field"><label className="fs-field-label">📦 Source</label><select className="fs-field-input" name="foodSource" value={formData.foodSource} onChange={handleChange}><option value="homemade">Homemade</option><option value="packed">Packed</option><option value="unopened">Unopened</option><option value="restaurant">Restaurant</option></select></div>
              <div className="fs-field"><label className="fs-field-label">🕐 Prepared</label><input className={`fs-field-input ${formErrors.preparedTime ? "fs-field-input--err" : ""}`} type="datetime-local" name="preparedTime" max={nowMin} value={formData.preparedTime} onChange={handleChange} />{formErrors.preparedTime && <span className="fs-field-err">{formErrors.preparedTime}</span>}</div>
              <div className="fs-field"><label className="fs-field-label">⚠️ Consume Before</label><input className={`fs-field-input ${formErrors.consumeBefore ? "fs-field-input--err" : ""}`} type="datetime-local" name="consumeBefore" min={nowMin} value={formData.consumeBefore} onChange={handleChange} />{formErrors.consumeBefore && <span className="fs-field-err">{formErrors.consumeBefore}</span>}</div>
              <div className="fs-field"><label className="fs-field-label">🌶️ Spicy Level</label><select className="fs-field-input" name="spicyLevel" value={formData.spicyLevel} onChange={handleChange}><option value="none">Not Spicy</option><option value="mild">Mild</option><option value="medium">Medium</option><option value="hot">Hot</option><option value="extra-hot">Extra Hot</option></select></div>
            </div>
            <div className="fs-field"><label className="fs-field-label">⚠️ Allergens</label><div className="fs-allergen-row">{ALLERGEN_OPTIONS.map((t) => <button key={t} type="button" className={`fs-allergen-tag ${formData.allergenTags.includes(t) ? "fs-allergen-tag--active" : ""}`} onClick={() => handleAllergenToggle(t)}>{t}</button>)}</div></div>
            <div className="fs-field"><label className="fs-field-label">📝 Description <span className="fs-req">*</span></label><textarea className={`fs-field-textarea ${formErrors.description ? "fs-field-input--err" : ""}`} name="description" placeholder="Describe the food, quantity, dietary info..." value={formData.description} onChange={handleChange} rows={3} />{formErrors.description && <span className="fs-field-err">{formErrors.description}</span>}</div>
            <div className="fs-upload-zone"><label className="fs-upload-area"><input type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} />{formData.imageUrl ? <div className="fs-upload-preview-wrap"><img src={formData.imageUrl} alt="" className="fs-upload-preview" /><span className="fs-upload-change">Click to change</span></div> : <div className="fs-upload-placeholder"><span className="fs-upload-icon">📸</span><span className="fs-upload-text">Upload image</span><span className="fs-upload-hint">PNG, JPG up to 3 MB</span></div>}</label></div>
            <div className={`fs-disclaimer ${formErrors.safetyDisclaimer ? "fs-disclaimer--err" : ""}`}><label className="fs-disclaimer-label"><input type="checkbox" name="safetyDisclaimer" checked={formData.safetyDisclaimer} onChange={handleChange} /><span>I confirm this food is safe for consumption. <span className="fs-req">*</span></span></label><p className="fs-disclaimer-note">The poster is responsible for the food's safety.</p>{formErrors.safetyDisclaimer && <span className="fs-field-err" style={{ marginLeft: 26 }}>{formErrors.safetyDisclaimer}</span>}</div>
            <button type="submit" className="fs-publish-btn">🚀 Publish Food Share</button>
          </div>
        </form>
      )}

      {/* ── Tabs ── */}
      <div className="fsd-tabs">
        <button className={`fsd-tab ${activeTab === "feed" ? "fsd-tab--active" : ""}`} onClick={() => setActiveTab("feed")}>🍽️ Food Feed</button>
        <button className={`fsd-tab ${activeTab === "posted" ? "fsd-tab--active" : ""}`} onClick={() => setActiveTab("posted")}>📝 My Posts {history.posted.length > 0 && <span className="fsd-tab-count">({history.posted.length})</span>}</button>
        <button className={`fsd-tab ${activeTab === "joined" ? "fsd-tab--active" : ""}`} onClick={() => setActiveTab("joined")}>🤝 My Claims {history.joined.length > 0 && <span className="fsd-tab-count">({history.joined.length})</span>}</button>
      </div>

      {/* ── Filters + Sort (single row) ── */}
      <div className="fsd-filters">
        <input className="fsd-search" placeholder="Search food items..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="fsd-filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="free_food">Free</option>
          <option value="paid_food">Paid</option>
          <option value="shared_cost">Shared</option>
        </select>
        <select className="fsd-filter-select" value={filterFoodType} onChange={(e) => setFilterFoodType(e.target.value)}>
          <option value="">All Food</option>
          <option value="veg">Veg</option>
          <option value="non-veg">Non-Veg</option>
          <option value="vegan">Vegan</option>
        </select>
        <select className="fsd-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="resolved">Claimed</option>
          <option value="expired">Expired</option>
          <option value="collected">Collected</option>
        </select>
        <div className="fsd-sort-row">
          <span className="fsd-sort-label">Sort:</span>
          <button className={`fsd-sort-btn ${sortBy === "latest" ? "fsd-sort-btn--active" : ""}`} onClick={() => setSortBy("latest")}>Latest</button>
          <button className={`fsd-sort-btn ${sortBy === "expiring" ? "fsd-sort-btn--active" : ""}`} onClick={() => setSortBy("expiring")}>Expiring Soon</button>
        </div>
      </div>

      {/* ── Body: Cards + Right Sidebar ── */}
      <div className="fsd-body">
        <div className="fsd-cards-area">
          {filtered.length === 0 ? (
            <div className="fs-empty"><span className="fs-empty-icon">🍽️</span><p>No food shares found</p><span className="fs-empty-hint">Try adjusting your filters or share your own!</span></div>
          ) : (
            <div className="fsd-card-grid">
              {filtered.map((post) => (
                <FoodShareCard
                  key={`${activeTab}-${post._id}`}
                  post={post}
                  userId={userId}
                  onClaim={handleClaim}
                  onCancelClaim={handleCancelClaim}
                  onCollect={handleCollect}
                  onReport={handleReport}
                  onVerifyPickup={handleVerifyPickup}
                  onExpire={handleExpire}
                  onOpenLiveLocation={handleOpenLiveLocation}
                  isHistory={isHistory}
                  isMyPosts={activeTab === "posted"}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="fsd-right">
          <div className="fsd-right-card">
            <div className="fsd-right-card-head">
              <h4>Live Pickup Tracking</h4>
            </div>
            {!selectedLivePost ? (
              <p className="fsd-right-empty">Open any free one-person post and click "Live Location".</p>
            ) : (
              <>
                <p className="wallet-small"><strong>{selectedLivePost.title}</strong></p>
                {liveLocationError && <p className="wallet-error">{liveLocationError}</p>}
                {liveLocation && (
                  <FoodShareLiveMap
                    pickup={liveLocation.pickup}
                    ownerLiveLocation={liveLocation.ownerLiveLocation}
                    collectorLiveLocation={liveLocation.collectorLiveLocation}
                    meRole={String(selectedLivePost.user?._id || selectedLivePost.user) === String(userId) ? "sharer" : "collector"}
                  />
                )}
                <div className="wallet-inline" style={{ marginTop: 8 }}>
                  <button className="fcc-act-btn fcc-act-btn--outline" onClick={handleRefreshLiveLocation}>Refresh</button>
                  <button className="fcc-act-btn fcc-act-btn--green" onClick={handleToggleShareMyLocation}>
                    {isSharingLive ? "Stop Sharing" : "Share My Live"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <div className="fsd-right-card">
            <div className="fsd-right-card-head">
              <h4>🔔 Notifications</h4>
              {notifications.length > 0 && <span className="fsd-notif-badge">{notifications.length}</span>}
            </div>
            {notifications.length === 0 ? (
              <p className="fsd-right-empty">No new notifications</p>
            ) : (
              <div className="fsd-notif-list">
                {notifications.map((n, i) => (
                  <div key={i} className="fsd-notif-item">
                    <span className="fsd-notif-icon">{n.icon}</span>
                    <div>
                      <p className="fsd-notif-text">{n.text}</p>
                      {n.time && <span className="fsd-notif-time">{n.time}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Safety Tips */}
          <div className="fsd-right-card">
            <h4 className="fsd-right-card-head">🛡️ Food Safety Tips</h4>
            <ul className="fsd-tips-list">
              <li>✅ Always check food condition before accepting</li>
              <li>✅ Verify allergen information with the poster</li>
              <li>✅ Only share food that's safe to consume</li>
              <li>✅ Report any suspicious or unsafe posts</li>
              <li>✅ Coordinate pickup times promptly</li>
            </ul>
          </div>

          {/* Quick Stats */}
          <div className="fsd-right-card">
            <h4 className="fsd-right-card-head">📊 Quick Stats</h4>
            <div className="fsd-qstats">
              <div className="fsd-qstat-row"><span>Total Shares Today</span><strong>{posts.filter((p) => new Date(p.createdAt).toDateString() === new Date().toDateString()).length}</strong></div>
              <div className="fsd-qstat-row"><span>Available Portions</span><strong>{totalPortionsAvail}</strong></div>
              <div className="fsd-qstat-row"><span>Active Sharers</span><strong>{activeSharers}</strong></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FoodSharePage;
