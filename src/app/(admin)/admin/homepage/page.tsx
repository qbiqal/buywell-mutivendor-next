import type { Metadata } from "next";
import { HomepageBannerClient } from "./HomepageBannerClient";

export const metadata: Metadata = { title: "Homepage Banners — BuyWell Admin" };

export default function HomepageBannersPage() {
  return <HomepageBannerClient />;
}
