import { asc, eq } from "drizzle-orm";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireOwnerPage } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Website Editor" };

export default async function AdminSettingsPage() {
  await requireOwnerPage();
  const db = await getDb();
  const [settings, productRows, categoryRows] = await Promise.all([
    getSettings(),
    db.select({ id: products.id, name: products.name, featured: products.featured }).from(products).orderBy(asc(products.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder)),
  ]);
  return (
    <>
      <PageHeader title="Website Editor" subtitle="Customise your website content, delivery, payment and store settings. Owner only." />
      <SettingsEditor
        settings={settings}
        products={productRows.map(({ id, name }) => ({ id, name }))}
        categories={categoryRows}
        featuredIds={productRows.filter((p) => p.featured).map((p) => p.id)}
      />
    </>
  );
}
