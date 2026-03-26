// src/layout/NavBar.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import Avatar from "../components/ux/Avatar";
import Confirm from "../components/ux/Confirm";
import { VendorAPI } from "../lib/api";
import "./Navbar.css";
import {
  FaUser,
  FaHeart,
  FaShoppingCart,
  FaSearch,
  FaTimes,
  FaTachometerAlt,
  FaClipboardList,
  FaStore,
  FaBoxOpen,
  FaTruck,
} from "react-icons/fa";

export default function NavBar() {
  const { user, loading, logout } = useAuth();
  const { cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [showAccount, setShowAccount] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [vendorLogoUrl, setVendorLogoUrl] = useState(null);
  const isVendor = !!(user && (user.role === "vendor" || user.isVendor === true));

  const accountRef = useRef(null);

  // Close dropdown on outside click / ESC
  useEffect(() => {
    function onDocClick(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setShowAccount(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") {
        setShowAccount(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Vendor logo for header avatar (when logged in as vendor)
  useEffect(() => {
    if (!user || !isVendor) {
      setVendorLogoUrl(null);
      return;
    }
    VendorAPI.getProfile()
      .then((r) => {
        const data = r?.data?.data ?? r?.data;
        const url = data?.logoUrl || null;
        setVendorLogoUrl(url || null);
      })
      .catch(() => setVendorLogoUrl(null));
  }, [user, isVendor]);

  function submitSearch(e) {
    e.preventDefault();
    alert("Searching: " + q); // TODO: replace with real navigation
  }

  const vendorPublicId = user?.id || user?._id;

  return (
    <header className="navbar">
      {/* Left: Logo */}
      <a href="/" className="logo">
        <img src="/images/logo.png" alt="Artisan Avenue" />
      </a>

      {/* Center: links */}
      <nav className="nav-links">
        {["Home", "About", "Shop Handmade", "For Vendors", "Blog", "Contact"].map((label, i) => {
          const href = ["/", "/about", "/shop", "/for-vendors", "/blog", "/contact"][i];
          return (
            <a key={label} href={href} className="nav-pill">
              {label}
            </a>
          );
        })}
      </nav>

      {/* Right */}
      <div className="right">
        {!searchOpen ? (
          <>
            {/* Account */}
            <div className="icon-wrap" ref={accountRef}>
              <button
                className="icon-btn"
                aria-label="Account"
                onClick={() => setShowAccount((s) => !s)}
                disabled={loading}
              >
                {loading ? (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#eee" }} />
                ) : user ? (
                  <Avatar user={user} size={32} imageUrl={vendorLogoUrl} />
                ) : (
                  <FaUser />
                )}
              </button>

              {showAccount && (
                <div className="dropdown">
                  {!user ? (
                    <>
                      <a href="/login">Log in</a>
                      <a href="/register">Sign up</a>
                    </>
                  ) : (
                    <>
                      <div className="dropdown-header">
                        {user.firstName ? `Hi, ${user.firstName}!` : user.email}
                      </div>

                      {isVendor ? (
                        <>
                          <div className="dropdown-subheader">Vendor</div>
                          <div className="dropdown-grid">
                            <Link
                              to="/vendor/dashboard"
                              className="dropdown-item"
                              onClick={() => setShowAccount(false)}
                            >
                              <span className="dropdown-item-icon">
                                <FaTachometerAlt />
                              </span>
                              <span>Dashboard</span>
                            </Link>
                            <Link
                              to="/vendor/listings"
                              className="dropdown-item"
                              onClick={() => setShowAccount(false)}
                            >
                              <span className="dropdown-item-icon">
                                <FaBoxOpen />
                              </span>
                              <span>My listings</span>
                            </Link>
                            {vendorPublicId && (
                              <Link
                                to={`/makers/${vendorPublicId}?tab=products`}
                                className="dropdown-item"
                                onClick={() => setShowAccount(false)}
                              >
                                <span className="dropdown-item-icon">
                                  <FaStore />
                                </span>
                                <span>Preview storefront</span>
                              </Link>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="dropdown-subheader">Account</div>
                          <div className="dropdown-grid">
                            <Link
                              to="/orders"
                              className="dropdown-item"
                              onClick={() => setShowAccount(false)}
                            >
                              <span className="dropdown-item-icon">
                                <FaClipboardList />
                              </span>
                              <span>My orders</span>
                            </Link>
                            <Link
                              to="/cart"
                              className="dropdown-item"
                              onClick={() => setShowAccount(false)}
                            >
                              <span className="dropdown-item-icon">
                                <FaShoppingCart />
                              </span>
                              <span>Cart</span>
                              {cartCount > 0 && (
                                <span className="dropdown-badge">{cartCount > 99 ? "99+" : cartCount}</span>
                              )}
                            </Link>
                            <Link
                              to="/wishlist"
                              className="dropdown-item"
                              onClick={() => setShowAccount(false)}
                            >
                              <span className="dropdown-item-icon">
                                <FaHeart />
                              </span>
                              <span>Wishlist</span>
                              {wishlistCount > 0 && (
                                <span className="dropdown-badge">{wishlistCount > 99 ? "99+" : wishlistCount}</span>
                              )}
                            </Link>
                            <a
                              href="/contact"
                              className="dropdown-item"
                              onClick={() => setShowAccount(false)}
                            >
                              <span className="dropdown-item-icon">
                                <FaTruck />
                              </span>
                              <span>Help & contact</span>
                            </a>
                          </div>
                        </>
                      )}

                      <button
                        className="dropdown-danger"
                        onClick={() => {
                          setShowAccount(false);
                          setConfirmOpen(true);
                        }}
                      >
                        Log out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Wishlist */}
            <Link to="/wishlist" className="icon-btn icon-btn-wishlist" aria-label="Wishlist">
              <FaHeart />
              {wishlistCount > 0 && (
                <span className="cart-badge">{wishlistCount > 99 ? "99+" : wishlistCount}</span>
              )}
            </Link>

            {/* Cart */}
            <Link to="/cart" className="icon-btn icon-btn-cart" aria-label="Cart">
              <FaShoppingCart />
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount > 99 ? "99+" : cartCount}</span>
              )}
            </Link>

            {/* Search trigger */}
            <button className="icon-btn" aria-label="Open search" onClick={() => setSearchOpen(true)}>
              <FaSearch />
            </button>
          </>
        ) : (
          <form className="search" onSubmit={submitSearch}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
            <button className="search-submit" type="submit">
              <FaSearch />
            </button>
            <button type="button" className="search-close" onClick={() => setSearchOpen(false)}>
              <FaTimes />
            </button>
          </form>
        )}
      </div>

      {/* Confirm logout */}
      <Confirm
        open={confirmOpen}
        title="Log out?"
        message="You’ll be signed out of your account."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await logout();
          // optional redirect:
          // window.location.href = "/";
        }}
      />
    </header>
  );
}




