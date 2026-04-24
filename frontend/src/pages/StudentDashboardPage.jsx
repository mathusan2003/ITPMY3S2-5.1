import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const StudentDashboardPage = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Student";

  return (
    <div className="sd-page">
      {/* ── Hero ── */}
      <section className="sd-hero">
        <div className="sd-hero-deco sd-hero-deco--1" />
        <div className="sd-hero-deco sd-hero-deco--2" />
        <div className="sd-hero-deco sd-hero-deco--3" />
        <div className="sd-hero-content">
          <span className="sd-hero-badge">NSBM CAMPUS</span>
          <h1 className="sd-hero-heading">
            Savor the Campus
            <br />
            Experience.
          </h1>
          <p className="sd-hero-sub">
            Fresh flavors, gourmet ingredients, and your favorite comfort food —
            delivered straight to your desk or ready for pickup.
          </p>
          <div className="sd-hero-actions">
            <Link to="/student/menu" className="sd-btn-primary">
              Order Now <span className="sd-btn-arrow">→</span>
            </Link>
            <Link to="/student/menu" className="sd-btn-outline">
              Explore Menu
            </Link>
          </div>
        </div>
      </section>

      {/* ── Welcome ── */}
      <section className="sd-welcome">
        <div className="sd-welcome-header">
          <h2 className="sd-welcome-title">
            Welcome back,
            <br />
            <span className="sd-welcome-name">{firstName}.</span>
          </h2>
          <p className="sd-welcome-sub">
            Manage your campus life from a single dashboard. Order food, track your
            finances, join collaborative study groups, and share meals effortlessly.
          </p>
        </div>

        <div className="sd-cards">
          <Link to="/student/menu" className="sd-card">
            <div className="sd-card-icon sd-card-icon--food">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            </div>
            <h3>Food Order</h3>
            <p>Browse our cafe's menu, add your favorites to cart, and track orders in real time.</p>
            <span className="sd-card-link">Explore →</span>
          </Link>

          <Link to="/student/wallet" className="sd-card">
            <div className="sd-card-icon sd-card-icon--wallet">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <h3>Wallet</h3>
            <p>Manage your balance and transactions. Check your finance spending and top-up anytime.</p>
            <span className="sd-card-link sd-card-link--wallet">Manage →</span>
          </Link>

          <Link to="/student/group-study" className="sd-card">
            <div className="sd-card-icon sd-card-icon--study">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <h3>Group Study</h3>
            <p>Find study buddies and join groups. Collaborate, share materials, and stay ahead in studies.</p>
            <span className="sd-card-link sd-card-link--study">View →</span>
          </Link>

          <Link to="/student/food-sharing" className="sd-card">
            <div className="sd-card-icon sd-card-icon--share">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </div>
            <h3>Food Sharing</h3>
            <p>Share leftovers with others. Reduce food waste and build a supportive campus community.</p>
            <span className="sd-card-link sd-card-link--share">Share →</span>
          </Link>
        </div>
      </section>

      {/* ── Quick Access ── */}
      <section className="sd-quick">
        <h3 className="sd-quick-title">Quick Access</h3>
        <div className="sd-quick-pills">
          <Link to="/student/orders" className="sd-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            My Orders
          </Link>
          <Link to="/student/cart" className="sd-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            My Cart
          </Link>
          <Link to="/student/complaints" className="sd-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            My Complaints
          </Link>
        </div>
      </section>

      {/* ── Bottom Cards ── */}
      <section className="sd-bottom">
        <div className="sd-spotlight">
          <span className="sd-spotlight-badge">COMMUNITY SPOTLIGHT</span>
          <h3 className="sd-spotlight-heading">
            Join the next Group Study marathon starting this Friday
          </h3>
          <div className="sd-spotlight-illustration">
            <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
              <circle cx="55" cy="80" r="35" fill="#4338ca" opacity=".18"/>
              <circle cx="125" cy="75" r="30" fill="#6366f1" opacity=".15"/>
              <rect x="35" y="45" width="18" height="55" rx="9" fill="#22c55e"/>
              <circle cx="44" cy="35" r="12" fill="#fbbf24"/>
              <rect x="100" y="40" width="18" height="60" rx="9" fill="#f97316"/>
              <circle cx="109" cy="30" r="12" fill="#60a5fa"/>
              <rect x="67" y="55" width="14" height="45" rx="7" fill="#818cf8"/>
              <circle cx="74" cy="45" r="10" fill="#f472b6"/>
            </svg>
          </div>
        </div>

        <div className="sd-rewards">
          <div className="sd-rewards-content">
            <h3 className="sd-rewards-heading">Loyalty Rewards</h3>
            <p className="sd-rewards-sub">
              Earn points every time you order food. Redeem rewards or exchange them for discounts on future orders.
            </p>
            <Link to="/student/wallet" className="sd-rewards-btn">
              View My Points
            </Link>
          </div>
          <div className="sd-rewards-illustration">
            <svg width="120" height="140" viewBox="0 0 120 140" fill="none">
              <circle cx="60" cy="90" r="40" fill="#ede9fe"/>
              <rect x="45" y="40" width="30" height="70" rx="15" fill="#f97316"/>
              <circle cx="60" cy="30" r="15" fill="#fbbf24"/>
              <rect x="35" y="95" width="12" height="30" rx="6" fill="#4338ca"/>
              <rect x="73" y="95" width="12" height="30" rx="6" fill="#4338ca"/>
              <rect x="70" y="55" width="25" height="12" rx="6" fill="#22c55e"/>
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudentDashboardPage;
