# PC BUILDER STORE V2 — FULL FRONTEND MIGRATION + REAL DATABASE DEMO LOGIN

> **Implementation instruction for Copilot Agent**  
> This document combines the full V2 frontend migration with the requirement to create three real PostgreSQL demo accounts and enable real email/password login. Read this file directly from the current VS Code workspace. Do not rely on pasted-text attachments or inaccessible agent-session paths.

---

# 0. EXECUTION GOAL

The goal is to turn the existing PC Builder Store project into the V2 application as its **primary UI**, migrate all 22 approved screens from Google Stitch into React + TypeScript, load real product/catalog data from the existing PostgreSQL-backed Java API, and provide realistic demo workflows for business features whose APIs have not yet been implemented.

In addition, create three actual user records in the local development PostgreSQL database and make email/password login genuinely work for those accounts.

The user explicitly wants:

- A real `ADMIN` database account.
- A real `SALES` staff database account.
- A real `CUSTOMER` database account.
- Real login using email and password against PostgreSQL.
- Login state to survive page refresh and normal navigation.
- Logout to end the authenticated session.
- **No registration implementation yet.**
- **No JWT or refresh-token implementation yet.**
- **No OTP or email verification yet.**
- **No password-reset implementation yet.**

Use server-side HTTP session authentication with an HttpOnly session cookie for this development milestone. Do not replace real login with a frontend-only role switcher.

The V2 light lavender/white/purple/champagne design must become the main UI for the approved routes. The old dark legacy UI must no longer appear on those routes after migration.

Work through the phases in this document in order. Do not stop after creating a plan or after migrating only a few screens. Continue through all phases unless a genuine blocker requires user input. Report blockers honestly.

---

# 1. READ THE WORKSPACE DIRECTLY

This is an instruction to work in the currently open repository. Read source files from the workspace filesystem, not from pasted-text attachments or temporary agent-session paths.

The repository root has historically been named `PCBuilderStore_Frontend_Preview` and contains folders such as:

- `frontend/`
- `backend-java/`
- `backend/` (legacy Node backend; do not modify)
- `api/`
- `docs/`
- `seed/`
- `PCBuilderStore_Stitch_V2_Reference/`
- root `schema_35_tables.sql`

The Stitch reference may be located at the repository root under `PCBuilderStore_Stitch_V2_Reference/`. If the user has moved it, locate it by searching the workspace. Do not assume a different path without checking.

The reference contains 22 screen folders. Each screen should have:
- `code.html`
- `screen.png`
- `DESIGN.md`

These HTML files are static design references, not ready-made React pages. Rebuild the designs as React components. Do not use iframe embedding or inject the full exported HTML as the runtime application.

Also read the Phase 0 audit report if present in the workspace. The last audit found that all 22 references existed and mapped to 22 unique approved routes.

---

# 2. MANDATORY REPOSITORY SAFETY

Before editing anything:

1. Inspect the current Git branch, commit, and `git status --short --branch`.
2. Record tracked modifications and untracked files.
3. Identify the current location of the Stitch reference and Phase 1 files.
4. Preserve the original state of all user changes.

Expected branch:

`migration/java-spring-boot`

Expected latest known Phase 3A/Phase 1 baseline commit:

`f4fbaa4f8875e2a6f9ba5dc0a69cc65b96970351`

The actual current branch/commit must be checked; do not assume it is unchanged.

Known pre-existing changes that must be preserved include:

- `backend-java/pom.xml` modification for Apache Commons CSV.
- `frontend/vite.config.ts` modification: configurable `API_PROXY_TARGET`, defaulting to Java API on port 8080.
- `.vscode/settings.json` and all user settings.
- Catalog importer source and test files.
- Authentication design documents.
- Catalog preview runbook.
- Java API migration inventory.
- Stitch reference files and other user-created documents.

**Never:**

- Switch branches.
- Merge or rebase.
- Run `git reset`, `git clean`, or destructive checkout commands.
- Discard, stash, or overwrite existing user changes.
- Run `git add .` or commit without explicit permission.
- Modify `.vscode/settings.json`.
- Delete `LegacyScreen` before every relevant route is migrated and verified.
- Delete the old Node backend.
- Change or add database tables/columns.
- Run schema migrations, seed scripts, or the catalog importer except for the explicitly requested demo-account seed against the verified development database.
- Print database passwords, plaintext account passwords in logs, session IDs, or password hashes unnecessarily.

At completion, compare Git status with the initial snapshot and list all changes made by this task separately from pre-existing changes.

