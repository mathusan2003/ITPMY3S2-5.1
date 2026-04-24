const FoodItem = require("../../models/FoodItem");
const Review = require("../../models/Review");
const { sendSuccess, sendError } = require("../../utils/apiResponse");

const refreshFoodItemRating = async (foodItemId) => {
  const reviews = await Review.find({ foodItem: foodItemId });
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0;

  await FoodItem.findByIdAndUpdate(foodItemId, {
    averageRating: Number(averageRating.toFixed(1)),
    totalReviews,
  });
};

const addOrUpdateReview = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { rating, comment = "" } = req.body;

    const item = await FoodItem.findById(itemId);
    if (!item) {
      return sendError(res, "Food item not found", 404);
    }

    const review = await Review.findOneAndUpdate(
      { user: req.user._id, foodItem: itemId },
      { rating: Number(rating), comment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await refreshFoodItemRating(itemId);

    return sendSuccess(res, "Review submitted successfully", { review }, 200);
  } catch (error) {
    next(error);
  }
};

const getFoodItemReviews = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const reviews = await Review.find({ foodItem: itemId })
      .populate("user", "name role")
      .sort({ createdAt: -1 });

    return sendSuccess(res, "Reviews fetched successfully", { reviews }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addOrUpdateReview,
  getFoodItemReviews,
};
