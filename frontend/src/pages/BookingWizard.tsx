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

interface StoredUser {
  id: number;
  email: string;
  token?: string;
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

const parseSlotToIso = (slot: string | null): string => {
  if (!slot) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T12:00:00`;
  }

  const timeMatch = slot.match(/(\d{1,2}):(\d{2})/);
  const hour = timeMatch ? timeMatch[1].padStart(2, '0') : '10';
  const minute = timeMatch ? timeMatch[2].padStart(2, '0') : '00';

  const dateMatch = slot.match(/(\d{1,2})\s+([a-zăâîșț]+)/i);
  const monthsMap: Record<string, string> = {
    ian: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    mai: '05',
    iun: '06',
    iul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  };

  const day = dateMatch ? dateMatch[1].padStart(2, '0') : '20';
  const monthPrefix = dateMatch ? dateMatch[2].slice(0, 3).toLowerCase() : 'nov';
  const month = monthsMap[monthPrefix] ?? '11';

  return `2026-${month}-${day}T${hour}:${minute}:00`;
};

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

 
const salveazaRezervareInBackend = async (): Promise<void> => {
    if (!facilitateSelectata || !datePas1) {
        alert('Datele rezervării lipsesc.');
        return;
    }

    let userId = 1;

    const rawUser = localStorage.getItem('user');

    if (rawUser) {
        try {
            const parsed = JSON.parse(rawUser) as StoredUser;

            if (parsed && parsed.id) {
                userId = parsed.id;
            }
        } catch {
            console.error('Nu s-au putut citi datele utilizatorului.');
        }
    }

    const echipamenteSelectate = datePas1.echipamente
        .filter((e) => e.selectat)
        .map((e) =>
            e.nume.replace(/\s*\(\+\d+\s*lei\)/i, '').trim()
        );

    const payload = {
        userId: userId,
        facilityId: facilitateSelectata.id,
        startAt: parseSlotToIso(datePas1.slotSelectat),
        hoursCount: 1,
        type: datePas1.tip === 'PE_JOC' ? 'joc' : 'ora',
        equipment: echipamenteSelectate,
        totalAmount: totalFinalCalculat
    };

    try {
        const response = await fetch(
            'http://localhost:8080/api/bookings',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        const responseText = await response.text();

        if (!response.ok) {
            throw new Error(
                responseText || 'Eroare la salvarea rezervării.'
            );
        }

        const result = JSON.parse(responseText);

        console.log('Rezervare salvată:', result);

        avanseazaLaPasul(5);

    } catch (err: unknown) {
        const msg = err instanceof Error
            ? err.message
            : 'Nu s-a putut comunica cu serverul.';

        alert(msg);
    }
};


  if (!Number.isInteger(idSelectat) || !facilitateSelectata) {
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
          onNext={() => {
            void salveazaRezervareInBackend();
          }}
          onBack={() => setPasCurent(3)}
        />
      )}

      {pasCurent === 5 && <Confirm />}
    </div>
  );
};