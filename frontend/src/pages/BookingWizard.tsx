import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Options, type DatePas1 } from './Options';
import { Terms } from './Terms';
import { Cost } from './Cost';
import { Payment } from './Payment';
import { Confirm } from './Confirm';

interface FacilitateBooking {
  id: number;
  nume: string;
  pretPeOra: number;
  multiplicatorJoc: number;
}

const facilitati: FacilitateBooking[] = [
  {
    id: 1,
    nume: 'Sala Polivalentă',
    pretPeOra: 40,
    multiplicatorJoc: 1.5,
  },
  {
    id: 2,
    nume: 'Teren de tenis',
    pretPeOra: 30,
    multiplicatorJoc: 1.5,
  },
  {
    id: 3,
    nume: 'Sala de fitness',
    pretPeOra: 20,
    multiplicatorJoc: 1.0,
  },
  {
    id: 4,
    nume: 'Bază sportivă',
    pretPeOra: 50,
    multiplicatorJoc: 1.5,
  },
];

export const BookingWizard: React.FC = () => {

  const navigate = useNavigate();

  const { idFacilitate } = useParams<{ idFacilitate: string }>();

  const idSelectat = Number(idFacilitate);

  const facilitateSelectata = facilitati.find(
    (facilitate) => facilitate.id === idSelectat
  );

  const [pasCurent, setPasCurent] = useState<number>(1);
  const [pasMaximAtins, setPasMaximAtins] = useState<number>(1);

  const [datePas1, setDatePas1] = useState<DatePas1 | null>(null);
  const [totalFinalCalculat, setTotalFinalCalculat] = useState<number>(0);

  const pasii = [
    { nr: 1, titlu: '1. Opțiuni' },
    { nr: 2, titlu: '2. Termeni' },
    { nr: 3, titlu: '3. Cost' },
    { nr: 4, titlu: '4. Plată' },
    { nr: 5, titlu: '5. Confirmare' },
  ];

  const handleSelectPasHeader = (numarPas: number): void => {
    if (numarPas <= pasMaximAtins) {
      setPasCurent(numarPas);
    }
  };

  const avanseazaLaPasul = (urmatorulPas: number): void => {
    setPasCurent(urmatorulPas);

    if (urmatorulPas > pasMaximAtins) {
      setPasMaximAtins(urmatorulPas);
    }
  };

  if (
    !Number.isInteger(idSelectat) ||
    !facilitateSelectata
  ) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-10 text-center">
        <h2 className="text-xl font-bold text-rose-400">
          Facilitatea nu a fost găsită!
        </h2>

        <button
          type="button"
          onClick={() => navigate('/facilitati')}
          className="mt-4 bg-sky-500 hover:bg-sky-600 px-5 py-2 rounded-lg"
        >
          Înapoi la facilități
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 space-y-6">

      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">

        {pasii.map((pas) => {
          const esteDeblocat = pas.nr <= pasMaximAtins;
          const esteActiv = pasCurent === pas.nr;

          return (
            <button
              key={pas.nr}
              type="button"
              disabled={!esteDeblocat}
              onClick={() => handleSelectPasHeader(pas.nr)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                esteActiv
                  ? 'bg-sky-500 text-white shadow-md'
                  : esteDeblocat
                  ? 'bg-slate-800 text-sky-400 hover:bg-slate-700 cursor-pointer'
                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-60'
              }`}
            >
              {pas.titlu}
            </button>
          );
        })}

      </div>

      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-2xl font-bold text-white">
            {facilitateSelectata.nume}
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            ID facilitate: {facilitateSelectata.id}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/facilitati')}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Înapoi la Facilități
        </button>

      </div>

      {pasCurent === 1 && (
        <Options
          pretPeOra={facilitateSelectata.pretPeOra}
          pretPeJoc={
            facilitateSelectata.pretPeOra *
            facilitateSelectata.multiplicatorJoc
          }
          onNext={(date: DatePas1) => {
            setDatePas1(date);
            avanseazaLaPasul(2);
          }}
        />
      )}

      {pasCurent === 2 && (
        <Terms
          onNext={() => avanseazaLaPasul(3)}
          onBack={() => setPasCurent(1)}
        />
      )}

      {pasCurent === 3 && (
        <Cost
          totalBrut={datePas1?.totalEstimat ?? facilitateSelectata.pretPeOra}
          procentReducere={50}
          onNext={(sumaCalculata: number) => {
            setTotalFinalCalculat(sumaCalculata);
            avanseazaLaPasul(4);
          }}
          onBack={() => setPasCurent(2)}
        />
      )}

      {pasCurent === 4 && (
        <Payment
          sumaPlata={totalFinalCalculat}
          onNext={() => avanseazaLaPasul(5)}
          onBack={() => setPasCurent(3)}
        />
      )}

      {pasCurent === 5 && <Confirm />}

    </div>
  );
};
