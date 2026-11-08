import React, { useState } from 'react';

interface PaymentProps {
  sumaPlata: number;
  onNext: () => void;
  onBack: () => void;
}

export const Payment: React.FC<PaymentProps> = ({ sumaPlata, onNext, onBack }) => {
  const [numarCard, setNumarCard] = useState<string>('');
  const [expirare, setExpirare] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [eroare, setEroare] = useState<string>('');

  const handlePay = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (numarCard.replace(/\s/g, '').length !== 16) {
      setEroare('Numărul cardului trebuie să conțină exact 16 cifre.');
      return;
    }
    if (!expirare.includes('/') || expirare.length !== 5) {
      setEroare('Data expirării trebuie să fie în formatul LL/AA (ex: 12/28).');
      return;
    }
    if (cvv.length !== 3) {
      setEroare('Codul CVV trebuie să aibă 3 cifre.');
      return;
    }

    setEroare('');
    onNext();
  };

  return (
    <form onSubmit={handlePay} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">Plată bancară online</h2>

      {eroare && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium">
          {eroare}
        </div>
      )}

      <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Număr card</label>
          <input
            type="text"
            maxLength={19}
            value={numarCard}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumarCard(e.target.value)}
            placeholder="1234 5678 9012 3456"
            className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Expirare</label>
            <input
              type="text"
              maxLength={5}
              value={expirare}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpirare(e.target.value)}
              placeholder="LL/AA"
              className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">CVV</label>
            <input
              type="password"
              maxLength={3}
              value={cvv}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCvv(e.target.value)}
              placeholder="123"
              className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="pt-2 text-sm text-slate-300 font-semibold">
          Sumă de plată: <span className="text-sky-400">{sumaPlata} lei</span>
        </div>
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
          type="submit"
          className="bg-sky-500 hover:bg-sky-600 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors"
        >
          Efectuează plata
        </button>
      </div>
    </form>
  );
};