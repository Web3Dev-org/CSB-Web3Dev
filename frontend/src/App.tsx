import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Loader2 } from "lucide-react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";

import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { FacilitiesPage } from "./pages/FacilitiesPage";
import { BookingWizardPage } from "./pages/BookingWizardPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { ProfilePage } from "./pages/ProfilePage";

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

const AppShell: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

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
                <Navigate to="/facilitati" replace />
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
                <Navigate to="/facilitati" replace />
              ) : (
                <LoginPage />
              )
            }
          />

          {/* Înregistrare (+ aliasuri compatibile) */}
          <Route
            path="/signup"
            element={
              isAuthenticated ? (
                <Navigate to="/facilitati" replace />
              ) : (
                <SignUpPage />
              )
            }
          />
          <Route
            path="/register"
            element={<Navigate to="/signup" replace />}
          />
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
                to={isAuthenticated ? "/facilitati" : "/login"}
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