const TransactionTable = ({ transactions }) => {
  if (!transactions.length) {
    return <p>No wallet transactions yet.</p>;
  }

  return (
    <div className="card">
      <h3>Transaction History</h3>
      <div style={{ overflowX: "auto" }}>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx._id}>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                <td>{tx.type}</td>
                <td>Rs. {tx.amount}</td>
                <td>{tx.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
