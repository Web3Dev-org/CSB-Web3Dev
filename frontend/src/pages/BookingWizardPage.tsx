import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2 } from "lucide-react";

import {
  apiClient,
  ApiProblemError,
  unwrap,
  type AppSettings,
  type BookingDetail,
  type Equipment,
  type Facility,
  type PaymentDetail,
  type PaymentInitiateResponse,
} from "../api";
import { useAuth } from "../context/useAuth";
import { Options, type BookingOptionsData } from "../components/booking/Options";
import { Cost } from "../components/booking/Cost";
import { Terms } from "../components/booking/Terms";
import { Payment } from "../components/booking/Payment";
import { Confirm } from "../components/booking/Confirm";

const WIZARD_STEPS = [
  { nr: 1, title: "1. Opțiuni" },
  { nr: 2, title: "2. Cost" },
  { nr: 3, title: "3. Termeni" },
  { nr: 4, title: "4. Plată" },
  { nr: 5, title: "5. Confirmare" },
];

export const BookingWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { idFacilitate } = useParams<{ idFacilitate: string }>();
  const facilityId = Number(idFacilitate);
  
  const isValidFacilityId = Number.isInteger(facilityId) && facilityId > 0;

  const [facility, setFacility] = useState<Facility | null>(null);
  const [equipmentCatalog, setEquipmentCatalog] = useState<Equipment[]>([]);
  const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
  const [loadingInit, setLoadingInit] = useState<boolean>(isValidFacilityId);
  const [initError, setInitError] = useState<string>("");

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxStepReached, setMaxStepReached] = useState<number>(1);

  const [optionsData, setOptionsData] = useState<BookingOptionsData | null>(
    null,
  );
  const [createdBooking, setCreatedBooking] = useState<BookingDetail | null>(
    null,
  );
  const [completedPayment, setCompletedPayment] = useState<
    PaymentInitiateResponse | PaymentDetail | null
  >(null);

  useEffect(() => {
    if (!isValidFacilityId) {
      return;
    }

    let cancelled = false;

    Promise.all([
      unwrap(apiClient.GET("/facilities")),
      unwrap(apiClient.GET("/app/equipment")),
      unwrap(apiClient.GET("/app/settings")),
    ])
      .then(([facilities, equipment, appSettings]) => {
        if (cancelled) return;
        const found = facilities.find((f) => f.id === facilityId) ?? null;
        setFacility(found);
        setEquipmentCatalog(equipment);
        setSettings(appSettings);
        setInitError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setInitError(ApiProblemError.fromUnknown(err).message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInit(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [facilityId, isValidFacilityId]);

  const goToStep = (nextStep: number): void => {
    setCurrentStep(nextStep);
    setMaxStepReached((prev) => Math.max(prev, nextStep));
  };

  const handleHeaderStepClick = (stepNumber: number): void => {
    // După ce rezervarea a fost creată (pasul 4+), blocăm revenirea la pașii 1-3 pentru a evita duplicatele
    if (createdBooking && stepNumber < 4) {
      return;
    }
    if (stepNumber <= maxStepReached) {
      setCurrentStep(stepNumber);
    }
  };

  if (loadingInit) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-10 flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
        Se pregătește formularul de rezervare...
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-10 text-center space-y-4">
        <p className="text-sm text-rose-400">{initError}</p>
        <button
          type="button"
          onClick={() => navigate("/facilitati")}
          className="bg-sky-500 hover:bg-sky-600 px-5 py-2 rounded-lg text-sm font-medium cursor-pointer"
        >
          Înapoi la facilități
        </button>
      </div>
    );
  }

  if (!facility || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-10 text-center">
        <h2 className="text-xl font-bold text-rose-400">
          Facilitatea nu a fost găsită!
        </h2>

        <button
          type="button"
          onClick={() => navigate("/facilitati")}
          className="mt-4 bg-sky-500 hover:bg-sky-600 px-5 py-2 rounded-lg cursor-pointer"
        >
          Înapoi la facilități
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 space-y-6">
      {/* Bara de pași */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {WIZARD_STEPS.map((step) => {
          const isLockedAfterCreation = Boolean(createdBooking) && step.nr < 4;
          const isUnlocked =
            step.nr <= maxStepReached && !isLockedAfterCreation;
          const isActive = currentStep === step.nr;

          return (
            <button
              key={step.nr}
              type="button"
              disabled={!isUnlocked}
              onClick={() => handleHeaderStepClick(step.nr)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-sky-500 text-white shadow-md"
                  : isUnlocked
                    ? "bg-slate-800 text-sky-400 hover:bg-slate-700 cursor-pointer"
                    : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-60"
              }`}
            >
              {step.title}
            </button>
          );
        })}
      </div>

      {/* Antet facilitate */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{facility.name}</h1>

          <p className="text-sm text-slate-400 mt-1">
            {facility.description ?? `ID facilitate: ${facility.id}`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/facilitati")}
          className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
        >
          Înapoi la Facilități
        </button>
      </div>

      {currentStep === 1 && (
        <Options
          facility={facility}
          equipmentCatalog={equipmentCatalog}
          settings={settings}
          initialData={optionsData}
          onNext={(data) => {
            setOptionsData(data);
            goToStep(2);
          }}
        />
      )}

      {currentStep === 2 && optionsData && (
        <Cost
          options={optionsData}
          user={user}
          currency={settings?.currency}
          onNext={() => goToStep(3)}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {currentStep === 3 && optionsData && (
        <Terms
          options={optionsData}
          onBookingCreated={(booking) => {
            setCreatedBooking(booking);
            goToStep(4);
          }}
          onBack={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 4 && createdBooking && (
        <Payment
          booking={createdBooking}
          currency={settings?.currency}
          onCompleted={(payment) => {
            setCompletedPayment(payment);
            goToStep(5);
          }}
          onBack={() => goToStep(5)}
        />
      )}

      {currentStep === 5 && createdBooking && (
        <Confirm
          booking={createdBooking}
          payment={completedPayment}
          reminderMinutes={user.reminderMinutes}
        />
      )}
    </div>
  );
};