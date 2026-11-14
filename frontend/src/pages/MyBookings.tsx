import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  FileText,
  XCircle,
  Plus,
  Info,
} from 'lucide-react';
import type {
  StatusRezervare,
  TipRezervare,
} from '../types/database';

interface StoredUser {
  id: number;
  email: string;
  fullName?: string;
  full_name?: string;
  token?: string;
}

interface BookingApiResponse {
  id: number;
  facilityName?: string;
  facility_name?: string;
  startAt?: string;
  start_at?: string;
  hoursCount?: number;
  hours_count?: number;
  type: 'ora' | 'joc' | 'PE_ORA' | 'PE_JOC';
  equipment?: string[];
  totalAmount?: number;
  total_amount?: number;
  status: string;
  canCancel?: boolean;
  can_cancel?: boolean | number;
}

interface RezervareItem {
  id: number;
  facilitateNume: string;
  startAtIso: string;
  data: string;
  intervalOrar: string;
  tipRezervare: TipRezervare;
  echipamente: string[];
  costTotal: number;
  status: StatusRezervare;
  poateFiAnulata: boolean;
}

type FiltruRezervari = 'TOATE' | 'VIITOARE' | 'TRECUTE';

const API_BASE_URL = 'http://localhost:8080/api';

const mapStatusFromBackend = (rawStatus: string): StatusRezervare => {
  const normalized = rawStatus.toUpperCase();
  switch (normalized) {
    case 'IN_ASTEPTARE':
      return 'IN_ASTEPTARE';
    case 'APROBATA':
    case 'CONFIRMATA':
      return 'CONFIRMATA';
    case 'RESPINSA':
      return 'RESPINSA';
    case 'ANULATA':
      return 'ANULATA';
    case 'FINALIZATA':
      return 'FINALIZATA';
    default:
      return 'IN_ASTEPTARE';
  }
};

const formatDateAndInterval = (
  startAtIso: string,
  hoursCount: number
): { dataText: string; intervalText: string } => {
  const startDate = new Date(startAtIso);
  if (Number.isNaN(startDate.getTime())) {
    return { dataText: startAtIso, intervalText: '-' };
  }

  const dataText = startDate.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const endDate = new Date(startDate.getTime() + hoursCount * 60 * 60 * 1000);
  const startHour = startDate.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endHour = endDate.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    dataText,
    intervalText: `${startHour} - ${endHour}`,
  };
};

