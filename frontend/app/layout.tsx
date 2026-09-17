import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lazeez Kalkata's — Online Kathi Rolls & Food Ordering",
  description:
    "Order Kolkata Kathi Rolls, Tandoori Tikka, Soya Chaap, Main Course, and Roti online from Lazeez Kalkata's. Free Delivery for orders above ₹100/-.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-amber-950 text-amber-50 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
