"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, CartItem, AddonItem, MenuItem } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (
    item: MenuItem,
    category: string,
    portion?: "qtr" | "half" | "full",
    selectedAddons?: AddonItem[]
  ) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CartContext = createContext<CartContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("lazeez_user");
    const savedToken = localStorage.getItem("lazeez_token");
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const login = (token: string, user: User) => {
    setUser(user);
    setToken(token);
    localStorage.setItem("lazeez_user", JSON.stringify(user));
    localStorage.setItem("lazeez_token", token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("lazeez_user");
    localStorage.removeItem("lazeez_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("lazeez_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lazeez_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (
    item: MenuItem,
    category: string,
    portion?: "qtr" | "half" | "full",
    selectedAddons: AddonItem[] = []
  ) => {
    let basePrice = item.price || 0;
    if (portion && item.prices) {
      basePrice = item.prices[portion] || 0;
    }

    const addonsKey = selectedAddons
      .map((a) => a.id)
      .sort()
      .join("-");
    const cartId = `${item.id}-${portion || "default"}-${addonsKey}`;

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.cartId === cartId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      const newItem: CartItem = {
        cartId,
        id: item.id,
        name: item.name,
        category,
        portion,
        price: basePrice,
        quantity: 1,
        selectedAddons,
        isVeg: item.isVeg
      };
      return [...prev, newItem];
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartSubtotal = cart.reduce((sum, item) => {
    let itemTotal = item.price;
    if (item.selectedAddons) {
      itemTotal += item.selectedAddons.reduce((aSum, a) => aSum + a.price, 0);
    }
    return sum + itemTotal * item.quantity;
  }, 0);

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartSubtotal,
        cartCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
