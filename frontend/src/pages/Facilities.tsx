import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Facilitate } from '../types/database';

interface FacilitateUI extends Facilitate {
  descriere: string;
  esteDisponibil: boolean;
}

export const Facilities: React.FC = () => {
  const navigate = useNavigate();

  const [facilitati] = useState<FacilitateUI[]>([
    {
      id: 1,
      nume: 'Sala Polivalentă',
      pretPeOra: 40,
      multiplicatorJoc: 1.5,
      descriere: 'Ideală pentru antrenamente, meciuri și activități sportive cu echipă.',
      esteDisponibil: true,
    },
    {
      id: 2,
      nume: 'Teren de tenis',
      pretPeOra: 30,
      multiplicatorJoc: 1.5,
      descriere: 'Momentan ocupat. Poți alege alt interval sau altă facilitate.',
      esteDisponibil: false,
    },
    {
      id: 3,
      nume: 'Sala de fitness',
      pretPeOra: 20,
      multiplicatorJoc: 1.0,
      descriere: 'Spațiu pregătit pentru antrenament individual și sesiuni în aer liber.',
      esteDisponibil: true,
    },
    {
      id: 4,
      nume: 'Bază sportivă',
      pretPeOra: 50,
      multiplicatorJoc: 1.5,
      descriere: 'Spațiu extins pentru antrenamente, jocuri și activități de grup.',
      esteDisponibil: true,
    },
  ]);

  const handleRezervaClick = (idFacilitate: number): void => {
    navigate(`/rezervare/${idFacilitate}`);
  };

  const totalFacilitati = facilitati.length;

  const numarIndisponibile = facilitati.filter(
    (f) => !f.esteDisponibil
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 space-y-8">

      <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Interfața de închirieri · status în timp real
          </span>

          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
            Interfața de închirieri
          </h1>

          <p className="text-slate-400 text-sm mt-1">
            Alege o sală, verifică disponibilitatea și rezervă rapid.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 text-center min-w-40">
          <span className="text-xs text-slate-400 block font-medium">
            Astăzi
          </span>

          <span className="text-2xl font-bold text-white block">
            {totalFacilitati} facilități
          </span>

          <span className="text-xs text-amber-400 block font-medium mt-0.5">
            {numarIndisponibile} indisponibilă
          </span>
        </div>
      </div>

      <div className="space-y-4">

        <h2 className="text-xl font-bold text-white">
          Facilități disponibile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {facilitati.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-colors"
            >

              <div className="space-y-3">

                <div className="flex justify-between items-center gap-2">

                  <h3 className="text-lg font-bold text-white">
                    {item.nume}
                  </h3>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      item.esteDisponibil
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {item.esteDisponibil ? 'Disponibil' : 'Indisponibil'}
                  </span>

                </div>

                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.descriere}
                </p>

              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">

                <div>
                  <span className="text-xs text-slate-500 block">
                    de la
                  </span>

                  <span className="text-sm font-semibold text-slate-200">
                    {item.pretPeOra} lei/oră
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!item.esteDisponibil}
                  onClick={() => handleRezervaClick(item.id)}
                  className={`font-medium text-sm px-4 py-2 rounded-lg transition-colors ${
                    item.esteDisponibil
                      ? 'bg-sky-500 hover:bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {item.esteDisponibil ? 'Rezervă' : 'Indisponibil'}
                </button>

              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
};
