import React, { useState } from 'react';
import type { TipRezervare } from '../types/database';

export interface EchipamentOption {
  id: number;
  nume: string;
  pret: number;
  selectat: boolean;
}

export interface DatePas1 {
  tip: TipRezervare;
  echipamente: EchipamentOption[];
  slotSelectat: string | null;
  totalEstimat: number;
}

interface Step1Props {
  pretPeOra: number;
  pretPeJoc: number;
  onNext: (dateRezervare: DatePas1) => void;
}

export const Options: React.FC<Step1Props> = ({
    
  pretPeOra,
  pretPeJoc,
  onNext,
}) => {
  const [tipRezervare, setTipRezervare] = useState<TipRezervare>('PE_ORA');
  const [slotSelectat, setSlotSelectat] = useState<string | null>(null);
  const [eroareValidation, setEroareValidation] = useState<string>('');

  const [echipamente, setEchipamente] = useState<EchipamentOption[]>([
    { id: 1, nume: 'Mingi (+10 lei)', pret: 10, selectat: false },
    { id: 2, nume: 'Veste (+5 lei)', pret: 5, selectat: false },
    { id: 3, nume: 'Plasă volei (+15 lei)', pret: 15, selectat: false },
  ]);

  const zile = [
    'sâm, 31 oct.',
    'dum, 1 nov.',
    'lun, 2 nov.',
    'mar, 3 nov.',
    'mie, 4 nov.',
    'joi, 5 nov.',
    'vin, 6 nov.',
  ];

  const ore = [
    '8:00',
    '9:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
  ];

  const sloturiOcupate: Record<string, boolean> = {
    'sâm, 31 oct.-10:00': true,
    'sâm, 31 oct.-15:00': true,
    'sâm, 31 oct.-20:00': true,
    'dum, 1 nov.-11:00': true,
    'dum, 1 nov.-16:00': true,
    'lun, 2 nov.-12:00': true,
    'lun, 2 nov.-17:00': true,
    'mar, 3 nov.-8:00': true,
    'mar, 3 nov.-13:00': true,
    'mar, 3 nov.-18:00': true,
    'mie, 4 nov.-9:00': true,
    'mie, 4 nov.-14:00': true,
    'mie, 4 nov.-19:00': true,
    'joi, 5 nov.-10:00': true,
    'joi, 5 nov.-15:00': true,
    'joi, 5 nov.-20:00': true,
    'vin, 6 nov.-11:00': true,
    'vin, 6 nov.-16:00': true,
  };

  const handleToggleEchipament = (id: number): void => {
    setEchipamente((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selectat: !e.selectat } : e))
    );
  };

  const handleSelectSlot = (cheieSlot: string): void => {
    setSlotSelectat(cheieSlot);
    setEroareValidation('');  
  };

  
  const costBaza = tipRezervare === 'PE_ORA' ? pretPeOra : pretPeJoc;
  const costEchipamente = echipamente
    .filter((e) => e.selectat)
    .reduce((sum, e) => sum + e.pret, 0);
  const totalEstimat = slotSelectat ? costBaza + costEchipamente : 0;

  const handleContinue = (): void => {
    
    if (!slotSelectat) {
      setEroareValidation('Selectați mai întâi un interval orar liber din calendar!');
      return;
    }

    setEroareValidation('');
    onNext({
      tip: tipRezervare,
      echipamente,
      slotSelectat,
      totalEstimat,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Panou Stânga: Opțiuni Tip Rezervare & Echipamente */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Tip rezervare</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
              <input
                type="radio"
                name="tipRezervare"
                checked={tipRezervare === 'PE_ORA'}
                onChange={() => setTipRezervare('PE_ORA')}
                className="accent-sky-500"
              />
              Pe oră ({pretPeOra} lei/oră)
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
              <input
                type="radio"
                name="tipRezervare"
                checked={tipRezervare === 'PE_JOC'}
                onChange={() => setTipRezervare('PE_JOC')}
                className="accent-sky-500"
              />
              Pe joc ({pretPeJoc} lei/joc)
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Echipament extra</h3>
          <div className="space-y-2">
            {echipamente.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 cursor-pointer text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={item.selectat}
                  onChange={() => handleToggleEchipament(item.id)}
                  className="accent-sky-500 rounded"
                />
                {item.nume}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Panou Dreapta: Calendar 7 Zile */}
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-white">Calendar 7 zile</h3>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500 inline-block"></span>
              liber
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500 inline-block"></span>
              ocupat
            </span>
          </div>
        </div>

        {/* Notificare de Eroare/Validare în caz că nu a ales slotul */}
        {eroareValidation && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium">
            {eroareValidation}
          </div>
        )}

        {/* Tabelul Grilă al Calendarului */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="p-2 text-left">Ora</th>
                {zile.map((zi) => (
                  <th key={zi} className="p-2 font-medium">
                    {zi}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ore.map((ora) => (
                <tr key={ora} className="border-b border-slate-800/40">
                  <td className="p-2 text-slate-400 text-left font-mono">{ora}</td>
                  {zile.map((zi) => {
                    const cheieSlot = `${zi}-${ora}`;
                    const esteOcupat = !!sloturiOcupate[cheieSlot];
                    const esteSelectat = slotSelectat === cheieSlot;

                    return (
                      <td key={cheieSlot} className="p-1">
                        <button
                          type="button"
                          disabled={esteOcupat}
                          onClick={() => handleSelectSlot(cheieSlot)}
                          className={`w-full py-1.5 px-2 rounded font-medium transition-all ${
                            esteOcupat
                              ? 'bg-amber-950/40 text-amber-600 border border-amber-900/40 cursor-not-allowed'
                              : esteSelectat
                              ? 'bg-sky-500 text-white font-bold ring-2 ring-sky-300 shadow-md'
                              : 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/40 cursor-pointer'
                          }`}
                        >
                          {esteOcupat ? 'ocupat' : 'liber'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total estimat & Buton Continuă */}
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 block">
              Selecție: {slotSelectat || 'Nicio oră selectată'}
            </span>
            <span className="text-sm font-bold text-white">
              Total estimat:{' '}
              <span className="text-sky-400 text-lg">{totalEstimat} lei</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className={`font-medium text-sm px-6 py-2.5 rounded-lg transition-colors ${
              slotSelectat
                ? 'bg-sky-500 hover:bg-sky-600 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            Continuă
          </button>
        </div>
      </div>
    </div>
  );
};