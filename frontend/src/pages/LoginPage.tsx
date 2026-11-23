import React, { useState } from "react";
import { useNavigate } from "react-router";
import { apiClient, ApiProblemError, unwrap } from "../api";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Stare modal resetare parolă (/auth/forgot-password + /auth/reset-password)
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [resetEmail, setResetEmail] = useState<string>("");
  const [resetToken, setResetToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [resetMessage, setResetMessage] = useState<string>("");
  const [resetError, setResetError] = useState<string>("");
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const authResponse = await unwrap(
        apiClient.POST("/auth/login", {
          body: { email: email.trim(), password },
        }),
      );

      setAuth(authResponse);
      navigate("/facilitati");
    } catch (err) {
      const problem = ApiProblemError.fromUnknown(err);
      setError(problem.message || "Email sau parolă incorectă.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetLoading(true);

    try {
      await unwrap(
        apiClient.POST("/auth/forgot-password", {
          body: { email: resetEmail.trim() },
        }),
      );
      setResetMessage(
        "Dacă adresa există, instrucțiunile și token-ul de resetare au fost trimise pe e-mail.",
      );
      setResetStep("confirm");
    } catch (err) {
      setResetError(ApiProblemError.fromUnknown(err).message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetLoading(true);

    try {
      await unwrap(
        apiClient.POST("/auth/reset-password", {
          body: {
            token: resetToken.trim(),
            newPassword,
          },
        }),
      );
      setResetMessage(
        "Parola a fost actualizată cu succes. Te poți autentifica acum.",
      );
      setResetToken("");
      setNewPassword("");
    } catch (err) {
      setResetError(ApiProblemError.fromUnknown(err).message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-xl p-8 border border-slate-800 shadow-xl">
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4 mb-6 text-center">
          <h2 className="text-xl font-bold text-sky-400 mb-1">
            Autentificare în aplicație
          </h2>
          <p className="text-xs text-slate-400">
            Introdu adresa de email instituțională și parola pentru a continua.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mb-4 text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@student.usv.ro"
              required
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Parolă
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Se autentifică..." : "Autentificare"}
          </button>

          <div className="flex justify-between items-center text-xs mt-4">
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="text-sky-400 hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              Nu ai cont? Înregistrează-te
            </button>
            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setResetError("");
                setResetMessage("");
                setResetStep("request");
                setResetModalOpen(true);
              }}
              className="text-slate-400 hover:text-sky-400 hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              Ai uitat parola?
            </button>
          </div>
        </form>
      </div>

      {/* Modal Resetare Parolă */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Resetare parolă</h3>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Închide
              </button>
            </div>

            {resetMessage && (
              <div className="bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-md p-3 text-xs">
                {resetMessage}
              </div>
            )}

            {resetError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-md p-3 text-xs">
                {resetError}
              </div>
            )}

            {resetStep === "request" ? (
              <form
                onSubmit={(e) => void handleForgotPassword(e)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Adresa de email a contului
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="student@student.usv.ro"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setResetStep("confirm")}
                    className="text-xs text-sky-400 hover:underline cursor-pointer"
                  >
                    Am deja un token
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? "Se trimite..." : "Trimite token"}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e) => void handleResetPassword(e)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Token primit pe email
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Introdu token-ul de resetare"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Parolă nouă (minim 8 caractere)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setResetStep("request")}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ← Retrimite email
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? "Se salvează..." : "Salvează parola"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};