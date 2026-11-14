import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

export const Confirm: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-6">
      <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl flex items-center justify-center mx-auto">
        <Check className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Rezervare plătită · status: Rezervat</h2>
        <p className="text-sm text-slate-400">
          Notificarea în aplicație și factura PDF au fost generate.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <button
          type="button"
          onClick={() => alert('Factura PDF se descarcă...')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          Descarcă factura PDF
        </button>
        <button
          type="button"
          onClick={() => navigate('/rezervarile-mele')}
          className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          Rezervările mele
        </button>
      </div>

      <p className="text-xs text-slate-500 pt-2">Reminder: 60 min înainte de început.</p>
    </div>
  );
};