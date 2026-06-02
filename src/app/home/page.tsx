import LandingPage from "@/app/(public)/LandingPage";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildSeoMetadata("/home", { canonicalPath: "/home" });
}

export default LandingPage;
