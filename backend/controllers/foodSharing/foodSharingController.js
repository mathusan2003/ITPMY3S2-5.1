const FoodSharePost = require("../../models/FoodSharePost");
const { sendSuccess, sendError } = require("../../utils/apiResponse");
const crypto = require("crypto");

const POPULATE_USER = "name role phone email";
const POPULATE_CLAIM = "name email phone";
const MAX_DESCRIPTION_WORDS = 20;

const countWords = (value = "") =>
  String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const updateExpiredPosts = async () => {
  await FoodSharePost.updateMany(
    { status: "available", expiryTime: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );
};

const populatePost = (query) =>
  query
    .populate("user", POPULATE_USER)
    .populate("joins.user", "name email phone")
    .populate("claims.user", POPULATE_CLAIM)
    .populate("waitlist.user", POPULATE_CLAIM)
    .populate("reports.user", "name email");

const isActiveClaimOfUser = (post, userId) =>
  post.claims.some((c) => String(c.user?._id || c.user) === String(userId) && c.status === "active");

const isLocationParticipant = (post, userId) => {
  const isOwner = String(post.user?._id || post.user) === String(userId);
  const isCollector = String(post.activeCollector?._id || post.activeCollector || "") === String(userId);
  return { isOwner, isCollector, isAllowed: isOwner || isCollector };
};

// ─── Create ─────────────────────────────────────────────
const createFoodPost = async (req, res, next) => {
  try {
    const {
      title,
      description,
      imageUrl = "",
      shareType = "free_food",
      pickupLocation,
      pickupLat,
      pickupLng,
      pickupInstructions = "",
      pickupTimeStart,
      pickupTimeEnd,
      maxMembers,
      quantity,
      totalPortions,
      availableUntil,
      expiryTime,
      foodType = "veg",
      foodSource = "packed",
      preparedTime,
      consumeBefore,
      allergenTags = [],
      spicyLevel = "none",
      safetyDisclaimer = false,
    } = req.body;

    if (countWords(description) > MAX_DESCRIPTION_WORDS) {
      return sendError(res, `Description must be ${MAX_DESCRIPTION_WORDS} words or less`, 400);
    }

    const isFreeFood = (shareType || "free_food") === "free_food";
    const portions = isFreeFood ? 1 : Number(totalPortions || maxMembers || quantity || 1);

    const post = await FoodSharePost.create({
      user: req.user._id,
      title,
      description: description || "",
      imageUrl: typeof imageUrl === "string" ? imageUrl.trim() : "",
      shareType,
      pickupLocation,
      pickupLat: pickupLat !== undefined ? Number(pickupLat) : null,
      pickupLng: pickupLng !== undefined ? Number(pickupLng) : null,
      pickupInstructions,
      pickupTimeStart: pickupTimeStart ? new Date(pickupTimeStart) : null,
      pickupTimeEnd: pickupTimeEnd ? new Date(pickupTimeEnd) : null,
      totalPortions: portions,
      maxMembers: isFreeFood ? 1 : Number(maxMembers ?? quantity ?? portions),
      singleCollectorOnly: isFreeFood,
      expiryTime: new Date(availableUntil || expiryTime),
      foodType,
      foodSource,
      preparedTime: preparedTime ? new Date(preparedTime) : null,
      consumeBefore: consumeBefore ? new Date(consumeBefore) : null,
      allergenTags: Array.isArray(allergenTags) ? allergenTags : allergenTags ? [allergenTags] : [],
      spicyLevel,
      safetyDisclaimer,
      status: "available",
      locationSharingEnabled: isFreeFood,
    });
    return sendSuccess(res, "Food sharing post created", { post }, 201);
  } catch (error) {
    next(error);
  }
};

// ─── List available ─────────────────────────────────────
const getAvailableFoodPosts = async (req, res, next) => {
  try {
    await updateExpiredPosts();
    const posts = await populatePost(
      FoodSharePost.find({ status: { $in: ["available", "resolved"] } }).sort({ createdAt: -1 })
    );
    return sendSuccess(res, "Available shared food fetched", { posts }, 200);
  } catch (error) {
    next(error);
  }
};

// ─── Get single post ────────────────────────────────────
const getFoodPostById = async (req, res, next) => {
  try {
    await updateExpiredPosts();
    const post = await populatePost(FoodSharePost.findById(req.params.postId));
    if (!post) return sendError(res, "Post not found", 404);
    return sendSuccess(res, "Post fetched", { post }, 200);
  } catch (error) {
    next(error);
  }
};

// ─── Claim (replaces old join) ──────────────────────────
const claimFoodPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { portions = 1 } = req.body;
    const post = await populatePost(FoodSharePost.findById(postId));

    if (!post) return sendError(res, "Post not found", 404);
    if (post.status !== "available") return sendError(res, "Food is no longer available", 400);
    if (post.expiryTime.getTime() <= Date.now()) return sendError(res, "Food post has expired", 400);
    if (String(post.user._id || post.user) === String(req.user._id)) return sendError(res, "You cannot claim your own post", 400);

    const alreadyClaimed = isActiveClaimOfUser(post, req.user._id);
    if (alreadyClaimed) return sendError(res, "You already have an active claim", 400);

    if (post.singleCollectorOnly) {
      const pickupCode = crypto.randomInt(100000, 999999).toString();
      const claimed = await FoodSharePost.findOneAndUpdate(
        {
          _id: postId,
          status: "available",
          expiryTime: { $gt: new Date() },
          user: { $ne: req.user._id },
          activeCollector: null,
          singleCollectorOnly: true,
        },
        {
          $set: {
            activeCollector: req.user._id,
            status: "resolved",
            resolvedAt: new Date(),
          },
          $push: {
            claims: {
              user: req.user._id,
              portions: 1,
              status: "active",
              pickupCode,
              claimedAt: new Date(),
            },
            joins: { user: req.user._id },
          },
        },
        { new: true }
      );

      if (!claimed) {
        return sendError(res, "This free food is already claimed by another student", 400);
      }

      const refreshed = await populatePost(FoodSharePost.findById(postId));
      return sendSuccess(res, "Food claimed successfully", { post: refreshed }, 200);
    }

    const activeClaims = post.claims.filter((c) => c.status === "active");
    const claimedPortions = activeClaims.reduce((s, c) => s + c.portions, 0);
    const remaining = post.totalPortions - claimedPortions;

    if (remaining <= 0) {
      post.waitlist.push({ user: req.user._id, portions: Math.min(Number(portions), post.totalPortions) });
      await post.save();
      const refreshed = await populatePost(FoodSharePost.findById(postId));
      return sendSuccess(res, "All portions claimed. You have been added to the waitlist.", { post: refreshed, waitlisted: true }, 200);
    }

    const claimPortions = Math.min(Number(portions) || 1, remaining);
    post.claims.push({ user: req.user._id, portions: claimPortions });

    // Also push to legacy joins for backward compat
    const alreadyJoined = post.joins.some((j) => String(j.user?._id || j.user) === String(req.user._id));
    if (!alreadyJoined) post.joins.push({ user: req.user._id });

    const newClaimedTotal = claimedPortions + claimPortions;
    if (newClaimedTotal >= post.totalPortions) {
      post.status = "resolved";
      post.resolvedAt = new Date();
    }

    await post.save();
    const refreshed = await populatePost(FoodSharePost.findById(postId));
    return sendSuccess(res, "Food claimed successfully", { post: refreshed }, 200);
  } catch (error) {
    next(error);
  }
};

