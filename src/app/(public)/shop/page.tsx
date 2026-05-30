import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop — Pure Honey & A2 Ghee",
  description: "Browse our collection of pure mono-floral honey (Tulsi, Karanj, Moringa) and A2 Bilona Ghee from Prakvedaa.",
};

export default function ShopPage() {
  return <ShopClient />;
}
