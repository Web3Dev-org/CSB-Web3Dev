import React, { useState } from 'react';

interface TermsProps {
  onNext: () => void;
  onBack: () => void;
}

export const Terms: React.FC<TermsProps> = ({ onNext, onBack }) => {
  const [termeniAcceptati, setTermeniAcceptati] = useState<boolean>(false);
  const [eroare, setEroare] = useState<string>('');

  const handleContinue = (): void => {
    if (!termeniAcceptati) {
      setEroare('Trebuie să accepți termenii și condițiile pentru a continua.');
      return;
    }
    setEroare('');
    onNext();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">Acceptare termeni și condiții</h2>

      <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3 text-sm text-slate-300 leading-relaxed">
        <p>1. Rezervarea este personală și nu poate fi cedată.</p>
        <p>2. Anularea gratuită este posibilă cu cel puțin <strong>12 ore</strong> înainte de începere.</p>
        <p>3. Echipamentul deteriorat se achită de utilizator.</p>
        <p>4. Accesul se face cu legitimația USV, cu 10 minute înainte de oră.</p>
        <p>5. Reducerile (Student 50%, Cadru didactic 25%) se aplică pe baza statutului din Cont.</p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
          <input
            type="checkbox"
            checked={termeniAcceptati}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setTermeniAcceptati(e.target.checked);
              if (e.target.checked) setEroare('');
            }}
            className="accent-sky-500 rounded"
          />
          Accept termenii și condițiile
        </label>
        {eroare && <p className="text-xs text-rose-400 font-medium">{eroare}</p>}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors"
        >
          Înapoi
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className={`font-medium text-sm px-6 py-2 rounded-lg transition-colors ${
            termeniAcceptati
              ? 'bg-sky-500 hover:bg-sky-600 text-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          Trimite cererea de rezervare
        </button>
      </div>
    </div>
  );
};