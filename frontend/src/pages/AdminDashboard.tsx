import React, { useEffect, useMemo, useState } from "react";
import { apiClient, unwrap } from "../api";
import type { components } from "../api/schema";

// Tipuri extrase direct din schema OpenAPI generată
type AdminBookingRequest = components["schemas"]["AdminBookingRequest"];
type Equipment = components["schemas"]["Equipment"];
type AppSettings = components["schemas"]["AppSettings"];
type UserStatus = components["schemas"]["UserStatus"];

type PaymentFilter = "ALL" | "PAID" | "UNPAID";

// Formatare interval orar prietenoasă (ex: "Mâine 10:00", "Joi 19:00")
function formatBookingSlot(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const timeStr = date.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) {
    return `Azi ${timeStr}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Mâine ${timeStr}`;
  }

  const weekday = date.toLocaleDateString("ro-RO", { weekday: "long" });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalizedWeekday} ${timeStr}`;
}

export const AdminDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<AdminBookingRequest[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [discounts, setDiscounts] = useState<UserStatus[]>([]);

  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      unwrap(apiClient.GET("/admin/bookings")),
      unwrap(apiClient.GET("/app/equipment")),
      unwrap(apiClient.GET("/app/settings")),
      unwrap(apiClient.GET("/app/statuses")),
    ])
      .then(([bookingsData, equipmentData, settingsData, statusesData]) => {
        if (!cancelled) {
          setBookings(bookingsData);
          setEquipment(equipmentData);
          setSettings(settingsData);
          setDiscounts(statusesData);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Nu s-au putut încărca datele panoului de administrare.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Statistici calculate dinamic pentru cele 3 carduri de sus
  const stats = useMemo(() => {
    const total = bookings.length;
    const paid = bookings.filter((b) => b.paymentState === "Plătit").length;
    const unpaid = bookings.filter((b) => b.paymentState === "Neplătit").length;
    return { total, paid, unpaid };
  }, [bookings]);

  // Lista filtrată după tab-ul selectat
  const filteredBookings = useMemo(() => {
    if (activeFilter === "PAID") {
      return bookings.filter((b) => b.paymentState === "Plătit");
    }
    if (activeFilter === "UNPAID") {
      return bookings.filter((b) => b.paymentState === "Neplătit");
    }
    return bookings;
  }, [bookings, activeFilter]);

  const handleDecision = async (
    bookingId: number,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    setProcessingId(bookingId);
    setError(null);
    try {
      const updated =
        action === "approve"
          ? await unwrap(
              apiClient.POST("/admin/bookings/{id}/approve", {
                params: { path: { id: bookingId } },
              }),
            )
          : await unwrap(
              apiClient.POST("/admin/bookings/{id}/reject", {
                params: { path: { id: bookingId } },
                ...(reason ? { body: { reason } } : {}),
              }),
            );

      // Re-randare imediată a listei cu starea actualizată
      setBookings((prev) =>
        prev.map((item) =>
          item.bookingId === updated.id
            ? { ...item, status: updated.status }
            : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Eroare la procesarea cererii de rezervare.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const renderStatusOrActions = (booking: AdminBookingRequest) => {
    if (booking.status === "aprobata") {
      return (
        <span className="inline-block rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-5 py-1.5 text-xs font-semibold text-emerald-400">
          Aprobată
        </span>
      );
    }

    if (booking.status === "respinsa") {
      return (
        <span className="inline-block rounded-xl border border-rose-700/50 bg-rose-950/40 px-5 py-1.5 text-xs font-semibold text-rose-400">
          Respinsă
        </span>
      );
    }

    if (booking.status !== "in_asteptare") {
      return (
        <span className="inline-block rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-1.5 text-xs font-semibold text-slate-300">
          {booking.status === "anulata" ? "Anulată" : "Finalizată"}
        </span>
      );
    }

    const isProcessing = processingId === booking.bookingId;

    return (
      <div className="inline-flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => void handleDecision(booking.bookingId, "approve")}
          className="rounded-xl border border-[#4a80bd] bg-transparent px-5 py-1.5 text-xs font-semibold text-[#79b4f5] transition hover:bg-[#64a3e8] hover:text-[#0c1624] disabled:opacity-50"
        >
          {isProcessing ? "Se procesează..." : "Aprobă"}
        </button>

        <button
          type="button"
          disabled={isProcessing}
          onClick={() => void handleDecision(booking.bookingId, "reject")}
          className="rounded-xl border border-rose-700/70 bg-transparent px-5 py-1.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-600 hover:text-white disabled:opacity-50"
        >
          Respinge
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0d1522] text-slate-100 font-sans">
      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-7 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Panou control · urmărire cereri (Administrator)
        </h1>

        {error && (
          <div className="rounded-xl border border-rose-700/60 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* KPI Cards Row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#162235] py-5 shadow-sm">
            <span className="text-3xl font-extrabold text-white">
              {stats.total}
            </span>
            <span className="mt-1 text-xs font-medium text-slate-400">
              Total cereri
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#162235] py-5 shadow-sm">
            <span className="text-3xl font-extrabold text-white">
              {stats.paid}
            </span>
            <span className="mt-1 text-xs font-medium text-slate-400">
              Plăți efectuate
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#162235] py-5 shadow-sm">
            <span className="text-3xl font-extrabold text-white">
              {stats.unpaid}
            </span>
            <span className="mt-1 text-xs font-medium text-slate-400">
              Plăți neachitate
            </span>
          </div>
        </section>

        {/* Requests Panel & Filter Tabs */}
        <section className="rounded-2xl border border-[#2480e8]/80 bg-[#162235] p-5 shadow-lg">
          {/* Segmented Tabs */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                activeFilter === "ALL"
                  ? "bg-[#64a3e8] text-[#0c1624] shadow"
                  : "bg-[#0f1826] text-slate-300 hover:bg-[#131f30]"
              }`}
            >
              Toate
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("PAID")}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                activeFilter === "PAID"
                  ? "bg-[#64a3e8] text-[#0c1624] shadow"
                  : "bg-[#0f1826] text-slate-300 hover:bg-[#131f30]"
              }`}
            >
              Plătite
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("UNPAID")}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                activeFilter === "UNPAID"
                  ? "bg-[#64a3e8] text-[#0c1624] shadow"
                  : "bg-[#0f1826] text-slate-300 hover:bg-[#131f30]"
              }`}
            >
              Neplătite
            </button>
          </div>

          {/* Requests Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/60 text-xs font-semibold text-slate-400">
                  <th className="py-3 pl-2">Client</th>
                  <th className="py-3">Facilitate</th>
                  <th className="py-3">Interval</th>
                  <th className="py-3">Plată</th>
                  <th className="py-3 pr-2 text-right">
                    <span className="sr-only">Acțiuni</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Se încarcă cererile de rezervare...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Nu există cereri pentru filtrul selectat.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => {
                    const isPaid = booking.paymentState === "Plătit";

                    return (
                      <tr
                        key={booking.bookingId}
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="py-4 pl-2 font-medium text-slate-100">
                          {booking.client}
                        </td>
                        <td className="py-4 text-slate-200">
                          {booking.facility}
                        </td>
                        <td className="py-4 text-slate-400">
                          {formatBookingSlot(booking.startAt)}
                        </td>
                        <td className="py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${
                              isPaid
                                ? "bg-emerald-950/90 text-emerald-400 border border-emerald-700/40"
                                : "bg-amber-950/90 text-amber-400 border border-amber-700/40"
                            }`}
                          >
                            {booking.paymentState}
                          </span>
                        </td>
                        <td className="py-4 pr-2 text-right">
                          {renderStatusOrActions(booking)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom Card: Equipment & Global Rules */}
        <section className="rounded-2xl border border-slate-700/60 bg-[#162235] p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-white">
            Gestionează echipamente și reguli
          </h2>

          <ul className="divide-y divide-slate-800/80 text-sm">
            {equipment.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2.5 text-slate-300"
              >
                <span>{item.name}</span>
                <span className="font-bold text-white">
                  {item.price}{" "}
                  {settings?.currency === "RON"
                    ? "lei"
                    : (settings?.currency ?? "lei")}
                </span>
              </li>
            ))}
          </ul>

          {settings && (
            <p className="mt-3 text-xs text-slate-400">
              Regulă anulare: {settings.cancellationHours} ore · Reduceri:{" "}
              {discounts
                .filter((d) => d.discountPercent > 0)
                .map((d) => `${d.label} ${d.discountPercent}%`)
                .join(", ")}
              .
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
