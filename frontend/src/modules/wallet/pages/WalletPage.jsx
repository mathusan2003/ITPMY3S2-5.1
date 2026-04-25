
import { useEffect, useMemo, useState } from "react";
import DailySpendingSummaryCard from "../components/DailySpendingSummaryCard";
import MonthlySpendingChart from "../components/MonthlySpendingChart";
import BudgetAlertsCard from "../components/BudgetAlertsCard";
import {
  fetchMonthlyFoodBudget,
  fetchMonthlySpendingSummary,
  fetchDailySpendingSummary,
  fetchRewardPointsTransactions,
  fetchWallet,
  topUpWallet,
  setMonthlyFoodBudget,
  fetchEmergencyRequests,
  requestEmergencyWallet,
  fetchWalletTransactionsFiltered,
  lookupTransferRecipient,
  initiateWalletTransfer,
  confirmWalletTransferOtp,
  fetchTransferHistory,
  fetchWalletNotifications,
  markWalletNotificationRead,
} from "../services/walletService";

const NAV_ITEMS = [
  { key: "overview", icon: "OV", label: "Overview" },
  { key: "spending", icon: "SP", label: "Spending Analytics" },
  { key: "budget", icon: "BD", label: "Monthly Budget" },
  { key: "rewards", icon: "RW", label: "Reward Points" },
  { key: "transactions", icon: "TX", label: "Transactions" },
  { key: "transfer", icon: "TR", label: "Wallet Transfer" },
  { key: "notifications", icon: "NF", label: "Notifications" },
  { key: "emergency", icon: "EM", label: "Emergency Request" },
];

