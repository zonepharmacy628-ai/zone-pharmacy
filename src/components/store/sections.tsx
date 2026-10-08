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
    // Compact single card on phones and tablets; the lg classes keep the original desktop layout.
    <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl border border-line bg-brand-50 p-3 shadow-card sm:gap-4 sm:p-4 lg:grid-cols-4 lg:p-6 lg:shadow-none">
      {TRUST.map((t) => (
        <li key={t.title} className="flex items-center gap-2 sm:gap-3">
          <t.icon className="size-6 shrink-0 text-brand-600 sm:size-7 lg:size-8" strokeWidth={1.6} />
          <div className="min-w-0">
            <p className="text-[13px]/[1.2] font-semibold text-navy-900 sm:text-sm">{t.title}</p>
            <p className="text-[11px]/[1.25] text-navy-500 sm:text-xs">{t.text}</p>
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

const PILL_ROWS = [0, 1, 2, 3, 4];

function BlisterPack({ x, y, rotate, scale = 1 }: { x: number; y: number; rotate: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <rect x="6" y="10" width="170" height="330" rx="18" fill="#121440" opacity=".28" />
      <rect width="170" height="330" rx="18" fill="url(#hero-foil)" stroke="#ffffff" strokeOpacity=".55" strokeWidth="1.5" />
      <path d="M0 165h170" stroke="#ffffff" strokeOpacity=".35" strokeDasharray="3 5" />
      {PILL_ROWS.map((row) =>
        [0, 1].map((col) => (
          <g key={`${row}-${col}`} transform={`translate(${20 + col * 72} ${24 + row * 60})`}>
            <rect x="2" y="4" width="58" height="34" rx="17" fill="#3c2899" opacity=".3" />
            <rect width="58" height="34" rx="17" fill="url(#hero-pill)" stroke="#ffffff" strokeOpacity=".7" />
            <rect x="9" y="6" width="26" height="7" rx="3.5" fill="#ffffff" opacity=".75" />
          </g>
        )),
      )}
    </g>
  );
}

/** Hero artwork (blister packs) used until the owner uploads a banner image. Fills its box like a cover photo. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7558ec" />
          <stop offset=".55" stopColor="#4a31bd" />
          <stop offset="1" stopColor="#1a1d52" />
        </linearGradient>
        <linearGradient id="hero-foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6f4ff" />
          <stop offset=".5" stopColor="#bfb1fb" />
          <stop offset="1" stopColor="#ece8ff" />
        </linearGradient>
        <linearGradient id="hero-pill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dcd4ff" />
        </linearGradient>
      </defs>
      <rect width="400" height="520" fill="url(#hero-bg)" />
      <circle cx="330" cy="70" r="120" fill="#ffffff" opacity=".07" />
      <circle cx="60" cy="470" r="150" fill="#ffffff" opacity=".05" />
      <BlisterPack x={235} y={-70} rotate={24} scale={0.95} />
      <BlisterPack x={150} y={170} rotate={-10} scale={1.12} />
    </svg>
  );
}
