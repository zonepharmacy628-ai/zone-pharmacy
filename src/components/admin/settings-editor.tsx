"use client";

import { CreditCard, ExternalLink, Home, Palette, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { saveSettingsAction, type SettingsSection } from "@/actions/admin/settings";
import { ActionForm, CheckField, Field, FileField, SubmitButton, TextArea } from "@/components/ui/form";
import type { SiteSettings } from "@/lib/settings-shared";
import { cn, fileUrl } from "@/lib/utils";

const TABS: { key: SettingsSection; label: string; icon: typeof Home }[] = [
  { key: "branding", label: "Branding", icon: Palette },
  { key: "homepage", label: "Homepage", icon: Home },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "store", label: "Store", icon: Store },
];

function ImageSetting({ name, label, fileId, hint, accept = "image/jpeg,image/png,image/webp" }: { name: string; label: string; fileId: string | null; hint: string; accept?: string }) {
  const src = fileUrl(fileId);
  return (
    <div className="rounded-2xl border border-line p-4">
      {src && (
        <div className="mb-3 flex items-center gap-4">
          <Image src={src} alt={`Current ${label.toLowerCase()}`} width={160} height={80} unoptimized className="h-16 w-auto max-w-40 rounded-lg border border-line bg-surface object-contain p-1" />
          <CheckField name={`${name}Remove`} label="Remove" />
        </div>
      )}
      <FileField name={name} label={src ? `Replace ${label}` : label} accept={accept} hint={hint} />
    </div>
  );
}

