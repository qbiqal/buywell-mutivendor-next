import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact Us — BuyWell Online Shopping India",
  description: "Get in touch with BuyWell Online Shopping India Pvt Ltd. We're here to help with orders, returns, vendor queries and general support.",
};

export default function ContactPage() {
  return <ContactClient />;
}
