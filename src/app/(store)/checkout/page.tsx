import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { CheckoutForm, type PaymentOptions } from "@/components/store/checkout-form";
import { Breadcrumbs } from "@/components/store/sections";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  const db = await getDb();
  const saved = user
    ? await db
        .select({
          id: addresses.id,
          label: addresses.label,
          fullName: addresses.fullName,
          phone: addresses.phone,
          address: addresses.address,
          city: addresses.city,
          isDefault: addresses.isDefault,
        })
        .from(addresses)
        .where(eq(addresses.userId, user.id))
        .orderBy(desc(addresses.isDefault), asc(addresses.id))
    : [];
  // Account details are only sent to the browser for methods the owner has enabled.
  const payment: PaymentOptions = {
    cod: s.codEnabled,
    jazzcash: s.jazzcashEnabled ? { title: s.jazzcashTitle, number: s.jazzcashNumber } : null,
    bank: s.bankEnabled ? { name: s.bankName, title: s.bankAccountTitle, number: s.bankAccountNumber, iban: s.bankIban } : null,
  };

  return (
    <div className="container-page py-5 sm:py-8">
      <Breadcrumbs items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="h-page mb-5">Checkout</h1>
      <CheckoutForm addresses={saved} payment={payment} />
    </div>
  );
}
