import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import App from "./App";
import "./index.css";
import useBackendWakeup from "./hooks/useBackendWakeup";
import WakeupScreen from "./components/WakeupScreen";

function Root() {
  const { isReady, elapsedSeconds } = useBackendWakeup("https://nl2sql-analytics-copilot-backend.onrender.com/health");
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    if (isReady) {
      // 500ms delay to allow face-out transition to complete smoothly
      const timer = setTimeout(() => setShowApp(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  if (!showApp) {
    return <WakeupScreen elapsed={elapsedSeconds} isReady={isReady} />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);