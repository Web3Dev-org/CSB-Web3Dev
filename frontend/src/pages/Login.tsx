import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLoginSuccess?: (userData: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(errorMsg || 'Email sau parolă incorectă.');
      }

      const userData = await response.json();

      // Salvează datele utilizatorului în localStorage (sau state manager)
      localStorage.setItem('user', JSON.stringify(userData));

      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }

      navigate('/facilitati');
    } catch (err: any) {
      setError(err.message || 'Ceva nu a mers bine.');
    } finally {
      setLoading(false);
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="student@usv.ro"
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Se autentifică...' : 'Autentificare'}
          </button>

          <div className="flex justify-between items-center text-xs mt-4">
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="text-sky-400 hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              Nu ai cont? Înregistrează-te
            </button>
            <a href="#reset" className="text-slate-400 hover:text-sky-400 hover:underline">
              Ai uitat parola?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};