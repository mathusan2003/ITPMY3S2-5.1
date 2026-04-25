import api from "../../../services/api";

export const fetchWallet = async () => {
  const response = await api.get("/wallet");
  return response.data.data.wallet;
};

export const topUpWallet = async (amount) => {
  const response = await api.post("/wallet/topup", { amount });
  return response.data.data.wallet;
};

export const payOrderFromWallet = async (orderId) => {
  const response = await api.post("/wallet/pay-order", { orderId });
  return response.data.data;
};

export const payOrderFromWalletWithPoints = async (orderId, { useRewardPoints = 0 } = {}) => {
  const response = await api.post("/wallet/pay-order", { orderId, useRewardPoints });
  return response.data.data;
};

export const fetchWalletTransactions = async () => {
  const response = await api.get("/wallet/transactions");
  return response.data.data.transactions;
};

export const lookupTransferRecipient = async (identifier) => {
  const response = await api.get("/wallet/transfer/lookup", { params: { identifier } });
  return response.data.data.receiver;
};

export const initiateWalletTransfer = async (payload) => {
  const response = await api.post("/wallet/transfer", payload);
  return response.data.data;
};

export const confirmWalletTransferOtp = async ({ transferId, otp }) => {
  const response = await api.post("/wallet/transfer/confirm-otp", { transferId, otp });
  return response.data.data;
};

export const fetchTransferHistory = async (filters = {}) => {
  const response = await api.get("/wallet/transfers", { params: filters });
  return response.data.data.transfers;
};

export const fetchWalletNotifications = async () => {
  const response = await api.get("/wallet/notifications");
  return response.data.data.notifications;
};

export const markWalletNotificationRead = async (notificationId) => {
  const response = await api.patch(`/wallet/notifications/${notificationId}/read`);
  return response.data.data.notification;
};

export const fetchMonthlySpendingSummary = async () => {
  const response = await api.get("/wallet/monthly-summary");
  return response.data.data.monthly;
};

export const fetchMonthlyFoodBudget = async () => {
  const response = await api.get("/wallet/budget");
  return response.data.data;
};

export const setMonthlyFoodBudget = async (amount) => {
  const response = await api.put("/wallet/budget", { amount });
  return response.data.data;
};

export const fetchDailySpendingSummary = async () => {
  const response = await api.get("/wallet/daily-spending");
  return response.data.data.daily;
};

export const fetchRewardPointsTransactions = async () => {
  const response = await api.get("/wallet/reward-points");
  return response.data.data.transactions;
};

export const fetchEmergencyRequests = async () => {
  const response = await api.get("/wallet/emergency-requests/me");
  return response.data.data.requests;
};

export const requestEmergencyWallet = async (amount, note = "") => {
  const response = await api.post("/wallet/emergency-request", { amount, note });
  return response.data.data;
};

export const refundCancelledOrder = async (orderId) => {
  const response = await api.post("/wallet/refund-order", { orderId });
  return response.data.data;
};

export const fetchWalletTransactionsFiltered = async (filters = {}) => {
  const response = await api.get("/wallet/transactions", { params: filters });
  return response.data.data.transactions;
};
