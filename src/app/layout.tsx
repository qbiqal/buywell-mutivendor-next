import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { getLocalizationConfig } from "@/lib/config";
import { getModuleState } from "@/lib/modules";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://aprasnaturals.com"),
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [modules, localization] = await Promise.all([
    getModuleState(),
    getLocalizationConfig(),
  ]);

  const app = (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
  let body = app;
  if (modules.ecommerce) {
    const { CartProvider } = await import("@/components/shop/Cart/CartContext");
    body = <CartProvider>{app}</CartProvider>;
  }

  return (
    <html lang={localization.defaultLocale} className={publicSans.variable} suppressHydrationWarning>
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("apras-theme");if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.dataset.theme="dark";}else{document.documentElement.dataset.theme="light";}}catch(e){}`,
          }}
        />
        {body}
      </body>
    </html>
  );
}
