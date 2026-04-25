import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MonthlySpendingChart = ({ monthly }) => {
  const chartData = (monthly || [])
    .slice()
    .reverse()
    .map((entry) => ({
      label: `${MONTH_NAMES[entry._id?.month]} ${entry._id?.year}`,
      spent: entry.totalSpent,
      orders: entry.transactionCount,
    }));

  return (
    <div className="wallet-card">
      <div className="wallet-card-title-row">
        <span className="wallet-card-icon wallet-icon-budget" aria-hidden="true">📈</span>
        <div>
          <h3 className="wallet-card-title">Monthly Spending Trend</h3>
          <p className="wallet-card-subtitle" style={{ margin: 0 }}>Last months overview</p>
        </div>
      </div>

      {!chartData.length ? (
        <p className="wallet-empty">No monthly spending data yet.</p>
      ) : (
        <div style={{ width: "100%", height: 220, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                width={55}
                tickFormatter={(v) => `Rs.${v}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                }}
                formatter={(value, name) => [
                  `Rs. ${value}`,
                  name === "spent" ? "Spent" : name,
                ]}
              />
              <Area
                type="monotone"
                dataKey="spent"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#spendGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default MonthlySpendingChart;
