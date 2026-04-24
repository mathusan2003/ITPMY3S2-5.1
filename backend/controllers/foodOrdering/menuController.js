const FoodCategory = require("../../models/FoodCategory");
const FoodItem = require("../../models/FoodItem");
const { sendSuccess, sendError } = require("../../utils/apiResponse");

const getCategories = async (req, res, next) => {
  try {
    const categories = await FoodCategory.find({ isActive: true }).sort({ name: 1 });
    return sendSuccess(res, "Categories fetched successfully", { categories }, 200);
  } catch (error) {
    next(error);
  }
};

const getMenu = async (req, res, next) => {
  try {
    const { search = "", category = "", canteen = "" } = req.query;

    const query = { isAvailable: true };
    if (category) query.category = category;
    if (canteen) query.canteen = canteen;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const items = await FoodItem.find(query).populate("category", "name").sort({ createdAt: -1 });

    return sendSuccess(res, "Menu fetched successfully", { items }, 200);
  } catch (error) {
    next(error);
  }
};

const getFoodItemById = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const item = await FoodItem.findById(itemId).populate("category", "name");

    if (!item) {
      return sendError(res, "Food item not found", 404);
    }

    return sendSuccess(res, "Food item fetched successfully", { item }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getMenu,
  getFoodItemById,
};
