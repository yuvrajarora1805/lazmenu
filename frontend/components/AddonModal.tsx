"use client";

import React, { useState } from "react";
import { AddonItem, MenuItem } from "@/types";
import { X, Check, Sparkles } from "lucide-react";

interface AddonModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  category: string;
  addonsList: AddonItem[];
  onClose: () => void;
  onConfirm: (selectedAddons: AddonItem[]) => void;
}

export default function AddonModal({
  isOpen,
  item,
  category,
  addonsList,
  onClose,
  onConfirm
}: AddonModalProps) {
  const [selectedAddons, setSelectedAddons] = useState<AddonItem[]>([]);

  if (!isOpen || !item) return null;

  const toggleAddon = (addon: AddonItem) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const totalAddonPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const finalPrice = (item.price || 0) + totalAddonPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-amber-950 border border-amber-800 text-amber-50 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/60 bg-amber-900/40">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-lg text-amber-100">{item.name}</h3>
            </div>
            <p className="text-xs text-amber-400 mt-0.5">Customize your Kathi Roll with extra toppings</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-amber-800/50 text-amber-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Addon Items List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
            Available Roll Add-ons
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {addonsList.map((addon) => {
              const isSelected = selectedAddons.some((a) => a.id === addon.id);
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => toggleAddon(addon)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-amber-900/80 border-amber-400 text-amber-100 shadow-md scale-[1.02]"
                      : "bg-amber-950/60 border-amber-800/60 text-amber-300 hover:border-amber-700"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{addon.name}</div>
                    <div className="text-[11px] text-amber-400/80">
                      {addon.price > 0 ? `+ ₹${addon.price}` : "Free Charge"}
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                      isSelected
                        ? "bg-amber-400 border-amber-400 text-amber-950"
                        : "border-amber-700 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-amber-800/80 bg-amber-900/40 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400">Total Price</div>
            <div className="text-xl font-bold text-amber-200">₹{finalPrice}</div>
          </div>

          <button
            onClick={() => {
              onConfirm(selectedAddons);
              onClose();
            }}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-amber-950 font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all transform active:scale-95 text-sm"
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}
