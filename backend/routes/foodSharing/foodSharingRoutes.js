const express = require("express");
const { protect } = require("../../middleware/authMiddleware");
const { validateFoodPostCreate, validateLiveLocationUpdate } = require("../../validations/foodSharingValidation");
const {
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
} = require("../../controllers/foodSharing/foodSharingController");

const router = express.Router();

router.post("/", protect, validateFoodPostCreate, createFoodPost);
router.get("/", protect, getAvailableFoodPosts);
router.get("/history/me", protect, getMyFoodShareHistory);
router.get("/:postId", protect, getFoodPostById);

// Claim system
router.post("/:postId/claim", protect, claimFoodPost);
router.patch("/:postId/cancel-claim", protect, cancelClaim);
router.post("/:postId/verify-pickup", protect, verifyPickupCode);

// Status management
router.patch("/:postId/status", protect, markFoodStatus);
router.patch("/:postId/collect", protect, markFoodCollected);

// Reporting
router.post("/:postId/report", protect, reportFoodPost);
router.get("/:postId/live-location", protect, getLiveLocation);
router.patch("/:postId/live-location", protect, validateLiveLocationUpdate, updateMyLiveLocation);

// Backward compatibility
router.post("/:postId/join", protect, joinFoodPost);

module.exports = router;
