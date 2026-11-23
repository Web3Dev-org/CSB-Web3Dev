import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Check, FileText, Loader2 } from "lucide-react";
import {
  apiClient,
  ApiProblemError,
  unwrap,
  type BookingDetail,
  type PaymentDetail,
  type PaymentInitiateResponse,
} from "../../api";

interface ConfirmProps {
  booking: BookingDetail;
  payment?: PaymentInitiateResponse | PaymentDetail | null;
  reminderMinutes?: number;
}

export const Confirm: React.FC<ConfirmProps> = ({
  booking,
  payment,
  reminderMinutes = 60,
}) => {
  const navigate = useNavigate();
  const [loadingInvoice, setLoadingInvoice] = useState<boolean>(false);
  const [invoiceMessage, setInvoiceMessage] = useState<string>("");

  const isPaid = payment?.status === "reusita";

  const handleDownloadInvoice = async (): Promise<void> => {
    setLoadingInvoice(true);
    setInvoiceMessage("");

    try {
      const invoice = await unwrap(
        apiClient.GET("/bookings/{id}/invoice", {
          params: { path: { id: booking.id } },
        }),
      );

      if (invoice.pdfPath) {
        window.open(invoice.pdfPath, "_blank", "noopener,noreferrer");
      } else {
        setInvoiceMessage(
          `Factura ${invoice.series}-${invoice.number} este emisă, dar fișierul PDF nu este disponibil încă.`,
        );
      }
    } catch (err) {
      const problem = ApiProblemError.fromUnknown(err);
      if (problem.status === 404) {
        setInvoiceMessage(
          "Factura fiscală se emite automat după confirmarea plății online.",
        );
      } else {
        setInvoiceMessage(problem.message);
      }
    } finally {
      setLoadingInvoice(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-6">
      <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl flex items-center justify-center mx-auto">
        <Check className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {isPaid
            ? `Rezervare #${booking.id} plătită · În așteptarea aprobării`
            : `Rezervare #${booking.id} înregistrată`}
        </h2>
        <p className="text-sm text-slate-400">
          {booking.facilityName} ·{" "}
          {new Date(booking.startAt).toLocaleString("ro-RO", {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          ({booking.hoursCount}h)
        </p>
      </div>

      {invoiceMessage && (
        <div className="max-w-md mx-auto bg-slate-950 border border-slate-800 text-slate-300 text-xs p-3 rounded-lg">
          {invoiceMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <button
          type="button"
          disabled={loadingInvoice}
          onClick={() => void handleDownloadInvoice()}
          className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          {loadingInvoice ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Descarcă factura PDF
        </button>

        <button
          type="button"
          onClick={() => navigate("/rezervarile-mele")}
          className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          Rezervările mele
        </button>
      </div>

      <p className="text-xs text-slate-500 pt-2">
        Reminder configurat: {reminderMinutes} min înainte de început.
      </p>
    </div>
  );
};