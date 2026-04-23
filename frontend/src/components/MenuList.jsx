const MenuList = ({ menu = [] }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">Available Menu</h3>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {menu.length === 0 ? (
          <p className="text-sm text-slate-500">No menu available.</p>
        ) : (
          menu.map((item) => (
            <div key={item.id || item.name} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                <p className="text-sm font-medium text-emerald-700">Rs. {item.price}</p>
              </div>
              <p className="text-xs text-slate-500">{item.category} · {item.type}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MenuList;

