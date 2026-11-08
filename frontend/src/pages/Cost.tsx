import React from 'react';

interface CostProps {
  totalBrut: number;
  procentReducere: number;
  onNext: (totalFinal: number) => void;
  onBack: () => void;
}

export const Cost: React.FC<CostProps> = ({
  totalBrut,
  procentReducere,
  onNext,
  onBack,
}) => {
  const sumaReducere = (totalBrut * procentReducere) / 100;
  const totalFinal = totalBrut - sumaReducere;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">Verificare disponibilitate · cost total</h2>

      <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex justify-between items-center text-sm text-slate-300">
          <span>Facilitate (1×)</span>
          <span className="font-semibold text-white">{totalBrut} lei</span>
        </div>
        <div className="flex justify-between items-center text-sm text-slate-300">
          <span>Reducere Student ({procentReducere}%)</span>
          <span className="font-semibold text-emerald-400">-{sumaReducere} lei</span>
        </div>
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-base font-bold text-white">
          <span>Total</span>
          <span className="text-xl text-sky-400">{totalFinal} lei</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        Intervalul este liber, poți continua către plată.
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
          onClick={() => onNext(totalFinal)}
          className="bg-sky-500 hover:bg-sky-600 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors"
        >
          Plătește online
        </button>
      </div>
    </div>
  );
};