---

# 3. CURRENT PROJECT ARCHITECTURE AND KNOWN IMPLEMENTATION STATE

Verify all of this against the actual source before changing code.

## Frontend

- React 19.
- TypeScript.
- Vite.
- React Router 7.
- Tailwind CSS 3.4.
- No component library was found in the Phase 0 audit.
- Workspace command includes `npm run dev --workspace=frontend`.
- Existing route registry: `frontend/src/pages.ts`.
- Application routing: `App.tsx`.
- Legacy HTML renderer: `LegacyScreen.tsx`.
- Catalog implementation: `CatalogPage.tsx`.
- Catalog API client: `catalog-api.ts`.

Phase 1 shared V2 foundation has already been implemented. The known files are:

- `theme.css` — scoped light-first tokens, typography, responsive styles.
- `components.tsx` — customer/admin shells and reusable components.
- `V2FoundationPreview.tsx` — development preview content.
- `App.tsx` — development-only preview routes.
- `main.tsx` — imports the V2 theme.

Find their actual locations in the workspace. Do not create duplicate versions if they already exist.

Phase 1 verification previously reported:

- `npm run typecheck` passed.
- Production build passed to a temporary output directory.
- Preview routes `/system/v2-preview` and `/system/v2-admin-preview` rendered.
- Catalog source files and route mappings were not modified by Phase 1.
- C17 browser mock verification did not complete because the mock failed to intercept requests and Vite returned HTTP 500. This was not proof of a live Java API failure.

The preview routes are **not** the final application screens. They must remain useful for development if possible, but the approved business routes must render the actual V2 pages.

## Java backend

- Java 21.
- Spring Boot.
- Spring JDBC (`JdbcTemplate` / named parameters as used by the current code).
- PostgreSQL.
- No JPA/Hibernate.
- Existing 35-table schema must remain unchanged.

Known Java endpoints from the Phase 0 audit:

- `GET /api/health`
- `GET /api/health/db`
- `GET /api/catalog/facets`
- `GET /api/catalog/products`
- `GET /api/catalog/products/{modelCode}`

Verify actual routes, DTOs, controller implementations, tests, and configuration. Do not assume that any other business endpoint exists.

## Existing catalog behavior

Four routes have React-backed catalog functionality:

- C01 Homepage.
- C02 Parts Search.
- C03 Product Detail.
- C17 Product Comparison.

C17 comparison currently supports up to four model codes persisted in `localStorage` and loads product details using the existing product detail API. Preserve this behavior.

The catalog API exposes products, facets, offers, typed specifications, images, and demo-data indicators. Product numeric IDs are serialized as strings and money is handled as `BigDecimal` in Java.

The current supplied catalog dataset contains 150 illustrative products. Product image URLs are blank; use neutral category fallbacks, never unrelated product imagery.

---

# 4. EXACT APPROVED SCREEN SCOPE — 22 SCREENS

Migrate exactly these approved screens. Keep their route strings.

## Customer — 12 screens

| ID | Screen | Route |
|---|---|---|
| C01 | Homepage | `/customer/home` |
| C02 | Parts Search | `/customer/parts` |
| C03 | Product Detail | `/customer/product` |
| C04 | Cart | `/customer/cart` |
| C05 | Checkout | `/customer/checkout` |
| C06 | Order Result | `/customer/order-result` |
| C07 | Register | `/customer/register` |
| C08 | Login | `/customer/login` |
| C10 | Account Overview | `/customer/account` |
| C11 | Order History | `/customer/orders` |
| C12 | Order Detail | `/customer/order-detail` |
| C17 | Product Comparison | `/customer/compare` |

## Admin/Sales — 10 screens

| ID | Screen | Route |
|---|---|---|
| A01 | Staff Login | `/admin/login` |
| A02 | Admin Dashboard | `/admin/dashboard` |
| A03 | Product Management | `/admin/products` |
| A04 | Product Create/Edit | `/admin/product-edit` |
| A05 | CSV Import | `/admin/csv-import` |
| A07 | Category Management | `/admin/categories` |
| A08 | Brand Management | `/admin/brands` |
| A09 | Order Management | `/admin/orders` |
| A10 | Customer Lookup | `/admin/customers` |
| A12 | Staff and Roles | `/admin/staff` |

Do not invent C09, C13, A06, A11, or other approved business screens.

The existing Build-PC B01–B08 routes must remain clearly marked **Coming Soon**. Do not implement the Build-PC engine, compatibility engine, benchmark service, AI recommender, or BOM inventory logic.

