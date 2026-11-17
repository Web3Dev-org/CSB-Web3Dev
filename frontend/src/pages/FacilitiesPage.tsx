import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import {
  apiClient,
  ApiProblemError,
  unwrap,
  type AppSettings,
  type Facility,
} from "../api";

interface FacilityWithTodayStatus extends Facility {
  availableTodayCount: number;
}

function getTodayIsoBucharest(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const FacilitiesPage: React.FC = () => {
  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<FacilityWithTodayStatus[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const loadFacilities = async () => {
      setLoading(true);
      setError("");

      try {
        const [facilitiesList, appSettings] = await Promise.all([
          unwrap(apiClient.GET("/facilities")),
          unwrap(apiClient.GET("/app/settings")),
        ]);

        const todayIso = getTodayIsoBucharest();

        const enriched = await Promise.all(
          facilitiesList.map(async (facility) => {
            try {
              const slots = await unwrap(
                apiClient.GET("/facilities/{id}/availability", {
                  params: {
                    path: { id: facility.id },
                    query: { date: todayIso },
                  },
                }),
              );
              const availableTodayCount = slots.filter(
                (s) => s.status === "disponibil",
              ).length;
              return { ...facility, availableTodayCount };
            } catch {
              return { ...facility, availableTodayCount: 0 };
            }
          }),
        );

        if (!cancelled) {
          setFacilities(enriched);
          setSettings(appSettings);
        }
      } catch (err) {
        if (!cancelled) {
          setError(ApiProblemError.fromUnknown(err).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadFacilities();
    return () => {
      cancelled = true;
    };
  }, []);

  const currency = settings?.currency ?? "RON";
  const totalFacilities = facilities.length;
  const unavailableToday = facilities.filter(
    (f) => f.availableTodayCount === 0,
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
            {totalFacilities} facilități
          </span>

          <span className="text-xs text-amber-400 block font-medium mt-0.5">
            {unavailableToday}{" "}
            {unavailableToday === 1 ? "indisponibilă" : "indisponibile"} azi
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">
          Facilități disponibile
        </h2>

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
            Se încarcă facilitățile sportive...
          </div>
        ) : error ? (
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-6 text-center text-rose-400 text-sm">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {facilities.map((item) => {
              const hasSlotsToday = item.availableTodayCount > 0;

              return (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="text-lg font-bold text-white">
                        {item.name}
                      </h3>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                          hasSlotsToday
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {hasSlotsToday
                          ? `${item.availableTodayCount} locuri azi`
                          : "Ocupat azi"}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 leading-relaxed">
                      {item.description ??
                        "Facilitate sportivă disponibilă pentru rezervare online."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        de la
                      </span>

                      <span className="text-sm font-semibold text-slate-200">
                        {item.pricePerHour} {currency}/oră
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/rezervare/${item.id}`)}
                      className="bg-sky-500 hover:bg-sky-600 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Rezervă
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};