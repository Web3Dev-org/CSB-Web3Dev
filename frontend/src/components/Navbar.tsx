
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';

interface NavbarProps {
  utilizatorAutentificat: boolean;
  numarNotificari?: number;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  utilizatorAutentificat,
  numarNotificari = 0,
  onLogout,
}) => {
  const navigate = useNavigate();

  const handleLogoutClick = (): void => {
    if (onLogout) {
      onLogout();
    }

    navigate('/login');
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 flex items-center justify-between">

      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2 text-xl font-bold text-sky-400"
      >
        <span>⚽</span>
        <span>Rezervări Sport USV</span>
      </Link>

      {/* Navigare utilizator autentificat */}
      {utilizatorAutentificat && (
        <nav className="flex items-center gap-6">

          {/* Facilități */}
          <Link
            to="/facilitati"
            className="hover:text-sky-400 transition-colors"
          >
            Facilități
          </Link>

          {/* Rezervările mele */}
          <Link
            to="/rezervarile-mele"
            className="hover:text-sky-400 transition-colors"
          >
            Rezervările mele
          </Link>

          {/* Profil */}
          <Link
            to="/cont"
            className="hover:text-sky-400 transition-colors"
          >
            Cont
          </Link>

          {/* Administrare */}
          <Link
            to="/admin"
            className="hover:text-sky-400 transition-colors"
          >
            Admin
          </Link>

          {/* Notificări */}
          <div className="relative flex items-center">
            <Bell className="w-5 h-5 cursor-pointer text-slate-300 hover:text-white" />

            {numarNotificari > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-xs text-black font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {numarNotificari}
              </span>
            )}
          </div>

          {/* Deconectare */}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="bg-slate-800 hover:bg-slate-700 text-sm px-3 py-1.5 rounded-md border border-slate-700 transition-colors"
          >
            Deconectare
          </button>

        </nav>
      )}
    </header>
  );
};
