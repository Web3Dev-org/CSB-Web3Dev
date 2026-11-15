import React, { useMemo, useState } from 'react';
import type { components } from '../api/schema';

// Tipuri extrase direct din schema OpenAPI generată
type AdminBookingRequest = components['schemas']['AdminBookingRequest'];
type Equipment = components['schemas']['Equipment'];
type AppSettings = components['schemas']['AppSettings'];
type UserStatus = components['schemas']['UserStatus'];

type PaymentFilter = 'ALL' | 'PAID' | 'UNPAID';

// Date inițiale de test (înlocuiește-le cu apelurile API: GET /admin/bookings, GET /app/equipment etc.)
const INITIAL_BOOKINGS: AdminBookingRequest[] = [
  {
    bookingId: 101,
    client: 'Andrei Pop',
    facility: 'Sala de fitness',
    startAt: '2026-11-15T10:00:00+02:00',
    hoursCount: 1,
    totalAmount: 30,
    status: 'in_asteptare',
    paymentState: 'Plătit',
  },
  {
    bookingId: 102,
    client: 'Maria Ionescu',
    facility: 'Bază sportivă',
    startAt: '2026-11-15T17:00:00+02:00',
    hoursCount: 2,
    totalAmount: 100,
    status: 'in_asteptare',
    paymentState: 'Neplătit',
  },
  {
    bookingId: 103,
    client: 'Radu Lupu',
    facility: 'Sala Polivalentă',
    startAt: '2026-11-19T19:00:00+02:00',
    hoursCount: 1,
    totalAmount: 80,
    status: 'in_asteptare',
    paymentState: 'Plătit',
  },
];

const INITIAL_EQUIPMENT: Equipment[] = [
  { id: 1, name: 'Mingi', price: 10, stock: null },
  { id: 2, name: 'Veste', price: 5, stock: null },
  { id: 3, name: 'Plasă volei', price: 15, stock: null },
];

const INITIAL_SETTINGS: AppSettings = {
  cancellationHours: 12,
  arrivalMinutes: 10,
  bookingHorizonDays: 7,
  currency: 'RON',
};

const INITIAL_DISCOUNTS: UserStatus[] = [
  { code: 'student', label: 'Student', discountPercent: 50 },
  { code: 'cadru', label: 'Cadru didactic', discountPercent: 25 },
];

// Formatare interval orar prietenoasă (ex: "Mâine 10:00", "Joi 19:00")
function formatBookingSlot(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const timeStr = date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (date.toDateString() === now.toDateString()) {
    return `Azi ${timeStr}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Mâine ${timeStr}`;
  }

  const weekday = date.toLocaleDateString('ro-RO', { weekday: 'long' });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalizedWeekday} ${timeStr}`;
}

export const AdminDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<AdminBookingRequest[]>(INITIAL_BOOKINGS);
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>('ALL');
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // Statistici calculate dinamic pentru cele 3 carduri de sus
  const stats = useMemo(() => {
    const total = bookings.length;
    const paid = bookings.filter((b) => b.paymentState === 'Plătit').length;
    const unpaid = bookings.filter((b) => b.paymentState === 'Neplătit').length;
    return { total, paid, unpaid };
  }, [bookings]);

  // Lista filtrată după tab-ul selectat
  const filteredBookings = useMemo(() => {
    if (activeFilter === 'PAID') {
      return bookings.filter((b) => b.paymentState === 'Plătit');
    }
    if (activeFilter === 'UNPAID') {
      return bookings.filter((b) => b.paymentState === 'Neplătit');
    }
    return bookings;
  }, [bookings, activeFilter]);

  const handleApprove = async (bookingId: number) => {
    setApprovingId(bookingId);
    try {
      // Aici vei apela endpoint-ul din openapi-fetch:
      // await api.POST('/admin/bookings/{id}/approve', { params: { path: { id: bookingId } } });

      // Simulare răspuns API
      await new Promise((resolve) => setTimeout(resolve, 300));
      setBookings((prev) =>
        prev.map((item) =>
          item.bookingId === bookingId ? { ...item, status: 'aprobata' } : item
        )
      );
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1522] text-slate-100 font-sans">
      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-7 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Panou control · urmărire cereri (Administrator)
        </h1>

        {/* KPI Cards Row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#162235] py-5 shadow-sm">
            <span className="text-3xl font-extrabold text-white">{stats.total}</span>
            <span className="mt-1 text-xs font-medium text-slate-400">Cereri azi</span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#162235] py-5 shadow-sm">
            <span className="text-3xl font-extrabold text-white">{stats.paid}</span>
            <span className="mt-1 text-xs font-medium text-slate-400">Plăți efectuate</span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#162235] py-5 shadow-sm">
            <span className="text-3xl font-extrabold text-white">{stats.unpaid}</span>
            <span className="mt-1 text-xs font-medium text-slate-400">Plăți neachitate</span>
          </div>
        </section>

        {/* Requests Panel & Filter Tabs */}
        <section className="rounded-2xl border border-[#2480e8]/80 bg-[#162235] p-5 shadow-lg">
          {/* Segmented Tabs */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                activeFilter === 'ALL'
                  ? 'bg-[#64a3e8] text-[#0c1624] shadow'
                  : 'bg-[#0f1826] text-slate-300 hover:bg-[#131f30]'
              }`}
            >
              Toate
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('PAID')}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                activeFilter === 'PAID'
                  ? 'bg-[#64a3e8] text-[#0c1624] shadow'
                  : 'bg-[#0f1826] text-slate-300 hover:bg-[#131f30]'
              }`}
            >
              Plătite
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('UNPAID')}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                activeFilter === 'UNPAID'
                  ? 'bg-[#64a3e8] text-[#0c1624] shadow'
                  : 'bg-[#0f1826] text-slate-300 hover:bg-[#131f30]'
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
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Nu există cereri pentru filtrul selectat.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => {
                    const isPaid = booking.paymentState === 'Plătit';
                    const isApproved = booking.status === 'aprobata';

                    return (
                      <tr
                        key={booking.bookingId}
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="py-4 pl-2 font-medium text-slate-100">
                          {booking.client}
                        </td>
                        <td className="py-4 text-slate-200">{booking.facility}</td>
                        <td className="py-4 text-slate-400">
                          {formatBookingSlot(booking.startAt)}
                        </td>
                        <td className="py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${
                              isPaid
                                ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-700/40'
                                : 'bg-amber-950/90 text-amber-400 border border-amber-700/40'
                            }`}
                          >
                            {booking.paymentState}
                          </span>
                        </td>
                        <td className="py-4 pr-2 text-right">
                          {isApproved ? (
                            <span className="inline-block rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-5 py-1.5 text-xs font-semibold text-emerald-400">
                              Aprobată
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={approvingId === booking.bookingId}
                              onClick={() => handleApprove(booking.bookingId)}
                              className="rounded-xl border border-[#4a80bd] bg-transparent px-6 py-1.5 text-xs font-semibold text-[#79b4f5] transition hover:bg-[#64a3e8] hover:text-[#0c1624] disabled:opacity-50"
                            >
                              {approvingId === booking.bookingId ? 'Se aprobă...' : 'Aprobă'}
                            </button>
                          )}
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
            {INITIAL_EQUIPMENT.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2.5 text-slate-300"
              >
                <span>{item.name}</span>
                <span className="font-bold text-white">{item.price} lei</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-slate-400">
            Regulă anulare: {INITIAL_SETTINGS.cancellationHours} ore · Reduceri:{' '}
            {INITIAL_DISCOUNTS.map(
              (d) => `${d.label} ${d.discountPercent}%`
            ).join(', ')}
            .
          </p>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;