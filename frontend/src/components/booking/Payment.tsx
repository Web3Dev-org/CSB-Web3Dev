import React, { useState } from "react";
import { Banknote, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import {
  apiClient,
  ApiProblemError,
  unwrap,
  type BookingDetail,
  type PaymentDetail,
  type PaymentInitiateResponse,
  type PaymentMethod,
} from "../../api";

interface PaymentProps {
  booking: BookingDetail;
  currency?: string;
  onCompleted: (payment: PaymentInitiateResponse | PaymentDetail) => void;
  onBack: () => void;
}

const PAYMENT_TABS: Array<{
  method: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    method: "card_online",
    label: "Card bancar online",
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    method: "link_plata",
    label: "Link de plată",
    icon: <ExternalLink className="w-4 h-4" />,
  },
  {
    method: "numerar",
    label: "Numerar la recepție",
    icon: <Banknote className="w-4 h-4" />,
  },
];

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export const Payment: React.FC<PaymentProps> = ({
  booking,
  currency = "RON",
  onCompleted,
  onBack,
}) => {
  const [method, setMethod] = useState<PaymentMethod>("card_online");
  const [numarCard, setNumarCard] = useState<string>("");
  const [expirare, setExpirare] = useState<string>("");
  const [cvv, setCvv] = useState<string>("");

  const [initiatedLinkPayment, setInitiatedLinkPayment] =
    useState<PaymentInitiateResponse | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [eroare, setEroare] = useState<string>("");

  const handleMethodChange = (nextMethod: PaymentMethod): void => {
    setMethod(nextMethod);
    setEroare("");
    setInitiatedLinkPayment(null);
  };

  const validateCardFields = (): boolean => {
    const digitsOnly = numarCard.replace(/\s/g, "");
    if (!/^\d{16}$/.test(digitsOnly)) {
      setEroare("Numărul cardului trebuie să conțină exact 16 cifre.");
      return false;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expirare)) {
      setEroare("Data expirării trebuie să fie în formatul LL/AA (ex: 12/28).");
      return false;
    }
    if (!/^\d{3}$/.test(cvv)) {
      setEroare("Codul CVV trebuie să aibă 3 cifre.");
      return false;
    }
    return true;
  };

  const handlePay = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setEroare("");

    if (method === "card_online" && !validateCardFields()) {
      return;
    }

    setSubmitting(true);
    try {
      const initiated = await unwrap(
        apiClient.POST("/payments/initiate", {
          body: {
            bookingId: booking.id,
            method,
          },
        }),
      );

      if (method === "numerar") {
        onCompleted(initiated);
        return;
      }

      if (method === "link_plata" && initiated.paymentLink) {
        setInitiatedLinkPayment(initiated);
        return;
      }

      // Pentru card_online (simulat în UI), verificăm tranzacția prin GET /payments/{id}
      const detail = await unwrap(
        apiClient.GET("/payments/{id}", {
          params: { path: { id: initiated.paymentId } },
        }),
      );

      if (detail.status === "esuata") {
        setEroare(
          detail.failureReason ??
            "Plata a fost respinsă. Verifică datele și încearcă din nou.",
        );
        return;
      }

      onCompleted(detail);
    } catch (err) {
      setEroare(ApiProblemError.fromUnknown(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyLinkPayment = async (): Promise<void> => {
    if (!initiatedLinkPayment) return;
    setSubmitting(true);
    setEroare("");

    try {
      const detail = await unwrap(
        apiClient.GET("/payments/{id}", {
          params: { path: { id: initiatedLinkPayment.paymentId } },
        }),
      );

      if (detail.status === "esuata") {
        setEroare(
          detail.failureReason ??
            "Plata prin link a eșuat. Poți genera un nou link.",
        );
        setInitiatedLinkPayment(null);
        return;
      }

      onCompleted(detail);
    } catch (err) {
      setEroare(ApiProblemError.fromUnknown(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handlePay(e)}
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-white">Plată bancară online</h2>
        <span className="text-xs text-slate-400">
          Rezervare #{booking.id} · {booking.facilityName}
        </span>
      </div>

      {/* Selector metodă de plată din contractul API */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PAYMENT_TABS.map((tab) => {
          const active = method === tab.method;
          return (
            <button
              key={tab.method}
              type="button"
              disabled={submitting}
              onClick={() => handleMethodChange(tab.method)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-sky-500/15 border-sky-500 text-sky-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {eroare && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium">
          {eroare}
        </div>
      )}

      {/* Conținut specific metodei selectate */}
      {method === "card_online" && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Număr card
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={19}
              value={numarCard}
              onChange={(e) => setNumarCard(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Expirare
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={expirare}
                onChange={(e) => setExpirare(formatExpiry(e.target.value))}
                placeholder="LL/AA"
                className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                CVV
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={3}
                value={cvv}
                onChange={(e) =>
                  setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
                }
                placeholder="123"
                className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="pt-2 text-sm text-slate-300 font-semibold">
            Sumă de plată:{" "}
            <span className="text-sky-400">
              {booking.totalAmount.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      )}

      {method === "link_plata" && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
          {!initiatedLinkPayment ? (
            <p className="text-sm text-slate-300 leading-relaxed">
              Generează un link unic de plată securizat pentru rezervarea{" "}
              <strong className="text-white">#{booking.id}</strong>.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Link-ul de plată pentru tranzacția{" "}
                <strong className="text-white">
                  #{initiatedLinkPayment.paymentId}
                </strong>{" "}
                este pregătit:
              </p>
              {initiatedLinkPayment.paymentLink && (
                <a
                  href={initiatedLinkPayment.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Deschide link-ul de plată
                </a>
              )}
            </div>
          )}

          <div className="pt-2 text-sm text-slate-300 font-semibold">
            Sumă de plată:{" "}
            <span className="text-sky-400">
              {booking.totalAmount.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      )}

      {method === "numerar" && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Vei achita contravaloarea rezervării în numerar la recepția bazei
            sportive înainte de începerea intervalului rezervat.
          </p>

          <div className="pt-2 text-sm text-slate-300 font-semibold">
            Sumă de plată la recepție:{" "}
            <span className="text-sky-400">
              {booking.totalAmount.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      )}

      {/* Butoane acțiune (exact structura și stilurile originale) */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
        <button
          type="button"
          disabled={submitting}
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Înapoi
        </button>

        {method === "link_plata" && initiatedLinkPayment ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleVerifyLinkPayment()}
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Verifică statusul plății
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {method === "card_online"
              ? "Efectuează plata"
              : method === "link_plata"
                ? "Generează link de plată"
                : "Confirmă plata la recepție"}
          </button>
        )}
      </div>
    </form>
  );
};