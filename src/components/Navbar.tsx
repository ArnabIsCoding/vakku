import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const { user, logOut } = UserAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);



  const navLinks = [
    { path: "/",              label: ("home")         },
    { path: "/consequences",  label: ("consequences") },
    { path: "/best-time",     label: ("bestTime")     },
    { path: "/voter-trends",  label: ("voterTrends")  },
  ];

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          VAKKU
        </Link>

        <ul className="navbar__links">
          {navLinks.map(({ path, label }) => (
            <li key={path}>
              <Link
                to={path}
                className={`navbar__link${location.pathname === path ? " navbar__link--active" : ""}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="navbar__right">
          {user ? (
            <button className="btn-ghost navbar__signout" onClick={logOut}>
              {("signOut")}
            </button>
          ) : (
            <Link to="/signin" className="btn-primary navbar__signin">
              {("signIn")}
            </Link>
          )}
          <button
            className={`navbar__hamburger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="navbar__mobile">
          {navLinks.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className="navbar__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          </div>
      )}
    </nav>
  );
};

export default Navbar;
