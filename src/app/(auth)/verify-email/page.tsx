export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import VerifyEmailClient from "./VerifyEmailClient";

export const metadata: Metadata = { title: "Verify Email" };

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
