# Copilot Agent — PC Builder Store V2 Integration Brief

You are working in the existing PC Builder Store repository. The folder `design-reference/PCBuilderStore_Stitch_V2_Reference/` contains the approved Stitch reference bundle. Read its `README.md` and `SCREEN_MANIFEST.csv`, then inspect the existing application before making changes.

## Phase 0 — inspect only; do not edit yet

1. Inspect current git branch, working tree, untracked files, and latest commits. Do not switch branches or discard changes.
2. Read the frontend route registry (`frontend/src/pages.ts`), app shell, `LegacyScreen.tsx`, existing catalog pages/API clients, styling setup, package manifests, and current component structure.
3. Read the Java backend API inventory and integration notes. Confirm which endpoints currently exist.
4. Inspect all 22 Stitch exports (especially `screen.png`, `DESIGN.md`, and `code.html`) and compare them against existing route behavior.
5. Produce a route-by-route integration matrix with: route, screen ID, current implementation, available API, needed frontend components, backend gap, and risk.
6. Identify shared UI components to build once: customer header/footer, admin sidebar/topbar, buttons, inputs, badges, cards, tables, pagination, dialogs, toasts, empty/loading/error states.
7. Identify exported HTML elements/assets that cannot be used directly or rely on CDN/external resources.
8. Report any business requirements that conflict with the existing schema or current APIs. Do not invent fields or endpoints.

At the end of Phase 0, provide a concrete implementation plan split into small reviewable batches. **Do not modify code during Phase 0.**

## Scope and constraints

- React + TypeScript + Vite frontend.
- Java 21 + Spring Boot + Spring JDBC backend.
- PostgreSQL with the existing 35-table schema. Do not migrate to JPA/Hibernate.
- Preserve existing Java catalog APIs and the current catalog implementation.
- Current live endpoints: `/api/health`, `/api/health/db`, `/api/catalog/facets`, `/api/catalog/products`, `/api/catalog/products/{modelCode}`. Verify in repository before relying on this list.
- No Node backend modifications during the Java migration.
- Numeric database IDs may exceed JavaScript safe integer range; preserve them as strings where appropriate. Use `BigDecimal` for money in Java.
- Roles: `ADMIN`, `SALES`, `CUSTOMER`. Customer segments: `IT`, `NON_IT`. Conditions: `NEW`, `LIKE_NEW`, `USED`.
- Guest checkout is allowed. Payment is simulated.
- Build-PC is postponed and must remain Coming Soon. Do not implement B01–B08.
- No wishlist, product reviews, coupons, address book, real OTP/email verification, social login, real payment gateway, shipment event history, RMA/repair history, AI recommendation engine, benchmark service, BOM stock calculation, or certified compatibility engine.
- Product prices/stock are demo values. Catalog image URLs are blank; do not assign unrelated product photos.
- A05 CSV import is currently a local guarded development utility, not a live production admin API.
- A02 dashboard sample metrics must be marked as illustrative, not real business results.
- Authentication and staff permission enforcement are not yet implemented; do not present them as live.

## Visual acceptance criteria

- Light-first lavender/white surfaces, purple primary actions, deep plum text, restrained champagne-gold tags.
- Plus Jakarta Sans and JetBrains Mono for technical identifiers, subject to app dependency availability.
- Customer pages share one storefront shell. Admin pages share one admin shell.
- Responsive desktop-first behavior.
- Vietnamese UI with proper diacritics.
- Use Stitch exports as references, not as one-file-per-route static HTML embeds.

## Safety requirements

- Never overwrite the whole frontend with generated HTML.
- Do not change DB schema or seed data.
- Do not alter `.vscode/settings.json`.
- Preserve untracked user documents and local changes.
- Do not run destructive git commands (`reset`, `clean`, force push, rebase, etc.).
- Do not add dependencies without explaining why.

After Phase 0, wait for review before implementing.