// ─── Cancel claim ───────────────────────────────────────
const cancelClaim = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await FoodSharePost.findById(postId);
    if (!post) return sendError(res, "Post not found", 404);

    const claim = post.claims.find(
      (c) => String(c.user) === String(req.user._id) && c.status === "active"
    );
    if (!claim) return sendError(res, "No active claim found", 400);

    claim.status = "cancelled";
    claim.cancelledAt = new Date();

    // If post was resolved, re-open it
    if (post.status === "resolved") {
      post.status = "available";
      post.resolvedAt = null;
    }
    if (post.singleCollectorOnly && String(post.activeCollector || "") === String(req.user._id)) {
      post.activeCollector = null;
    }

    // Promote waitlist if any
    if (post.waitlist.length > 0) {
      const next = post.waitlist[0];
      const activeClaims = post.claims.filter((c) => c.status === "active");
      const claimedPortions = activeClaims.reduce((s, c) => s + c.portions, 0);
      const remaining = post.totalPortions - claimedPortions;

      if (remaining > 0) {
        const promotePortion = Math.min(next.portions, remaining);
        post.claims.push({ user: next.user, portions: promotePortion });
        if (!post.joins.some((j) => String(j.user) === String(next.user)))
          post.joins.push({ user: next.user });
        post.waitlist.shift();

        const newTotal = claimedPortions + promotePortion;
        if (newTotal >= post.totalPortions) {
          post.status = "resolved";
          post.resolvedAt = new Date();
        }
      }
    }

    await post.save();
    const refreshed = await populatePost(FoodSharePost.findById(postId));
    return sendSuccess(res, "Claim cancelled", { post: refreshed }, 200);
  } catch (error) {
    next(error);
  }
};

// ─── Verify pickup code (poster confirms handover) ─────
const verifyPickupCode = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { pickupCode } = req.body;
    if (!pickupCode) return sendError(res, "Pickup code is required", 400);

    const post = await FoodSharePost.findById(postId);
    if (!post) return sendError(res, "Post not found", 404);

    const isOwner = String(post.user) === String(req.user._id);
    if (!isOwner) return sendError(res, "Only the poster can verify pickup codes", 403);

    const claim = post.claims.find((c) => c.pickupCode === pickupCode && c.status === "active");
    if (!claim) return sendError(res, "Invalid pickup code", 400);

    claim.handoverConfirmed = true;
    claim.status = "completed";

    // If all active claims are completed, mark post as collected
    const allDone = post.claims.filter((c) => c.status === "active").length === 0;
    if (allDone) post.status = "collected";
    if (post.singleCollectorOnly) post.activeCollector = null;

    await post.save();
    const refreshed = await populatePost(FoodSharePost.findById(postId));
    return sendSuccess(res, "Pickup verified. Handover confirmed.", { post: refreshed }, 200);
  } catch (error) {
    next(error);
  }
};

