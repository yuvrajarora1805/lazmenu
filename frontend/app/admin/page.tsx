"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Order } from "@/types";
import {
  ChefHat,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  Utensils
} from "lucide-react";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error(e);
      }
    }

    const unlockAudio = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const toggleSound = () => {
    if (!soundEnabled) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        audioCtxRef.current = ctx;
        setSoundEnabled(true);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSoundEnabled(false);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // SSE for real-time updates
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const eventSource = new EventSource(`${backendUrl}/api/orders/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "NEW_ORDER") {
          setOrders((prev) => [data.order, ...prev]);
          playAudioPing();
        } else if (data.type === "STATUS_UPDATE") {
          setOrders((prev) =>
            prev.map((o) => (o.id === data.orderId ? data.order : o))
          );
          if (data.alert) {
            playAudioPing();
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const playAudioPing = () => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.error(e);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updated : o))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markItemMissing = async (orderId: string, itemIndex: number) => {
    if (!window.confirm("Mark this item as missing and pause the order?")) return;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/orders/${orderId}/missing-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIndex })
      });
      if (res.ok) {
        // Will be updated via SSE, or we can fetch manually
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === "All" || order.status === activeTab;
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone.includes(searchTerm);
    return matchesTab && matchesSearch;
  });

  const totalRevenue = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const countPending = orders.filter((o) => o.status === "Received").length;
  const countPreparing = orders.filter((o) => o.status === "Preparing").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-amber-900/40 to-amber-950 text-amber-50 pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header & Metrics Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-900/30 border border-amber-800/80 rounded-3xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-amber-400" />
              <h1 className="text-2xl font-black text-amber-100 uppercase tracking-tight">
                Kitchen Admin Dashboard
              </h1>
            </div>
            <p className="text-xs text-amber-400 mt-1">
              Live Order Management & Real-time Kitchen Status Control
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleSound}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                soundEnabled
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-amber-950/60 border-amber-800/60 text-amber-500/60"
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400" /> Sound Alert ON
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" /> Sound Alert OFF
                </>
              )}
            </button>

            <button
              onClick={fetchOrders}
              className="flex items-center gap-1.5 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 px-3 py-2 rounded-xl text-xs font-bold text-amber-300"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-amber-900/30 border border-amber-800/60 rounded-2xl p-4">
            <div className="text-xs font-semibold text-amber-400 uppercase">
              Total Orders
            </div>
            <div className="text-2xl font-black text-amber-100 mt-1">
              {orders.length}
            </div>
          </div>

          <div className="bg-amber-900/30 border border-amber-800/60 rounded-2xl p-4">
            <div className="text-xs font-semibold text-amber-400 uppercase">
              New Received
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1 animate-pulse">
              {countPending}
            </div>
          </div>

          <div className="bg-amber-900/30 border border-amber-800/60 rounded-2xl p-4">
            <div className="text-xs font-semibold text-amber-400 uppercase">
              In Preparation
            </div>
            <div className="text-2xl font-black text-orange-400 mt-1">
              {countPreparing}
            </div>
          </div>

          <div className="bg-amber-900/30 border border-amber-800/60 rounded-2xl p-4">
            <div className="text-xs font-semibold text-amber-400 uppercase">
              Total Sales Revenue
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              ₹{totalRevenue}
            </div>
          </div>
        </div>

        {/* Tabs & Search Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-800/60 pb-4">
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {[
              "All",
              "Received",
              "Accepted",
              "Preparing",
              "Out for Delivery",
              "Delivered",
              "Cancelled"
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab
                    ? "bg-amber-500 text-amber-950 shadow-md"
                    : "bg-amber-900/30 text-amber-300 hover:bg-amber-800/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-amber-400/60" />
            <input
              type="text"
              placeholder="Search Order # or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-amber-950/80 border border-amber-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Orders Queue Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-amber-400/60">
            <Utensils className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No orders found in this section</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              return (
                <div
                  key={order.id}
                  className="bg-amber-900/30 border border-amber-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xl space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-amber-800/50 pb-3">
                    <div>
                      <span className="text-lg font-black text-amber-100">
                        #{order.id}
                      </span>
                      <div className="text-[11px] text-amber-400">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        order.status === "Received"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                          : order.status === "Accepted"
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                          : order.status === "Preparing"
                          ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                          : order.status === "Out for Delivery"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          : order.status === "Delivered"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-red-500/20 text-red-300 border-red-500/40"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-amber-200">
                      Customer: {order.customerName}
                    </div>
                    <div className="text-amber-400 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-amber-500" />
                      {order.phone}
                    </div>
                    <div className="text-amber-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      {order.address}
                    </div>
                  </div>

                  {/* Order Items Breakdown */}
                  <div className="bg-amber-950/60 border border-amber-800/40 rounded-xl p-3 space-y-2 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start group">
                        <div>
                          <span className="font-bold text-amber-100">
                            {item.quantity}x {item.name}
                          </span>
                          {item.portion && (
                            <span className="ml-1 text-[10px] text-amber-400 uppercase font-semibold">
                              ({item.portion})
                            </span>
                          )}
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="text-[11px] text-amber-400/80 pl-2">
                              + {item.selectedAddons.map((a) => a.name).join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-300">
                            ₹{item.price * item.quantity}
                          </span>
                          {order.status === "Received" && (
                            <button 
                              onClick={() => markItemMissing(order.id, idx)}
                              className="bg-red-900/60 hover:bg-red-800 text-red-200 text-[10px] px-2 py-0.5 rounded border border-red-800 transition-colors"
                              title="Mark as Unavailable"
                            >
                              ⚠️ Missing?
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 border-t border-amber-800/40 flex justify-between font-black text-amber-100 text-sm">
                      <span>Total Amount:</span>
                      <span className="text-amber-400">₹{order.total}</span>
                    </div>
                  </div>

                  {/* Status Change Buttons */}
                  <div className="pt-2 border-t border-amber-800/50 flex flex-wrap gap-2">
                    {order.status === "Received" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "Accepted")}
                        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded-xl text-xs transition-all"
                      >
                        Accept Order 👍
                      </button>
                    )}

                    {order.status === "Accepted" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "Preparing")}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-amber-950 font-bold py-2 rounded-xl text-xs transition-all"
                      >
                        Start Preparing 🍳
                      </button>
                    )}

                    {order.status === "Preparing" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "Out for Delivery")}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs transition-all"
                      >
                        Send Out for Delivery 🛵
                      </button>
                    )}

                    {order.status === "Out for Delivery" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "Delivered")}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-all"
                      >
                        Mark as Delivered ✅
                      </button>
                    )}

                    {order.status !== "Delivered" && order.status !== "Cancelled" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "Cancelled")}
                        className="w-full bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-semibold py-1.5 rounded-xl text-xs transition-all"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
