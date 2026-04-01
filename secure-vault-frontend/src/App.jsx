import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import VaultCore from "./components/VaultCore";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import AuditDashboard from "./components/AuditDashboard";

// A simple placeholder for Phase 4
const AuditPage = () => (
  <div className="p-8 font-mono">SYSTEM AUDIT LOGS: [ENCRYPTED]</div>
);

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-vault-black text-vault-accent selection:bg-vault-accent selection:text-black">
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />

              {/* Private Routes (Wrapped in ProtectedRoute) */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <VaultCore />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/audit"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    {/* <AuditPage /> */}
                    <AuditDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}