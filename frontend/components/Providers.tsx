"use client";

import React from "react";
import { AuthProvider, CartProvider } from "@/context/AppContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}