---

# 5. APPROVED V2 DESIGN SYSTEM

The Stitch V2 screenshots are the visual source of truth. The application must use a light-first design, not the old dark/pink/red legacy theme and not the accidental dark teal/OBSIDIAN theme that appeared in an earlier Stitch batch.

## Colors

- Main background: `#F7F4FC`
- Alternative section background: `#F0ECF8`
- Card background: `#FFFFFF`
- Secondary surface: `#F4F0FA`
- Soft lavender: `#EAE4F5`
- Primary purple: `#6D4AFF`
- Primary button purple: `#6728D9`
- Secondary purple: `#8D65E8`
- Deep plum: `#302542`
- Main text: `#282234`
- Secondary text: `#71697E`
- Border: `#E4DEED`
- Champagne gold: `#D9AD62`
- Light gold surface: `#FFF4DF`
- Gold text: `#89601E`
- Success: `#21865B`
- Warning: `#C18A20`
- Error: `#CE4558`
- Information: `#4B72C8`

## Typography

- Plus Jakarta Sans for normal interface typography.
- JetBrains Mono for model codes, SKU, order codes, and technical identifiers.
- Preserve proper Vietnamese diacritics.

## Visual proportions and components

Target approximately 65–75% white/light surfaces, 15–25% purple/lavender, and no more than 5–10% gold accents.

Use:

- White cards.
- Soft lavender page/section surfaces.
- Purple primary actions.
- Deep plum headings.
- Fine lavender borders.
- Moderate rounded corners.
- Subtle shadows.
- Small champagne-gold tags/badges.
- Consistent spacing and hierarchy.

Never use:

- Full-page black backgrounds.
- Dark teal admin theme.
- OBSIDIAN branding.
- Old pink/red legacy branding.
- Excessive neon/glow.
- Heavy glassmorphism.
- Unrelated product photos.

Keep customer and admin layouts distinct but visually related.

Customer shell:
- Shared header.
- Navigation.
- Wide search.
- Cart/account controls.
- Shared footer.

Admin shell:
- White/light lavender sidebar.
- Purple active navigation item.
- Topbar.
- Breadcrumb.
- Main content area.
- Responsive collapsed sidebar.

Use the existing Phase 1 V2 tokens and components. Extend/refactor safely rather than making parallel design systems. Avoid global CSS rules that unintentionally recolor legacy or unrelated pages.

---

# 6. BUSINESS AND DATABASE CONSTRAINTS

The existing PostgreSQL database foundation contains exactly 35 tables. Do not modify the schema in this task.

## Roles

Actual role codes:

- `ADMIN`
- `SALES`
- `CUSTOMER`

## Customer segments

- `IT`
- `NON_IT`
- Existing schema may also support `UNSPECIFIED` as a default; verify actual constraints.

## Product types

- `CPU`
- `GPU`
- `MOTHERBOARD`
- `RAM`
- `STORAGE`
- `PSU`
- `CASE`
- `COOLER`
- `ACCESSORY`
- `PC`

## Product conditions

- `NEW`
- `LIKE_NEW`
- `USED`

## Product model versus sellable offer

Keep these separate:

Product model:
- Product name.
- Model code.
- Product type.
- Category.
- Brand.
- Description.
- Typed technical attributes.

Sellable offer:
- Price.
- Stock quantity.
- Condition.
- Warranty duration.
- Active state where supported.

Do not conflate the two.

## Explicitly unsupported or postponed functionality

Do not claim the following are production-ready unless actual code/API proves it:

- Public registration persistence.
- JWT or refresh tokens.
- OTP/email verification.
- Password reset.
- Social login.
- Real payment gateway.
- Production cart persistence.
- Production order creation/history.
- Product CRUD APIs.
- Category/brand CRUD APIs.
- Staff CRUD APIs.
- Customer lookup APIs.
- CSV admin HTTP API/import history.
- Coupon campaigns.
- Wishlist.
- Product reviews/ratings.
- Address book.
- RMA/repair history.
- Shipment-event tracking.
- AI recommendation engine.
- Real benchmark service.
- Certified hardware compatibility.
- BOM-based prebuilt PC stock calculation.

Use honest unavailable/prototype/demo states for unsupported business operations.

---

# 7. REAL DATABASE DEMO ACCOUNTS — REQUIRED

The user explicitly wants three real accounts inserted into the local development database, and actual email/password login working. Do NOT substitute a frontend-only Demo Role Switcher.

