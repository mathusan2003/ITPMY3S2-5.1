import { expect } from "@playwright/test";

const usersByRole = {
  student: {
    _id: "student-1",
    id: "student-1",
    name: "Student One",
    email: "student1@campus.edu",
    role: "student",
  },
  admin: {
    _id: "admin-1",
    id: "admin-1",
    name: "Canteen Admin",
    email: "canteen1@campus.edu",
    role: "admin",
    canteenKey: "canteen_1",
    canteenLabel: "1st Canteen",
  },
  vendor: {
    _id: "vendor-1",
    id: "vendor-1",
    name: "Vendor One",
    email: "vendor@campus.edu",
    role: "vendor",
  },
};

const seedCategories = [
  { _id: "cat-1", name: "Main Course" },
  { _id: "cat-2", name: "Beverages" },
];

const seedMenu = [
  {
    _id: "food-1",
    name: "Chicken Rice",
    description: "Rice with grilled chicken and salad.",
    price: 450,
    canteen: "1st Canteen",
    isAvailable: true,
    averageRating: 4.4,
    category: { _id: "cat-1", name: "Main Course" },
  },
];

const seedOrder = {
  _id: "order-1",
  orderCode: "12345",
  user: { name: "Student One", phone: "0710000000", email: "student1@campus.edu" },
  canteen: "1st Canteen",
  totalAmount: 450,
  status: "placed",
  paymentMethod: "wallet",
  items: [{ _id: "line-1", name: "Chicken Rice", quantity: 1, lineTotal: 450 }],
};

const seedTransfers = [
  {
    _id: "transfer-1",
    referenceCode: "TRX-001",
    status: "success",
    amount: 250,
    note: "Lunch share",
    sender: { email: "student1@campus.edu" },
    receiver: { email: "student2@campus.edu" },
    createdAt: "2026-04-20T09:00:00.000Z",
  },
];

const seedNotifications = [
  {
    _id: "notif-1",
    title: "Transfer received",
    message: "Rs. 250 received from student2@campus.edu",
    read: false,
    createdAt: "2026-04-20T10:00:00.000Z",
  },
];

const seedComplaints = [
  {
    _id: "cmp-1",
    title: "Late order delivery",
    description: "Order took too long to arrive.",
    status: "open",
  },
];

const seedGroups = [
  {
    _id: "group-1",
    name: "DBMS Marathon",
    subject: "Database Systems",
    description: "Night revision group",
    members: [{ _id: "student-1", name: "Student One" }],
    materials: [],
    maxMembers: 5,
    targetStudyYear: 2,
    targetSemester: 1,
    location: "Library Room 2",
    sessionTime: "2026-12-30T12:00:00.000Z",
    createdAt: "2026-04-20T08:00:00.000Z",
  },
];

const seedFoodPosts = [
  {
    _id: "post-1",
    title: "Extra Sandwich",
    description: "Packed and fresh.",
    status: "available",
    shareType: "free_food",
    foodType: "veg",
    foodSource: "packed",
    totalPortions: 2,
    pickupLocation: "Canteen Entrance",
    expiryTime: "2026-12-30T14:00:00.000Z",
    createdAt: "2026-04-20T11:00:00.000Z",
    user: { _id: "student-2", name: "Student Two", email: "student2@campus.edu" },
    claims: [],
    joins: [],
    waitlist: [],
    reports: [],
  },
];

const json = (route, data, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ success: status < 400, data }),
  });

const parseApiPath = (url) => {
  const pathname = new URL(url).pathname;
  return pathname.replace(/^\/api/, "");
};

const normalizeCartSummary = (cartItems) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.priceAtAddTime, 0);
  return { subtotal };
};

