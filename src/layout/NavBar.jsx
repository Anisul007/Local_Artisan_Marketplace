import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/ux/Avatar";
import Confirm from "../components/ux/Confirm";
import "./Navbar.css";
import { FaUser, FaHeart, FaShoppingCart, FaSearch, FaTimes } from "react-icons/fa";

export default function NavBar() {
  const { user, loading, logout } = useAuth();             // <-- get user + loading + logout from context
  const [showAccount, setShowAccount] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  const accountRef = useRef(null);

  // close dropdown on outside click / ESC
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

  function submitSearch(e) {
    e.preventDefault();
    alert("Searching: " + q); // TODO: replace with real navigation
  }

  return (
    <header className="navbar">
      {/* Left: Logo only */}
      <a href="/" className="logo">
        <img src="/images/logo.png" alt="Artisan Avenue" />
      </a>

      {/* Center: links */}
      <nav className="nav-links">
        {["Home", "About", "Shop Handmade", "For Makers", "Blog", "Contact"].map((label, i) => {
          const href = ["/", "/about", "/services", "/for-makers", "/blog", "/contact"][i];
          return (
            <a key={label} href={href} className="nav-pill">
              {label}
            </a>
          );
        })}
      </nav>

      {/* Right: either icons or search bar */}
      <div className="right">
        {!searchOpen ? (
          <>
            {/* Account / Avatar */}
            <div className="icon-wrap" ref={accountRef}>
              <button
                className="icon-btn"
                aria-label="Account"
                onClick={() => setShowAccount((s) => !s)}
                disabled={loading}   // prevent clicks while hydrating
              >
                {loading ? (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#eee",
                    }}
                  />
                ) : user ? (
                  <Avatar user={user} size={32} />
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
                      <a href="/profile">Profile</a>
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
            <button className="icon-btn" aria-label="Wishlist">
              <FaHeart />
            </button>

            {/* Cart */}
            <button className="icon-btn" aria-label="Cart">
              <FaShoppingCart />
            </button>

            {/* Search trigger */}
            <button
              className="icon-btn"
              aria-label="Open search"
              onClick={() => setSearchOpen(true)}
            >
              <FaSearch />
            </button>
          </>
        ) : (
          <form className="search" onSubmit={submitSearch}>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
            />
            <button className="search-submit" type="submit">
              <FaSearch />
            </button>
            <button
              type="button"
              className="search-close"
              onClick={() => setSearchOpen(false)}
            >
              <FaTimes />
            </button>
          </form>
        )}
      </div>

      {/* Confirm logout modal */}
      <Confirm
        open={confirmOpen}
        title="Log out?"
        message="You’ll be signed out of your account."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await logout();              // clears cookie + resets auth context
          // optional redirect:
          // window.location.href = "/";
        }}
      />
    </header>
  );
}




