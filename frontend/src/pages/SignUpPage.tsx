import React, { useState } from "react";
import { useNavigate } from "react-router";
import { apiClient, ApiProblemError, unwrap } from "../api";
import { useAuth } from "../context/AuthContext";

export const SignUpPage: React.FC = () => {
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Parolele introduse nu se potrivesc.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const authResponse = await unwrap(
        apiClient.POST("/auth/register", {
          body: {
            fullName: fullName.trim(),
            email: email.trim(),
            password,
          },
        }),
      );

      setAuth(authResponse);
      navigate("/facilitati");
    } catch (err) {
      const problem = ApiProblemError.fromUnknown(err);
      const fieldErrors = Object.values(problem.getFieldErrorMap());
      setError(
        fieldErrors[0] ??
          problem.message ??
          "Nu s-a putut efectua înregistrarea.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-xl p-8 border border-slate-800 shadow-xl">
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4 mb-6 text-center">
          <h2 className="text-xl font-bold text-sky-400 mb-1">
            Creează un cont nou
          </h2>
          <p className="text-xs text-slate-400">
            Introdu datele tale pentru a solicita accesul la facilitățile
            campusului.
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
              Nume complet
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Popescu Ion"
              required
              minLength={2}
              maxLength={150}
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email instituțional
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
              minLength={8}
              maxLength={100}
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Confirmă parola
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Se creează contul..." : "Înregistrare"}
          </button>

          <div className="text-center mt-4 text-xs text-slate-400">
            Ai deja un cont?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-sky-400 hover:underline font-medium bg-transparent border-none p-0 cursor-pointer"
            >
              Autentifică-te
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};