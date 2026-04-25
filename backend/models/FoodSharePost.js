const mongoose = require("mongoose");
const crypto = require("crypto");

const claimSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    portions: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "completed"],
      default: "active",
    },
    pickupCode: {
      type: String,
      default: () => crypto.randomInt(100000, 999999).toString(),
    },
    handoverConfirmed: {
      type: Boolean,
      default: false,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const waitlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    portions: {
      type: Number,
      default: 1,
      min: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Keep old joinSchema for backward compatibility
const joinSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const foodSharePostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    shareType: {
      type: String,
      enum: ["free_food", "paid_food", "shared_cost"],
      default: "free_food",
    },

    // Pickup coordination
    pickupLocation: {
      type: String,
      required: true,
      trim: true,
    },
    pickupLat: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },
    pickupLng: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
    pickupInstructions: {
      type: String,
      default: "",
      trim: true,
    },
    pickupTimeStart: {
      type: Date,
      default: null,
    },
    pickupTimeEnd: {
      type: Date,
      default: null,
    },

    // Portion control
    totalPortions: {
      type: Number,
      required: true,
      min: 1,
    },
    maxMembers: {
      type: Number,
      required: true,
      min: 1,
    },
    singleCollectorOnly: {
      type: Boolean,
      default: false,
      index: true,
    },
    activeCollector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Expiry / availability
    expiryTime: {
      type: Date,
      required: true,
    },

    // Food condition / safety
    foodType: {
      type: String,
      enum: ["veg", "non-veg", "vegan"],
      default: "veg",
    },
    foodSource: {
      type: String,
      enum: ["homemade", "packed", "unopened", "restaurant"],
      default: "packed",
    },
    preparedTime: {
      type: Date,
      default: null,
    },
    consumeBefore: {
      type: Date,
      default: null,
    },
    allergenTags: {
      type: [String],
      default: [],
    },
    spicyLevel: {
      type: String,
      enum: ["none", "mild", "medium", "hot", "extra-hot"],
      default: "none",
    },

    // Status
    status: {
      type: String,
      enum: ["available", "resolved", "expired", "collected", "removed"],
      default: "available",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },

    // Claims (replaces simple joins)
    claims: {
      type: [claimSchema],
      default: [],
    },
    waitlist: {
      type: [waitlistSchema],
      default: [],
    },

    // Legacy joins kept for backward compat
    joins: {
      type: [joinSchema],
      default: [],
    },

    // Reports / moderation
    reports: {
      type: [reportSchema],
      default: [],
    },
    moderationNote: {
      type: String,
      default: "",
      trim: true,
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Safety disclaimer acknowledged by poster
    safetyDisclaimer: {
      type: Boolean,
      default: false,
    },

    // Live location sharing between owner and collector
    locationSharingEnabled: {
      type: Boolean,
      default: false,
    },
    ownerLiveLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    collectorLiveLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FoodSharePost", foodSharePostSchema);
