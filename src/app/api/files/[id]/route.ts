import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { can } from "@/lib/permissions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const [file] = await db.select().from(files).where(eq(files.id, id));
  if (!file) return new Response("Not found", { status: 404 });

  const isPrivate = file.kind === "prescription";
  if (isPrivate) {
    // Prescriptions: only the uploader and staff who verify prescriptions or handle orders.
    const user = await getCurrentUser();
    const allowed = user && (file.ownerId === user.id || can(user, "manage_requests", "manage_orders"));
    if (!allowed) return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.size),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isPrivate ? "private, no-store" : "public, max-age=31536000, immutable",
    },
  });
}
