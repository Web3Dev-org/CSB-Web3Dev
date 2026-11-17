import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  apiClient,
  ApiProblemError,
  unwrap,
  type BookingDetail,
  type Terms as TermsDto,
} from "../../api";
import type { BookingOptionsData } from "./Options";

interface TermsProps {
  options: BookingOptionsData;
  onBookingCreated: (booking: BookingDetail) => void;
  onBack: () => void;
}

export const Terms: React.FC<TermsProps> = ({
  options,
  onBookingCreated,
  onBack,
}) => {
  const [terms, setTerms] = useState<TermsDto | null>(null);
  const [loadingTerms, setLoadingTerms] = useState<boolean>(true);
  const [accepted, setAccepted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const loadTerms = async () => {
      setLoadingTerms(true);
      try {
        const currentTerms = await unwrap(apiClient.GET("/app/terms/current"));
        if (!cancelled) {
          setTerms(currentTerms);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(ApiProblemError.fromUnknown(err).message);
        }
      } finally {
        if (!cancelled) {
          setLoadingTerms(false);
        }
      }
    };

    void loadTerms();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmitBooking = async (): Promise<void> => {
    if (!accepted) {
      setErrorMessage("Trebuie să accepți termenii și condițiile pentru a continua.");
      return;
    }

    if (!terms) {
      setErrorMessage("Versiunea termenilor și condițiilor nu a putut fi încărcată.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const createdBooking = await unwrap(
        apiClient.POST("/bookings", {
          body: {
            facilityId: options.facilityId,
            type: options.type,
            startAt: options.startAt,
            hoursCount: options.hoursCount,
            termsVersionId: terms.id,
            equipment: options.equipmentRequest,
          },
        }),
      );

      onBookingCreated(createdBooking);
    } catch (err) {
      setErrorMessage(ApiProblemError.fromUnknown(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Acceptare termeni și condiții
        </h2>
        {terms && (
          <span className="text-xs text-slate-400">
            Versiunea #{terms.id} ·{" "}
            {new Date(terms.publishedAt).toLocaleDateString("ro-RO")}
          </span>
        )}
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 text-sm text-slate-300 leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto">
        {loadingTerms ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            Se încarcă termenii și condițiile...
          </div>
        ) : terms ? (
          terms.body
        ) : (
          <p className="text-rose-400">Termenii nu sunt disponibili momentan.</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
          <input
            type="checkbox"
            checked={accepted}
            disabled={loadingTerms || !terms || submitting}
            onChange={(e) => {
              setAccepted(e.target.checked);
              if (e.target.checked) setErrorMessage("");
            }}
            className="accent-sky-500 rounded"
          />
          Accept termenii și condițiile de utilizare a bazei sportive
        </label>

        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
        <button
          type="button"
          disabled={submitting}
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Înapoi
        </button>
        <button
          type="button"
          disabled={!accepted || !terms || submitting}
          onClick={() => void handleSubmitBooking()}
          className={`inline-flex items-center gap-2 font-medium text-sm px-6 py-2 rounded-lg transition-colors ${
            accepted && terms && !submitting
              ? "bg-sky-500 hover:bg-sky-600 text-white cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Trimite cererea de rezervare
        </button>
      </div>
    </div>
  );
};