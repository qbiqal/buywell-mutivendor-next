export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import OrdersClient from "./OrdersClient";
export const metadata: Metadata = { title: "My Orders" };
export default function OrdersPage() { return <OrdersClient />; }
