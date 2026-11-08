import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8">
      {/* Header / Navigation */}
      <header className="w-full max-w-6xl mx-auto flex justify-between items-center py-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-slate-950">
            U
          </div>
          <span className="font-bold text-xl text-white">USV Campus</span>
        </div>
        <div className="space-x-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Autentificare
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-2 text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white rounded-md transition-colors"
          >
            Înregistrare
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto text-center my-auto py-12">
        <div className="inline-block bg-sky-500/10 border border-sky-500/20 rounded-full px-4 py-1.5 mb-6 text-sm text-sky-400 font-medium">
          Platforma oficială pentru studenți
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6">
          Acces simplificat la <span className="text-sky-400">facilitățile și rezervările</span> universității
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Gestionează-ți accesul la sălile de lectură, terenurile de sport și alte facilități ale campusului într-un singur loc, rapid și eficient.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-lg shadow-sky-500/25 transition-colors"
          >
            Creează cont nou
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium rounded-md transition-colors"
          >
            Intră în cont
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 mb-4 font-bold">
              01
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Rezervări Rapide</h3>
            <p className="text-sm text-slate-400">
              Rezervă locuri în sălile de lectură sau spațiile comune cu doar câteva clicuri.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 mb-4 font-bold">
              02
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Facilități Campus</h3>
            <p className="text-sm text-slate-400">
              Vezi disponibilitatea în timp real pentru terenurile de sport și sălile speciale.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 mb-4 font-bold">
              03
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Acces Securizat</h3>
            <p className="text-sm text-slate-400">
              Autentificare securizată bazată pe adresa ta de email instituțională USV.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Universitatea „Ștefan cel Mare” din Suceava. Toate drepturile rezervate.
      </footer>
    </div>
  );
};