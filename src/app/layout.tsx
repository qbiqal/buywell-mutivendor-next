import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { TrafficTracker } from "@/components/analytics/TrafficTracker";
import { ToastProvider } from "@/components/ui/Toast";
import { getLocalizationConfig } from "@/lib/config";
import { getModuleState } from "@/lib/modules";
import { buildSeoMetadata, getSeoConfig } from "@/lib/seo";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

// RootLayout queries the DB (getModuleState, getLocalizationConfig).
// Marking dynamic prevents Next.js from attempting to statically pre-render
// any page at build time when no DB connection is available.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata("/", { canonicalPath: "/" });
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [modules, localization, seo] = await Promise.all([
    getModuleState(),
    getLocalizationConfig(),
    getSeoConfig(),
  ]);

  const app = (
    <ToastProvider>
      <Suspense fallback={null}>
        <TrafficTracker enabled={seo.firstPartyAnalyticsEnabled} />
      </Suspense>
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
        {seo.gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${seo.gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        )}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("apras-theme");if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.dataset.theme="dark";}else{document.documentElement.dataset.theme="light";}}catch(e){}`,
          }}
        />
        {seo.gtmId && (
          <Script
            id="google-tag-manager"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${seo.gtmId}');`,
            }}
          />
        )}
        {seo.gaMeasurementId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${seo.gaMeasurementId}`} strategy="afterInteractive" />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.gaMeasurementId}');`,
              }}
            />
          </>
        )}
        {seo.metaPixelId && (
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.metaPixelId}');fbq('track','PageView');`,
            }}
          />
        )}
        {body}
      </body>
    </html>
  );
}
