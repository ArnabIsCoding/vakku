import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import "./SignInPage.css";

const SignInPage: React.FC = () => {
  const { googleSignIn, user, loading } = UserAuth();
  const navigate = useNavigate();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  const handleSignIn = async () => {
    setSigning(true);
    setError("");
    try {
      await googleSignIn();
      navigate("/");
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setSigning(false);
    }
  };

  return (
    <main className="signin-page">
      <div className="signin-page__split">

        <div className="signin-left">
          <div className="signin-left__logo">Vakku</div>
          <div className="signin-left__body">
            <h1 className="signin-left__headline">
              Your vote<br />shapes<br />India.
            </h1>
            <div className="signin-left__rule" />
          </div>
          <div className="signin-left__ghost" aria-hidden="true">IN</div>
        </div>

        <div className="signin-right">
          <div className="signin-form">
            <span className="signin-form__tag">Access · Continue</span>
            <h2 className="signin-form__headline">
              {("signIn")}
            </h2>
            <p className="signin-form__sub">{("signIn")}</p>

            <ul className="signin-form__perks">
              <li>Save your state &amp; constituency</li>
              <li>Personalised election reminders</li>
              <li>5 AI analyses per day (vs 1 guest)</li>
            </ul>

            {error && (
              <div className="signin-form__error" role="alert">{error}</div>
            )}

            <button
              className="signin-form__google-btn"
              onClick={handleSignIn}
              disabled={signing || loading}
            >
              {signing ? (
                <><span className="spinner" /> {("signingIn")}</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {("googleSignIn")}
                </>
              )}
            </button>

            <p className="signin-form__fine">
              Data used only for educational purposes. No spam.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
};

export default SignInPage;
