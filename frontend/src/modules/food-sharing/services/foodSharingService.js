import api from "../../../services/api";

export const createFoodSharePost = async (payload) => {
  const response = await api.post("/food-sharing", payload);
  return response.data.data.post;
};

export const fetchAvailableFoodPosts = async () => {
  const response = await api.get("/food-sharing");
  return response.data.data.posts;
};

export const fetchFoodPostById = async (postId) => {
  const response = await api.get(`/food-sharing/${postId}`);
  return response.data.data.post;
};

export const joinFoodPost = async (postId) => {
  const response = await api.post(`/food-sharing/${postId}/join`);
  return response.data.data.post;
};

export const claimFoodPost = async (postId, portions = 1) => {
  const response = await api.post(`/food-sharing/${postId}/claim`, { portions });
  return response.data.data;
};

export const cancelFoodClaim = async (postId) => {
  const response = await api.patch(`/food-sharing/${postId}/cancel-claim`);
  return response.data.data.post;
};

export const verifyPickupCode = async (postId, pickupCode) => {
  const response = await api.post(`/food-sharing/${postId}/verify-pickup`, { pickupCode });
  return response.data.data.post;
};

export const updateFoodPostStatus = async (postId, status) => {
  const response = await api.patch(`/food-sharing/${postId}/status`, { status });
  return response.data.data.post;
};

export const markFoodCollected = async (postId) => {
  const response = await api.patch(`/food-sharing/${postId}/collect`);
  return response.data.data.post;
};

export const reportFoodPost = async (postId, reason) => {
  const response = await api.post(`/food-sharing/${postId}/report`, { reason });
  return response.data;
};

export const fetchMyFoodShareHistory = async () => {
  const response = await api.get("/food-sharing/history/me");
  return response.data.data;
};

export const fetchFoodShareLiveLocation = async (postId) => {
  const response = await api.get(`/food-sharing/${postId}/live-location`);
  return response.data.data.location;
};

export const updateFoodShareLiveLocation = async (postId, { lat, lng }) => {
  const response = await api.patch(`/food-sharing/${postId}/live-location`, { lat, lng });
  return response.data.data.location;
};
