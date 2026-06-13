import ComingSoon from "@/components/ComingSoon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BuyWell — India's Multivendor Marketplace | Coming Soon",
  description:
    "BuyWell is India's trusted multivendor marketplace. Shop from thousands of verified sellers. Launching soon at buywell.in.",
  openGraph: {
    title: "BuyWell — Coming Soon",
    description: "India's next multivendor marketplace. Coming soon.",
    url: "https://buywell.in",
  },
};

export default function HomePage() {
  return <ComingSoon />;
}
