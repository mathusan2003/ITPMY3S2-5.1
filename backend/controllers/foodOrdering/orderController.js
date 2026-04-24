const Cart = require("../../models/Cart");
const Order = require("../../models/Order");
const FoodItem = require("../../models/FoodItem");
const User = require("../../models/User");
const { sendSuccess, sendError } = require("../../utils/apiResponse");
const { getCanteenLabelByKey } = require("../../constants/canteens");
const { sendSMS, buildOrderSMS, buildOrderStatusSMS } = require("../../services/smsService");

const generateOrderCode = async () => {
  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(10000 + Math.random() * 90000));
    const exists = await Order.findOne({ orderCode: code });
    if (!exists) return code;
  }
  return String(Date.now()).slice(-6);
};

const checkout = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.foodItem",
      "name price canteen isAvailable"
    );
    if (!cart || cart.items.length === 0) {
      return sendError(res, "Cart is empty", 400);
    }

    cart.items = cart.items.filter((item) => item.foodItem != null);
    if (cart.items.length === 0) {
      return sendError(res, "Cart is empty", 400);
    }

    const unavailableItem = cart.items.find((item) => !item.foodItem.isAvailable);
    if (unavailableItem) {
      return sendError(res, "Some items in cart are unavailable", 400);
    }

    const canteen = cart.items[0].foodItem.canteen;
    const mixedCanteen = cart.items.some((item) => item.foodItem.canteen !== canteen);
    if (mixedCanteen) {
      return sendError(res, "Please order items from one canteen at a time", 400);
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAddTime * item.quantity, 0);
    const deliveryFee = subtotal > 200 ? 0 : 20;
    const totalAmount = subtotal + deliveryFee;

    return sendSuccess(
      res,
      "Checkout details fetched",
      { cart, canteen, subtotal, deliveryFee, totalAmount },
      200
    );
  } catch (error) {
    next(error);
  }
};

const placeOrder = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.foodItem",
      "name price canteen isAvailable"
    );
    if (!cart || cart.items.length === 0) {
      return sendError(res, "Cart is empty", 400);
    }

    cart.items = cart.items.filter((item) => item.foodItem != null);
    if (cart.items.length === 0) {
      return sendError(res, "Cart is empty", 400);
    }

    const unavailableItem = cart.items.find((item) => !item.foodItem.isAvailable);
    if (unavailableItem) {
      return sendError(res, "Some items in cart are unavailable", 400);
    }

    const canteen = cart.items[0].foodItem.canteen;
    const mixedCanteen = cart.items.some((item) => item.foodItem.canteen !== canteen);
    if (mixedCanteen) {
      return sendError(res, "Please order items from one canteen at a time", 400);
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAddTime * item.quantity, 0);
    const deliveryFee = subtotal > 200 ? 0 : 20;
    const totalAmount = subtotal + deliveryFee;

    const orderItems = cart.items.map((item) => ({
      foodItem: item.foodItem._id,
      name: item.foodItem.name,
      quantity: item.quantity,
      unitPrice: item.priceAtAddTime,
      lineTotal: item.priceAtAddTime * item.quantity,
    }));

    const paymentMethod = req.body.paymentMethod === "wallet" ? "wallet" : "cash";

    const orderCode = await generateOrderCode();

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      canteen,
      subtotal,
      deliveryFee,
      totalAmount,
      orderCode,
      paymentMethod,
      paymentStatus: "pending",
      status: "placed",
      statusHistory: [{ status: "placed", note: "Order placed successfully" }],
    });

    cart.items = [];
    await cart.save();

    let smsSent = false;
    let smsError = null;
    const smsPhone = req.body.smsPhone || null;
    const student = await User.findById(req.user._id).select("phone");
    const phoneToUse = smsPhone || student?.phone;

    if (smsPhone && smsPhone !== student?.phone) {
      student.phone = smsPhone;
      await student.save();
    }

    if (phoneToUse) {
      console.log(`[Order ${order.orderCode}] Sending SMS to: ${phoneToUse}`);
      const smsMessage = buildOrderSMS(order);
      const smsResult = await sendSMS(phoneToUse, smsMessage);
      smsSent = smsResult.success;
      if (!smsResult.success) {
        smsError = smsResult.error;
        console.error(`[Order ${order.orderCode}] SMS failed:`, smsError);
      } else {
        console.log(`[Order ${order.orderCode}] SMS sent successfully`);
      }
    } else {
      smsError = "No phone number provided";
      console.warn(`[Order ${order.orderCode}] No phone number — SMS skipped`);
    }

    return sendSuccess(res, "Order placed successfully", { order, smsSent, smsError }, 201);
  } catch (error) {
    next(error);
  }
};