Create these three users:

| Role | Email | Password | Full name | Customer segment |
|---|---|---|---|---|
| ADMIN | `admin@pcbuilder.test` | `AdminDemo@2026!` | Admin Demo | UNSPECIFIED/default where valid |
| SALES | `sales@pcbuilder.test` | `SalesDemo@2026!` | Sales Demo | UNSPECIFIED/default where valid |
| CUSTOMER | `customer@pcbuilder.test` | `CustomerDemo@2026!` | Nguyễn Văn An | IT |

All three must have `account_status = ACTIVE` using the exact value accepted by the existing schema.

These are local development demo accounts only. Do not reuse these credentials in production.

## 7.1 Mandatory database target verification

The ONLY permitted target is:

`pc_builder_store_dev`

Before any SQL write:

1. Inspect the actual datasource configuration/environment variables.
2. Verify the connected database name using the active PostgreSQL connection (for example `SELECT current_database()` through the same datasource).
3. Verify the host is local development (localhost/127.0.0.1 or the exact established local configuration).
4. Verify the database name is exactly `pc_builder_store_dev`.
5. Verify it is not `pc_builder_store_it`.
6. Inspect the exact schema of the user and role tables from the repository SQL and the live database.
7. Inspect existing role rows and user email conflicts.

If any verification fails or the connection cannot be established, STOP before writes. Do not guess the target.

Never target a remote/production database or `pc_builder_store_it`.

Do not print the database password in logs or report output.

## 7.2 Inspect schema; do not guess

The Phase 0 audit identified likely user fields:

- role foreign key (`role_id` was observed in the schema design).
- `full_name`.
- `email`.
- `password_hash`.
- `phone`.
- `customer_segment`.
- `account_status`.

These names and the roles table structure MUST be verified against the actual migration/schema and current PostgreSQL database. Do not assume role table names, role code columns, IDs, sequences, defaults, check constraints, or unique constraints.

Resolve role foreign keys by the actual role code (`ADMIN`, `SALES`, `CUSTOMER`), never by guessed numeric IDs.

If required role rows are missing, insert only those missing role codes using the actual schema and unique constraints. Do not duplicate existing role rows.

## 7.3 Password hashing

Never store plaintext passwords.

Use BCrypt. Prefer the existing Spring Security BCrypt encoder if it is added/configured for real login. Generate a fresh salted BCrypt hash for each account.

Do not assume PostgreSQL `pgcrypto` or `crypt()` is installed.

The final database rows must contain BCrypt hashes in the existing `password_hash` field.

Do not log hashes unnecessarily. Do not store these passwords in frontend code, localStorage, or committed client configuration.

## 7.4 SQL seed file and execution

Create a development-only SQL seed artifact in an appropriate location, e.g. `seed/dev-demo-accounts.sql`, after inspecting the schema.

The script must be documented as local-development-only and idempotent.

If bcrypt hashes are generated by Java, place the generated hash values in the development SQL seed file; never place plaintext password values in SQL literals.

Use a transaction. Insert only the three specified demo accounts and any missing role rows. Resolve role IDs by role code. Avoid resetting/updating unrelated users. If one of the demo emails already exists, inspect it first and do not silently overwrite a pre-existing non-demo account. For an existing account that is clearly one of these demo fixtures, update only what is necessary and explicitly report that action.

Execute only against the verified `pc_builder_store_dev` database.

Afterward, query and verify:

- Exactly the three expected demo emails exist (or report any pre-existing state clearly).
- Each has the correct role code.
- Each account is `ACTIVE`.
- CUSTOMER has segment `IT`.
- ADMIN/SALES have a valid default/UNSPECIFIED segment if required by schema.
- `password_hash` values are present and look like BCrypt hashes, not plaintext.
- No unrelated user row was changed.

Do not modify schema or run other seed/import utilities.

---

# 8. REAL EMAIL/PASSWORD LOGIN WITHOUT JWT

Implement a minimal, real, database-backed authentication mechanism using server-side HTTP sessions.

This is NOT a mock login. User lookup and password verification must happen against PostgreSQL.

Use Spring Boot + Spring JDBC and the smallest necessary Spring Security/session configuration compatible with the existing Spring Boot version.

## Required endpoints

### `POST /api/auth/login`

Request should accept email and password.

Behavior:

