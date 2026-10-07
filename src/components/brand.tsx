import {
  Activity,
  Baby,
  Cross,
  Droplet,
  Flower2,
  Heart,
  Leaf,
  Pill,
  Scissors,
  Shield,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { cn, fileUrl } from "@/lib/utils";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  pill: Pill,
  activity: Activity,
  thermometer: Thermometer,
  leaf: Leaf,
  baby: Baby,
  sparkles: Sparkles,
  droplet: Droplet,
  scissors: Scissors,
  smile: Smile,
  cross: Cross,
  syringe: Syringe,
  stethoscope: Stethoscope,
  heart: Heart,
  shield: Shield,
  flower: Flower2,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? Pill;
  return <Icon className={className} />;
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mz-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22266a" />
          <stop offset="1" stopColor="#5a3fd8" />
        </linearGradient>
      </defs>
      <path
        d="M19 4h10a3 3 0 0 1 3 3v9h9a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-9v9a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3v-9H7a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3h9V7a3 3 0 0 1 3-3z"
        fill="url(#mz-logo)"
      />
      <path d="M14 30c7 1 14-3 20-12-2 10-9 16-20 12z" fill="#fff" opacity=".92" />
    </svg>
  );
}

/** Brand lockup. Uses the uploaded logo when the owner has set one in the Website Editor. */
export function Logo({
  name,
  logoFileId,
  light,
  className,
}: {
  name: string;
  logoFileId?: string | null;
  light?: boolean;
  className?: string;
}) {
  const src = fileUrl(logoFileId);
  if (src) {
    return <Image src={src} alt={name} width={180} height={48} unoptimized priority className={cn("h-10 w-auto object-contain sm:h-12", className)} />;
  }
  const words = name.trim().split(/\s+/);
  const first = words[0] ?? "MediZone";
  const rest = words.slice(1).join(" ");
  // "MediZone" renders two-tone like the approved logo; any other name stays one colour.
  const split = first === "MediZone" ? ["Medi", "Zone"] : [first, ""];
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="size-10 shrink-0 sm:size-11" />
      <span className="leading-none">
        <span className={cn("block text-xl font-extrabold tracking-tight sm:text-2xl", light ? "text-white" : "text-navy-900")}>
          {split[0]}
          <span className={light ? "text-brand-300" : "text-brand-600"}>{split[1]}</span>
        </span>
        {rest && (
          <span className={cn("mt-1 block text-[10px] font-semibold tracking-[0.32em] uppercase", light ? "text-white/80" : "text-navy-700")}>
            {rest}
          </span>
        )}
      </span>
    </span>
  );
}

const PACK_COLORS = ["#5a3fd8", "#2f3485", "#7558ec", "#0e7490", "#be185d", "#b45309", "#047857", "#4338ca"];

/** Product photo, or a generated pack illustration when no image has been uploaded yet. */
export function ProductImage({
  name,
  imageFileId,
  className,
  sizes = "(max-width: 640px) 50vw, 240px",
  priority,
}: {
  name: string;
  imageFileId: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const src = fileUrl(imageFileId);
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const color = PACK_COLORS[hash % PACK_COLORS.length];
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-brand-100", className)}>
      {src ? (
        <Image src={src} alt={name} fill unoptimized sizes={sizes} priority={priority} className="object-contain p-2" />
      ) : (
        <div className="absolute inset-[16%] flex flex-col overflow-hidden rounded-lg bg-white shadow-card" role="img" aria-label={name}>
          <div className="flex h-[38%] items-center justify-center" style={{ background: color }}>
            <Pill className="size-1/2 max-h-8 text-white/90" />
          </div>
          <div className="flex flex-1 items-center justify-center px-1.5 text-center text-[10px] leading-tight sm:text-xs font-bold text-navy-900">
            <span className="line-clamp-3">{name}</span>
          </div>
        </div>
      )}
    </div>
  );
}
