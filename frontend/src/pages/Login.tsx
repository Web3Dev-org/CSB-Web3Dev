import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('');
  const [parola, setParola] = useState<string>('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onLoginSuccess();
    navigate('/facilitati');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-xl p-8 border border-slate-800 shadow-xl">
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4 mb-6 text-center">
          <h2 className="text-xl font-bold text-sky-400 mb-1">
            Autentificare în aplicație
          </h2>
          <p className="text-xs text-slate-400">
            Introdu adresa de email instituțională și parola pentru a continua către facilități și rezervări.
          </p>
        </div>

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
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Parolă
            </label>
            <input
              type="password"
              value={parola}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParola(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 rounded-md transition-colors"
          >
            Autentificare
          </button>

          <div className="text-center mt-4">
            <a href="#reset" className="text-sm text-sky-400 hover:underline">
              Ai uitat parola?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};