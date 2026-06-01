export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
