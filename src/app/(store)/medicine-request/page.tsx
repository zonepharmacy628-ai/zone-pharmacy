import { BellRing, Pill, ShieldCheck, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import { MedicineRequestForm } from "@/components/store/forms";
import { Breadcrumbs, TrustBar } from "@/components/store/sections";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Medicine Not Found? Request It",
  description: "Can't find your medicine? Tell us what you need and our pharmacist will source it for you.",
  alternates: { canonical: "/medicine-request" },
};

const WHY = [
  { icon: Warehouse, text: "We check availability with our suppliers" },
  { icon: BellRing, text: "We contact you as soon as we have an answer" },
  { icon: ShieldCheck, text: "Safe & genuine medicines only" },
];

export default async function MedicineRequestPage({ searchParams }: { searchParams: Promise<{ medicine?: string }> }) {
  const [user, { medicine }] = await Promise.all([getCurrentUser(), searchParams]);
  return (
    <div className="container-page py-5 sm:py-8">
      <Breadcrumbs items={[{ label: "Medicine Request" }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-5 flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
              <Pill className="size-7" />
            </span>
            <div>
              <h1 className="h-page">Medicine Not Found? Request It</h1>
              <p className="mt-1 text-sm text-navy-500">Tell us what you need and we&apos;ll get it for you.</p>
            </div>
          </div>
          <section className="card p-5 sm:p-7">
            <div className="mb-6 rounded-2xl bg-brand-50 p-4">
              <p className="font-bold text-brand-700">We&apos;ll help you find it!</p>
              <p className="text-sm text-navy-700">Fill in the details below and our team will check availability and get back to you soon.</p>
            </div>
            <MedicineRequestForm defaults={{ medicine: medicine?.slice(0, 120), name: user?.name, email: user?.email, phone: user?.phone }} />
          </section>
        </div>
        <aside className="card self-start p-5 sm:p-6">
          <h2 className="h-section mb-3">Why Request Through Us?</h2>
          <ul className="divide-y divide-line">
            {WHY.map((w) => (
              <li key={w.text} className="flex items-center gap-3 py-3.5 text-sm font-medium text-navy-800">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                  <w.icon className="size-5" />
                </span>
                {w.text}
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <div className="mt-8">
        <TrustBar />
      </div>
    </div>
  );
}
