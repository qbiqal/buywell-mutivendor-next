import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { CartProvider } from "@/components/shop/Cart/CartContext";

export const metadata: Metadata = {
  title: {
    default: "APRAS Naturals — Pure Prakvedaa Honey & A2 Bilona Ghee",
    template: "%s | APRAS Naturals",
  },
  description:
    "APRAS Naturals is the authorized partner of Prakvedaa. Discover pure mono-floral raw honey and authentic A2 Bilona Ghee sourced ethically from India's heartland.",
  keywords: ["honey", "A2 ghee", "Prakvedaa", "organic honey", "Jharkhand", "raw honey", "bilona ghee"],
  openGraph: {
    siteName: "APRAS Naturals",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}
