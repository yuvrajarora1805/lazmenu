"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AppContext";
import { User, LogIn, UserPlus, X, Phone, Lock, Mail } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isLoginView ? "/api/auth/login" : "/api/auth/signup";
    const body = isLoginView
      ? { phone, password }
      : { name, phone, email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      login(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-amber-950 border border-amber-800 text-amber-50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/60 bg-amber-900/40">
          <div className="flex items-center gap-2">
            {isLoginView ? (
              <LogIn className="w-5 h-5 text-amber-400" />
            ) : (
              <UserPlus className="w-5 h-5 text-amber-400" />
            )}
            <h2 className="font-bold text-lg tracking-wide text-amber-100">
              {isLoginView ? "Customer / Admin Login" : "Create Account"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-amber-800/50 text-amber-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-200 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginView && (
              <div>
                <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-amber-400/60" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-amber-900/30 border border-amber-700/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-amber-400/60" />
                <input
                  type="tel"
                  required
                  placeholder="8432813476"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-amber-900/30 border border-amber-700/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {!isLoginView && (
              <div>
                <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-amber-400/60" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-amber-900/30 border border-amber-700/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-amber-400/60" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-amber-900/30 border border-amber-700/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-amber-950 font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : isLoginView
                ? "Log In"
                : "Sign Up Account"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-amber-900/60 text-center">
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setError("");
              }}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
            >
              {isLoginView
                ? "Don't have an account? Sign up here"
                : "Already registered? Log in to your account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
