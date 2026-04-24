const User = require("../../models/User");
const Order = require("../../models/Order");
const Complaint = require("../../models/Complaint");
const FoodSharePost = require("../../models/FoodSharePost");
const WalletTransaction = require("../../models/WalletTransaction");
const FoodItem = require("../../models/FoodItem");
const StudyGroup = require("../../models/StudyGroup");
const { sendSuccess, sendError } = require("../../utils/apiResponse");
const { getCanteenLabelByKey } = require("../../constants/canteens");

const MAX_DESCRIPTION_WORDS = 15;
const countWords = (value = "") =>
  String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const canteenLabelForUser = (req) =>
  req.user.canteenKey ? getCanteenLabelByKey(req.user.canteenKey) : null;

const getAdminDashboardStats = async (req, res, next) => {
  try {
    const label = canteenLabelForUser(req);
    if (label) {
      const [menuItems, totalOrders, revenueAgg] = await Promise.all([
        FoodItem.countDocuments({ canteen: label, createdBy: req.user._id }),
        Order.countDocuments({ canteen: label }),
        Order.aggregate([
          {
            $match: {
              canteen: label,
              status: { $in: ["completed", "ready", "preparing", "accepted", "placed"] },
            },
          },
          { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
        ]),
      ]);

      return sendSuccess(
        res,
        "Admin dashboard stats fetched",
        {
          stats: {
            scope: "canteen",
            canteenLabel: label,
            menuItems,
            totalOrders,
            totalRevenue: revenueAgg[0]?.revenue || 0,
          },
        },
        200
      );
    }

    const [totalUsers, totalOrders, openComplaints, sharedFoodPosts] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Complaint.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      FoodSharePost.countDocuments({ status: "available" }),
    ]);

    return sendSuccess(
      res,
      "Admin dashboard stats fetched",
      {
        stats: {
          scope: "platform",
          totalUsers,
          totalOrders,
          openComplaints,
          sharedFoodPosts,
        },
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    return sendSuccess(res, "Users fetched", { users }, 200);
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const user = await User.findById(userId);
    if (!user) return sendError(res, "User not found", 404);

    user.isActive = Boolean(isActive);
    await user.save();
    return sendSuccess(res, "User status updated", { user }, 200);
  } catch (error) {
    next(error);
  }
};

const collectUserActivity = async (userId) => {
  const [orders, walletTransactions, complaints, foodPosts, createdGroups, joinedGroups] = await Promise.all([
    Order.find({ user: userId }).select("status totalAmount createdAt orderCode").sort({ createdAt: -1 }).limit(5).lean(),
    WalletTransaction.find({ user: userId }).select("type amount description createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    Complaint.find({ user: userId }).select("title status createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    FoodSharePost.find({ user: userId }).select("title status createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    StudyGroup.find({ createdBy: userId }).select("name subject createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    StudyGroup.find({ "members.user": userId }).select("name subject createdAt").sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const activities = [];

  orders.forEach((order) => {
    activities.push({
      type: "order",
      title: `Order ${order.orderCode || ""}`.trim(),
      meta: `Status: ${order.status} · Rs. ${order.totalAmount}`,
      createdAt: order.createdAt,
    });
  });

  walletTransactions.forEach((tx) => {
    activities.push({
      type: "wallet",
      title: `Wallet ${tx.type}`,
      meta: `Rs. ${tx.amount}${tx.description ? ` · ${tx.description}` : ""}`,
      createdAt: tx.createdAt,
    });
  });

  complaints.forEach((complaint) => {
    activities.push({
      type: "complaint",
      title: complaint.title,
      meta: `Complaint: ${complaint.status}`,
      createdAt: complaint.createdAt,
    });
  });

  foodPosts.forEach((post) => {
    activities.push({
      type: "food_share",
      title: post.title,
      meta: `Food share post: ${post.status}`,
      createdAt: post.createdAt,
    });
  });

  createdGroups.forEach((group) => {
    activities.push({
      type: "group_study",
      title: group.name,
      meta: `Created group · ${group.subject}`,
      createdAt: group.createdAt,
    });
  });

  joinedGroups.forEach((group) => {
    activities.push({
      type: "group_study",
      title: group.name,
      meta: `Joined group · ${group.subject}`,
      createdAt: group.createdAt,
    });
  });

  activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    counts: {
      orders: orders.length,
      walletTransactions: walletTransactions.length,
      complaints: complaints.length,
      foodSharePosts: foodPosts.length,
      createdGroups: createdGroups.length,
      joinedGroups: joinedGroups.length,
    },
    lastActivityAt: activities[0]?.createdAt || null,
    recentActivities: activities.slice(0, 10),
  };
};

const getUserActivityOverview = async (req, res, next) => {
  try {
    const { q = "", status = "all", role = "all" } = req.query;
    const query = {};

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    if (role !== "all") {
      query.role = role;
    }

    if (status !== "all") {
      query.accountStatus = status;
    }

    const users = await User.find(query)
      .select("name email role isActive accountStatus statusReason suspendedUntil createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const usersWithActivity = await Promise.all(
      users.map(async (user) => {
        const activity = await collectUserActivity(user._id);
        return {
          ...user,
          activityCounts: activity.counts,
          lastActivityAt: activity.lastActivityAt,
          recentActivities: activity.recentActivities.slice(0, 3),
        };
      })
    );

    return sendSuccess(res, "User activity fetched", { users: usersWithActivity }, 200);
  } catch (error) {
    next(error);
  }
};

const getUserActivityDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select(
      "name email role isActive accountStatus statusReason suspendedUntil createdAt"
    );
    if (!user) return sendError(res, "User not found", 404);

    const activity = await collectUserActivity(userId);

    return sendSuccess(
      res,
      "User activity details fetched",
      {
        user,
        activityCounts: activity.counts,
        lastActivityAt: activity.lastActivityAt,
        recentActivities: activity.recentActivities,
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

const updateUserAccountStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, reason = "", suspendedUntil = null } = req.body;
    const allowedStatuses = ["active", "suspended", "blocked"];

    if (!allowedStatuses.includes(status)) {
      return sendError(res, "Invalid status value", 400);
    }

    const user = await User.findById(userId);
    if (!user) return sendError(res, "User not found", 404);
    if (String(user._id) === String(req.user._id)) {
      return sendError(res, "You cannot change your own account status", 400);
    }

    user.accountStatus = status;
    user.statusReason = reason;
    user.isActive = status === "active";

    if (status === "suspended") {
      user.suspendedUntil = suspendedUntil ? new Date(suspendedUntil) : null;
    } else {
      user.suspendedUntil = null;
    }

    await user.save();

    return sendSuccess(res, "User account status updated", { user }, 200);
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const label = canteenLabelForUser(req);
    const query = label ? { canteen: label } : {};
    const orders = await Order.find(query)
      .populate("user", "name email phone department studyYear semester")
      .sort({ createdAt: -1 });
    return sendSuccess(res, "Orders fetched", { orders }, 200);
  } catch (error) {
    next(error);
  }
};

const getCanteenMenu = async (req, res, next) => {
  try {
    const label = canteenLabelForUser(req);
    if (!label) return sendError(res, "Canteen context missing", 400);

    const items = await FoodItem.find({ canteen: label, createdBy: req.user._id })
      .populate("category", "name")
      .sort({ createdAt: -1 });
    return sendSuccess(res, "Canteen menu fetched", { items }, 200);
  } catch (error) {
    next(error);
  }
};

const createCanteenMenuItem = async (req, res, next) => {
  try {
    const label = canteenLabelForUser(req);
    if (!label) return sendError(res, "Canteen context missing", 400);

    const { name, description = "", price, imageUrl = "", category } = req.body;
    if (!name || price === undefined || price === "" || !category) {
      return sendError(res, "name, price and category are required", 400);
    }
    if (countWords(description) > MAX_DESCRIPTION_WORDS) {
      return sendError(res, `Description must be ${MAX_DESCRIPTION_WORDS} words or less`, 400);
    }

    const item = await FoodItem.create({
      name,
      description,
      price: Number(price),
      imageUrl,
      canteen: label,
      category,
      createdBy: req.user._id,
      isAvailable: true,
    });

    return sendSuccess(res, "Menu item created", { item }, 201);
  } catch (error) {
    next(error);
  }
};

const updateCanteenMenuItem = async (req, res, next) => {
  try {
    const label = canteenLabelForUser(req);
    if (!label) return sendError(res, "Canteen context missing", 400);

    const { itemId } = req.params;
    const item = await FoodItem.findById(itemId);
    if (!item) return sendError(res, "Menu item not found", 404);
    if (item.canteen !== label || String(item.createdBy) !== String(req.user._id)) {
      return sendError(res, "Not allowed", 403);
    }

    const { name, description, price, imageUrl, category, isAvailable } = req.body;
    if (name !== undefined) item.name = name;
    if (description !== undefined) {
      if (countWords(description) > MAX_DESCRIPTION_WORDS) {
        return sendError(res, `Description must be ${MAX_DESCRIPTION_WORDS} words or less`, 400);
      }
      item.description = description;
    }
    if (price !== undefined) item.price = Number(price);
    if (imageUrl !== undefined) item.imageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
    if (category !== undefined) item.category = category;
    if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
    await item.save();

    return sendSuccess(res, "Menu item updated", { item }, 200);
  } catch (error) {
    next(error);
  }
};

const deleteCanteenMenuItem = async (req, res, next) => {
  try {
    const label = canteenLabelForUser(req);
    if (!label) return sendError(res, "Canteen context missing", 400);

    const { itemId } = req.params;
    const item = await FoodItem.findById(itemId);
    if (!item) return sendError(res, "Menu item not found", 404);
    if (item.canteen !== label || String(item.createdBy) !== String(req.user._id)) {
      return sendError(res, "Not allowed", 403);
    }

    await FoodItem.findByIdAndDelete(itemId);
    return sendSuccess(res, "Menu item deleted", null, 200);
  } catch (error) {
    next(error);
  }
};

const getWalletReports = async (req, res, next) => {
  try {
    const totals = await WalletTransaction.aggregate([
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);
    return sendSuccess(res, "Wallet reports fetched", { totals }, 200);
  } catch (error) {
    next(error);
  }
};

const getComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    return sendSuccess(res, "Complaints fetched", { complaints }, 200);
  } catch (error) {
    next(error);
  }
};

const getFoodSharingPosts = async (req, res, next) => {
  try {
    const posts = await FoodSharePost.find({})
      .populate("user", "name email phone")
      .populate("claims.user", "name email phone")
      .populate("reports.user", "name email")
      .sort({ createdAt: -1 });
    return sendSuccess(res, "Food sharing posts fetched", { posts }, 200);
  } catch (error) {
    next(error);
  }
};

const moderateFoodSharingPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { status, moderationNote } = req.body;
    const allowed = ["available", "resolved", "expired", "collected", "removed"];
    if (!allowed.includes(status)) return sendError(res, "Invalid status", 400);

    const post = await FoodSharePost.findById(postId);
    if (!post) return sendError(res, "Post not found", 404);

    post.status = status;
    if (moderationNote) post.moderationNote = moderationNote;
    if (status === "removed") post.removedBy = req.user._id;
    await post.save();

    return sendSuccess(res, "Food sharing post moderated", { post }, 200);
  } catch (error) {
    next(error);
  }
};