function PickList({ name, legend, options, selected, hint }: { name: string; legend: string; options: { id: number; name: string }[]; selected: number[]; hint: string }) {
  const [query, setQuery] = useState("");
  const chosen = new Set(selected);
  const q = query.trim().toLowerCase();
  return (
    <fieldset className="rounded-2xl border border-line p-4">
      <legend className="px-2 text-sm font-bold text-navy-900">{legend}</legend>
      <p className="mb-3 text-xs text-navy-500">{hint}</p>
      {options.length > 12 && (
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter…" aria-label={`Filter ${legend}`} className="input mb-3 py-2" />
      )}
      {/* Filtered-out options stay mounted (hidden) so their checked state is still submitted. */}
      <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
        {options.map((o) => (
          <div key={o.id} className={q && !o.name.toLowerCase().includes(q) ? "hidden" : undefined}>
            <CheckField name={name} value={o.id} label={o.name} defaultChecked={chosen.has(o.id)} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function SettingsEditor({
  settings: s,
  products,
  categories,
  featuredIds,
}: {
  settings: SiteSettings;
  products: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  featuredIds: number[];
}) {
  const [tab, setTab] = useState<SettingsSection>("branding");
  const [jazz, setJazz] = useState(s.jazzcashEnabled);
  const [bank, setBank] = useState(s.bankEnabled);
  const form = (section: SettingsSection, children: React.ReactNode) => (
    <ActionForm action={saveSettingsAction.bind(null, section)} className={cn("space-y-5", tab !== section && "hidden")}>
      {children}
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton className="px-8 py-3">Save Changes</SubmitButton>
      </div>
    </ActionForm>
  );

  return (
    <div className="card">
      <div role="tablist" aria-label="Website editor sections" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line p-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn("flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition", tab === t.key ? "bg-brand-600 text-white" : "text-navy-800 hover:bg-brand-50")}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
        <Link href="/" target="_blank" className="ml-auto flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
          <ExternalLink className="size-4" /> Preview Website
        </Link>
      </div>

      <div className="p-5 sm:p-6">
        {form(
          "branding",
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="pharmacyName" label="Pharmacy Name" required maxLength={60} defaultValue={s.pharmacyName} />
              <Field name="tagline" label="Tagline" maxLength={80} defaultValue={s.tagline} />
              <Field name="websiteTitle" label="Website Title" required maxLength={120} defaultValue={s.websiteTitle} hint="Shown in the browser tab and search results." wrapClassName="sm:col-span-2" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageSetting name="logo" label="Logo" fileId={s.logoFileId} hint="PNG, JPG or WebP — max 4 MB. Recommended height 96px." />
              <ImageSetting name="favicon" label="Favicon" fileId={s.faviconFileId} accept="image/png,image/x-icon,image/webp,image/jpeg" hint="PNG or ICO — square, at least 48×48px." />
            </div>
          </>,
        )}

        {form(
          "homepage",
          <>
            <Field name="announcement" label="Announcement / Banner Text" maxLength={120} defaultValue={s.announcement} hint="Shown in the dark bar at the very top of every page." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="heroBadge" label="Hero Badge" maxLength={60} defaultValue={s.heroBadge} />
              <Field name="heroHeading" label="Hero Heading" required maxLength={80} defaultValue={s.heroHeading} />
              <Field name="heroHighlight" label="Highlighted Words" maxLength={60} defaultValue={s.heroHighlight} hint="Shown in purple after the heading." />
            </div>
            <TextArea name="heroDescription" label="Hero Description" maxLength={240} defaultValue={s.heroDescription} />
            <ImageSetting name="heroImage" label="Hero / Banner Image" fileId={s.heroImageFileId} hint="PNG, JPG or WebP — max 4 MB. Landscape images work best." />
            <PickList name="featuredProductIds" legend="Featured Products" options={products} selected={featuredIds} hint="Shown in the Featured Products slider on the home page." />
            <PickList name="popularCategoryIds" legend="Popular Categories" options={categories} selected={s.popularCategoryIds} hint="Shown under Shop by Category. Leave all unticked to show the first eight." />
          </>,
        )}

        {form(
          "delivery",
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="deliveryCharge" label={`Delivery Charges (${s.currency})`} type="number" min={0} step="1" required defaultValue={s.deliveryCharge} />
              <Field name="freeDeliveryThreshold" label={`Free Delivery Above (${s.currency})`} type="number" min={0} step="1" required defaultValue={s.freeDeliveryThreshold} hint="Set to 0 to always charge delivery." />
              <Field name="deliveryTime" label="Delivery Time" required maxLength={60} defaultValue={s.deliveryTime} placeholder="2–5 working days" />
            </div>
            <TextArea name="deliveryMessage" label="Delivery Message" required maxLength={200} defaultValue={s.deliveryMessage} hint="Shown on the order confirmation and tracking pages." />
          </>,
        )}

        {form(
          "payment",
          <>
            <div className="rounded-2xl border border-line p-4">
              <CheckField name="codEnabled" label="Cash on Delivery (COD)" hint="Customers pay in cash when the order arrives." defaultChecked={s.codEnabled} />
            </div>
            <div className="space-y-4 rounded-2xl border border-line p-4">
              <CheckField name="jazzcashEnabled" label="JazzCash" hint="Customers send payment to your JazzCash account and enter the transaction ID." checked={jazz} onChange={(e) => setJazz(e.target.checked)} />
              <div className={cn("grid gap-4 sm:grid-cols-2", !jazz && "opacity-60")}>
                <Field name="jazzcashTitle" label="JazzCash Account Title" maxLength={80} defaultValue={s.jazzcashTitle} />
                <Field name="jazzcashNumber" label="JazzCash Account Number" maxLength={30} inputMode="tel" defaultValue={s.jazzcashNumber} />
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border border-line p-4">
              <CheckField name="bankEnabled" label="Bank Transfer" hint="Customers transfer to your bank account and enter the transaction ID." checked={bank} onChange={(e) => setBank(e.target.checked)} />
              <div className={cn("grid gap-4 sm:grid-cols-2", !bank && "opacity-60")}>
                <Field name="bankName" label="Bank Name" maxLength={80} defaultValue={s.bankName} />
                <Field name="bankAccountTitle" label="Account Title" maxLength={80} defaultValue={s.bankAccountTitle} />
                <Field name="bankAccountNumber" label="Account Number" maxLength={40} defaultValue={s.bankAccountNumber} />
                <Field name="bankIban" label="IBAN" maxLength={40} defaultValue={s.bankIban} />
              </div>
            </div>
            <p className="text-xs text-navy-500">Account details are shown to customers at checkout only while that method is enabled.</p>
          </>,
        )}

        {form(
          "store",
          <>
            <TextArea name="storeAddress" label="Address" maxLength={240} defaultValue={s.storeAddress} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="storePhone" label="Phone" type="tel" maxLength={18} defaultValue={s.storePhone} />
              <Field name="storeEmail" label="Email" type="email" maxLength={160} defaultValue={s.storeEmail} />
              <Field name="openingTime" label="Opening Time" type="time" required defaultValue={s.openingTime} />
              <Field name="closingTime" label="Closing Time" type="time" required defaultValue={s.closingTime} />
              <Field name="currency" label="Currency Symbol" required maxLength={6} defaultValue={s.currency} hint="e.g. Rs." />
            </div>
            <p className="text-xs text-navy-500">
              Delivery charges, free-delivery threshold and delivery time are under the <strong>Delivery</strong> tab.
            </p>
          </>,
        )}
      </div>
    </div>
  );
}
