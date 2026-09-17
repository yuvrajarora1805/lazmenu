import React from "react";

export interface MenuItem {
  id: string;
  name: string;
  price?: number;
  prices?: {
    qtr?: number;
    half?: number;
    full?: number;
  };
  isVeg?: boolean;
}

export interface AddonItem {
  id: string;
  name: string;
  price: number;
  isFree?: boolean;
}

export interface MenuCategory {
  category: string;
  subtitle?: string;
  type: string;
  items: MenuItem[] | AddonItem[];
}

export interface CartItem {
  cartId: string;
  id: string;
  name: string;
  category: string;
  portion?: "qtr" | "half" | "full";
  price: number;
  quantity: number;
  selectedAddons?: AddonItem[];
  isVeg?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  address: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string;
  status: "Received" | "Accepted" | "Preparing" | "Out for Delivery" | "Delivered" | "Cancelled" | "Pending User Action";
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "customer" | "admin";
}