const getReportedFoodPosts = async (req, res, next) => {
  try {
    const posts = await FoodSharePost.find({ "reports.0": { $exists: true } })
      .populate("user", "name email phone")
      .populate("reports.user", "name email")
      .populate("claims.user", "name email phone")
      .sort({ "reports.length": -1, createdAt: -1 });
    return sendSuccess(res, "Reported food posts fetched", { posts }, 200);
  } catch (error) {
    next(error);
  }
};

const removeFoodPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { moderationNote } = req.body;
    const post = await FoodSharePost.findById(postId);
    if (!post) return sendError(res, "Post not found", 404);

    post.status = "removed";
    post.removedBy = req.user._id;
    if (moderationNote) post.moderationNote = moderationNote;
    post.claims.forEach((c) => { if (c.status === "active") c.status = "cancelled"; });
    await post.save();

    return sendSuccess(res, "Food post removed", { post }, 200);
  } catch (error) {
    next(error);
  }
};

const getGroupStudyFeedback = async (req, res, next) => {
  try {
    const groups = await StudyGroup.find({ "feedbacks.0": { $exists: true } })
      .select("name subject createdBy feedbacks")
      .populate("createdBy", "name email")
      .populate("feedbacks.user", "name email")
      .sort({ updatedAt: -1 });

    return sendSuccess(res, "Group feedback fetched", { groups }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboardStats,
  getUsers,
  updateUserStatus,
  getUserActivityOverview,
  getUserActivityDetails,
  updateUserAccountStatus,
  getOrders,
  getCanteenMenu,
  createCanteenMenuItem,
  updateCanteenMenuItem,
  deleteCanteenMenuItem,
  getWalletReports,
  getComplaints,
  getFoodSharingPosts,
  moderateFoodSharingPost,
  getReportedFoodPosts,
  removeFoodPost,
  getGroupStudyFeedback,
};
