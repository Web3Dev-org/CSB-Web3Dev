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

export const App: React.FC = () => {
  const [autentificat, setAutentificat] = useState<boolean>(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

        <Navbar
          utilizatorAutentificat={autentificat}
          numarNotificari={1}
          onLogout={() => setAutentificat(false)}
        />

        <main className="flex-1">
          <Routes>

            <Route
              path="/login"
              element={
                autentificat ? (
                  <Navigate to="/facilitati" replace />
                ) : (
                  <Login
                    onLoginSuccess={() => setAutentificat(true)}
                  />
                )
              }
            />

            <Route
              path="/facilitati"
              element={
                autentificat ? (
                  <Facilities />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/rezervare/:idFacilitate"
              element={
                autentificat ? (
                  <BookingWizard />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/"
              element={<LandingPage />}
            />

            <Route
              path="/signup"
              element={<SignUpPage />}
            />

            <Route
              path="/cont"
              element={<ProfilePage />}
            />

            <Route
              path="*"
              element={
                <Navigate
                  to={autentificat ? "/facilitati" : "/login"}
                  replace
                />
              }
            />

          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;