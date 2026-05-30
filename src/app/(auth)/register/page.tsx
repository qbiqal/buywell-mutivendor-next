export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return <RegisterClient />;
}
