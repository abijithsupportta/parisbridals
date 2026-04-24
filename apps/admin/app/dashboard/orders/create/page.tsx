import { Metadata } from "next";
import OrderForm from "@/components/admin/OrderForm";

export const metadata: Metadata = {
  title: "Create Order | Paris Bridals",
  description: "Create a new rental order",
};

export default function CreateOrderPage() {
  return <OrderForm />;
}
