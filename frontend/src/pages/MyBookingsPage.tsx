import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, Clock, FileText, Info, Plus, XCircle } from "lucide-react";
import {
  apiClient,
  ApiProblemError,
  unwrap,
  type AppSettings,
  type BookingStatus,
  type BookingSummary,
} from "../api";

type FiltruRezervari = "TOATE" | "VIITOARE" | "TRECUTE";

function formatDateAndInterval(
  startAtIso: string,
  hoursCount: number,
): { dataText: string; intervalText: string } {
  const startDate = new Date(startAtIso);
  if (Number.isNaN(startDate.getTime())) {
    return { dataText: startAtIso, intervalText: "-" };
  }

  const dataText = startDate.toLocaleDateString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const endDate = new Date(startDate.getTime() + hoursCount * 60 * 60 * 1000);
  const startHour = startDate.toLocaleTimeString("ro-RO", {
    timeZone: "Europe/Bucharest",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endHour = endDate.toLocaleTimeString("ro-RO", {
    timeZone: "Europe/Bucharest",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    dataText,
    intervalText: `${startHour} - ${endHour}`,
  };
}

export const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();

  const [filtruActiv, setFiltruActiv] = useState<FiltruRezervari>("TOATE");
  const [rezervari, setRezervari] = useState<BookingSummary[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [eroare, setEroare] = useState<string>("");
  const [infoBanner, setInfoBanner] = useState<string>("");

  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [rezervareDeAnulat, setRezervareDeAnulat] =
    useState<BookingSummary | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");

  const fetchRezervari = useCallback(async () => {
    try {
      setLoading(true);
      setEroare("");

      const [pageData, appSettings] = await Promise.all([
        unwrap(
          apiClient.GET("/bookings", {
            params: {
              query: {
                sort: "startAt,desc",
                page: 0,
                size: 100,
              },
            },
          }),
        ),
        unwrap(apiClient.GET("/app/settings")),
      ]);

      setRezervari(pageData.content);
      setSettings(appSettings);
    } catch (err) {
      setEroare(ApiProblemError.fromUnknown(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRezervari();
  }, [fetchRezervari]);

  const handleDownloadInvoice = async (bookingId: number): Promise<void> => {
    setInfoBanner("");
    try {
      const invoice = await unwrap(
        apiClient.GET("/bookings/{id}/invoice", {
          params: { path: { id: bookingId } },
        }),
      );

      if (invoice.pdfPath) {
        window.open(invoice.pdfPath, "_blank", "noopener,noreferrer");
      } else {
        setInfoBanner(
          `Factura ${invoice.series}-${invoice.number} este emisă, dar fișierul PDF nu este disponibil încă.`,
        );
      }
    } catch (err) {
      const problem = ApiProblemError.fromUnknown(err);
      if (problem.status === 404) {
        setInfoBanner(
          `Nu există încă o factură emisă pentru rezervarea #${bookingId}.`,
        );
      } else {
        setInfoBanner(problem.message);
      }
    }
  };

  const confirmaAnulareRezervare = async (): Promise<void> => {
    if (!rezervareDeAnulat) return;

    const idRezervare = rezervareDeAnulat.id;
    try {
      setCancelingId(idRezervare);
      setEroare("");

      const updated = await unwrap(
        apiClient.POST("/bookings/{id}/cancel", {
          params: { path: { id: idRezervare } },
          body: {
            reason: cancelReason.trim() || null,
          },
        }),
      );

      setRezervari((prev) =>
        prev.map((rez) =>
          rez.id === idRezervare
            ? {
                ...rez,
                status: updated.status,
                isActiveBooking: updated.isActiveBooking,
                canCancel: updated.canCancel,
              }
            : rez,
        ),
      );
      setRezervareDeAnulat(null);
      setCancelReason("");
    } catch (err) {
      setEroare(ApiProblemError.fromUnknown(err).message);
      setRezervareDeAnulat(null);
    } finally {
      setCancelingId(null);
    }
  };

  const rezervariFiltrate = rezervari.filter((rez) => {
    if (filtruActiv === "VIITOARE") {
      return rez.isActiveBooking;
    }
    if (filtruActiv === "TRECUTE") {
      return !rez.isActiveBooking;
    }
    return true;
  });

  const rezervariViitoare = rezervari
    .filter((rez) => rez.isActiveBooking)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const primaRezervare = rezervariViitoare[0];
  const urmatoareaRezervareText = primaRezervare
    ? (() => {
        const formatted = formatDateAndInterval(
          primaRezervare.startAt,
          primaRezervare.hoursCount,
        );
        return `${formatted.dataText.replace(/\s\d{4}$/, "")}, ${
          formatted.intervalText.split(" - ")[0]
        }`;
      })()
    : "Nicio rezervare";

  const currency = settings?.currency ?? "RON";
  const cancellationHours = settings?.cancellationHours ?? 12;
  const arrivalMinutes = settings?.arrivalMinutes ?? 10;

  const getStatusLabel = (status: BookingStatus): string => {
    switch (status) {
      case "in_asteptare":
        return "În așteptare";
      case "aprobata":
        return "Rezervat";
      case "respinsa":
        return "Respins";
      case "anulata":
        return "Anulat";
      case "finalizata":
        return "Finalizat";
      default:
        return status;
    }
  };

  const getStatusClass = (status: BookingStatus): string => {
    switch (status) {
      case "aprobata":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "in_asteptare":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "anulata":
      case "respinsa":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "finalizata":
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
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
          onClick={() => setFiltruActiv("TOATE")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            filtruActiv === "TOATE"
              ? "bg-sky-500 text-white"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
          }`}
        >
          Toate ({rezervari.length})
        </button>

        <button
          type="button"
          onClick={() => setFiltruActiv("VIITOARE")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            filtruActiv === "VIITOARE"
              ? "bg-sky-500 text-white"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
          }`}
        >
          Active / Viitoare
        </button>

        <button
          type="button"
          onClick={() => setFiltruActiv("TRECUTE")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            filtruActiv === "TRECUTE"
              ? "bg-sky-500 text-white"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
          }`}
        >
          Istoric
        </button>
      </div>

      {infoBanner && (
        <div className="bg-sky-500/10 border border-sky-500/20 text-sky-300 rounded-xl px-4 py-3 text-xs">
          {infoBanner}
        </div>
      )}

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
              const { dataText, intervalText } = formatDateAndInterval(
                rez.startAt,
                rez.hoursCount,
              );

              return (
                <div
                  key={rez.id}
                  className={`bg-slate-900 border rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4 transition-colors ${
                    rez.isActiveBooking
                      ? "border-slate-800 hover:border-slate-700"
                      : "border-slate-800/50 opacity-75"
                  }`}
                >
                  {/* Detalii rezervare */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        rez.isActiveBooking
                          ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                          : "bg-slate-800/60 border-slate-700 text-slate-500"
                      }`}
                    >
                      <Calendar className="w-6 h-6" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {rez.facilityName}
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          #{rez.id}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {dataText}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {intervalText} ({rez.hoursCount}h)
                        </span>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md font-medium">
                          {rez.totalAmount.toFixed(2)} {currency} ·{" "}
                          {rez.type === "ora" ? "Pe oră" : "Pe joc"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status și acțiuni */}
                  <div className="flex sm:flex-col justify-between items-end gap-3 shrink-0">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold border ${getStatusClass(
                        rez.status,
                      )}`}
                    >
                      {getStatusLabel(rez.status)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownloadInvoice(rez.id)}
                        className="flex items-center gap-1.5 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        Factură
                      </button>

                      {rez.canCancel && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelReason("");
                            setRezervareDeAnulat(rez);
                          }}
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Rezumat</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Rezervări viitoare</span>
                <span className="font-bold text-white">
                  {rezervariViitoare.length}
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

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sky-400 text-sm font-bold">
              <Info className="w-4 h-4" />
              Informații utile
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Anularea gratuită este permisă cu cel puțin{" "}
              <strong>{cancellationHours} ore</strong> înainte de începerea
              intervalului. Accesul în bază se face pe baza legitimației USV cu{" "}
              {arrivalMinutes} minute înainte.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/facilitati")}
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
                  Ești sigur că dorești să anulezi rezervarea pentru{" "}
                  <span className="text-white font-semibold">
                    {rezervareDeAnulat.facilityName}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Motiv anulare (opțional)
              </label>
              <input
                type="text"
                maxLength={255}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Program suprapus cu un curs"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400">
              Anularea este gratuită cu minim{" "}
              <strong className="text-slate-200">
                {cancellationHours} ore
              </strong>{" "}
              înainte de începerea intervalului. Această acțiune nu poate fi
              revocată.
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
                {cancelingId !== null ? "Se anulează..." : "Confirmă anularea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};