1. Find the user by normalized email using the actual existing users table.
2. Load their role code by joining/resolving the actual roles table.
3. Verify password against BCrypt `password_hash`.
4. Reject unknown email or wrong password with a generic credential error.
5. Reject non-`ACTIVE` accounts.
6. Establish an authenticated server-side session.
7. Return safe user identity fields only.

### `GET /api/auth/me`

Return the currently authenticated session identity:

- user ID (serialize as a string if numeric/large).
- full name.
- email.
- role code.
- customer segment.
- account status only if useful and safe.

Never return password hash or credentials.

If unauthenticated, return an appropriate 401 response.

### `POST /api/auth/logout`

Invalidate the server-side session and clear the session cookie. Return a safe success response.

## Session requirements

- Use server-side HTTP session, not JWT.
- Use an HttpOnly cookie.
- Use `SameSite=Lax` or the appropriate secure local-development setting.
- Use `Secure` only when HTTPS is active; do not make local HTTP testing impossible.
- Set cookie path appropriately.
- Use session fixation protection/regenerate session ID on authentication.
- Configure session timeout reasonably for development.
- Do not store credentials, password hashes, or session IDs in localStorage.
- Do not implement refresh tokens.
- Do not leave the Spring Boot generated default login page enabled.
- Configure CSRF protection correctly for session-cookie authentication, especially login/logout state-changing requests. If using a CSRF token repository, expose a safe mechanism for the frontend to obtain the token and send it back. Do not simply disable CSRF for convenience without documenting and justifying a safe alternative.
- Configure Vite proxy/session cookie behavior so frontend calls to `/api` work from the current Vite origin.
- Use `credentials: 'include'` for relevant frontend calls.
- Do not log passwords or session identifiers.

## Catalog accessibility

Existing health and catalog endpoints must remain publicly accessible without login:

- `/api/health`
- `/api/health/db`
- `/api/catalog/**`

Do not accidentally require authentication for catalog browsing.

## Role behavior

- ADMIN can enter the admin UI.
- SALES can enter the appropriate staff/admin UI for demo purposes.
- CUSTOMER uses the customer storefront/account UI.
- Customer login must not be mistaken for staff login.
- Staff login can accept ADMIN and SALES.
- If the wrong role attempts to enter the wrong login area, show a clear role-appropriate message or route them to the correct area after successful authentication.

Do not invent an advanced permissions matrix. Backend APIs for admin CRUD/orders/customers/staff do not yet exist, so role identity does not make those operations production-persistent or secure by itself.

## Important scope exclusions

Do NOT implement:

- Registration endpoint or persistent registration.
- JWT.
- Refresh tokens.
- OTP.
- Email verification.
- Password reset.
- Social login.
- Real multi-factor authentication.

C07 Register must remain a polished V2 screen with a clear message that registration is not enabled yet. Do not make it submit a fake successful registration.

C08 Customer Login and A01 Staff Login must perform real email/password login against the demo accounts.

---

# 9. FRONTEND AUTHENTICATION INTEGRATION

Implement a shared authentication/session service and React context/provider appropriate to the current project structure.

Requirements:

- On app initialization, call `GET /api/auth/me` to restore a valid session.
- Expose authenticated user state, role, loading state, login action, and logout action.
- Use `credentials: 'include'` for auth requests.
- Follow CSRF requirements for POST login/logout.
- Do not save passwords or session tokens in localStorage.
- Display the real logged-in user's name and role in the UI.
- Provide a true logout action that calls the backend.
- Use route guards only as a user-experience layer; do not claim frontend guards alone provide backend security.
- Do not create a Demo Role Switcher or hard-coded identity switch control.

Login redirects:

- `CUSTOMER` → `/customer/home` or `/customer/account`.
- `ADMIN` → `/admin/dashboard`.
- `SALES` → `/admin/dashboard` or the agreed staff landing page.

A direct visit to a protected-looking UI route should show the appropriate login/unauthenticated state when the session is absent. Because actual admin business APIs are not implemented, do not imply backend authorization for nonexistent operations.

---

# 10. DATA STRATEGY FOR ALL 22 SCREENS

Strictly distinguish LIVE API data, AUTHENTICATED IDENTITY, and DEMO BUSINESS DATA.

## 10.1 Live catalog data from PostgreSQL-backed Java APIs

These screens must use real Java catalog endpoints:

- C01 Homepage.
- C02 Parts Search.
- C03 Product Detail.
- C17 Product Comparison.
- A03 Product Management (read-only catalog view).
- A07 Category Management (read-only facets view).
- A08 Brand Management (read-only facets view).

