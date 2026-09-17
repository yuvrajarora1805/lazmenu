"use client";

import React, { useState } from "react";
import { useAuth, useCart } from "@/context/AppContext";
import AuthModal from "./AuthModal";
import CartDrawer from "./CartDrawer";
import { ShoppingBag, User, Phone, ShieldCheck, Flame, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();

  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      {/* Top Banner Alert */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-amber-950 font-black text-xs py-2 px-4 text-center tracking-wide flex items-center justify-center gap-4 shadow-inner">
        <span className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 fill-amber-950" /> Lunch | Snacks | Dinner
        </span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline">🚀 Free Delivery on all Orders!</span>
        <span>•</span>
        <span>⚡ Min Order: ₹100/-</span>
        <span className="hidden md:inline">•</span>
        <span className="hidden md:flex items-center gap-1">
          <Phone className="w-3 h-3" /> Call: 8432813476
        </span>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-amber-950/95 backdrop-blur-md border-b border-amber-900/80 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Restaurant Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-amber-950 font-black text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-amber-100 group-hover:text-amber-400 transition-colors uppercase">
                Lazeez Kalkata's
              </h1>
              <p className="text-[10px] text-amber-400/90 font-medium">Authentic Kathi Rolls & Tandoori</p>
            </div>
          </Link>

          {/* Action Navigation */}
          <div className="flex items-center gap-3">
            {/* Kitchen Admin Dashboard Link */}
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 bg-amber-900/60 hover:bg-amber-800/80 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-700/60 text-xs font-bold transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Kitchen Admin
            </Link>

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-xs text-amber-300 font-medium">
                  Hi, <strong>{user.name}</strong>
                </span>
                <button
                  onClick={logout}
                  className="bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-700/40 text-xs font-semibold transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-1.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 px-3 py-1.5 rounded-xl border border-amber-700/60 text-xs font-bold transition-all"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                Login / Signup
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg transition-all transform active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Order Cart</span>
              {cartCount > 0 && (
                <span className="bg-amber-950 text-amber-300 text-[11px] px-2 py-0.5 rounded-full font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
