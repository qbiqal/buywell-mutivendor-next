import type { Metadata } from "next";
import ComplianceClient from "./ComplianceClient";

export const metadata: Metadata = { title: "Compliance" };

export default function CompliancePage() {
  return <ComplianceClient />;
}