Preserve existing catalog response contracts and behavior. Do not mock products to hide API failures.

A03, A07, A08 are read-only because product/category/brand write APIs do not exist yet. Disable or clearly label unavailable write operations; do not show false success.

## 10.2 Demo business data for APIs not yet implemented

The following flows may use browser-local demo fixtures/state so the screens can be visually and interactively tested:

- C04 Cart.
- C05 Checkout.
- C06 Order Result.
- C10 Account Overview fields not exposed by an API.
- C11 Order History.
- C12 Order Detail.
- A02 Dashboard metrics and recent orders.
- A04 Product Create/Edit draft preview.
- A05 CSV import preview.
- A09 Order Management.
- A10 Customer Lookup.
- A12 Staff/role presentation beyond the three real demo identities.

Use a clean, separated demo-data service layer (for example under `frontend/src/demo/`) rather than embedding fixture arrays directly into components.

Use namespaced, versioned localStorage keys to avoid conflicts. Initialize fixtures only when the relevant key is absent. Provide a development reset option if appropriate.

Every demo-only business record or metric must be visibly labeled:

`DỮ LIỆU DEMO — CHƯA ĐƯỢC LƯU VÀO DATABASE`

Do not mix demo orders with real catalog records. Keep user identity from `/api/auth/me` separate from browser-local demo orders.

## 10.3 Demo checkout flow

C04:
- Add/remove items.
- Quantity changes.
- Subtotal and total calculations.
- Local persistence for the demo cart.
- Empty state.

C05:
- Guest checkout remains supported.
- For this demo login milestone, a logged-in CUSTOMER may have basic known identity information prefilled if available; do not force registration.
- Validate name, phone, and delivery address.
- Payment is simulated only.
- A successful demo checkout creates a browser-local demo order, then navigates to C06.
- Do not call a nonexistent order API.

C06/C11/C12:
- Read the browser-local demo order store.
- Show order result/history/detail consistently.
- Do not claim PostgreSQL persistence.
- Do not fabricate shipment tracking or RMA history.

A02/A09:
- Use the same demo order store.
- Label totals and charts as demo data.
- Never present illustrative revenue as actual sales.

A10:
- Use clearly labeled demo customer fixtures for phone lookup.
- Do not expose private information from real database users beyond the authenticated account's safe profile fields.

A12:
- Show the three actual demo account identities/roles from the authenticated/demo account list only if safely available; otherwise use explicitly labeled sample staff profile data.
- Do not create arbitrary database staff through this screen.
- No staff CRUD API exists yet.

A05:
- CSV file selection and local preview/validation only.
- Do not automatically call the local startup importer.
- Do not claim database import succeeded.

---

# 11. SCREEN-SPECIFIC REQUIREMENTS

Implement each screen according to its Stitch reference folder and screen screenshot. Reuse shared components and avoid duplicate shells.

## Customer

### C01 Homepage

- Shared customer header/footer.
- Hero with lavender/white surfaces and restrained purple/gold accents.
- Category matrix using the ten real product types/categories where available.
- Featured items sourced from live Catalog API.
- Product cards use actual API product names/model codes/offers/specs.
- Build-PC callout says Coming Soon only.
- Do not invent compatibility or AI recommendation claims.

### C02 Parts Search

- Search, supported filters, sorting, pagination.
- Use `/api/catalog/facets` and `/api/catalog/products`.
- Desktop filter sidebar; mobile filter drawer.
- Real API loading/error/empty states.
- No fake ratings/reviews.

### C03 Product Detail

- Load by real model code through product detail API.
- Product model versus offer distinction.
- Typed specifications from API.
- Condition, price, stock, warranty only when actually provided.
- No unrelated product imagery.
- Add-to-cart uses local demo cart only and is labeled accordingly.

### C04 Cart

- Local demo cart.
- Editable quantities/removal.
- Clear summary and empty state.

### C05 Checkout

- Guest checkout.
- Name, phone, address.
- Simulated payment.
- No real gateway.

### C06 Order Result

- Demo success/failure states.
- Success only after the local demo checkout action has completed.
- Clearly label demo order.

### C07 Register

- Fully styled form UI.
- Submission disabled or displays “Chức năng đăng ký chưa được triển khai”.
- Do not create accounts.

### C08 Login

- Real `/api/auth/login`.
- Real CUSTOMER account login.
- Password field and show/hide control.
- Validation and generic credential error.
- Customer redirects after login.

### C10 Account Overview

