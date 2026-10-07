import { eq } from "drizzle-orm";
import { MobileNav } from "@/components/store/chrome";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { StoreProvider } from "@/components/store/store-context";
import { getCurrentUser } from "@/lib/auth";
import { getActiveCategories } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { wishlist } from "@/lib/db/schema";
import { isStaffRole } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { toPublicSettings } from "@/lib/settings-shared";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, user, categories] = await Promise.all([getSettings(), getCurrentUser(), getActiveCategories()]);
  const db = await getDb();
  const wishlistIds = user
    ? (await db.select({ id: wishlist.productId }).from(wishlist).where(eq(wishlist.userId, user.id))).map((w) => w.id)
    : [];

  return (
    <StoreProvider
      settings={toPublicSettings(settings)}
      user={user ? { id: user.id, name: user.name, email: user.email, phone: user.phone, isStaff: isStaffRole(user.role) } : null}
      wishlist={wishlistIds}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-white focus:p-3">
        Skip to content
      </a>
      <Header categories={categories} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} categories={categories} />
      <MobileNav />
    </StoreProvider>
  );
}
