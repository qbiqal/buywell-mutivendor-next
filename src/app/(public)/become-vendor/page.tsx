import type { Metadata } from "next";
import { BecomeVendorClient } from "./BecomeVendorClient";

export const metadata: Metadata = {
  title: "Sell on BuyWell | Become a Vendor",
  description: "Join BuyWell as a seller. Reach thousands of customers across India with zero upfront cost.",
};

export default function BecomeVendorPage() {
  return <BecomeVendorClient />;
}
