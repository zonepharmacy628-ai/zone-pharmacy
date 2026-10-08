import { Clock, CreditCard, Mail, MapPin, Phone, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, TrustList } from "@/components/store/sections";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: "About Us",
    description: `About ${s.pharmacyName}: genuine medicines, delivery, payment and store information.`,
    alternates: { canonical: "/about" },
  };
}

/** Public information page. Everything shown here comes from the Website Editor settings. */
export default async function AboutPage() {
  const s = await getSettings();
  const payments = [s.codEnabled && "Cash on Delivery", s.jazzcashEnabled && "JazzCash", s.bankEnabled && "Bank Transfer"].filter(Boolean).join(", ");
  const contact = [
    { icon: MapPin, label: "Address", value: s.storeAddress },
    { icon: Phone, label: "Phone", value: s.storePhone, href: s.storePhone ? `tel:${s.storePhone.replace(/[^\d+]/g, "")}` : undefined },
    { icon: Mail, label: "Email", value: s.storeEmail, href: s.storeEmail ? `mailto:${s.storeEmail}` : undefined },
    { icon: Clock, label: "Opening hours", value: `${s.openingTime} – ${s.closingTime}` },
  ].filter((c) => c.value);

  return (
    <div className="container-page max-w-5xl py-5 sm:py-8">
      <Breadcrumbs items={[{ label: "About Us" }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="card p-6 sm:p-8">
            <p className="text-sm font-semibold text-brand-600">{s.tagline}</p>
            <h1 className="h-page mt-1">About {s.pharmacyName}</h1>
            <p className="mt-4 text-sm leading-relaxed text-navy-700">
              {s.pharmacyName} is an online pharmacy for genuine medicines and everyday health products. {s.heroDescription}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-navy-700">
              Prescription medicines are dispatched only after our pharmacist has checked your prescription. If you cannot find a medicine, send us a{" "}
              <Link href="/medicine-request" className="font-semibold text-brand-600 hover:underline">
                medicine request
              </Link>{" "}
              and we will try to arrange it for you.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-primary">
                Shop Medicines
              </Link>
              <Link href="/track" className="btn btn-outline">
                Track an Order
              </Link>
            </div>
          </section>

          <section className="card p-6 sm:p-8" aria-labelledby="about-delivery">
            <h2 id="about-delivery" className="h-section mb-4">
              Delivery &amp; Payment
            </h2>
            <ul className="space-y-4 text-sm text-navy-700">
              <li className="flex gap-3">
                <Truck className="mt-0.5 size-5 shrink-0 text-brand-600" />
                <span>
                  {s.deliveryMessage} Delivery charge is {formatMoney(s.deliveryCharge, s.currency)}
                  {s.freeDeliveryThreshold > 0 && <>, and delivery is free on orders above {formatMoney(s.freeDeliveryThreshold, s.currency)}</>}.
                </span>
              </li>
              {payments && (
                <li className="flex gap-3">
                  <CreditCard className="mt-0.5 size-5 shrink-0 text-brand-600" />
                  <span>Payment methods: {payments}.</span>
                </li>
              )}
            </ul>
          </section>

          <section className="card p-6 sm:p-8" aria-labelledby="about-contact">
            <h2 id="about-contact" className="h-section mb-4">
              Store Information
            </h2>
            <ul className="grid gap-4 text-sm sm:grid-cols-2">
              {contact.map((c) => (
                <li key={c.label} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                    <c.icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold tracking-wide text-navy-500 uppercase">{c.label}</span>
                    {c.href ? (
                      <a href={c.href} className="font-semibold break-words text-navy-900 hover:text-brand-600">
                        {c.value}
                      </a>
                    ) : (
                      <span className="font-semibold break-words text-navy-900">{c.value}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="self-start">
          <TrustList />
        </aside>
      </div>
    </div>
  );
}
