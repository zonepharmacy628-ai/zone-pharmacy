# 24Zone Pharmacy

Online pharmacy storefront and admin panel.

- **Storefront** — home, categories, search and filters, product pages, cart, checkout (COD / JazzCash / Bank Transfer), order confirmation, order tracking, medicine requests, prescription upload, customer accounts (orders, re-order, wishlist, saved addresses, reviews).
- **Admin panel** (`/admin`) — dashboard, orders, products, categories, inventory and stock history, purchases and purchase invoices, suppliers, expiry management, medicine requests, sales reports (PDF / Excel export), staff and permissions, activity log, and the owner-only Website Editor (branding, homepage, delivery, payment, store).

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL via Drizzle ORM (embedded PGlite for local development) |
| Auth | Email + password, bcrypt hashes, signed HTTP-only session cookie |
| Files | Product images and prescriptions are stored in the database and served through an access-controlled route |

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and set `AUTH_SECRET`, `OWNER_EMAIL` and `OWNER_PASSWORD` (the file explains each one). Leave `DATABASE_URL` empty.

```bash
npm run dev
```

Open http://localhost:3000. On the first request an embedded Postgres database is created in `.data/`, migrated, and seeded with the categories, a starter catalogue and your Owner account. Sign in at `/login` with the owner email and password; staff and the owner are taken to `/admin`.

To start again from an empty database, stop the server and delete the `.data/` folder.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |
| `npm run db:generate` | Create a new SQL migration in `drizzle/` after editing `src/lib/db/schema.ts` |
| `npm run db:setup` | Apply migrations and seed the Postgres database in `DATABASE_URL` (idempotent) |
| `npm run vercel-build` | `db:setup` followed by `build` — used by Vercel |

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | Always | Signs session cookies (32+ random characters) |
| `OWNER_EMAIL`, `OWNER_PASSWORD` | For the first seed | Creates the Owner account when none exists |
| `OWNER_NAME` | No | Display name of the Owner account |
| `DATABASE_URL` | In production | Postgres connection string (pooled) |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL for SEO; auto-detected on Vercel |
| `DATABASE_POOL_MAX` | No | Max Postgres connections per instance (default 5) |

## Database and migrations

The schema lives in `src/lib/db/schema.ts`; SQL migrations are committed in `drizzle/`.

- **Local:** nothing to do — migrations and the seed run automatically against the embedded database.
- **Production:** `npm run db:setup` applies pending migrations and seeds an empty database. It runs on every Vercel deploy through `vercel-build`, and is safe to repeat.
- **Changing the schema:** edit `schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`.

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel choose **Add New → Project** and import the repository. The framework (Next.js), install command (`npm ci`) and build command (`npm run vercel-build`) are read from `vercel.json`.
3. Create a Postgres database — the simplest route is **Storage → Create Database → Neon** inside the Vercel project, which adds `DATABASE_URL` for you. Any Postgres provider works; use its pooled connection string.
4. Under **Settings → Environment Variables** add `AUTH_SECRET`, `OWNER_EMAIL`, `OWNER_PASSWORD` (and `OWNER_NAME`, `NEXT_PUBLIC_SITE_URL` if wanted) for Production and Preview.
5. Deploy. The build migrates and seeds the database, then builds the site.
6. Sign in at `/login` as the owner, open **Website Editor**, and set your store details, delivery charges and payment accounts.

After the first successful deploy you can remove `OWNER_PASSWORD` from Vercel; it is only read when no owner exists.

## Roles and permissions

- **Owner** — full access. Only the owner can manage staff and permissions, the Website Editor, and payment/store settings. The owner account cannot be edited or deactivated from the staff screen.
- **Staff** — Manager, Pharmacist, Sales Staff and Inventory Staff each start with sensible default permissions that the owner can adjust per person.
- Every page, server action and API route checks the session, role and permission on the server. Deactivating a staff member or changing a password signs that account out immediately.

## Payments

Cash on Delivery, JazzCash and Bank Transfer are switched on or off by the owner in **Website Editor → Payment**. JazzCash and Bank Transfer work as manual transfers: the customer is shown your account details at checkout, pays, and enters the transaction ID; staff verify it and mark the order as paid.

## Notes on security

- Prices, stock, delivery charges and totals are always computed on the server from the database; the browser only sends product ids and quantities.
- Orders are created in a single transaction with row locks, a `stock >= quantity` guard and a database check constraint, so stock can never go negative. Each checkout carries an idempotency key, so a double submit cannot create two orders.
- Uploads are limited to 4 MB and verified by file signature (PDF/JPG/PNG for prescriptions, JPG/PNG/WebP for images). Prescriptions are only served to the uploader and to staff allowed to handle orders or prescriptions.
- Login, registration, checkout, order tracking and medicine requests are rate limited.
