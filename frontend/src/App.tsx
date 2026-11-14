import React, { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Facilities } from './pages/Facilities';
import { BookingWizard } from './pages/BookingWizard';
import { LandingPage } from './pages/LandingPage';
import { SignUpPage } from './pages/SignUpPage';
import { ProfilePage } from './pages/ProfilePage';
import { MyBookings } from './pages/MyBookings';
import { AdminDashboard } from './pages/AdminDashboard';

export type UserRole = 'user' | 'admin';

export interface CurrentUser {
  email: string;
  role: UserRole;
}

export const App: React.FC = () => {
  // În loc de simplu boolean, ții utilizatorul curent (sau null dacă nu e logat)
  const [utilizator, setUtilizator] = useState<CurrentUser | null>(null);

  const autentificat = utilizator !== null;
  const esteAdmin = utilizator?.role === 'admin';

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

        <Navbar
          utilizatorAutentificat={autentificat}
          esteAdmin={esteAdmin} // <-- Pasează-l în Navbar ca să ascunzi link-ul "Admin" pentru userii normali
          numarNotificari={1}
          onLogout={() => setUtilizator(null)}
        />

        <main className="flex-1">
          <Routes>
            {/* Autentificare */}
            <Route
              path="/login"
              element={
                autentificat ? (
                  <Navigate to={esteAdmin ? "/admin" : "/facilitati"} replace />
                ) : (
                  <Login
                    onLoginSuccess={(user) => setUtilizator(user)}
                  />
                )
              }
            />

            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Rute pentru orice utilizator logat */}
            <Route
              path="/facilitati"
              element={autentificat ? <Facilities /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/rezervare/:idFacilitate"
              element={autentificat ? <BookingWizard /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/rezervarile-mele"
              element={autentificat ? <MyBookings /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/cont"
              element={autentificat ? <ProfilePage /> : <Navigate to="/login" replace />}
            />

            {/* Rută protejată DOAR pentru Admin */}
            <Route
              path="/admin"
              element={
                !autentificat ? (
                  <Navigate to="/login" replace />
                ) : esteAdmin ? (
                  <AdminDashboard />
                ) : (
                  // Dacă e logat ca 'user' și tastează /admin în URL, îl trimiți înapoi
                  <Navigate to="/facilitati" replace />
                )
              }
            />

            <Route
              path="*"
              element={<Navigate to={autentificat ? "/facilitati" : "/login"} replace />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;