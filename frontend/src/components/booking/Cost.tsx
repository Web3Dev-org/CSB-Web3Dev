import React from "react";
import type { User } from "../../api";
import type { BookingOptionsData } from "./Options";

export interface CostBreakdown {
  baseAmount: number;
  equipmentAmount: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
}

interface CostProps {
  options: BookingOptionsData;
  user: User;
  currency?: string;
  onNext: (breakdown: CostBreakdown) => void;
  onBack: () => void;
}

export const Cost: React.FC<CostProps> = ({
  options,
  user,
  currency = "RON",
  onNext,
  onBack,
}) => {
  const subtotal = +(options.baseAmount + options.equipmentAmount).toFixed(2);
  const discountPercent = user.discountPercent;
  const discountAmount = +((subtotal * discountPercent) / 100).toFixed(2);
  const totalAmount = +(subtotal - discountAmount).toFixed(2);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">
          Rezumat și calcul tarifar
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {options.facilityName} · {options.displayLabel} · tarif{" "}
          {options.type === "ora" ? "pe oră" : "pe joc"}
        </p>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3.5">
        <div className="flex justify-between items-center text-sm text-slate-300">
          <span>
            {options.facilityName} ({options.hoursCount} × {options.unitPrice}{" "}
            {currency})
          </span>
          <span className="font-semibold text-white">
            {options.baseAmount.toFixed(2)} {currency}
          </span>
        </div>

        {options.equipment.map((item) => (
          <div
            key={item.equipmentId}
            className="flex justify-between items-center text-sm text-slate-300"
          >
            <span>
              Echipament: {item.name} ({item.quantity}×)
            </span>
            <span className="font-semibold text-white">
              {(item.unitPrice * item.quantity).toFixed(2)} {currency}
            </span>
          </div>
        ))}

        <div className="flex justify-between items-center text-sm text-slate-300">
          <span>
            Reducere {user.statusLabel} ({discountPercent}%)
          </span>
          <span className="font-semibold text-emerald-400">
            -{discountAmount.toFixed(2)} {currency}
          </span>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-base font-bold text-white">
          <span>Total de plată</span>
          <span className="text-xl text-sky-400">
            {totalAmount.toFixed(2)} {currency}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        Intervalul selectat este disponibil. Continuă pentru a accepta
        termenii și a trimite rezervarea.
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Înapoi
        </button>
        <button
          type="button"
          onClick={() =>
            onNext({
              baseAmount: options.baseAmount,
              equipmentAmount: options.equipmentAmount,
              discountPercent,
              discountAmount,
              totalAmount,
            })
          }
          className="bg-sky-500 hover:bg-sky-600 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Continuă la termeni și condiții
        </button>
      </div>
    </div>
  );
};