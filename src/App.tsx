import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthContextProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles/globals.css";

const HomePage         = lazy(() => import("./pages/HomePage"));
const SignInPage       = lazy(() => import("./pages/SignInPage"));
const ConsequencesPage = lazy(() => import("./pages/ConsequencesPage"));
const BestTimePage     = lazy(() => import("./pages/BestTimePage"));
const VoterTrendsPage  = lazy(() => import("./pages/VoterTrendsPage"));

const Loader: React.FC = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#202020" }} role="status">
    <div style={{ width: 36, height: 36, border: "2px solid rgba(246,229,78,0.15)", borderTopColor: "#FF671F", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
  </div>
);

const NotFound: React.FC = () => (
  <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#202020", gap: 24, padding: "0 24px", textAlign: "center" }}>
    <span style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: "clamp(80px, 18vw, 160px)", color: "#FF671F", lineHeight: 1, fontWeight: 900 }}>404</span>
    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase" }}>Page not found</p>
    <a href="/" className="btn-primary">← Back to Home</a>
  </div>
);

const App: React.FC = () => (
  <BrowserRouter>
    <AuthContextProvider>
      <ScrollToTop />
      <Navbar />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/"       element={<HomePage />}   />
          <Route path="/signin" element={<SignInPage />} />

          <Route
            path="/consequences"
            element={
              <ProtectedRoute>
                <ConsequencesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/best-time"
            element={
              <ProtectedRoute>
                <BestTimePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/voter-trends"
            element={
              <ProtectedRoute>
                <VoterTrendsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthContextProvider>
  </BrowserRouter>
);

export default App;
