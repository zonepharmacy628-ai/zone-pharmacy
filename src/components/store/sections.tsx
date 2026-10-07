import { ChevronRight, Headset, Lock, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";

const TRUST = [
  { icon: PackageCheck, title: "100% Genuine Products", text: "Original & verified" },
  { icon: Truck, title: "Fast Delivery", text: "Across Pakistan" },
  { icon: Lock, title: "Secure Payments", text: "Multiple payment options" },
  { icon: Headset, title: "Pharmacist Support", text: "We're here to help" },
];

export function TrustBar() {
  return (
    <ul className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-brand-50 p-4 sm:p-6 lg:grid-cols-4">
      {TRUST.map((t) => (
        <li key={t.title} className="flex items-center gap-3">
          <t.icon className="size-8 shrink-0 text-brand-600" strokeWidth={1.6} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-900">{t.title}</p>
            <p className="text-xs text-navy-500">{t.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TrustList() {
  return (
    <ul className="card divide-y divide-line px-5">
      {TRUST.map((t) => (
        <li key={t.title} className="flex items-center gap-3 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
            <t.icon className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">{t.title}</p>
            <p className="text-xs text-navy-500">{t.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-navy-500">
        <li>
          <Link href="/" className="font-semibold text-navy-900 hover:text-brand-600">
            Home
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5" />
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-600">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Decorative hero artwork used until the owner uploads a banner image. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 300" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ha-box" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7558ec" />
          <stop offset="1" stopColor="#3c2899" />
        </linearGradient>
        <linearGradient id="ha-cap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a3fd8" />
          <stop offset="1" stopColor="#9a85f5" />
        </linearGradient>
      </defs>
      <ellipse cx="215" cy="262" rx="190" ry="22" fill="#dcd4ff" opacity=".7" />
      <path d="M338 150c-6-44 14-78 52-92 6 40-10 74-52 92z" fill="#22a06b" opacity=".9" />
      <path d="M342 176c14-30 40-46 70-42-10 30-34 46-70 42z" fill="#34c38f" opacity=".9" />
      <path d="M338 150c14-34 30-60 52-92M342 176c22-18 44-32 70-42" stroke="#fff" strokeWidth="1.5" fill="none" opacity=".6" />
      <rect x="222" y="70" width="128" height="180" rx="12" fill="#fff" stroke="#dcd4ff" strokeWidth="2" />
      <rect x="222" y="178" width="128" height="72" rx="12" fill="url(#ha-box)" />
      <rect x="222" y="178" width="128" height="14" fill="url(#ha-box)" />
      <path d="M279 104h14v16h16v14h-16v16h-14v-16h-16v-14h16z" fill="#5a3fd8" />
      <rect x="110" y="96" width="92" height="154" rx="16" fill="#fff" stroke="#dcd4ff" strokeWidth="2" />
      <rect x="120" y="74" width="72" height="30" rx="8" fill="#f6f4ff" stroke="#dcd4ff" strokeWidth="2" />
      <path d="M149 150h14v16h16v14h-16v16h-14v-16h-16v-14h16z" fill="#5a3fd8" />
      <g transform="rotate(-24 70 220)">
        <rect x="30" y="206" width="78" height="30" rx="15" fill="#fff" stroke="#dcd4ff" strokeWidth="2" />
        <path d="M69 206h24a15 15 0 0 1 0 30H69z" fill="url(#ha-cap)" />
      </g>
      <g transform="rotate(18 190 248)">
        <rect x="160" y="238" width="62" height="24" rx="12" fill="#fff" stroke="#dcd4ff" strokeWidth="2" />
        <path d="M191 238h19a12 12 0 0 1 0 24h-19z" fill="#f59e0b" />
      </g>
      <circle cx="262" cy="258" r="13" fill="#fff" stroke="#dcd4ff" strokeWidth="2" />
      <circle cx="56" cy="170" r="11" fill="#fff" stroke="#dcd4ff" strokeWidth="2" />
    </svg>
  );
}