export const MyBookings: React.FC = () => {
  const navigate = useNavigate();

  const [filtruActiv, setFiltruActiv] = useState<FiltruRezervari>('TOATE');
  const [rezervari, setRezervari] = useState<RezervareItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [eroare, setEroare] = useState<string>('');
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [rezervareDeAnulat, setRezervareDeAnulat] =
    useState<RezervareItem | null>(null);

  const getAuthenticatedUser = (): StoredUser => {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as StoredUser;
        if (parsed && parsed.id) {
          return parsed;
        }
      } catch {
        // fallback pe userId 1 pentru testare
      }
    }
    return { id: 1, email: 'popescu.ion@student.usv.ro' };
  };

  useEffect(() => {
    const fetchRezervari = async (): Promise<void> => {
      const currentUser = getAuthenticatedUser();

      try {
        setLoading(true);
        setEroare('');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (currentUser.token) {
          headers['Authorization'] = `Bearer ${currentUser.token}`;
        }

        const response = await fetch(
          `${API_BASE_URL}/bookings/user/${currentUser.id}`,
          {
            method: 'GET',
            headers,
          }
        );

        if (!response.ok) {
          throw new Error('Nu s-au putut încărca rezervările din server.');
        }

        const data = (await response.json()) as BookingApiResponse[];

        const mappedRezervari: RezervareItem[] = data.map((item) => {
          const startIso = item.startAt ?? item.start_at ?? '';
          const hours = item.hoursCount ?? item.hours_count ?? 1;
          const { dataText, intervalText } = formatDateAndInterval(
            startIso,
            hours
          );

          const rawType = item.type.toUpperCase();
          const tipRezervare: TipRezervare =
            rawType === 'JOC' || rawType === 'PE_JOC' ? 'PE_JOC' : 'PE_ORA';

          const statusMapat = mapStatusFromBackend(item.status);
          const rawCanCancel = item.canCancel ?? item.can_cancel;
          const poateFiAnulata =
            rawCanCancel !== undefined
              ? Boolean(rawCanCancel)
              : statusMapat === 'IN_ASTEPTARE' || statusMapat === 'CONFIRMATA';

          return {
            id: item.id,
            facilitateNume:
              item.facilityName ?? item.facility_name ?? 'Facilitate sportivă',
            startAtIso: startIso,
            data: dataText,
            intervalOrar: intervalText,
            tipRezervare,
            echipamente: item.equipment ?? [],
            costTotal: Number(item.totalAmount ?? item.total_amount ?? 0),
            status: statusMapat,
            poateFiAnulata,
          };
        });

        setRezervari(mappedRezervari);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Eroare de conexiune cu serverul.';
        setEroare(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchRezervari();
  }, []);

  const esteRezervareActiva = (status: StatusRezervare): boolean => {
    return status === 'IN_ASTEPTARE' || status === 'CONFIRMATA';
  };

  const confirmaAnulareRezervare = async (): Promise<void> => {
    if (!rezervareDeAnulat) {
      return;
    }

    const idRezervare = rezervareDeAnulat.id;
    const currentUser = getAuthenticatedUser();

    try {
      setCancelingId(idRezervare);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentUser.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/bookings/${idRezervare}/cancel`,
        {
          method: 'PATCH',
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Rezervarea nu a putut fi anulată.');
      }

      setRezervari((prev) =>
        prev.map((rez) =>
          rez.id === idRezervare
            ? {
                ...rez,
                status: 'ANULATA',
                poateFiAnulata: false,
              }
            : rez
        )
      );
      setRezervareDeAnulat(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Eroare la anularea rezervării.';
      setEroare(message);
      setRezervareDeAnulat(null);
    } finally {
      setCancelingId(null);
    }
  };

  const rezervariFiltrate = rezervari.filter((rez) => {
    if (filtruActiv === 'VIITOARE') {
      return esteRezervareActiva(rez.status);
    }

    if (filtruActiv === 'TRECUTE') {
      return (
        rez.status === 'FINALIZATA' ||
        rez.status === 'ANULATA' ||
        rez.status === 'RESPINSA'
      );
    }

    return true;
  });

  const rezervariViitoare = rezervari
    .filter((rez) => esteRezervareActiva(rez.status))
    .sort((a, b) => a.startAtIso.localeCompare(b.startAtIso));

  const numarRezervariActive = rezervariViitoare.length;

  const primaRezervare = rezervariViitoare[0];
  const urmatoareaRezervareText = primaRezervare
    ? `${primaRezervare.data.replace(/\s\d{4}$/, '')}, ${
        primaRezervare.intervalOrar.split(' - ')[0]
      }`
    : 'Nicio rezervare';

  const getStatusLabel = (status: StatusRezervare): string => {
    switch (status) {
      case 'IN_ASTEPTARE':
        return 'În așteptare';
      case 'CONFIRMATA':
        return 'Rezervat';
      case 'RESPINSA':
        return 'Respins';
      case 'ANULATA':
        return 'Anulat';
      case 'FINALIZATA':
        return 'Finalizat';
      default:
        return 'Necunoscut';
    }
  };

  const getStatusClass = (status: StatusRezervare): string => {
    switch (status) {
      case 'CONFIRMATA':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'IN_ASTEPTARE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'ANULATA':
      case 'RESPINSA':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'FINALIZATA':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 space-y-6">
      {/* Titlu pagină */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Rezervările mele
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Gestionează programările active, descarcă facturile sau rezervă un
          nou interval.
        </p>
      </div>

      {/* Filtrare rezervări */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltruActiv('TOATE')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            filtruActiv === 'TOATE'
              ? 'bg-sky-500 text-white'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          Toate ({rezervari.length})
        </button>

        <button
          type="button"
          onClick={() => setFiltruActiv('VIITOARE')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            filtruActiv === 'VIITOARE'
              ? 'bg-sky-500 text-white'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          Active / Viitoare
        </button>

        <button
          type="button"
          onClick={() => setFiltruActiv('TRECUTE')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            filtruActiv === 'TRECUTE'
              ? 'bg-sky-500 text-white'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          Istoric
        </button>
      </div>

      {/* Conținut principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Lista rezervărilor */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
              Se încarcă rezervările...
            </div>
          ) : eroare ? (
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-6 text-center text-rose-400 text-sm">
              {eroare}
            </div>
          ) : rezervariFiltrate.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
              Nu există rezervări în această categorie.
            </div>
          ) : (
            rezervariFiltrate.map((rez) => {
              const esteActiva = esteRezervareActiva(rez.status);

              return (
                <div
                  key={rez.id}
                  className={`bg-slate-900 border rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4 transition-colors ${
                    esteActiva
                      ? 'border-slate-800 hover:border-slate-700'
                      : 'border-slate-800/50 opacity-75'
                  }`}
                >
                  {/* Detalii rezervare */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        esteActiva
                          ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                          : 'bg-slate-800/60 border-slate-700 text-slate-500'
                      }`}
                    >
                      <Calendar className="w-6 h-6" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {rez.facilitateNume}
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          #{rez.id}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {rez.data}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {rez.intervalOrar}
                        </span>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md font-medium">
                          {rez.costTotal} lei ·{' '}
                          {rez.tipRezervare === 'PE_ORA' ? 'Pe oră' : 'Pe joc'}
                        </span>

                        {rez.echipamente.length > 0 && (
                          <span className="text-xs text-slate-400">
                            + {rez.echipamente.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status și acțiuni */}
                  <div className="flex sm:flex-col justify-between items-end gap-3 shrink-0">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold border ${getStatusClass(
                        rez.status
                      )}`}
                    >
                      {getStatusLabel(rez.status)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          alert(
                            `Se descarcă factura PDF pentru rezervarea #${rez.id}...`
                          )
                        }
                        className="flex items-center gap-1.5 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        Factură
                      </button>

                      {rez.poateFiAnulata && esteActiva && (
                        <button
                          type="button"
                          onClick={() => setRezervareDeAnulat(rez)}
                          className="flex items-center gap-1.5 text-xs font-medium bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-900/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Anulează
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panou lateral */}
        <div className="lg:col-span-1 space-y-4">
          {/* Rezumat */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Rezumat</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Rezervări viitoare</span>
                <span className="font-bold text-white">
                  {numarRezervariActive}
                </span>
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                <span className="text-slate-400">Următoarea rezervare</span>
                <span className="font-bold text-white">
                  {urmatoareaRezervareText}
                </span>
              </div>
            </div>
          </div>

          {/* Informații utile */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sky-400 text-sm font-bold">
              <Info className="w-4 h-4" />
              Informații utile
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Anularea gratuită este permisă cu cel puțin{' '}
              <strong>12 ore</strong> înainte de începerea intervalului.
              Accesul în bază se face pe baza legitimației USV cu 10 minute
              înainte.
            </p>
          </div>

          {/* Buton rezervare nouă */}
          <button
            type="button"
            onClick={() => navigate('/facilitati')}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Rezervă o nouă facilitate
          </button>
        </div>
      </div>

      {/* Modal confirmare anulare */}
      {rezervareDeAnulat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-400">
                <XCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  Anulare rezervare #{rezervareDeAnulat.id}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Ești sigur că dorești să anulezi rezervarea pentru{' '}
                  <span className="text-white font-semibold">
                    {rezervareDeAnulat.facilitateNume}
                  </span>{' '}
                  ({rezervareDeAnulat.data}, {rezervareDeAnulat.intervalOrar})?
                </p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400">
              Anularea este gratuită cu minim{' '}
              <strong className="text-slate-200">12 ore</strong> înainte de
              începerea intervalului. Această acțiune nu poate fi revocată.
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={cancelingId !== null}
                onClick={() => setRezervareDeAnulat(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Renunță
              </button>

              <button
                type="button"
                disabled={cancelingId !== null}
                onClick={() => void confirmaAnulareRezervare()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                {cancelingId !== null
                  ? 'Se anulează...'
                  : 'Confirmă anularea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};