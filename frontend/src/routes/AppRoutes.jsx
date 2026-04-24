import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import LoginPage from "../modules/auth/pages/LoginPage";
import RegisterPage from "../modules/auth/pages/RegisterPage";
import ForgotPasswordPage from "../modules/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../modules/auth/pages/ResetPasswordPage";
import ProfilePage from "../modules/auth/pages/ProfilePage";
import StudentDashboardPage from "../pages/StudentDashboardPage";
import { useAuth } from "../context/AuthContext";
import MenuPage from "../modules/food-ordering/pages/MenuPage";
import CartPage from "../modules/food-ordering/pages/CartPage";
import CheckoutPage from "../modules/food-ordering/pages/CheckoutPage";
import OrderHistoryPage from "../modules/food-ordering/pages/OrderHistoryPage";
import OrderDetailsPage from "../modules/food-ordering/pages/OrderDetailsPage";
import WalletPage from "../modules/wallet/pages/WalletPage";
import ComplaintListPage from "../modules/complaints/pages/ComplaintListPage";
import SubmitComplaintPage from "../modules/complaints/pages/SubmitComplaintPage";
import ComplaintDetailsPage from "../modules/complaints/pages/ComplaintDetailsPage";
import FoodSharePage from "../modules/food-sharing/pages/FoodSharePage";
import GroupStudyPage from "../modules/group-study/pages/GroupStudyPage";
import StudyGroupDetailsPage from "../modules/group-study/pages/StudyGroupDetailsPage";
import NotificationsPage from "../modules/notifications/pages/NotificationsPage";
import AdminDashboardPage from "../modules/admin/pages/AdminDashboardPage";
import AdminOrdersPage from "../modules/admin/pages/AdminOrdersPage";
import AdminOrderDetailsPage from "../modules/admin/pages/AdminOrderDetailsPage";
import AdminCanteenMenuPage from "../modules/admin/pages/AdminCanteenMenuPage";
import { RequireCanteenOwnerOutlet, RequireSuperAdminOutlet } from "../components/AdminRouteGuards";
import FoodSharingModerationPage from "../modules/admin/pages/FoodSharingModerationPage";
import GroupStudyFeedbackPage from "../modules/admin/pages/GroupStudyFeedbackPage";
import AdminUserActivityPage from "../modules/admin/pages/AdminUserActivityPage";
import VendorDashboardPage from "../modules/vendor/pages/VendorDashboardPage";
import ManageMenuPage from "../modules/vendor/pages/ManageMenuPage";
import VendorOrdersPage from "../modules/vendor/pages/VendorOrdersPage";
import RevenueSummaryPage from "../modules/vendor/pages/RevenueSummaryPage";
import FoodAssistantPage from "../pages/FoodAssistantPage";

const HomePage = () => (
  <div>
    <h2>Welcome to Canteen Management</h2>
    <p>Use this platform for food ordering, wallet, and campus services.</p>
  </div>
);

const UnauthorizedPage = () => (
  <div>
    <h2>Unauthorized</h2>
    <p>You do not have permission to access this route.</p>
  </div>
);

const HomeRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div className="page-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "vendor") return <Navigate to="/vendor/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          <Route path="/student/menu" element={<MenuPage />} />
          <Route path="/student/food-assistant" element={<FoodAssistantPage />} />
          <Route path="/student/cart" element={<CartPage />} />
          <Route path="/student/checkout" element={<CheckoutPage />} />
          <Route path="/student/orders" element={<OrderHistoryPage />} />
          <Route path="/student/orders/:orderId" element={<OrderDetailsPage />} />
          <Route path="/student/wallet" element={<WalletPage />} />
          <Route path="/student/complaints" element={<ComplaintListPage />} />
          <Route path="/student/complaints/new" element={<SubmitComplaintPage />} />
          <Route path="/student/food-sharing" element={<FoodSharePage />} />
          <Route path="/student/group-study" element={<GroupStudyPage />} />
          <Route path="/student/group-study/:groupId" element={<StudyGroupDetailsPage />} />
          <Route path="/student/profile" element={<ProfilePage />} />
          <Route path="/student/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/orders/:orderId" element={<AdminOrderDetailsPage />} />
          <Route path="/admin/food-sharing" element={<FoodSharingModerationPage />} />
          <Route element={<RequireSuperAdminOutlet />}>
            <Route path="/admin/group-study-feedback" element={<GroupStudyFeedbackPage />} />
            <Route path="/admin/user-activity" element={<AdminUserActivityPage />} />
          </Route>
          <Route element={<RequireCanteenOwnerOutlet />}>
            <Route path="/admin/menu" element={<AdminCanteenMenuPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["vendor"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/vendor/dashboard" element={<VendorDashboardPage />} />
          <Route path="/vendor/menu" element={<ManageMenuPage />} />
          <Route path="/vendor/orders" element={<VendorOrdersPage />} />
          <Route path="/vendor/revenue" element={<RevenueSummaryPage />} />
        </Route>
      </Route>

      <Route path="/dashboard" element={<HomeRedirect />} />
      <Route element={<ProtectedRoute allowedRoles={["student", "admin"]} />}>
        <Route path="/complaints/:complaintId" element={<ComplaintDetailsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
