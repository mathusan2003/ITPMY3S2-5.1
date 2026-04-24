const Cart = require("../../models/Cart");
const FoodItem = require("../../models/FoodItem");
const { sendSuccess, sendError } = require("../../utils/apiResponse");

const calculateCartSummary = (items) => {
  const subtotal = items.reduce((sum, item) => sum + item.priceAtAddTime * item.quantity, 0);
  return { subtotal };
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate("items.foodItem", "name price imageUrl canteen");
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await Cart.findById(cart._id).populate("items.foodItem", "name price imageUrl canteen");
  }
  return cart;
};

const getMyCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);

    const staleCount = cart.items.filter((item) => item.foodItem == null).length;
    if (staleCount > 0) {
      cart.items = cart.items.filter((item) => item.foodItem != null);
      await cart.save();
    }

    const summary = calculateCartSummary(cart.items);
    return sendSuccess(res, "Cart fetched successfully", { cart, summary }, 200);
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const { foodItemId, quantity } = req.body;
    const qty = Number(quantity);

    const foodItem = await FoodItem.findById(foodItemId);
    if (!foodItem || !foodItem.isAvailable) {
      return sendError(res, "Food item not available", 404);
    }

    const cart = await getOrCreateCart(req.user._id);

    // Remove stale items whose foodItem reference no longer exists
    cart.items = cart.items.filter((item) => item.foodItem != null);

    const existingItem = cart.items.find(
      (item) => item.foodItem && String(item.foodItem._id) === String(foodItemId)
    );

    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.items.push({
        foodItem: foodItem._id,
        quantity: qty,
        priceAtAddTime: foodItem.price,
      });
    }

    await cart.save();
    const updatedCart = await Cart.findById(cart._id).populate("items.foodItem", "name price imageUrl canteen");

    return sendSuccess(
      res,
      "Item added to cart",
      { cart: updatedCart, summary: calculateCartSummary(updatedCart.items) },
      200
    );
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const qty = Number(quantity);

    const cart = await getOrCreateCart(req.user._id);
    cart.items = cart.items.filter((item) => item.foodItem != null);
    const existingItem = cart.items.find(
      (item) => item.foodItem && String(item.foodItem._id) === String(itemId)
    );

    if (!existingItem) {
      return sendError(res, "Cart item not found", 404);
    }

    existingItem.quantity = qty;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.foodItem", "name price imageUrl canteen");
    return sendSuccess(
      res,
      "Cart updated successfully",
      { cart: updatedCart, summary: calculateCartSummary(updatedCart.items) },
      200
    );
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const cart = await getOrCreateCart(req.user._id);

    cart.items = cart.items.filter(
      (item) => item.foodItem != null && String(item.foodItem._id) !== String(itemId)
    );
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.foodItem", "name price imageUrl canteen");
    return sendSuccess(
      res,
      "Item removed from cart",
      { cart: updatedCart, summary: calculateCartSummary(updatedCart.items) },
      200
    );
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    return sendSuccess(res, "Cart cleared", { cart, summary: { subtotal: 0 } }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
