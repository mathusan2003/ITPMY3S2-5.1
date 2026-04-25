const { sendError } = require("../utils/apiResponse");

const validateFoodPostCreate = (req, res, next) => {
  const { title, pickupLocation, maxMembers, quantity, totalPortions, availableUntil, expiryTime, shareType, pickupLat, pickupLng } = req.body;
  const portions = Number(totalPortions || maxMembers || quantity);
  const endTime = availableUntil || expiryTime;

  if (!title || !pickupLocation || !portions || !endTime) {
    return sendError(res, "title, pickupLocation, portions/maxMembers and availableUntil are required", 400);
  }
  if (portions < 1) {
    return sendError(res, "Portions must be at least 1", 400);
  }
  if (new Date(endTime).getTime() <= Date.now()) {
    return sendError(res, "availableUntil must be in the future", 400);
  }
  const allowedTypes = ["free_food", "paid_food", "shared_cost"];
  if (shareType && !allowedTypes.includes(shareType)) {
    return sendError(res, "Invalid shareType", 400);
  }
  if (pickupLat !== undefined) {
    const lat = Number(pickupLat);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return sendError(res, "pickupLat must be between -90 and 90", 400);
    }
  }
  if (pickupLng !== undefined) {
    const lng = Number(pickupLng);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return sendError(res, "pickupLng must be between -180 and 180", 400);
    }
  }
  next();
};

const validateLiveLocationUpdate = (req, res, next) => {
  const { lat, lng } = req.body;
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || nLat < -90 || nLat > 90) {
    return sendError(res, "lat must be between -90 and 90", 400);
  }
  if (!Number.isFinite(nLng) || nLng < -180 || nLng > 180) {
    return sendError(res, "lng must be between -180 and 180", 400);
  }
  next();
};

module.exports = { validateFoodPostCreate, validateLiveLocationUpdate };
