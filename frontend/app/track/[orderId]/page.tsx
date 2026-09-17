"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Order } from "@/types";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Truck,
  PackageCheck,
  XCircle,
  Phone,
  MapPin,
  ShoppingBag
} from "lucide-react";

export default function TrackOrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        throw new Error("Order not found");
      }
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      setError(err.message || "Failed to load order status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Setup SSE connection for real-time live updates
    const eventSource = new EventSource("/api/orders/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === "STATUS_UPDATE" &&
          data.orderId === orderId
        ) {
          setOrder(data.order);
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-950 text-amber-50 flex items-center justify-center p-6">
        <div className="animate-spin text-amber-500">
          <Clock className="w-10 h-10" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-amber-950 text-amber-50">
        <Navbar />
        <div className="max-w-md mx-auto my-20 p-6 bg-amber-900/30 border border-amber-800 rounded-2xl text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Order Not Found</h2>
          <p className="text-xs text-amber-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const steps = [
    { label: "Received", icon: Clock, description: "Kitchen received your order" },
    { label: "Accepted", icon: CheckCircle2, description: "Order confirmed" },
    { label: "Preparing", icon: ChefHat, description: "Chefs preparing your food" },
    { label: "Out for Delivery", icon: Truck, description: "Rider on the way" },
    { label: "Delivered", icon: PackageCheck, description: "Enjoy your meal!" }
  ];

  const currentStepIndex = steps.findIndex((s) => s.label === order.status);
  const isCancelled = order.status === "Cancelled";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-amber-900/40 to-amber-950 text-amber-50 pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Status Header */}
        <div className="bg-amber-900/30 border border-amber-800/80 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-xl">
          <span className="text-xs font-bold px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
            Live Order Status
          </span>
          <h1 className="text-3xl font-black text-amber-100">
            Order #{order.id}
          </h1>
          <p className="text-xs text-amber-400">
            Placed on {new Date(order.createdAt).toLocaleTimeString()} • Free Delivery
          </p>

          {isCancelled ? (
            <div className="mt-4 p-4 bg-red-950/80 border border-red-800 text-red-200 text-sm font-bold rounded-2xl flex items-center justify-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span>This order was cancelled by the kitchen.</span>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-2xl inline-block font-semibold">
              Live updates enabled! Status changes automatically.
            </div>
          )}
        </div>

        {/* Stepper Progress Bar */}
        {!isCancelled && (
          <div className="bg-amber-900/30 border border-amber-800/80 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative">
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const IconComponent = step.icon;

                return (
                  <div
                    key={step.label}
                    className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? "bg-amber-900/80 border-amber-400 text-amber-100 shadow-lg scale-105"
                        : isCompleted
                        ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300"
                        : "bg-amber-950/40 border-amber-900/40 text-amber-500/60"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        isCurrent
                          ? "bg-amber-400 text-amber-950 animate-pulse"
                          : isCompleted
                          ? "bg-emerald-500 text-amber-950"
                          : "bg-amber-900/40 text-amber-600"
                      }`}
                    >
                      <IconComponent className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="font-bold text-xs">{step.label}</div>
                    <div className="text-[10px] text-amber-400/80 mt-1">
                      {step.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Details & Summary */}
        <div className="bg-amber-900/30 border border-amber-800/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <h2 className="font-bold text-lg text-amber-100 border-b border-amber-800/60 pb-3 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            Order Summary
          </h2>

          <div className="space-y-3">
            {order.items.map((item, i) => {
              const itemAddonsTotal =
                item.selectedAddons?.reduce((a, addon) => a + addon.price, 0) || 0;
              const unitTotal = item.price + itemAddonsTotal;

              return (
                <div
                  key={i}
                  className="flex items-start justify-between p-3 rounded-2xl bg-amber-950/50 border border-amber-800/40"
                >
                  <div>
                    <div className="font-bold text-sm text-amber-100">
                      {item.quantity}x {item.name}
                    </div>
                    {item.portion && (
                      <span className="text-[10px] bg-amber-800/60 text-amber-300 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                        {item.portion} portion
                      </span>
                    )}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="text-xs text-amber-400/80 mt-1 pl-3 border-l border-amber-700/50">
                        {item.selectedAddons.map((addon) => (
                          <div key={addon.id}>+ {addon.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-sm text-amber-300">
                    ₹{unitTotal * item.quantity}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-amber-800/60 space-y-2 text-xs">
            <div className="flex justify-between text-amber-300 font-medium">
              <span>Customer Name:</span>
              <strong className="text-amber-100">{order.customerName}</strong>
            </div>
            <div className="flex justify-between text-amber-300 font-medium">
              <span>Contact Phone:</span>
              <strong className="text-amber-100">{order.phone}</strong>
            </div>
            <div className="flex justify-between text-amber-300 font-medium">
              <span>Delivery Address:</span>
              <strong className="text-amber-100">{order.address}</strong>
            </div>

            <div className="flex justify-between text-base font-black text-amber-100 pt-3 border-t border-amber-800/60">
              <span>Total Paid / Payable:</span>
              <span className="text-amber-400 text-lg">₹{order.total}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
