import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { Bell, CheckCheck } from "lucide-react";
import {
  apiClient,
  clearAccessToken,
  unwrap,
  type Notification,
  type User,
} from "../api";

interface NavbarProps {
  user: User | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const data = await unwrap(
        apiClient.GET("/notifications", {
          params: { query: { unreadOnly: false } },
        }),
      );
      setNotifications(data);
    } catch {
      // Erorile 401 sunt gestionate global de authMiddleware
    }
  }, [user]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: number): Promise<void> => {
    try {
      await unwrap(
        apiClient.PATCH("/notifications/{id}/read", {
          params: { path: { id: notificationId } },
        }),
      );
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
      );
    } catch {
      // Ignoră eroarea tranzitorie la marcare
    }
  };

  const handleLogoutClick = (): void => {
    clearAccessToken();
    onLogout?.();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    isActive
      ? "text-sky-400 font-medium transition-colors"
      : "text-slate-300 hover:text-sky-400 transition-colors";

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <Link
        to="/"
        className="flex items-center gap-2 text-xl font-bold text-sky-400"
      >
        <span>⚽</span>
        <span>Rezervări Sport USV</span>
      </Link>

      {user ? (
        <nav className="flex items-center gap-6">
          <NavLink to="/facilitati" className={navLinkClass}>
            Facilități
          </NavLink>

          <NavLink to="/rezervarile-mele" className={navLinkClass}>
            Rezervările mele
          </NavLink>

          <NavLink to="/cont" className={navLinkClass}>
            Cont
          </NavLink>

          {user.role === "admin" && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}

          {/* Popover Notificări */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              aria-label="Notificări"
              onClick={() => {
                const next = !dropdownOpen;
                setDropdownOpen(next);
                if (next) void fetchNotifications();
              }}
              className="relative flex items-center p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-[11px] text-slate-950 font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    Notificări ({unreadCount} necitite)
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/70">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-slate-400 text-center">
                      Nu ai notificări momentan.
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3.5 text-xs space-y-1.5 transition-colors ${
                          notif.isRead ? "bg-slate-900/50" : "bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={
                              notif.isRead
                                ? "text-slate-400"
                                : "text-slate-100 font-medium"
                            }
                          >
                            {notif.message}
                          </p>
                          {!notif.isRead && (
                            <button
                              type="button"
                              title="Marchează ca citită"
                              onClick={() => void handleMarkAsRead(notif.id)}
                              className="text-sky-400 hover:text-sky-300 shrink-0 cursor-pointer"
                            >
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-500">
                          {new Date(notif.createdAt).toLocaleString("ro-RO", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="bg-slate-800 hover:bg-slate-700 text-sm px-3 py-1.5 rounded-md border border-slate-700 transition-colors cursor-pointer"
          >
            Deconectare
          </button>
        </nav>
      ) : (
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
          >
            Autentificare
          </Link>
          <Link
            to="/signup"
            className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors"
          >
            Înregistrare
          </Link>
        </div>
      )}
    </header>
  );
};