import React from "react";
import { Navigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = UserAuth();
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#202020" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(246,229,78,0.2)", borderTopColor: "#FF671F", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
