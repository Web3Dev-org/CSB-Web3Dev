import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Loader2 } from "lucide-react";

import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { Navbar } from "./components/Navbar";

import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { FacilitiesPage } from "./pages/FacilitiesPage";
import { BookingWizardPage } from "./pages/BookingWizardPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PaymentLinkPage } from "./pages/PaymentLinkPage";
import { AdminDashboard } from "./pages/AdminDashboard";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
        Se verifică sesiunea...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();

  return (
    <ProtectedRoute>
      {isAdmin ? children : <Navigate to="/facilitati" replace />}
    </ProtectedRoute>
  );
};

const AppShell: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const defaultRoute = isAdmin ? "/admin" : "/facilitati";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar user={user} onLogout={logout} />

      <main className="flex-1">
        <Routes>
          {/* Pagina principală */}
          <Route
            path="/"
            element={
              isLoading ? null : isAuthenticated ? (
                <Navigate to={defaultRoute} replace />
              ) : (
                <LandingPage />
              )
            }
          />

          {/* Autentificare */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to={defaultRoute} replace />
              ) : (
                <LoginPage />
              )
            }
          />

          {/* Panou administrator */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Înregistrare (+ aliasuri compatibile) */}
          <Route
            path="/signup"
            element={
              isAuthenticated ? (
                <Navigate to={defaultRoute} replace />
              ) : (
                <SignUpPage />
              )
            }
          />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route
            path="/inregistrare"
            element={<Navigate to="/signup" replace />}
          />

          {/* Facilități sportive */}
          <Route
            path="/facilitati"
            element={
              <ProtectedRoute>
                <FacilitiesPage />
              </ProtectedRoute>
            }
          />

          {/* Rezervarea unei facilități */}
          <Route
            path="/rezervare/:idFacilitate"
            element={
              <ProtectedRoute>
                <BookingWizardPage />
              </ProtectedRoute>
            }
          />

          {/* Rezervările mele */}
          <Route
            path="/rezervarile-mele"
            element={
              <ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />

          {/* Plată prin link (metoda link_plata) */}
          <Route
            path="/plata/:token"
            element={
              <ProtectedRoute>
                <PaymentLinkPage />
              </ProtectedRoute>
            }
          />

          {/* Profil utilizator */}
          <Route
            path="/cont"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Rute inexistente */}
          <Route
            path="*"
            element={
              <Navigate
                to={isAuthenticated ? defaultRoute : "/login"}
                replace
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;