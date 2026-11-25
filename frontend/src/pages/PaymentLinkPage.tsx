import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { CheckCircle2, CreditCard, Loader2, XCircle } from "lucide-react";
import {
  apiClient,
  ApiProblemError,
  unwrap,
  type PaymentDetail,
} from "../api";

/**
 * Pagina deschisă din link-ul de plată (metoda `link_plata`).
 * Nu există încă un procesator de plăți real: butonul finalizează plata simulat.
 */
export const PaymentLinkPage: React.FC = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [eroare, setEroare] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    unwrap(
      apiClient.GET("/payments/link/{token}", {
        params: { path: { token } },
      }),
    )
      .then((detail) => {
        if (!cancelled) setPayment(detail);
      })
      .catch((err: unknown) => {
        if (!cancelled) setEroare(ApiProblemError.fromUnknown(err).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handlePay = async (): Promise<void> => {
    setSubmitting(true);
    setEroare("");
    try {
      const paid = await unwrap(
        apiClient.POST("/payments/link/{token}/pay", {
          params: { path: { token } },
        }),
      );
      setPayment(paid);
    } catch (err) {
      setEroare(ApiProblemError.fromUnknown(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-sky-400" />
          <h1 className="text-xl font-bold text-white">Plată prin link</h1>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            Se încarcă detaliile plății...
          </div>
        )}

        {eroare && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium">
            {eroare}
          </div>
        )}

        {payment && <PaymentSummary payment={payment} />}

        {payment?.status === "initiata" && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handlePay()}
            className="w-full inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Plătește {payment.amount.toFixed(2)} {payment.currency}
          </button>
        )}

        {payment?.status === "reusita" && (
          <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm p-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Plata a fost efectuată. Te poți întoarce în fereastra rezervării
              și apăsa „Verifică statusul plății”.
            </span>
          </div>
        )}

        {payment && (payment.status === "esuata" || payment.status === "rambursata") && (
          <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm p-3 rounded-lg">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Acest link nu mai este valabil
              {payment.failureReason ? `: ${payment.failureReason}` : "."}
            </span>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Mediu de test: plata este simulată, nu se percepe nicio sumă reală.
        </p>

        <Link
          to="/rezervarile-mele"
          className="inline-block text-sm text-sky-400 hover:text-sky-300"
        >
          ← Rezervările mele
        </Link>
      </div>
    </div>
  );
};

const PaymentSummary: React.FC<{ payment: PaymentDetail }> = ({ payment }) => (
  <dl className="grid grid-cols-2 gap-y-2 text-sm">
    <dt className="text-slate-400">Rezervare</dt>
    <dd className="text-white text-right">#{payment.bookingId}</dd>
    <dt className="text-slate-400">Tranzacție</dt>
    <dd className="text-white text-right">#{payment.id}</dd>
    <dt className="text-slate-400">Sumă</dt>
    <dd className="text-sky-400 font-semibold text-right">
      {payment.amount.toFixed(2)} {payment.currency}
    </dd>
  </dl>
);