// ─── Mark manual status (owner) ─────────────────────────
const markFoodStatus = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { status } = req.body;
    const allowed = ["collected", "expired"];
    if (!allowed.includes(status)) return sendError(res, "Invalid status", 400);

    const post = await FoodSharePost.findById(postId);
    if (!post) return sendError(res, "Post not found", 404);

    const isOwner = String(post.user) === String(req.user._id);
    const isJoiner = post.joins.some((j) => String(j.user) === String(req.user._id));
    const isClaimer = isActiveClaimOfUser(post, req.user._id);
    if (!isOwner && !isJoiner && !isClaimer) return sendError(res, "Not authorized", 403);

    post.status = status;
    if (status === "collected") {
      post.claims.forEach((c) => { if (c.status === "active") c.status = "completed"; });
      if (post.singleCollectorOnly) post.activeCollector = null;
    }
    await post.save();
    const refreshed = await populatePost(FoodSharePost.findById(postId));
    return sendSuccess(res, `Food marked as ${status}`, { post: refreshed }, 200);
  } catch (error) {
    next(error);
  }
};

// ─── Report unsafe food ─────────────────────────────────
const reportFoodPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;
    if (!reason?.trim()) return sendError(res, "Reason is required", 400);

    const post = await FoodSharePost.findById(postId);
    if (!post) return sendError(res, "Post not found", 404);

    const alreadyReported = post.reports.some((r) => String(r.user) === String(req.user._id));
    if (alreadyReported) return sendError(res, "You have already reported this post", 400);

    post.reports.push({ user: req.user._id, reason: reason.trim() });
    await post.save();
    return sendSuccess(res, "Report submitted. Thank you for keeping the community safe.", {}, 200);
  } catch (error) {
    next(error);
  }
};

// ─── My history ─────────────────────────────────────────
const getMyFoodShareHistory = async (req, res, next) => {
  try {
    await updateExpiredPosts();
    const [posted, joined] = await Promise.all([
      populatePost(FoodSharePost.find({ user: req.user._id }).sort({ createdAt: -1 })),
      populatePost(
        FoodSharePost.find({
          $or: [
            { "joins.user": req.user._id },
            { "claims.user": req.user._id },
          ],
        }).sort({ createdAt: -1 })
      ),
    ]);
    return sendSuccess(res, "Food share history fetched", { posted, joined }, 200);
  } catch (error) {
    next(error);
  }
};

// ─── Legacy join (backward compat alias) ────────────────
const joinFoodPost = async (req, res, next) => {
  req.body.portions = req.body.portions || 1;
  return claimFoodPost(req, res, next);
};

// ─── Legacy collect (backward compat) ───────────────────
const markFoodCollected = async (req, res, next) => {
  req.body.status = "collected";
  return markFoodStatus(req, res, next);
};

const updateMyLiveLocation = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { lat, lng } = req.body;
    const post = await FoodSharePost.findById(postId);
    if (!post) return sendError(res, "Post not found", 404);
    if (!post.singleCollectorOnly) return sendError(res, "Live location is enabled only for free one-person share posts", 400);

    const { isOwner, isCollector, isAllowed } = isLocationParticipant(post, req.user._id);
    if (!isAllowed) return sendError(res, "Not authorized to share location for this post", 403);

    const payload = { lat: Number(lat), lng: Number(lng), updatedAt: new Date() };
    if (isOwner) post.ownerLiveLocation = payload;
    if (isCollector) post.collectorLiveLocation = payload;
    post.locationSharingEnabled = true;
    await post.save();

    return sendSuccess(
      res,
      "Live location updated",
      {
        location: {
          pickup: { lat: post.pickupLat, lng: post.pickupLng },
          ownerLiveLocation: post.ownerLiveLocation,
          collectorLiveLocation: post.collectorLiveLocation,
        },
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

const getLiveLocation = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await FoodSharePost.findById(postId);
    if (!post) return sendError(res, "Post not found", 404);
    if (!post.singleCollectorOnly) return sendError(res, "Live location is enabled only for free one-person share posts", 400);

    const { isAllowed } = isLocationParticipant(post, req.user._id);
    if (!isAllowed) return sendError(res, "Not authorized to view live location for this post", 403);

    return sendSuccess(
      res,
      "Live location fetched",
      {
        location: {
          pickup: { lat: post.pickupLat, lng: post.pickupLng },
          ownerLiveLocation: post.ownerLiveLocation,
          collectorLiveLocation: post.collectorLiveLocation,
          locationSharingEnabled: post.locationSharingEnabled,
        },
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFoodPost,
  getAvailableFoodPosts,
  getFoodPostById,
  claimFoodPost,
  cancelClaim,
  verifyPickupCode,
  markFoodStatus,
  reportFoodPost,
  getMyFoodShareHistory,
  joinFoodPost,
  markFoodCollected,
  updateMyLiveLocation,
  getLiveLocation,
};
