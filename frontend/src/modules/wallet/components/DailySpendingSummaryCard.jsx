import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DailySpendingSummaryCard = ({ daily }) => {
  const chartData = (daily || []).map((entry) => ({
    date: entry._id?.date?.slice(5) || "",
    spent: entry.totalSpent,
    count: entry.transactionCount,
  }));

  return (
    <div className="wallet-card">
      <div className="wallet-card-title-row">
        <span className="wallet-card-icon" aria-hidden="true">📊</span>
        <div>
          <h3 className="wallet-card-title">Daily Spending</h3>
          <p className="wallet-card-subtitle" style={{ margin: 0 }}>Current month</p>
        </div>
      </div>

      {!chartData.length ? (
        <p className="wallet-empty">No spending records available.</p>
      ) : (
        <div style={{ width: "100%", height: 220, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v) => `Rs.${v}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                }}
                formatter={(value) => [`Rs. ${value}`, "Spent"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar dataKey="spent" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default DailySpendingSummaryCard;