- Use authenticated safe profile identity from `/api/auth/me`.
- Other account/order details may be demo or unavailable; label honestly.
- No address book, wishlist, loyalty points, or RMA history.

### C11 Order History

- Browser-local demo orders only.
- Clearly labeled demo.
- Empty state.

### C12 Order Detail

- Browser-local demo order details only.
- No shipment timeline or repair history.

### C17 Product Comparison

- Preserve existing four-product maximum.
- Preserve localStorage model-code list.
- Load real product details via current API.
- Group typed specifications.
- Highlight differences.
- Use neutral dash for missing attributes.
- Do not invent compatibility scores or certified compatibility.

## Admin/Sales

### A01 Staff Login

- Real `/api/auth/login`.
- ADMIN and SALES identities only for staff login.
- Redirect according to authenticated role.
- No public staff registration.

### A02 Dashboard

- Shared AdminLayout.
- Catalog counts only when derived from live API data.
- Sales/order KPIs and charts are demo-only and labeled.
- Recent demo orders.
- Quick links to approved admin routes.

### A03 Product Management

- Fetch real catalog products and facets.
- Search/filter using supported read API.
- Read-only notice.
- No fake CRUD success.

### A04 Product Create/Edit

- Schema-driven form based on existing attribute definitions.
- Keep model and offer separate.
- Product conditions `NEW`, `LIKE_NEW`, `USED`.
- Local draft preview only; no nonexistent write API.
- Neutral image fallback.

### A05 CSV Import

- File selection and local preview/validation.
- Clearly mark as not connected to a production Admin import API.
- Never invoke startup importer implicitly.

### A07 Category Management

- Real read-only categories from facets.
- No fake CRUD persistence.

### A08 Brand Management

- Real read-only brands from facets.
- No fake CRUD persistence.

### A09 Order Management

- Shared browser-local demo order records.
- Search/filter/status display.
- Demo-only status changes if included.
- No claim of database persistence.

### A10 Customer Lookup

- Phone lookup against clearly labeled demo customer fixtures.
- Privacy-aware result states.
- No unsupported customer API.

### A12 Staff and Roles

- Show actual role codes only: ADMIN, SALES, CUSTOMER.
- Demonstrate the three database-backed demo accounts.
- No staff CRUD API or permission matrix.
- Do not show plaintext passwords in staff table or account profile.

---

# 12. MIGRATION ORDER

Complete the migration in these batches. Do not stop after each batch waiting for a new user prompt unless a genuine blocker occurs. Typecheck/build and verify each batch before continuing.

## Batch 1 — Authentication foundation and database demo accounts

1. Inspect datasource and schema.
2. Verify `pc_builder_store_dev` and local host.
3. Inspect actual role/user rows.
4. Create an idempotent BCrypt demo-account seed script.
5. Execute only against the verified dev database.
6. Verify all three accounts/roles/statuses/segments.
7. Implement session-based login/me/logout APIs.
8. Implement frontend auth context/session restoration.
9. Wire C08 and A01 real login forms.
10. Keep registration/JWT/OTP/password reset postponed.

If the database target cannot be confirmed, stop the database write part and continue only with non-destructive frontend work. Never guess.

## Batch 2 — Live Catalog and customer shell

- CustomerLayout/header/footer.
- C01 Homepage.
- C02 Parts Search.
- C03 Product Detail.
- C17 Product Comparison.

These must use live API data, preserve search/filter/detail/compare behavior, and display the V2 design.

## Batch 3 — Customer commerce demo flow

- C04 Cart.
- C05 Checkout.
- C06 Order Result.
- Browser-local demo cart and order state.

## Batch 4 — Customer identity and account screens

- C07 Register (disabled prototype, no registration backend).
- C08 Login (real database-backed login).
- C10 Account Overview.
- C11 Order History.
- C12 Order Detail.

Use real session identity for the signed-in user. Use clearly marked demo records for unsupported order history.

## Batch 5 — Admin shell and catalog screens

- AdminLayout/sidebar/topbar.
- A01 Staff Login (real database-backed ADMIN/SALES login).
- A02 Dashboard.
- A03 Product Management (live read-only catalog).
- A04 Product Create/Edit (local draft only).

## Batch 6 — Admin management screens

- A05 CSV Import (local preview only).
- A07 Category Management (live read-only facets).
- A08 Brand Management (live read-only facets).
- A09 Order Management (demo orders).
- A10 Customer Lookup (demo customer fixtures).
- A12 Staff and Roles (show three real demo account identities; no CRUD API).

