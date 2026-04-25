const BudgetAlertsCard = ({ budget }) => {
  const { monthlyFoodBudget, spentThisMonth, alerts } = budget || {};

  const notSet = monthlyFoodBudget === null || monthlyFoodBudget === undefined || monthlyFoodBudget === 0;
  const eightyReached = Boolean(alerts?.eightyPercentReached);
  const hundredReached = Boolean(alerts?.hundredPercentReached);

  let message = "No alerts";
  if (notSet) message = "Set your budget to enable alerts";
  if (!notSet && eightyReached && !hundredReached) message = "80% budget reached";
  if (!notSet && hundredReached) message = "100% budget reached (budget exhausted)";

  return (
    <div className="wallet-card">
      <div className="wallet-card-title-row">
        <span className="wallet-card-icon" aria-hidden="true">
          ⚠️
        </span>
        <h3 className="wallet-card-title">Alerts</h3>
      </div>

      <p className="wallet-empty" style={{ marginTop: 8 }}>
        {message}
      </p>

      {!notSet && (
        <div className="wallet-alert-lines">
          <div>
            80%: <strong>{eightyReached ? "Reached" : "Not reached"}</strong>
          </div>
          <div>
            100%: <strong>{hundredReached ? "Reached" : "Not reached"}</strong>
          </div>
        </div>
      )}

      {!notSet && (
        <p className="wallet-small">
          Budget Rs. {monthlyFoodBudget} | Spent Rs. {spentThisMonth}
        </p>
      )}
    </div>
  );
};

export default BudgetAlertsCard;