export async function attachMockApi(page, { role = "student" } = {}) {
  let menuItems = [...seedMenu];
  let cartItems = [];
  let complaints = [...seedComplaints];
  let groups = [...seedGroups];
  let foodPosts = [...seedFoodPosts];
  let postedHistory = [];
  let joinedHistory = [];
  let orders = [{ ...seedOrder }];
  let transferNotifications = [...seedNotifications];
  const roleUser = usersByRole[role] || usersByRole.student;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const path = parseApiPath(request.url());
    const body = request.postDataJSON?.() || {};

    if (method === "GET" && path === "/auth/me") return json(route, { user: roleUser });
    if (method === "POST" && path === "/auth/login") {
      const email = String(body.email || "").toLowerCase();
      const resolvedUser = email.includes("admin")
        ? usersByRole.admin
        : email.includes("vendor")
          ? usersByRole.vendor
          : usersByRole.student;
      return json(route, { token: "mock-token", user: resolvedUser });
    }

    if (method === "GET" && path === "/food-ordering/categories") return json(route, { categories: seedCategories });
    if (method === "GET" && path === "/food-ordering/menu") return json(route, { items: menuItems });

    if (method === "GET" && path === "/food-ordering/cart") {
      return json(route, {
        cart: { _id: "cart-1", items: cartItems },
        summary: normalizeCartSummary(cartItems),
      });
    }
    if (method === "POST" && path === "/food-ordering/cart/items") {
      const foodItem = menuItems.find((item) => item._id === body.foodItemId) || menuItems[0];
      const existing = cartItems.find((item) => item.foodItem?._id === foodItem._id);
      if (existing) {
        existing.quantity += Number(body.quantity || 1);
      } else {
        cartItems.push({
          foodItem,
          quantity: Number(body.quantity || 1),
          priceAtAddTime: foodItem.price,
        });
      }
      return json(route, { cart: { items: cartItems }, summary: normalizeCartSummary(cartItems) });
    }
    if (method === "PUT" && path.startsWith("/food-ordering/cart/items/")) {
      const itemId = path.split("/").pop();
      cartItems = cartItems.map((item) =>
        item.foodItem?._id === itemId ? { ...item, quantity: Number(body.quantity || item.quantity) } : item
      );
      return json(route, { cart: { items: cartItems }, summary: normalizeCartSummary(cartItems) });
    }
    if (method === "DELETE" && path.startsWith("/food-ordering/cart/items/")) {
      const itemId = path.split("/").pop();
      cartItems = cartItems.filter((item) => item.foodItem?._id !== itemId);
      return json(route, { cart: { items: cartItems }, summary: normalizeCartSummary(cartItems) });
    }
    if (method === "DELETE" && path === "/food-ordering/cart") {
      cartItems = [];
      return json(route, { cart: { items: [] }, summary: { subtotal: 0 } });
    }
    if (method === "GET" && path === "/food-ordering/orders") return json(route, { orders });
    if (method === "GET" && path.startsWith("/food-ordering/orders/verify/")) return json(route, { order: orders[0] });
    if (method === "PATCH" && path.startsWith("/food-ordering/orders/deliver/")) {
      orders = orders.map((order) => ({ ...order, status: "completed" }));
      return json(route, { order: orders[0] });
    }
    if (method === "PATCH" && /\/food-ordering\/orders\/[^/]+\/status$/.test(path)) {
      const orderId = path.split("/")[3];
      orders = orders.map((order) => (order._id === orderId ? { ...order, status: body.status || order.status } : order));
      return json(route, { order: orders.find((order) => order._id === orderId) || orders[0] });
    }

    if (method === "GET" && path === "/wallet") return json(route, { wallet: { balance: 5000, rewardPoints: 120 } });
    if (method === "POST" && path === "/wallet/topup") return json(route, { wallet: { balance: 5500, rewardPoints: 120 } });
    if (method === "GET" && path === "/wallet/transactions") {
      return json(route, {
        transactions: [
          {
            _id: "tx-1",
            type: "topup",
            amount: 1000,
            description: "Wallet top up",
            createdAt: "2026-04-21T08:00:00.000Z",
          },
        ],
      });
    }
    if (method === "GET" && path === "/wallet/monthly-summary") return json(route, { monthly: [{ month: 4, amount: 3200 }] });
    if (method === "GET" && path === "/wallet/daily-spending") return json(route, { daily: [{ date: "2026-04-20", amount: 450 }] });
    if (method === "GET" && path === "/wallet/reward-points") {
      return json(route, { transactions: [{ _id: "rw-1", pointsDelta: 20, kind: "earned", createdAt: "2026-04-19T00:00:00.000Z" }] });
    }
    if (method === "GET" && path === "/wallet/budget") {
      return json(route, { monthlyFoodBudget: 12000, spentThisMonth: 3200, remainingThisMonth: 8800 });
    }
    if (method === "PUT" && path === "/wallet/budget") return json(route, { monthlyFoodBudget: Number(body.amount || 0), spentThisMonth: 3200, remainingThisMonth: 0 });
    if (method === "GET" && path === "/wallet/emergency-requests/me") return json(route, { requests: [] });
    if (method === "POST" && path === "/wallet/emergency-request") return json(route, { request: { _id: "em-1", amount: body.amount, status: "pending" } });
    if (method === "GET" && path === "/wallet/transfer/lookup") return json(route, { receiver: { _id: "student-2", name: "Student Two", email: "student2@campus.edu" } });
    if (method === "POST" && path === "/wallet/transfer") {
      return json(route, {
        transfer: {
          _id: "transfer-new",
          referenceCode: "TRX-002",
          status: "success",
          amount: Number(body.amount || 0),
          sender: { email: "student1@campus.edu" },
          receiver: { email: "student2@campus.edu", name: "Student Two" },
          note: body.note || "",
          createdAt: "2026-04-22T09:00:00.000Z",
          completedAt: "2026-04-22T09:01:00.000Z",
        },
        requiresOtp: false,
      });
    }
    if (method === "POST" && path === "/wallet/transfer/confirm-otp") return json(route, { transfer: seedTransfers[0] });
    if (method === "GET" && path === "/wallet/transfers") return json(route, { transfers: seedTransfers });
    if (method === "GET" && path === "/wallet/notifications") return json(route, { notifications: transferNotifications });
    if (method === "PATCH" && /\/wallet\/notifications\/[^/]+\/read$/.test(path)) {
      const notificationId = path.split("/")[3];
      transferNotifications = transferNotifications.map((item) => (item._id === notificationId ? { ...item, read: true } : item));
      return json(route, { notification: transferNotifications.find((item) => item._id === notificationId) || transferNotifications[0] });
    }

    if (method === "GET" && path === "/complaints") return json(route, { complaints });
    if (method === "POST" && path === "/complaints") {
      const complaint = { _id: `cmp-${complaints.length + 1}`, title: body.title, description: body.description, status: "open" };
      complaints = [complaint, ...complaints];
      return json(route, { complaint });
    }

    if (method === "GET" && path === "/group-study") return json(route, { groups });
    if (method === "POST" && path === "/group-study") {
      const group = {
        _id: `group-${groups.length + 1}`,
        name: body.name,
        subject: body.subject,
        description: body.description || "",
        members: [{ _id: roleUser._id, name: roleUser.name }],
        materials: [],
        maxMembers: Number(body.maxMembers || 2),
        targetStudyYear: Number(body.targetStudyYear || 1),
        targetSemester: Number(body.targetSemester || 1),
        location: body.location || "Library",
        sessionTime: body.sessionTime || "2026-12-30T12:00:00.000Z",
        createdAt: "2026-04-22T00:00:00.000Z",
      };
      groups = [group, ...groups];
      return json(route, { group });
    }
    if (method === "POST" && /\/group-study\/[^/]+\/join$/.test(path)) return json(route, { group: groups[0] });

    if (method === "GET" && path === "/food-sharing") return json(route, { posts: foodPosts });
    if (method === "GET" && path === "/food-sharing/history/me") return json(route, { posted: postedHistory, joined: joinedHistory });
    if (method === "POST" && path === "/food-sharing") {
      const post = {
        _id: `post-${foodPosts.length + 1}`,
        title: body.title,
        description: body.description,
        status: "available",
        shareType: body.shareType || "free_food",
        foodType: body.foodType || "veg",
        foodSource: body.foodSource || "packed",
        totalPortions: Number(body.totalPortions || body.maxMembers || 1),
        pickupLocation: body.pickupLocation || "Canteen",
        expiryTime: body.availableUntil || "2026-12-30T14:00:00.000Z",
        createdAt: "2026-04-22T00:00:00.000Z",
        user: { _id: roleUser._id, name: roleUser.name, email: roleUser.email },
        claims: [],
        joins: [],
        waitlist: [],
        reports: [],
      };
      foodPosts = [post, ...foodPosts];
      postedHistory = [post, ...postedHistory];
      return json(route, { post });
    }
    if (method === "POST" && /\/food-sharing\/[^/]+\/claim$/.test(path)) return json(route, { ok: true });
    if (method === "PATCH" && /\/food-sharing\/[^/]+\/cancel-claim$/.test(path)) return json(route, { post: foodPosts[0] });
    if (method === "PATCH" && /\/food-sharing\/[^/]+\/collect$/.test(path)) return json(route, { post: { ...foodPosts[0], status: "collected" } });
    if (method === "PATCH" && /\/food-sharing\/[^/]+\/status$/.test(path)) return json(route, { post: { ...foodPosts[0], status: body.status || "expired" } });
    if (method === "POST" && /\/food-sharing\/[^/]+\/verify-pickup$/.test(path)) return json(route, { post: foodPosts[0] });
    if (method === "POST" && /\/food-sharing\/[^/]+\/report$/.test(path)) return json(route, { ok: true });
    if (method === "GET" && /\/food-sharing\/[^/]+\/live-location$/.test(path)) {
      return json(route, {
        location: {
          pickup: { lat: 6.8213, lng: 79.9652 },
          ownerLiveLocation: null,
          collectorLiveLocation: null,
        },
      });
    }
    if (method === "PATCH" && /\/food-sharing\/[^/]+\/live-location$/.test(path)) return json(route, { location: { pickup: { lat: body.lat, lng: body.lng } } });

    if (method === "GET" && path === "/admin/dashboard-stats") {
      return json(route, { stats: { menuItems: menuItems.length, totalOrders: orders.length, totalRevenue: 24500 } });
    }
    if (method === "GET" && path === "/admin/orders") return json(route, { orders });
    if (method === "GET" && path === "/admin/canteen/menu") return json(route, { items: menuItems });
    if (method === "POST" && path === "/admin/canteen/menu") {
      const newItem = {
        _id: `food-${menuItems.length + 1}`,
        name: body.name,
        description: body.description || "",
        price: Number(body.price || 0),
        category: { _id: body.category || "cat-1", name: "Main Course" },
        imageUrl: body.imageUrl || "",
        isAvailable: true,
      };
      menuItems = [newItem, ...menuItems];
      return json(route, { item: newItem });
    }
    if (method === "PATCH" && /\/admin\/canteen\/menu\/[^/]+$/.test(path)) {
      const itemId = path.split("/").pop();
      menuItems = menuItems.map((item) => (item._id === itemId ? { ...item, ...body } : item));
      return json(route, { item: menuItems.find((item) => item._id === itemId) || menuItems[0] });
    }
    if (method === "DELETE" && /\/admin\/canteen\/menu\/[^/]+$/.test(path)) {
      const itemId = path.split("/").pop();
      menuItems = menuItems.filter((item) => item._id !== itemId);
      return json(route, { ok: true });
    }
    if (method === "GET" && path === "/admin/food-sharing") return json(route, { posts: foodPosts });
    if (method === "GET" && path === "/admin/food-sharing/reported") return json(route, { posts: [] });
    if (method === "PATCH" && /\/admin\/food-sharing\/[^/]+\/moderate$/.test(path)) return json(route, { post: foodPosts[0] });
    if (method === "DELETE" && /\/admin\/food-sharing\/[^/]+$/.test(path)) return json(route, { post: foodPosts[0] });
    if (method === "GET" && path === "/admin/group-study-feedback") return json(route, { groups: [] });
    if (method === "GET" && path === "/admin/users/activity") return json(route, { users: [] });

    if (method === "GET" && path === "/vendor/dashboard-stats") {
      return json(route, { stats: { totalMenuItems: menuItems.length, incomingOrders: orders.length, totalRevenue: 15200 } });
    }
    if (method === "GET" && path === "/vendor/menu") return json(route, { items: menuItems });
    if (method === "POST" && path === "/vendor/menu") {
      const item = {
        _id: `food-${menuItems.length + 1}`,
        name: body.name,
        price: Number(body.price || 0),
        description: body.description || "",
        canteen: body.canteen || "Vendor Canteen",
        category: body.category || "cat-1",
        isAvailable: true,
      };
      menuItems = [item, ...menuItems];
      return json(route, { item });
    }
    if (method === "PUT" && /\/vendor\/menu\/[^/]+$/.test(path)) {
      const itemId = path.split("/").pop();
      menuItems = menuItems.map((item) => (item._id === itemId ? { ...item, ...body } : item));
      return json(route, { item: menuItems.find((item) => item._id === itemId) || menuItems[0] });
    }
    if (method === "DELETE" && /\/vendor\/menu\/[^/]+$/.test(path)) {
      const itemId = path.split("/").pop();
      menuItems = menuItems.filter((item) => item._id !== itemId);
      return json(route, { ok: true });
    }
    if (method === "GET" && path === "/vendor/orders") return json(route, { orders });
    if (method === "PATCH" && /\/vendor\/orders\/[^/]+\/status$/.test(path)) {
      const orderId = path.split("/")[3];
      orders = orders.map((order) => (order._id === orderId ? { ...order, status: body.status || order.status } : order));
      return json(route, { order: orders.find((order) => order._id === orderId) || orders[0] });
    }
    if (method === "GET" && path === "/vendor/revenue-summary") {
      return json(route, {
        monthly: [
          { _id: { year: 2026, month: 4 }, totalRevenue: 15200, totalOrders: 18 },
          { _id: { year: 2026, month: 3 }, totalRevenue: 13100, totalOrders: 15 },
        ],
      });
    }

    return json(route, {});
  });
}

export async function loginAsRole(page, role = "student") {
  await attachMockApi(page, { role });
  await page.addInitScript(() => {
    localStorage.setItem("canteen_auth", JSON.stringify({ token: "mock-token" }));
  });
}

export async function expectOnDashboard(page, role) {
  if (role === "student") await expect(page).toHaveURL(/\/student\/dashboard$/);
  if (role === "admin") await expect(page).toHaveURL(/\/admin\/dashboard$/);
  if (role === "vendor") await expect(page).toHaveURL(/\/vendor\/dashboard$/);
}