const TRANSFER_MIN = 10;
const TRANSFER_MAX = 25000;
const TRANSFER_DAILY_LIMIT = 50000;
const OTP_THRESHOLD = 5000;

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const WalletPage = () => {
  const [wallet, setWallet] = useState({ balance: 0, rewardPoints: 0 });
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState({ monthlyFoodBudget: null, spentThisMonth: 0, remainingThisMonth: null });
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [topUpAmount, setTopUpAmount] = useState(100);
  const [error, setError] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [txFilters, setTxFilters] = useState({ type: "", from: "", to: "", minAmount: "", maxAmount: "", q: "" });
  const [rewardTxs, setRewardTxs] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [emergencyAmount, setEmergencyAmount] = useState(500);
  const [emergencyNote, setEmergencyNote] = useState("");
  const [activeNav, setActiveNav] = useState("overview");

  const [receiverLookupLoading, setReceiverLookupLoading] = useState(false);
  const [receiverLookupError, setReceiverLookupError] = useState("");
  const [receiverPreview, setReceiverPreview] = useState(null);
  const [transferForm, setTransferForm] = useState({
    receiverIdentifier: "",
    amount: "",
    note: "",
    password: "",
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [pendingOtpTransfer, setPendingOtpTransfer] = useState(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [transferReceipt, setTransferReceipt] = useState(null);

  const [transferHistory, setTransferHistory] = useState([]);
  const [transferHistoryLoading, setTransferHistoryLoading] = useState(false);
  const [transferFilters, setTransferFilters] = useState({ status: "", q: "" });

  const [walletNotifications, setWalletNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const unreadNotificationCount = useMemo(
    () => walletNotifications.filter((notification) => !notification.read).length,
    [walletNotifications]
  );

  const loadWalletData = async () => {
    try {
      const [walletData, txData, dailyData, monthlyData, rewardData, emergencyData] = await Promise.all([
        fetchWallet(),
        fetchWalletTransactionsFiltered({}),
        fetchDailySpendingSummary(),
        fetchMonthlySpendingSummary(),
        fetchRewardPointsTransactions(),
        fetchEmergencyRequests(),
      ]);
      const budgetData = await fetchMonthlyFoodBudget();
      setWallet(walletData);
      setTransactions(txData);
      setBudget(budgetData);
      setBudgetInput(
        budgetData.monthlyFoodBudget !== null && budgetData.monthlyFoodBudget !== undefined
          ? String(budgetData.monthlyFoodBudget)
          : ""
      );
      setDaily(dailyData);
      setMonthly(monthlyData);
      setRewardTxs(rewardData);
      setEmergencyRequests(emergencyData);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not load wallet");
    }
  };

  const loadTransferHistoryData = async (filters = transferFilters, silent = false) => {
    if (!silent) setTransferHistoryLoading(true);
    try {
      const transfers = await fetchTransferHistory({
        status: filters.status || undefined,
        q: filters.q || undefined,
      });
      setTransferHistory(transfers || []);
    } catch (apiError) {
      if (!silent) setError(apiError.response?.data?.message || "Could not load transfer history");
    } finally {
      if (!silent) setTransferHistoryLoading(false);
    }
  };

  const loadWalletNotificationsData = async (silent = false) => {
    if (!silent) setNotificationsLoading(true);
    try {
      const notifications = await fetchWalletNotifications();
      setWalletNotifications(notifications || []);
    } catch (apiError) {
      if (!silent) setError(apiError.response?.data?.message || "Could not load notifications");
    } finally {
      if (!silent) setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
    loadTransferHistoryData({ status: "", q: "" }, true);
    loadWalletNotificationsData(true);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadWalletNotificationsData(true);
    }, 20000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleTopUp = async () => {
    setError("");
    try {
      await topUpWallet(Number(topUpAmount));
      await loadWalletData();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Top up failed");
    }
  };

  const handleSetBudget = async () => {
    setError("");
    try {
      await setMonthlyFoodBudget(budgetInput === "" ? 0 : Number(budgetInput));
      await loadWalletData();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Setting budget failed");
    }
  };

  const handleApplyTxFilters = async () => {
    setError("");
    try {
      const filters = {
        type: txFilters.type || undefined,
        from: txFilters.from || undefined,
        to: txFilters.to || undefined,
        minAmount: txFilters.minAmount || undefined,
        maxAmount: txFilters.maxAmount || undefined,
        q: txFilters.q || undefined,
      };
      const txData = await fetchWalletTransactionsFiltered(filters);
      setTransactions(txData);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not apply filters");
    }
  };

  const handleEmergencyRequest = async () => {
    setError("");
    try {
      await requestEmergencyWallet(Number(emergencyAmount), emergencyNote);
      setEmergencyAmount(500);
      setEmergencyNote("");
      await loadWalletData();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Emergency request failed");
    }
  };

  const handleLookupRecipient = async () => {
    setReceiverLookupError("");
    setReceiverPreview(null);
    const identifier = String(transferForm.receiverIdentifier || "").trim();
    if (!identifier) {
      setReceiverLookupError("Enter student email or student ID.");
      return;
    }

    setReceiverLookupLoading(true);
    try {
      const receiver = await lookupTransferRecipient(identifier);
      setReceiverPreview(receiver);
    } catch (apiError) {
      setReceiverLookupError(apiError.response?.data?.message || "Receiver not found");
    } finally {
      setReceiverLookupLoading(false);
    }
  };

  const handleInitiateTransfer = async () => {
    setError("");
    setTransferReceipt(null);
    const amount = Number(transferForm.amount);
    if (!receiverPreview) {
      setError("Please verify receiver before transfer.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid transfer amount.");
      return;
    }

    setTransferSubmitting(true);
    try {
      const response = await initiateWalletTransfer({
        receiverIdentifier: transferForm.receiverIdentifier.trim(),
        amount,
        note: transferForm.note,
        password: transferForm.password,
      });

      if (response.requiresOtp) {
        setPendingOtpTransfer({
          transferId: response.transfer.id,
          referenceCode: response.transfer.referenceCode,
          amount: response.transfer.amount,
          receiver: response.transfer.receiver,
          expiresAt: response.transfer.expiresAt,
          devOtp: response.devOtp || null,
        });
        setOtpInput("");
      } else {
        setTransferReceipt(response.transfer);
        setPendingOtpTransfer(null);
        setTransferForm({ receiverIdentifier: "", amount: "", note: "", password: "" });
        setReceiverPreview(null);
      }

      await Promise.all([
        loadWalletData(),
        loadTransferHistoryData(transferFilters, true),
        loadWalletNotificationsData(true),
      ]);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Transfer failed");
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!pendingOtpTransfer) return;
    setError("");
    setOtpSubmitting(true);
    try {
      const response = await confirmWalletTransferOtp({
        transferId: pendingOtpTransfer.transferId,
        otp: otpInput,
      });
      setTransferReceipt(response.transfer);
      setPendingOtpTransfer(null);
      setOtpInput("");
      setTransferForm({ receiverIdentifier: "", amount: "", note: "", password: "" });
      setReceiverPreview(null);

      await Promise.all([
        loadWalletData(),
        loadTransferHistoryData(transferFilters, true),
        loadWalletNotificationsData(true),
      ]);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "OTP confirmation failed");
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleApplyTransferFilters = async () => {
    setError("");
    await loadTransferHistoryData(transferFilters);
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      const updated = await markWalletNotificationRead(notificationId);
      setWalletNotifications((previous) =>
        previous.map((notification) => (notification._id === updated._id ? updated : notification))
      );
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Could not update notification");
    }
  };

  const budgetPercent =
    budget.monthlyFoodBudget > 0
      ? Math.min(100, Math.round((budget.spentThisMonth / budget.monthlyFoodBudget) * 100))
      : 0;

  return (
    <div className="wl-layout">
      <aside className="wl-sidebar">
        <div className="wl-sidebar-header">
          <span className="wl-sidebar-logo">W</span>
          <h3 className="wl-sidebar-title">My Wallet</h3>
        </div>
        <nav className="wl-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`wl-nav-item ${activeNav === item.key ? "wl-nav-item--active" : ""}`}
              onClick={() => {
                setActiveNav(item.key);
                if (item.key === "transfer") loadTransferHistoryData(transferFilters, true);
                if (item.key === "notifications") loadWalletNotificationsData();
              }}
            >
              <span className="wl-nav-icon">{item.icon}</span>
              <span className="wl-nav-label">
                {item.label}
                {item.key === "notifications" && unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ""}
              </span>
            </button>
          ))}
        </nav>
        <div className="wl-sidebar-footer">
          <p className="wl-sidebar-balance">Rs. {wallet.balance}</p>
          <p className="wl-sidebar-balance-label">Available Balance</p>
        </div>
      </aside>

      <main className="wl-main">
        {error && <p className="wallet-error">{error}</p>}

        {activeNav === "overview" && (
          <div className="wl-section">
            <h2 className="wl-page-title">Overview</h2>
            <p className="wl-page-subtitle">Your wallet at a glance</p>

            <div className="wallet-grid">
              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon wallet-icon-balance" aria-hidden="true">WB</span>
                  <h3 className="wallet-card-title">Wallet Balance</h3>
                </div>
                <div className="wallet-metric-value">Rs. {wallet.balance}</div>
                <div className="wallet-inline">
                  <input
                    type="number"
                    min={1}
                    value={topUpAmount}
                    onChange={(event) => setTopUpAmount(event.target.value)}
                    placeholder="Amount"
                  />
                  <button onClick={handleTopUp}>Top Up</button>
                </div>
              </div>

              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon wallet-icon-reward" aria-hidden="true">RW</span>
                  <h3 className="wallet-card-title">Reward Points</h3>
                </div>
                <div className="wallet-metric-value">{wallet.rewardPoints}</div>
                <p className="wallet-small">1 point = Re. 1</p>
              </div>

              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon wallet-icon-budget" aria-hidden="true">BD</span>
                  <h3 className="wallet-card-title">Monthly Budget</h3>
                </div>
                {budget.monthlyFoodBudget ? (
                  <>
                    <div className="wl-budget-bar-wrap">
                      <div className="wl-budget-bar" style={{ width: `${budgetPercent}%` }} />
                    </div>
                    <p className="wallet-small">
                      Rs. {budget.spentThisMonth || 0} / Rs. {budget.monthlyFoodBudget} ({budgetPercent}%)
                    </p>
                  </>
                ) : (
                  <p className="wallet-empty">Not set</p>
                )}
              </div>

              <BudgetAlertsCard budget={budget} />
            </div>

            <div className="wallet-card" style={{ marginTop: 16 }}>
              <div className="wallet-card-title-row">
                <span className="wallet-card-icon" aria-hidden="true">TX</span>
                <h3 className="wallet-card-title">Recent Transactions</h3>
              </div>
              {!transactions?.length ? (
                <p className="wallet-empty">No transactions yet.</p>
              ) : (
                <ul className="wallet-list">
                  {transactions.slice(0, 5).map((transaction) => (
                    <li key={transaction._id} className="wallet-list-item">
                      <span className="wallet-list-date">{new Date(transaction.createdAt).toLocaleDateString()}</span>
                      <span className="wallet-list-amount">
                        {transaction.type} • Rs. {transaction.amount}
                        <span className="wallet-list-muted"> {transaction.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {transactions?.length > 5 && (
                <button className="wl-link-btn" onClick={() => setActiveNav("transactions")}>
                  View all transactions
                </button>
              )}
            </div>
          </div>
        )}

        {activeNav === "spending" && (
          <div className="wl-section">
            <h2 className="wl-page-title">Spending Analytics</h2>
            <p className="wl-page-subtitle">Track your daily and monthly spending trends</p>
            <div className="wallet-grid">
              <DailySpendingSummaryCard daily={daily} />
              <MonthlySpendingChart monthly={monthly} />
            </div>
          </div>
        )}

        {activeNav === "budget" && (
          <div className="wl-section">
            <h2 className="wl-page-title">Monthly Food Budget</h2>
            <p className="wl-page-subtitle">Set and manage your monthly food spending limit</p>

            <div className="wallet-grid">
              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon wallet-icon-budget" aria-hidden="true">BD</span>
                  <h3 className="wallet-card-title">Budget Settings</h3>
                </div>

                <p className="wallet-small">
                  Current budget:{" "}
                  {budget.monthlyFoodBudget !== null && budget.monthlyFoodBudget !== undefined
                    ? `Rs. ${budget.monthlyFoodBudget}`
                    : "Not set"}
                </p>
                <p className="wallet-small">Spent this month: Rs. {budget.spentThisMonth || 0}</p>
                <p className="wallet-small">
                  Remaining:{" "}
                  {budget.remainingThisMonth !== null && budget.remainingThisMonth !== undefined
                    ? `Rs. ${budget.remainingThisMonth}`
                    : "N/A"}
                </p>

                {budget.monthlyFoodBudget > 0 && (
                  <div className="wl-budget-bar-wrap" style={{ marginTop: 10 }}>
                    <div
                      className="wl-budget-bar"
                      style={{
                        width: `${budgetPercent}%`,
                        background: budgetPercent >= 100 ? "#dc2626" : budgetPercent >= 80 ? "#f59e0b" : "#10b981",
                      }}
                    />
                  </div>
                )}

                <div className="wallet-inline" style={{ marginTop: 12 }}>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g., 15000"
                    value={budgetInput}
                    onChange={(event) => setBudgetInput(event.target.value)}
                  />
                  <button onClick={handleSetBudget}>Set Budget</button>
                </div>
                <p className="wallet-hint">Set 0 (or clear input) to disable budget.</p>
              </div>

              <BudgetAlertsCard budget={budget} />
            </div>
          </div>
        )}

        {activeNav === "rewards" && (
          <div className="wl-section">
            <h2 className="wl-page-title">Reward Points</h2>
            <p className="wl-page-subtitle">Your reward points balance and history</p>

            <div className="wallet-grid">
              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon wallet-icon-reward" aria-hidden="true">RW</span>
                  <h3 className="wallet-card-title">Points Balance</h3>
                </div>
                <div className="wallet-metric-value">{wallet.rewardPoints} pts</div>
                <p className="wallet-small">Conversion: 1 point = Re. 1. Points are auto-earned on wallet payments.</p>
              </div>

              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon wallet-icon-reward" aria-hidden="true">HS</span>
                  <h3 className="wallet-card-title">Points History</h3>
                </div>
                {!rewardTxs?.length ? (
                  <p className="wallet-empty">No reward point transactions yet.</p>
                ) : (
                  <ul className="wallet-list">
                    {rewardTxs.map((transaction) => (
                      <li key={transaction._id} className="wallet-list-item">
                        <span className={`wl-reward-badge ${transaction.pointsDelta > 0 ? "wl-reward-earned" : "wl-reward-used"}`}>
                          {transaction.pointsDelta > 0 ? "+" : ""}
                          {transaction.pointsDelta}
                        </span>
                        <span className="wallet-list-amount">
                          {transaction.kind}
                          <span className="wallet-list-muted"> • {new Date(transaction.createdAt).toLocaleDateString()}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activeNav === "transactions" && (
          <div className="wl-section">
            <h2 className="wl-page-title">Transactions</h2>
            <p className="wl-page-subtitle">View and filter your wallet transaction history</p>

            <div className="wallet-card" style={{ marginBottom: 16 }}>
              <div className="wallet-card-title-row">
                <span className="wallet-card-icon" aria-hidden="true">FL</span>
                <h3 className="wallet-card-title">Filters</h3>
              </div>
              <div className="wallet-filters">
                <select value={txFilters.type} onChange={(event) => setTxFilters((previous) => ({ ...previous, type: event.target.value }))}>
                  <option value="">All types</option>
                  <option value="topup">Top Up</option>
                  <option value="order_payment">Order Payment</option>
                  <option value="refund">Refund</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                  <option value="transfer_out">Transfer Out</option>
                  <option value="transfer_in">Transfer In</option>
                </select>
                <input type="date" value={txFilters.from} onChange={(event) => setTxFilters((previous) => ({ ...previous, from: event.target.value }))} placeholder="From" />
                <input type="date" value={txFilters.to} onChange={(event) => setTxFilters((previous) => ({ ...previous, to: event.target.value }))} placeholder="To" />
                <input type="number" placeholder="Min Rs." value={txFilters.minAmount} onChange={(event) => setTxFilters((previous) => ({ ...previous, minAmount: event.target.value }))} />
                <input type="number" placeholder="Max Rs." value={txFilters.maxAmount} onChange={(event) => setTxFilters((previous) => ({ ...previous, maxAmount: event.target.value }))} />
                <input type="text" placeholder="Search description" value={txFilters.q} onChange={(event) => setTxFilters((previous) => ({ ...previous, q: event.target.value }))} />
                <button onClick={handleApplyTxFilters}>Apply</button>
              </div>
            </div>

            <div className="wallet-card">
              <div className="wallet-card-title-row">
                <span className="wallet-card-icon" aria-hidden="true">TX</span>
                <h3 className="wallet-card-title">All Transactions</h3>
              </div>
              {!transactions?.length ? (
                <p className="wallet-empty">No wallet transactions found.</p>
              ) : (
                <ul className="wallet-list">
                  {transactions.map((transaction) => (
                    <li key={transaction._id} className="wallet-list-item">
                      <span className="wallet-list-date">{new Date(transaction.createdAt).toLocaleDateString()}</span>
                      <span className="wallet-list-amount">
                        {transaction.type} • Rs. {transaction.amount}
                        <span className="wallet-list-muted"> {transaction.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeNav === "transfer" && (
          <div className="wl-section">
            <h2 className="wl-page-title">Wallet to Wallet Transfer</h2>
            <p className="wl-page-subtitle">Send money to another student securely</p>

            <div className="wallet-grid">
              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon" aria-hidden="true">TR</span>
                  <h3 className="wallet-card-title">New Transfer</h3>
                </div>
                <p className="wallet-small">Min: Rs. {TRANSFER_MIN} | Max: Rs. {TRANSFER_MAX} | Daily: Rs. {TRANSFER_DAILY_LIMIT}</p>
                <p className="wallet-small">OTP required for amounts &gt;= Rs. {OTP_THRESHOLD}</p>

                <div className="wallet-field-row">
                  <label>Receiver Email / Student ID</label>
                  <div className="wallet-inline" style={{ marginTop: 6 }}>
                    <input
                      type="text"
                      value={transferForm.receiverIdentifier}
                      onChange={(event) => setTransferForm((previous) => ({ ...previous, receiverIdentifier: event.target.value }))}
                      placeholder="student@example.com or ID"
                    />
                    <button type="button" onClick={handleLookupRecipient} disabled={receiverLookupLoading}>
                      {receiverLookupLoading ? "Checking..." : "Verify"}
                    </button>
                  </div>
                  {receiverLookupError && <p className="wallet-error">{receiverLookupError}</p>}
                  {receiverPreview && (
                    <p className="wallet-small">
                      Receiver: <strong>{receiverPreview.name}</strong> ({receiverPreview.email})
                    </p>
                  )}
                </div>

                <div className="wallet-field-row">
                  <label>Amount (Rs.)</label>
                  <input
                    type="number"
                    min={TRANSFER_MIN}
                    max={TRANSFER_MAX}
                    value={transferForm.amount}
                    onChange={(event) => setTransferForm((previous) => ({ ...previous, amount: event.target.value }))}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="wallet-field-row">
                  <label>Note (Optional)</label>
                  <input
                    type="text"
                    maxLength={250}
                    value={transferForm.note}
                    onChange={(event) => setTransferForm((previous) => ({ ...previous, note: event.target.value }))}
                    placeholder="Lunch share / Borrowed money"
                  />
                </div>

                <div className="wallet-field-row">
                  <label>Password Confirmation</label>
                  <input
                    type="password"
                    value={transferForm.password}
                    onChange={(event) => setTransferForm((previous) => ({ ...previous, password: event.target.value }))}
                    placeholder="Enter your account password"
                  />
                </div>

                <div className="wallet-inline" style={{ marginTop: 14 }}>
                  <button type="button" onClick={handleInitiateTransfer} disabled={transferSubmitting}>
                    {transferSubmitting ? "Processing..." : "Confirm Transfer"}
                  </button>
                </div>
              </div>

              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon" aria-hidden="true">RC</span>
                  <h3 className="wallet-card-title">Transfer Status & Receipt</h3>
                </div>

                {!pendingOtpTransfer && !transferReceipt && (
                  <p className="wallet-empty">Start a transfer to see OTP prompt or receipt details here.</p>
                )}

                {pendingOtpTransfer && (
                  <div className="wl-transfer-panel">
                    <p className="wallet-small"><strong>OTP Verification Required</strong></p>
                    <p className="wallet-small">Reference: {pendingOtpTransfer.referenceCode}</p>
                    <p className="wallet-small">Amount: Rs. {pendingOtpTransfer.amount}</p>
                    <p className="wallet-small">Receiver: {pendingOtpTransfer.receiver?.name} ({pendingOtpTransfer.receiver?.email})</p>
                    <p className="wallet-small">Expires: {formatDateTime(pendingOtpTransfer.expiresAt)}</p>
                    {pendingOtpTransfer.devOtp && (
                      <p className="wallet-small">Dev OTP: <strong>{pendingOtpTransfer.devOtp}</strong></p>
                    )}

                    <div className="wallet-inline">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpInput}
                        onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, ""))}
                        placeholder="Enter 6-digit OTP"
                      />
                      <button type="button" onClick={handleConfirmOtp} disabled={otpSubmitting || otpInput.length !== 6}>
                        {otpSubmitting ? "Verifying..." : "Verify OTP"}
                      </button>
                    </div>
                  </div>
                )}

                {transferReceipt && (
                  <div className="wl-transfer-panel">
                    <p className="wallet-small"><strong>Status: {transferReceipt.status}</strong></p>
                    <p className="wallet-small">Reference ID: {transferReceipt.referenceCode}</p>
                    <p className="wallet-small">Amount: Rs. {transferReceipt.amount}</p>
                    <p className="wallet-small">From: {transferReceipt.sender?.email}</p>
                    <p className="wallet-small">To: {transferReceipt.receiver?.email}</p>
                    <p className="wallet-small">Note: {transferReceipt.note || "-"}</p>
                    <p className="wallet-small">Created: {formatDateTime(transferReceipt.createdAt)}</p>
                    <p className="wallet-small">Completed: {formatDateTime(transferReceipt.completedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="wallet-card" style={{ marginTop: 16 }}>
              <div className="wallet-card-title-row">
                <span className="wallet-card-icon" aria-hidden="true">HS</span>
                <h3 className="wallet-card-title">Transfer History</h3>
              </div>

              <div className="wallet-filters" style={{ marginBottom: 12 }}>
                <select
                  value={transferFilters.status}
                  onChange={(event) => setTransferFilters((previous) => ({ ...previous, status: event.target.value }))}
                >
                  <option value="">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="otp_required">OTP Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <input
                  type="text"
                  placeholder="Search by ref, note, email"
                  value={transferFilters.q}
                  onChange={(event) => setTransferFilters((previous) => ({ ...previous, q: event.target.value }))}
                />
                <button type="button" onClick={handleApplyTransferFilters}>Filter</button>
              </div>

              {transferHistoryLoading ? (
                <p className="wallet-empty">Loading transfer history...</p>
              ) : !transferHistory.length ? (
                <p className="wallet-empty">No transfers found.</p>
              ) : (
                <ul className="wallet-list">
                  {transferHistory.map((transfer) => (
                    <li key={transfer._id} className="wallet-list-item wl-transfer-history-item">
                      <div>
                        <p className="wl-transfer-ref">{transfer.referenceCode}</p>
                        <p className="wallet-list-muted">
                          {transfer.sender?.email} to {transfer.receiver?.email}
                        </p>
                        {transfer.note ? <p className="wallet-list-muted">Note: {transfer.note}</p> : null}
                        <p className="wallet-list-muted">{formatDateTime(transfer.createdAt)}</p>
                      </div>
                      <div className="wl-transfer-right">
                        <span className={`wl-status-pill wl-status-pill--${transfer.status}`}>{transfer.status}</span>
                        <span className="wallet-list-amount">Rs. {transfer.amount}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeNav === "notifications" && (
          <div className="wl-section">
            <h2 className="wl-page-title">Transfer Notifications</h2>
            <p className="wl-page-subtitle">Real-time transfer alerts for sent and received money</p>

            <div className="wallet-card">
              <div className="wallet-inline" style={{ marginTop: 0, marginBottom: 12 }}>
                <button type="button" onClick={() => loadWalletNotificationsData()} disabled={notificationsLoading}>
                  {notificationsLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {!walletNotifications.length ? (
                <p className="wallet-empty">No notifications yet.</p>
              ) : (
                <ul className="wallet-list">
                  {walletNotifications.map((notification) => (
                    <li key={notification._id} className="wallet-list-item wl-notification-item">
                      <div>
                        <p className="wl-transfer-ref">{notification.title}</p>
                        <p className="wallet-list-muted">{notification.message}</p>
                        <p className="wallet-list-muted">{formatDateTime(notification.createdAt)}</p>
                      </div>
                      <div className="wl-transfer-right">
                        <span className={`wl-status-pill ${notification.read ? "wl-status-pill--read" : "wl-status-pill--unread"}`}>
                          {notification.read ? "Read" : "New"}
                        </span>
                        {!notification.read && (
                          <button type="button" onClick={() => handleMarkNotificationRead(notification._id)}>
                            Mark read
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeNav === "emergency" && (
          <div className="wl-section">
            <h2 className="wl-page-title">Emergency Wallet Request</h2>
            <p className="wl-page-subtitle">Request an emergency top-up when you need funds urgently</p>

            <div className="wallet-grid">
              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon wallet-icon-emergency" aria-hidden="true">EM</span>
                  <h3 className="wallet-card-title">New Request</h3>
                </div>
                <p className="wallet-small">Maximum per request: Rs. 5000</p>
                <div className="wallet-inline">
                  <input type="number" min={1} value={emergencyAmount} onChange={(event) => setEmergencyAmount(event.target.value)} placeholder="Amount" />
                  <button onClick={handleEmergencyRequest}>Submit Request</button>
                </div>
                <div className="wallet-field-row" style={{ marginTop: 8 }}>
                  <input placeholder="Notes (optional)" value={emergencyNote} onChange={(event) => setEmergencyNote(event.target.value)} />
                </div>
              </div>

              <div className="wallet-card">
                <div className="wallet-card-title-row">
                  <span className="wallet-card-icon" aria-hidden="true">RQ</span>
                  <h3 className="wallet-card-title">My Requests</h3>
                </div>
                {!emergencyRequests?.length ? (
                  <p className="wallet-empty">No emergency requests yet.</p>
                ) : (
                  <ul className="wallet-list">
                    {emergencyRequests.map((request) => (
                      <li key={request._id} className="wallet-list-item">
                        <span className="wallet-list-date">{new Date(request.createdAt).toLocaleDateString()}</span>
                        <span className="wallet-list-amount">
                          Rs. {request.amount} <span className="wallet-list-muted">({request.status})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default WalletPage;
