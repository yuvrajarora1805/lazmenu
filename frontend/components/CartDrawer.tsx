"use client";

import React, { useState } from "react";
import { useCart, useAuth } from "@/context/AppContext";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  Phone,
  MapPin,
  User as UserIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQuantity, clearCart, cartSubtotal } =
    useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [customerName, setCustomerName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const minOrderMet = cartSubtotal >= 100;
  const remainingForMin = 100 - cartSubtotal;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!minOrderMet) {
      setError("Minimum order amount is ₹100/-");
      return;
    }

    if (!cart.length) {
      setError("Your cart is empty");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id || "guest",
          customerName,
          phone,
          address,
          items: cart,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      clearCart();
      onClose();
      router.push(`/track/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Order placement failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-amber-950 border-l border-amber-800 text-amber-50 w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/80 bg-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-amber-100">Your Order</h2>
              <p className="text-xs text-amber-400">Lazeez Kalkata's Kitchen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-amber-800/50 text-amber-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-amber-400/60">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Your order cart is empty</p>
              <p className="text-xs mt-1">Select delicious rolls & dishes from the menu to start!</p>
            </div>
          ) : (
            cart.map((item) => {
              const itemAddonsTotal =
                item.selectedAddons?.reduce((a, addon) => a + addon.price, 0) || 0;
              const unitTotal = item.price + itemAddonsTotal;
              return (
                <div
                  key={item.cartId}
                  className="bg-amber-900/30 border border-amber-800/60 rounded-2xl p-4 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            item.isVeg !== false ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <h4 className="font-bold text-amber-100">{item.name}</h4>
                      </div>

                      {item.portion && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-800/60 text-amber-300 uppercase mt-1 inline-block">
                          {item.portion} portion
                        </span>
                      )}

                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="text-xs text-amber-400/80 mt-1.5 pl-4 border-l-2 border-amber-700/50">
                          {item.selectedAddons.map((addon) => (
                            <div key={addon.id}>
                              + {addon.name} ({addon.price > 0 ? `₹${addon.price}` : "Free"})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeFromCart(item.cartId)}
                      className="text-amber-500/60 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-800/40">
                    <span className="font-bold text-amber-300">
                      ₹{unitTotal * item.quantity}
                    </span>

                    <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-700/60 rounded-xl px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.cartId, -1)}
                        className="text-amber-400 hover:text-amber-200"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-xs text-amber-100 px-2">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.cartId, 1)}
                        className="text-amber-400 hover:text-amber-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Minimum Order Banner */}
        {cart.length > 0 && (
          <div className="px-6 py-2">
            {!minOrderMet ? (
              <div className="bg-amber-900/60 border border-amber-600/80 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Add <strong>₹{remainingForMin}</strong> more to meet the minimum order limit of <strong>₹100/-</strong>
                </span>
              </div>
            ) : (
              <div className="bg-emerald-950/80 border border-emerald-700/60 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Free Delivery Applied & Minimum order met!</span>
              </div>
            )}
          </div>
        )}

        {/* Drawer Footer & Checkout Form */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-amber-800/80 bg-amber-900/40 space-y-4">
            {error && (
              <div className="p-2.5 bg-red-950 border border-red-800 text-red-200 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-amber-400/60" />
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-amber-950/80 border border-amber-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-amber-400/60" />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Phone (8432813476)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-amber-950/80 border border-amber-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-amber-400/60" />
                  <input
                    type="text"
                    required
                    placeholder="Full Delivery Address / Table No."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-amber-950/80 border border-amber-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm font-bold text-amber-100 pt-2 border-t border-amber-800/40">
                <span>Subtotal (Free Delivery):</span>
                <span className="text-lg text-amber-400">₹{cartSubtotal}</span>
              </div>

              <button
                type="submit"
                disabled={loading || !minOrderMet}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-amber-950 font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-40"
              >
                {loading ? "Placing Order..." : `Confirm Order (₹${cartSubtotal})`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
