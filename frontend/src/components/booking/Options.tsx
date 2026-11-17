import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  apiClient,
  ApiProblemError,
  unwrap,
  type AppSettings,
  type BookingEquipmentRequest,
  type BookingType,
  type Equipment,
  type Facility,
  type SlotAvailability,
  type SlotStatus,
} from "../../api";

export interface SelectedEquipmentItem {
  equipmentId: number;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface BookingOptionsData {
  facilityId: number;
  facilityName: string;
  type: BookingType;
  startAt: string; // ISO 8601 Europe/Bucharest ex. 2026-11-18T18:00:00+02:00
  displayLabel: string;
  hoursCount: number;
  unitPrice: number;
  baseAmount: number;
  equipmentAmount: number;
  equipment: SelectedEquipmentItem[];
  equipmentRequest: BookingEquipmentRequest[];
}

interface OptionsProps {
  facility: Facility;
  equipmentCatalog: Equipment[];
  settings?: AppSettings;
  initialData?: BookingOptionsData | null;
  onNext: (data: BookingOptionsData) => void;
}

interface DayColumn {
  isoDate: string; // YYYY-MM-DD in Europe/Bucharest
  label: string; // ex: "mie., 18 nov."
}

function getBucharestDays(horizonDays: number): DayColumn[] {
  const days: DayColumn[] = [];
  const now = new Date();

  const isoFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const labelFormatter = new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  for (let i = 0; i < horizonDays; i++) {
    const target = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    days.push({
      isoDate: isoFormatter.format(target),
      label: labelFormatter.format(target),
    });
  }

  return days;
}

/**
 * Construiește timestamp-ul ISO 8601 cu offset-ul real pentru Europe/Bucharest
 * la ora fixă selectată (ex: 2026-11-18T18:00:00+02:00).
 */
function buildBucharestIsoTimestamp(isoDate: string, startTime: string): string {
  const probeUtc = new Date(`${isoDate}T${startTime}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest",
    timeZoneName: "longOffset",
  }).formatToParts(probeUtc);

  const gmtOffset =
    parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+02:00";
  const offset = gmtOffset.replace("GMT", "") || "+02:00";

  return `${isoDate}T${startTime}:00${offset}`;
}

export const Options: React.FC<OptionsProps> = ({
  facility,
  equipmentCatalog,
  settings,
  initialData,
  onNext,
}) => {
  const horizonDays = settings?.bookingHorizonDays ?? 7;
  const currency = settings?.currency ?? "RON";

  const [bookingType, setBookingType] = useState<BookingType>(
    initialData?.type ?? "ora",
  );
  const [hoursCount, setHoursCount] = useState<number>(
    initialData?.hoursCount ?? 1,
  );
  const [selectedSlot, setSelectedSlot] = useState<{
    isoDate: string;
    dayLabel: string;
    startTime: string;
  } | null>(null);

  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const item of initialData?.equipment ?? []) {
      initial[item.equipmentId] = item.quantity;
    }
    return initial;
  });

  const [availabilityByDate, setAvailabilityByDate] = useState<
    Record<string, SlotAvailability[]>
  >({});
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string>("");

  const days = useMemo(() => getBucharestDays(horizonDays), [horizonDays]);

  useEffect(() => {
    let cancelled = false;

    const loadAvailability = async () => {
      setLoadingAvailability(true);
      try {
        const entries = await Promise.all(
          days.map(async (day) => {
            const slots = await unwrap(
              apiClient.GET("/facilities/{id}/availability", {
                params: {
                  path: { id: facility.id },
                  query: { date: day.isoDate },
                },
              }),
            );
            return [day.isoDate, slots] as const;
          }),
        );

        if (!cancelled) {
          setAvailabilityByDate(Object.fromEntries(entries));
        }
      } catch (err) {
        if (!cancelled) {
          const problem = ApiProblemError.fromUnknown(err);
          setValidationError(problem.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    };

    void loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [days, facility.id]);

  // Determină intervalul orar relevant al facilității din programul săptămânal
  const visibleHours = useMemo(() => {
    if (facility.hours.length === 0) {
      return Array.from({ length: 14 }, (_, idx) => {
        const h = idx + 8;
        return `${String(h).padStart(2, "0")}:00`;
      });
    }
    const minOpen = Math.min(...facility.hours.map((h) => h.openHour));
    const maxClose = Math.max(...facility.hours.map((h) => h.closeHour));
    const list: string[] = [];
    for (let h = minOpen; h < maxClose; h++) {
      list.push(`${String(h).padStart(2, "0")}:00`);
    }
    return list;
  }, [facility.hours]);

  const pricePerHour = facility.pricePerHour;
  const pricePerGame = +(facility.pricePerHour * facility.gameMultiplier).toFixed(
    2,
  );
  const unitPrice = bookingType === "ora" ? pricePerHour : pricePerGame;

  const isRangeAvailable = (
    isoDate: string,
    startTime: string,
    duration: number,
  ): boolean => {
    const daySlots = availabilityByDate[isoDate];
    if (!daySlots) return false;

    const startHour = Number.parseInt(startTime.slice(0, 2), 10);
    for (let offset = 0; offset < duration; offset++) {
      const targetTime = `${String(startHour + offset).padStart(2, "0")}:00`;
      const slot = daySlots.find((s) => s.startTime === targetTime);
      if (!slot || slot.status !== "disponibil") {
        return false;
      }
    }
    return true;
  };

  const handleToggleEquipment = (item: Equipment): void => {
    setQuantities((prev) => {
      const current = prev[item.id] ?? 0;
      if (current > 0) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return { ...prev, [item.id]: 1 };
    });
  };

  const selectedEquipment: SelectedEquipmentItem[] = useMemo(() => {
    return equipmentCatalog
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => ({
        equipmentId: item.id,
        name: item.name,
        unitPrice: item.price,
        quantity: quantities[item.id],
      }));
  }, [equipmentCatalog, quantities]);

  const baseAmount = +(unitPrice * hoursCount).toFixed(2);
  const equipmentAmount = +selectedEquipment
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    .toFixed(2);
  const estimatedSubtotal = selectedSlot
    ? +(baseAmount + equipmentAmount).toFixed(2)
    : 0;

  const handleContinue = (): void => {
    if (!selectedSlot) {
      setValidationError(
        "Selectează mai întâi un interval orar disponibil din calendar.",
      );
      return;
    }

    if (!isRangeAvailable(selectedSlot.isoDate, selectedSlot.startTime, hoursCount)) {
      setValidationError(
        `Nu există ${hoursCount} ore consecutive disponibile începând cu ora ${selectedSlot.startTime}.`,
      );
      return;
    }

    setValidationError("");
    const startAt = buildBucharestIsoTimestamp(
      selectedSlot.isoDate,
      selectedSlot.startTime,
    );

    onNext({
      facilityId: facility.id,
      facilityName: facility.name,
      type: bookingType,
      startAt,
      displayLabel: `${selectedSlot.dayLabel}, ${selectedSlot.startTime} (${hoursCount}h)`,
      hoursCount,
      unitPrice,
      baseAmount,
      equipmentAmount,
      equipment: selectedEquipment,
      equipmentRequest: selectedEquipment.map((e) => ({
        equipmentId: e.equipmentId,
        quantity: e.quantity,
      })),
    });
  };

  const renderSlotButton = (day: DayColumn, time: string) => {
    const daySlots = availabilityByDate[day.isoDate] ?? [];
    const slot = daySlots.find((s) => s.startTime === time);
    const status: SlotStatus = slot?.status ?? "inchis";

    const canSelect =
      status === "disponibil" && isRangeAvailable(day.isoDate, time, hoursCount);

    const startHour = selectedSlot
      ? Number.parseInt(selectedSlot.startTime.slice(0, 2), 10)
      : -1;
    const currentHour = Number.parseInt(time.slice(0, 2), 10);

    const isSelected =
      selectedSlot?.isoDate === day.isoDate &&
      currentHour >= startHour &&
      currentHour < startHour + hoursCount;

    if (status === "inchis") {
      return (
        <span className="block w-full py-1.5 px-2 rounded text-slate-600 bg-slate-950/60 border border-slate-800/40 select-none">
          închis
        </span>
      );
    }

    if (status === "blocat") {
      return (
        <span className="block w-full py-1.5 px-2 rounded text-rose-400/80 bg-rose-950/30 border border-rose-900/40 cursor-not-allowed">
          blocat
        </span>
      );
    }

    if (status === "rezervare") {
      return (
        <span className="block w-full py-1.5 px-2 rounded text-amber-500 bg-amber-950/40 border border-amber-900/40 cursor-not-allowed">
          ocupat
        </span>
      );
    }

    return (
      <button
        type="button"
        disabled={!canSelect}
        onClick={() => {
          setSelectedSlot({
            isoDate: day.isoDate,
            dayLabel: day.label,
            startTime: time,
          });
          setValidationError("");
        }}
        className={`w-full py-1.5 px-2 rounded font-medium transition-all ${
          isSelected
            ? "bg-sky-500 text-white font-bold ring-2 ring-sky-300 shadow-md cursor-pointer"
            : canSelect
              ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/40 cursor-pointer"
              : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
        }`}
      >
        liber
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Panou Stânga: Tip Rezervare, Durată & Echipament */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Tip tarif
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
              <input
                type="radio"
                name="bookingType"
                checked={bookingType === "ora"}
                onChange={() => setBookingType("ora")}
                className="accent-sky-500"
              />
              Pe oră ({pricePerHour} {currency}/h)
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
              <input
                type="radio"
                name="bookingType"
                checked={bookingType === "joc"}
                onChange={() => setBookingType("joc")}
                className="accent-sky-500"
              />
              Pe joc ({pricePerGame} {currency}/h)
            </label>
          </div>
        </div>

        <div>
          <label
            htmlFor="hoursCount"
            className="block text-sm font-semibold text-slate-300 mb-2"
          >
            Durată (ore consecutive)
          </label>
          <select
            id="hoursCount"
            value={hoursCount}
            onChange={(e) => {
              setHoursCount(Number(e.target.value));
              setSelectedSlot(null);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            {[1, 2, 3, 4].map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? "oră" : "ore"}
              </option>
            ))}
          </select>
        </div>

        {equipmentCatalog.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Echipament extra
            </h3>
            <div className="space-y-2.5">
              {equipmentCatalog.map((item) => {
                const outOfStock = item.stock !== null && item.stock <= 0;
                const checked = (quantities[item.id] ?? 0) > 0;

                return (
                  <label
                    key={item.id}
                    className={`flex items-center justify-between gap-2 text-sm ${
                      outOfStock
                        ? "text-slate-500 cursor-not-allowed"
                        : "text-slate-200 cursor-pointer"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        disabled={outOfStock}
                        checked={checked}
                        onChange={() => handleToggleEquipment(item)}
                        className="accent-sky-500 rounded"
                      />
                      <span>
                        {item.name} (+{item.price} {currency})
                      </span>
                    </span>
                    {outOfStock && (
                      <span className="text-[11px] text-rose-400">
                        epuizat
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Panou Dreapta: Calendar Disponibilitate */}
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h3 className="text-base font-bold text-white">
            Calendar următoarele {horizonDays} zile
          </h3>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500 inline-block" />
              liber
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500 inline-block" />
              ocupat
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500 inline-block" />
              blocat
            </span>
          </div>
        </div>

        {validationError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium">
            {validationError}
          </div>
        )}

        {loadingAvailability ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
            Se încarcă disponibilitatea sloturilor...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="p-2 text-left">Ora</th>
                  {days.map((day) => (
                    <th key={day.isoDate} className="p-2 font-medium">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleHours.map((time) => (
                  <tr key={time} className="border-b border-slate-800/40">
                    <td className="p-2 text-slate-400 text-left font-mono">
                      {time}
                    </td>
                    {days.map((day) => (
                      <td key={`${day.isoDate}-${time}`} className="p-1">
                        {renderSlotButton(day, time)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="text-xs text-slate-400 block">
              Selecție: {selectedSlot ? `${selectedSlot.dayLabel}, ${selectedSlot.startTime} (${hoursCount}h)` : "Nicio oră selectată"}
            </span>
            <span className="text-sm font-bold text-white">
              Subtotal înainte de reducere:{" "}
              <span className="text-sky-400 text-lg">
                {estimatedSubtotal} {currency}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className={`font-medium text-sm px-6 py-2.5 rounded-lg transition-colors ${
              selectedSlot
                ? "bg-sky-500 hover:bg-sky-600 text-white cursor-pointer"
                : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
            }`}
          >
            Continuă
          </button>
        </div>
      </div>
    </div>
  );
};