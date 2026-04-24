const CANTEENS = [
  { key: "canteen1", label: "1st Canteen" },
  { key: "canteen2", label: "2nd Canteen" },
  { key: "canteen3", label: "3rd Canteen" },
  { key: "canteen4", label: "4th Canteen" },
];

const getCanteenLabelByKey = (key) => {
  const found = CANTEENS.find((c) => c.key === key);
  return found ? found.label : null;
};

const getAllCanteenLabels = () => CANTEENS.map((c) => c.label);

module.exports = {
  CANTEENS,
  getCanteenLabelByKey,
  getAllCanteenLabels,
};
