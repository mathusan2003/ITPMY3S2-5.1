const MonthlySummaryCard = ({ monthly }) => {
  return (
    <div className="card">
      <h3>Monthly Spending Summary</h3>
      {!monthly.length ? (
        <p>No spending records available yet.</p>
      ) : (
        <ul>
          {monthly.map((entry) => (
            <li key={`${entry._id.year}-${entry._id.month}`}>
              {entry._id.month}/{entry._id.year}: Rs. {entry.totalSpent} ({entry.transactionCount} payments)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MonthlySummaryCard;
