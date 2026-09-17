"use client";

import React, { useState } from "react";
import { MenuCategory, MenuItem, AddonItem } from "@/types";
import { useCart } from "@/context/AppContext";
import AddonModal from "./AddonModal";
import { Plus, Flame, Sparkles, Check } from "lucide-react";

interface MenuGridProps {
  categories: MenuCategory[];
}

export default function MenuGrid({ categories }: MenuGridProps) {
  const { addToCart } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0]?.category || ""
  );

  // Addon modal state
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [selectedItemForAddon, setSelectedItemForAddon] = useState<MenuItem | null>(null);

  const addonCategory = categories.find((c) => c.type === "addon");
  const addonsList: AddonItem[] = (addonCategory?.items as AddonItem[]) || [];

  const handleAddItem = (
    item: MenuItem,
    categoryName: string,
    portion?: "qtr" | "half" | "full"
  ) => {
    // If Kathi roll, open Addon modal
    if (categoryName.toLowerCase().includes("kathi roll")) {
      setSelectedItemForAddon(item);
      setAddonModalOpen(true);
    } else {
      addToCart(item, categoryName, portion);
    }
  };

  const currentCategoryData = categories.find(
    (c) => c.category === activeCategory
  );

  return (
    <div className="space-y-8">
      {/* Category Pills Slider */}
      <div className="sticky top-16 z-30 bg-amber-950/90 backdrop-blur-md py-4 border-b border-amber-900/60 shadow-lg">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-4 max-w-7xl mx-auto">
          {categories.map((cat) => {
            const isActive = cat.category === activeCategory;
            return (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-amber-950 shadow-md shadow-amber-500/20 scale-105"
                    : "bg-amber-900/40 text-amber-300 hover:bg-amber-800/60 hover:text-amber-100 border border-amber-800/40"
                }`}
              >
                {cat.category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Active Category Display */}
      {currentCategoryData && (
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-800/60 pb-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-amber-100 uppercase">
                {currentCategoryData.category}
              </h2>
              {currentCategoryData.subtitle && (
                <p className="text-xs font-semibold text-amber-400 mt-1 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  {currentCategoryData.subtitle}
                </p>
              )}
            </div>
            <span className="text-xs text-amber-400/80 mt-1 sm:mt-0 font-medium">
              {currentCategoryData.items.length} Delicious Items
            </span>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCategoryData.items.map((item: any) => {
              return (
                <div
                  key={item.id}
                  className="bg-amber-900/20 border border-amber-800/50 hover:border-amber-600/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-amber-950/50 hover:-translate-y-0.5 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-amber-100 group-hover:text-amber-300 transition-colors">
                        {item.name}
                      </h3>
                      {item.isVeg !== undefined && (
                        <span
                          className={`w-3 h-3 rounded-full shrink-0 border mt-1 ${
                            item.isVeg
                              ? "bg-green-500 border-green-300"
                              : "bg-red-500 border-red-300"
                          }`}
                          title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                        />
                      )}
                    </div>
                  </div>

                  {/* Pricing and Action buttons */}
                  <div className="mt-4 pt-3 border-t border-amber-800/30 flex items-center justify-between">
                    {/* Single Price item */}
                    {item.price !== undefined && (
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <span className="text-xs text-amber-400 block">Price</span>
                          <span className="text-lg font-black text-amber-200">
                            {item.price > 0 ? `₹${item.price}` : "Free"}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleAddItem(item, currentCategoryData.category)
                          }
                          className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" /> Add
                        </button>
                      </div>
                    )}

                    {/* Multi portion item (Qtr / Half / Full) */}
                    {item.prices && (
                      <div className="w-full space-y-2">
                        <span className="text-xs text-amber-400 block">Select Portion:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {item.prices.qtr !== undefined && (
                            <button
                              onClick={() =>
                                handleAddItem(
                                  item,
                                  currentCategoryData.category,
                                  "qtr"
                                )
                              }
                              className="bg-amber-950/80 border border-amber-700/60 hover:border-amber-400 hover:bg-amber-900/60 p-2 rounded-xl text-center transition-all"
                            >
                              <div className="text-[10px] text-amber-400 uppercase font-bold">
                                Qtr
                              </div>
                              <div className="text-xs font-black text-amber-200">
                                ₹{item.prices.qtr}
                              </div>
                            </button>
                          )}

                          {item.prices.half !== undefined && (
                            <button
                              onClick={() =>
                                handleAddItem(
                                  item,
                                  currentCategoryData.category,
                                  "half"
                                )
                              }
                              className="bg-amber-950/80 border border-amber-700/60 hover:border-amber-400 hover:bg-amber-900/60 p-2 rounded-xl text-center transition-all"
                            >
                              <div className="text-[10px] text-amber-400 uppercase font-bold">
                                Half
                              </div>
                              <div className="text-xs font-black text-amber-200">
                                ₹{item.prices.half}
                              </div>
                            </button>
                          )}

                          {item.prices.full !== undefined && (
                            <button
                              onClick={() =>
                                handleAddItem(
                                  item,
                                  currentCategoryData.category,
                                  "full"
                                )
                              }
                              className="bg-amber-950/80 border border-amber-700/60 hover:border-amber-400 hover:bg-amber-900/60 p-2 rounded-xl text-center transition-all"
                            >
                              <div className="text-[10px] text-amber-400 uppercase font-bold">
                                Full
                              </div>
                              <div className="text-xs font-black text-amber-200">
                                ₹{item.prices.full}
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Addon Modal for rolls */}
      <AddonModal
        isOpen={addonModalOpen}
        item={selectedItemForAddon}
        category={activeCategory}
        addonsList={addonsList}
        onClose={() => setAddonModalOpen(false)}
        onConfirm={(selectedAddons) => {
          if (selectedItemForAddon) {
            addToCart(
              selectedItemForAddon,
              activeCategory,
              undefined,
              selectedAddons
            );
          }
        }}
      />
    </div>
  );
}
