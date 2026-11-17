import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient, ApiProblemError, unwrap, type User } from "../api";
import { useAuth } from "../context/AuthContext";

type ReminderOption = User["reminderMinutes"];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserState } = useAuth();

  const [fullName, setFullName] = useState<string>(user?.fullName ?? "");
  const [phone, setPhone] = useState<string>(user?.phone ?? "");
  const [notifyInApp, setNotifyInApp] = useState<boolean>(
    user?.notifyInApp ?? true,
  );
  const [notifyEmail, setNotifyEmail] = useState<boolean>(
    user?.notifyEmail ?? true,
  );
  const [reminderMinutes, setReminderMinutes] = useState<ReminderOption>(
    user?.reminderMinutes ?? 60,
  );

  // Stări pentru resetare parolă conform contractului (/auth/forgot-password + /auth/reset-password)
  const [resetTokenSent, setResetTokenSent] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");

  const [infoMessage, setInfoMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setPhone(user.phone ?? "");
    setNotifyInApp(user.notifyInApp);
    setNotifyEmail(user.notifyEmail);
    setReminderMinutes(user.reminderMinutes);
  }, [user]);

  const handleUpdateProfile = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setLoading(true);

    try {
      const updatedUser = await unwrap(
        apiClient.PATCH("/users/me", {
          body: {
            fullName: fullName.trim(),
            phone: phone.trim() ? phone.trim() : null,
            notifyInApp,
            notifyEmail,
            reminderMinutes,
          },
        }),
      );

      updateUserState(updatedUser);
      setInfoMessage("Profilul a fost actualizat cu succes!");
    } catch (err) {
      setErrorMessage(ApiProblemError.fromUnknown(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordToken = async (): Promise<void> => {
    if (!user) return;
    setErrorMessage("");
    setInfoMessage("");
    setLoading(true);

    try {
      await unwrap(
        apiClient.POST("/auth/forgot-password", {
          body: { email: user.email },
        }),
      );
      setResetTokenSent(true);
      setInfoMessage(
        `Un token de resetare a parolei a fost trimis pe ${user.email}.`,
      );
    } catch (err) {
      setErrorMessage(ApiProblemError.fromUnknown(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    if (newPassword !== confirmNewPassword) {
      setErrorMessage("Parolele noi nu se potrivesc.");
      return;
    }

    setLoading(true);
    try {
      await unwrap(
        apiClient.POST("/auth/reset-password", {
          body: {
            token: resetToken.trim(),
            newPassword,
          },
        }),
      );
      setInfoMessage("Parola a fost modificată cu succes!");
      setResetToken("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetTokenSent(false);
    } catch (err) {
      setErrorMessage(ApiProblemError.fromUnknown(err).message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Setări Profil</h1>
            <p className="text-xs text-slate-400">
              Gestionează datele personale, securitatea și preferințele
              contului.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/facilitati")}
            className="text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
          >
            ← Înapoi
          </button>
        </div>

        {/* Mesaje Feedback */}
        {infoMessage && (
          <div className="bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-md p-3 text-xs text-center">
            {infoMessage}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-md p-3 text-xs text-center">
            {errorMessage}
          </div>
        )}

        {/* 1. Date Personale & Preferințe */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-sky-400">
              Informații Personale
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              {user.statusLabel} · Reducere {user.discountPercent}%
              {user.statusVerified ? " (verificat)" : " (neverificat)"}
            </span>
          </div>

          <form
            onSubmit={(e) => void handleUpdateProfile(e)}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Email (neconfigurabil)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-slate-950/50 border border-slate-800 rounded-md px-3 py-2 text-slate-500 cursor-not-allowed text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nume Complet
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
                  required
                  minLength={2}
                  maxLength={150}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Număr de Telefon
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+40740123456"
                  maxLength={30}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
                />
              </div>
            </div>

            {/* Preferințe Notificări */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <span className="block text-sm font-medium text-slate-300">
                Notificări & Memento-uri
              </span>

              <div className="flex items-center space-x-6 text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyInApp}
                    onChange={(e) => setNotifyInApp(e.target.checked)}
                    className="accent-sky-500 rounded"
                  />
                  <span className="text-slate-300">În aplicație</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="accent-sky-500 rounded"
                  />
                  <span className="text-slate-300">Pe Email</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Memento înainte de rezervare
                </label>
                <select
                  value={reminderMinutes}
                  onChange={(e) =>
                    setReminderMinutes(Number(e.target.value) as ReminderOption)
                  }
                  className="bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value={30}>30 minute</option>
                  <option value={60}>1 oră</option>
                  <option value={120}>2 ore</option>
                  <option value={1440}>24 ore (1 zi)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              Salvează modificările
            </button>
          </form>
        </div>

        {/* 2. Schimbare Parolă (prin token email conform API) */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-sky-400">
                Securitate Parolă
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Solicită un token de securitate pe email pentru a seta o parolă
                nouă.
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void handleRequestPasswordToken()}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium px-3.5 py-2 rounded-md text-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {resetTokenSent
                ? "Retrimite token pe email"
                : "Solicită token resetare"}
            </button>
          </div>

          <form
            onSubmit={(e) => void handleResetPassword(e)}
            className="space-y-4 pt-2 border-t border-slate-800"
          >
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Token de resetare (primit pe {user.email})
              </label>
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Introdu token-ul primit pe email"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Parola nouă (minim 8 caractere)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Confirmă parola nouă
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              Actualizează parola
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};