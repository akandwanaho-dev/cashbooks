# Cashbook

A production-ready, offline-capable digital cash ledger built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui primitives, Recharts, Supabase, Capacitor 8, and Tauri 2. It runs on the web and builds into Android, iOS, Windows, and macOS binaries.

## Features

- Email/password, Google, and Apple authentication with Supabase Auth
- Multiple accounts/expense boxes for Home, School, Business, Transport and more
- Profiles, avatars, notification preferences and daily money motivation
- Protected administrator console for users, quotes, themes, pages and errors
- Strict per-user Row Level Security
- Realtime transaction synchronization
- Debit receipts, credit payments, rolling balances, and category analytics
- Searchable, sortable, filtered, paginated ledger
- Accountant-friendly `.xlsx` export with real date/currency cells
- Dark/light/system themes and responsive navigation
- Runtime Supabase setup saved in browser localStorage
- Fully interactive local demo mode
- UGX-first historical multi-currency conversion
- Native daily and loan/debt reminders on Android and iOS
- Persistent offline cache and mutation outbox
- Capacitor mobile and Tauri desktop build configurations
- Integer-minor-unit calculations to avoid floating-point drift

## Run locally

```bash
npm install
cp .env.example .env.local   # optional; runtime setup also works
npm run dev
```

Open the displayed local URL. If environment variables are absent, the app opens a database configuration screen. Use **Explore demo workspace** to inspect the full UI without a Supabase project.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql), [`supabase/mobile_migration.sql`](./supabase/mobile_migration.sql), then [`supabase/product_migration.sql`](./supabase/product_migration.sql). Existing deployments should run both migration files.
3. In Authentication settings, configure your Site URL and allowed redirect URLs for the deployed app.
4. Supply the Project URL and **anon/publishable** key either in `.env.local` or in the runtime configuration screen.
5. Enable Google and Apple in Supabase Authentication Providers if those buttons will be used.
6. Bootstrap the first administrator in SQL using their Auth user UUID:

```sql
insert into public.user_roles(user_id, role)
values ('YOUR-AUTH-USER-UUID', 'admin');
```

7. Never use the `service_role` key in this frontend.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

## Security note

Supabase anon/publishable keys are designed to be public in browser clients; they are not secrets. Runtime configuration is kept in this browser's localStorage and is never sent anywhere except the configured Supabase endpoint. Data authorization is enforced by the SQL Row Level Security policies, not by hiding the publishable key. A `service_role` key must never be placed in this app.

## Build

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Native builds

Use Node 22+, then follow [`NATIVE_BUILD_GUIDE.md`](./NATIVE_BUILD_GUIDE.md). The short workflow is:

```bash
npx cap add android     # once
npx cap add ios         # once; build iOS on macOS
npm run native:sync
npm run android         # Android Studio
npm run ios             # Xcode, macOS only
npm run desktop:dev     # Tauri
npm run desktop:build   # native package for current desktop OS
```

`vercel.json` includes the SPA rewrite required for direct web navigation to `/login`, `/ledger`, and `/settings`.
