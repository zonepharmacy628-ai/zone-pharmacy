import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { getSettings } from "@/lib/settings";
import { fileUrl, siteUrl } from "@/lib/utils";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

// Every page depends on the session, live stock or owner-editable settings.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const description = `${s.pharmacyName} — ${s.tagline}. Order genuine medicines and health products online with delivery in ${s.deliveryTime}.`;
  const favicon = fileUrl(s.faviconFileId);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.websiteTitle, template: `%s | ${s.pharmacyName}` },
    description,
    applicationName: s.pharmacyName,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: { type: "website", siteName: s.pharmacyName, title: s.websiteTitle, description, locale: "en_PK" },
    twitter: { card: "summary", title: s.websiteTitle, description },
  };
}

export const viewport: Viewport = { themeColor: "#1a1d52", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
