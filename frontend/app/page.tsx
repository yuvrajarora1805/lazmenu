import React from "react";
import Navbar from "@/components/Navbar";
import MenuGrid from "@/components/MenuGrid";
import { Phone, Clock, Truck, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

async function getMenuData() {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const res = await fetch(`${backendUrl}/api/menu`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch menu:", error);
    return null;
  }
}

export default async function HomePage() {
  const menuData = await getMenuData();

  if (!menuData) {
    return (
      <div className="min-h-screen bg-amber-950 text-amber-50 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold">Connecting to Lazeez Kalkata Server...</h1>
        <p className="text-sm text-amber-400 mt-2 max-w-md">
          Please ensure backend Node server is running on port 5000 (`node server.js`).
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-950 via-amber-900/40 to-amber-950 text-amber-50 pb-20">
      <Navbar />

      {/* Hero Banner Section */}
      <section className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-gradient-to-r from-amber-900/80 via-amber-800/40 to-orange-950/80 border border-amber-700/60 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-500/30">
              Kolkata's Famous Kathi Rolls & Tandoori
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-amber-100 tracking-tight leading-tight">
              Lazeez Kalkata's
            </h1>
            <p className="text-amber-300 text-sm sm:text-base font-medium">
              Savor double egg chicken rolls, malai soya chaap, tandoori tikka, paneer butter masala, & authentic rumali rotis freshly made to order.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-amber-200 font-semibold">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <span>Free Delivery (Min Order ₹100)</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Lunch • Snacks • Dinner</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400" />
                <span>Direct Hotline: 8432813476</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Food Menu Filterable Component */}
      <MenuGrid categories={menuData.menu} />
    </main>
  );
}