const getOrderHistory = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return sendSuccess(res, "Order history fetched", { orders }, 200);
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate("user", "name email phone department studyYear semester")
      .populate("items.foodItem", "name imageUrl description price canteen");

    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    const orderUserId = order.user?._id || order.user;
    const isOwner = orderUserId && String(orderUserId) === String(req.user._id);
    const canManage = ["admin", "vendor"].includes(req.user.role);

    if (!isOwner && !canManage) {
      return sendError(res, "You cannot view this order", 403);
    }

    if (!isOwner && req.user.role === "admin" && req.user.canteenKey) {
      const label = getCanteenLabelByKey(req.user.canteenKey);
      if (order.canteen !== label) {
        return sendError(res, "You cannot view this order", 403);
      }
    }

    if (!isOwner && req.user.role === "vendor") {
      const menuItems = await FoodItem.find({ createdBy: req.user._id }, "canteen");
      const canteens = new Set(menuItems.map((i) => i.canteen));
      if (!canteens.has(order.canteen)) {
        return sendError(res, "You cannot view this order", 403);
      }
    }

    return sendSuccess(res, "Order fetched successfully", { order }, 200);
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, note = "" } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    if (req.user.role === "admin" && req.user.canteenKey) {
      const label = getCanteenLabelByKey(req.user.canteenKey);
      if (order.canteen !== label) {
        return sendError(res, "You cannot manage this order", 403);
      }
    }

    if (req.user.role === "vendor") {
      const menuItems = await FoodItem.find({ createdBy: req.user._id }, "canteen");
      const canteens = new Set(menuItems.map((item) => item.canteen));
      if (!canteens.has(order.canteen)) {
        return sendError(res, "You cannot manage this order", 403);
      }
    }

    order.status = status;
    order.statusHistory.push({ status, note });
    await order.save();

    let smsSent = false;
    let smsError = null;
    const orderUser = await User.findById(order.user).select("phone");
    const phoneToUse = orderUser?.phone;

    if (phoneToUse) {
      const smsMessage = buildOrderStatusSMS(order, status);
      const smsResult = await sendSMS(phoneToUse, smsMessage);
      smsSent = smsResult.success;
      if (!smsResult.success) {
        smsError = smsResult.error;
        console.error(`[Order ${order.orderCode}] Status SMS failed:`, smsError);
      }
    } else {
      smsError = "No phone number provided";
    }

    return sendSuccess(res, "Order status updated", { order, smsSent, smsError }, 200);
  } catch (error) {
    next(error);
  }
};

const verifyOrderCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const order = await Order.findOne({ orderCode: code })
      .populate("user", "name email phone department studyYear semester")
      .populate("items.foodItem", "name imageUrl price canteen");

    if (!order) {
      return sendError(res, "Invalid Order Code", 404);
    }

    return sendSuccess(res, "Order found", { order }, 200);
  } catch (error) {
    next(error);
  }
};

const markOrderDelivered = async (req, res, next) => {
  try {
    const { code } = req.params;
    const order = await Order.findOne({ orderCode: code });

    if (!order) {
      return sendError(res, "Invalid Order Code", 404);
    }

    if (order.status === "completed") {
      return sendError(res, "This order is already delivered", 400);
    }

    if (order.status === "cancelled") {
      return sendError(res, "Cannot deliver a cancelled order", 400);
    }

    order.status = "completed";
    order.statusHistory.push({ status: "completed", note: "Marked as delivered via order code verification" });
    await order.save();

    return sendSuccess(res, "Order marked as delivered", { order }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkout,
  placeOrder,
  getOrderHistory,
  getOrderById,
  updateOrderStatus,
  verifyOrderCode,
  markOrderDelivered,
};