## Batch 7 — Integration and regression

- Verify all 22 routes.
- Verify all demo roles log in and log out.
- Verify session survives refresh.
- Verify public catalog endpoints still work without login.
- Verify V2 theme on all 22 routes.
- Verify Build-PC routes remain Coming Soon.
- Verify desktop/tablet/mobile.
- Run typecheck and production build.
- Run appropriate Java unit/controller tests.
- Run DB integration tests only against the approved isolated test database if their profile explicitly targets it; never repurpose `pc_builder_store_it` for demo seeding.
- Do not run migrations/importers as part of regression tests.

---

# 13. REQUIRED TEST MATRIX

## Real authentication

Test all of the following against `pc_builder_store_dev`:

1. ADMIN correct email/password login succeeds.
2. SALES correct email/password login succeeds.
3. CUSTOMER correct email/password login succeeds.
4. Incorrect password rejected.
5. Unknown email rejected.
6. Inactive account rejected.
7. Customer account cannot be treated as staff login identity.
8. ADMIN/SALES are identified as staff roles.
9. `GET /api/auth/me` returns the authenticated identity.
10. Browser refresh restores the session.
11. Logout invalidates the session.
12. Login response never exposes password hash.
13. Catalog endpoints remain publicly accessible without login.
14. Session cookie is HttpOnly and configured appropriately.
15. CSRF behavior is tested and documented.

## Catalog

1. C01 live featured products.
2. C02 search/facets/filters/sorting/pagination.
3. C03 model detail.
4. C17 empty compare.
5. C17 add/remove products.
6. C17 maximum four products.
7. C17 refresh persistence.
8. C17 live detail retrieval.
9. No fake product images/specifications/ratings.

## Demo business workflows

1. Cart add/remove/quantity/total.
2. Demo checkout validation.
3. Demo payment success/failure.
4. Demo order creation in browser storage only.
5. Order result/history/detail consistency.
6. Admin demo order listing and filters.
7. Customer demo lookup.
8. Admin/Sales/Customer identity shown correctly.
9. Demo data reset behavior.

## Visual and responsive

All 22 routes must use V2 styles and correct brand identity.

Check desktop, tablet, and mobile.

No old dark theme should appear on the 22 approved routes.

No OBSIDIAN branding.

No overflow/clipping.

No tiny unreadable text.

Correct Vietnamese diacritics.

Loading, empty, error, success, disabled and validation states should be understandable.

---

# 14. RUN AND TEST INSTRUCTIONS TO REPORT

At completion, give exact commands for the user's Windows environment.

Expected frontend command from repository root:

```powershell
npm run dev --workspace=frontend
```

The Vite port may be 5173 or another port if occupied. Report the actual port from terminal output.

The Java API is expected to use local port 8080 according to the existing Vite proxy default, but inspect the current configuration and report the actual datasource and server settings without exposing passwords.

Explain which terminals must remain running:

- Java backend terminal.
- Frontend Vite terminal.

Do not claim the website is fully live if the Java server/database is unavailable.

---

# 15. FINAL REPORT REQUIRED

At the end, provide a concise but complete report:

1. **22-screen status:** each screen migrated or any remaining blocker.
2. **V2 routing:** confirmation that the approved routes now render V2 as the primary UI.
3. **Shared components:** customer/admin shells and shared design system.
4. **Database seed:** exact SQL file path, verified database name, local host verification, accounts inserted/already existed, role mapping, status, segment. Never print hashes or database password.
5. **Authentication:** endpoints, session behavior, cookie/CSRF configuration, login/logout tests.
6. **Demo workflows:** which records are browser-local and clearly labeled.
7. **Live catalog:** which screens read Java/PostgreSQL data.
8. **Files created/modified:** distinguish new work from pre-existing modifications.
9. **Tests:** exact typecheck/build/unit/integration/browser results; never claim tests that were not run.
10. **Limitations:** registration, JWT, OTP, password reset, real order APIs, CRUD APIs, payment gateway, Build-PC remain postponed/unimplemented.
11. **Windows run instructions:** exact commands and URLs.
12. **Git status:** confirm existing branch and user changes were preserved; no commit unless explicitly requested.

The completed application must open at `/customer/home` using the V2 light design. Customer login and staff login must authenticate the three real demo database accounts. No frontend-only role-switching substitute is acceptable.

**Begin implementation now, reading this file directly from the workspace. Do not ask the user to reattach or paste this instruction. Follow the ordered batches and safety constraints above.**
