# Authentication and Authorization Design Decisions — Phase 3B.0

## Status and scope

This is a design review only. No authentication API, security configuration,
dependency, frontend code, schema, migration, seed, or database data was changed.
The existing Node.js backend remains a reference; no Java authentication or
user API currently exists.

The proposed public paths follow the requested `/api/auth/*` and `/api/me`
contracts. This is a design decision, not an implemented API. No migration or
seed SQL should be run as part of Phase 3B.1.

## Sources inspected

- [Java API migration inventory](java-api-migration-inventory.md), including
  current API status, schema inventory, phase plan, and guest-cart notes.
- [REST API proposal](../system-design/rest-api.md) and
  [architecture proposal](../system-design/architecture.md).
- Root [35-table MySQL schema](../../schema_35_tables.sql).
- PostgreSQL DDL-only
  [initial migration](../../backend/prisma/migrations/20261102000000_initial/migration.sql).
- Node [Prisma schema](../../backend/prisma/schema.prisma) and
  [Prisma seed source](../../backend/prisma/seed.ts).
- Java Spring Boot controllers, JDBC configuration, CORS configuration,
  exception response, application properties, and Maven dependencies.
- React [router](../../frontend/src/App.tsx), [screen map](../../frontend/src/pages.ts),
  [legacy renderer](../../frontend/src/LegacyScreen.tsx), app entry point,
  API clients, shared legacy interactions, and customer register/login/cart/
  checkout HTML screens.

The agent environment did not expose `TEST_DATABASE_URL` or another database
connection, and `psql` was unavailable. No live database query was made. Role
codes below are the exact codes declared by the SQL and Prisma seed sources,
not a claim that those rows currently exist in `pc_builder_store_it`.

## Existing implementation and schema findings

### Current implementation

- The migration inventory says authentication/user APIs do not exist in either
  the Java branch or the Node reference. The Java backend currently has health
  and catalog controllers only; no Spring Security dependency or authentication
  filter/configuration is present.
- The Java CORS configuration currently sets `allowCredentials(false)`. The
  Java error response currently has `{ "error": { "code": "...", "message":
  "..." } }`; it does not yet include `details` or `requestId`.
- Node app logging redacts password fields, but the inspected Node routes do not
  implement authentication or password verification. There is no evidenced
  legacy password-hash format to preserve.

### `roles` and `users`

The original MySQL schema and PostgreSQL migration/Prisma schema agree on these
columns:

| Table | Columns and constraints |
|---|---|
| `roles` | `role_id`, `role_code` (`VARCHAR(40)`, unique), `role_name` (`VARCHAR(100)`), nullable `description` (`VARCHAR(500)`). |
| `users` | `user_id`, required `role_id`, `full_name` (`VARCHAR(160)`), `email` (`VARCHAR(254)`, unique), `password_hash` (`VARCHAR(255)`), nullable `phone` (`VARCHAR(40)`), `customer_segment` (`VARCHAR(20)`, default `UNSPECIFIED`), `account_status` (`VARCHAR(20)`, default `ACTIVE`), and created/updated timestamps. `role_id` references `roles.role_id` with delete restricted. |

- In the MySQL schema, both identifiers are `BIGINT UNSIGNED AUTO_INCREMENT`.
  The PostgreSQL migration represents them as `NUMERIC(20,0)` and constrains
  values to the unsigned 64-bit range. Java/API code must not assume a signed
  `long` can hold every valid identifier. Keep IDs as decimal strings at the
  JSON boundary and use `BigDecimal`/exact decimal JDBC handling internally.
- The schema-level seed insert and `backend/prisma/seed.ts` both declare these
  role codes and descriptions:

  | Code | Seed name | Seed description |
  |---|---|---|
  | `CUSTOMER` | Customer | Browses products, buys items and builds PC configurations |
  | `SALES` | Sales Staff | Handles orders and customer assistance |
  | `ADMIN` | Administrator | Manages products, users, rules and system configuration |

- The PostgreSQL migration header says it was ported without seed statements.
  The inspected Prisma seed inserts/upserts roles but does not insert user
  accounts. Therefore, the role codes are seed-defined; live role rows and any
  existing user rows remain unverified. Phase 3B.1 must look roles up by code
  and fail explicitly if required roles are absent. It must not silently create
  roles or assign a hard-coded numeric role ID.
- The `customer_segment` check allows exactly `IT`, `NON_IT`, and
  `UNSPECIFIED`; the default is `UNSPECIFIED`. Registration must not accept a
  browser-selected role or segment. Start new customer accounts at the
  database default segment unless a separately approved business rule says
  otherwise.
- `account_status` is a string with default `ACTIVE`; there is no database
  enum/check constraint defining all possible status codes. Authentication
  should allow only the explicitly approved active value `ACTIVE` and fail
  closed for every other or unknown value. The full status lifecycle needs
  product-owner confirmation.
- `password_hash` is only a `VARCHAR(255)`. Neither the schema, migration, nor
  seed source specifies a hash algorithm or contains a seeded user hash.
  Compatibility with existing stored hashes cannot be established from the
  inspected source. The repository has no password hashing/verifying utility,
  and the seed does not create users. This is not proof that the live database
  has no existing accounts or hashes.
- `uq_users_email` is a database unique constraint. In the PostgreSQL
  migration, the column uses the nondeterministic ICU collation
  `mysql_0900_ai_ci` (`und-u-ks-level1`), intended to approximate
  case-/accent-insensitive MySQL comparison. Registration and login need one
  documented email normalization/comparison policy consistent with that
  constraint. Keep the database constraint as the concurrency-safe final
  duplicate check and map its unique violation to the public conflict response.

### Existing guest-order schema constraints

- `carts` has nullable `user_id`, nullable unique `guest_token`, and a check
  requiring at least one of them. `cart_items` belong to a cart.
- `orders.user_id` is nullable, but `orders` has no guest-token, session,
  verification-token, or guest-owner column. The customer contact/address
  fields are order data, not proof of ownership.
- Thus guest carts can be authorized by possession of a strong guest
  credential stored in the existing `carts.guest_token` field. A guest order
  can be created with `user_id = NULL`, but the schema cannot persist a
  revocable guest-order credential. A short-lived, signed, order-specific
  read-only capability can authorize a guest on the same browser without a new
  table; this is replayable until expiry and cannot be recovered after cookie
  loss. Longer-term recovery requires an approved external email capability
  flow or schema change. Email address or a predictable order number must not
  be used as authentication.

## Authentication approach comparison

| Approach | Expiration and logout | Revocation and schema fit | CSRF / XSS | CORS and React |
|---|---|---|---|---|
| JWT bearer token in `Authorization` | Short access-token expiry is required. Logout can discard the browser's copy but cannot invalidate a copied, already-issued token. Refresh-token logout/revocation needs additional state. | A short-lived stateless access token fits without a session table, but immediate token revocation is unavailable. Rechecking the active user and role from `users`/`roles` on each request can enforce account disablement and role changes. | Authorization headers are not automatically attached cross-site, so conventional CSRF exposure is lower. Storing bearer tokens in `localStorage`/`sessionStorage` makes them readable to injected JavaScript; keeping them only in memory reduces persistence but not XSS access. | React must attach the token to API requests and handle expiry. Cross-origin API requires explicit CORS. |
| HttpOnly secure cookie | A server-side opaque session cookie normally needs a server-side session store for expiry, logout, and revocation. A signed JWT placed in a cookie is stateless, but clearing the cookie only removes the browser copy. | A stateful session is not supportable across restarts/instances using only current schema. A short-lived signed cookie JWT can fit, with the same revocation limitation as bearer JWTs. | `HttpOnly` prevents JavaScript from reading the authentication credential, reducing token exfiltration risk. The browser sends cookies automatically, so mutations need CSRF protection (SameSite plus a CSRF token and Origin checks). XSS can still make authenticated same-origin requests. | Natural browser integration; React calls `/api/me` to discover the principal and never handles the auth token. Credentialed cross-origin requests require explicit CORS origins and `credentials: include`. |
| Access token plus refresh token | Gives short access expiry and longer login continuity only when refresh rotation, expiry, logout, and reuse detection are correctly implemented. | Reliable refresh revocation/rotation and replay detection require persistent per-token/session state. There is no token/session table in the fixed 35-table schema. Stateless refresh tokens cannot provide equivalent single-device logout or theft detection. | If refresh is in a cookie, CSRF defenses still apply; if in JS storage, theft risk increases. Access tokens in memory can reduce exposure but do not solve refresh revocation. | More client complexity: refresh races, retries, rotation, and logout synchronization across tabs/devices. |

### Recommendation

For the first authentication phase, use a short-lived, signed access JWT carried
only in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie, with no refresh token.
Use HTTPS outside local development, a host-only cookie scoped to `/api`, and
an initial fixed expiration of about 15 minutes. This is a starting policy to
approve, not an existing project setting. There is no idle timeout or sliding
renewal without state. Once it expires, the customer signs in again.

On each authenticated request, validate signature, issuer, audience, and
expiry, then load the current user and role by the token's string `sub` ID.
Require `account_status = 'ACTIVE'`; authorize using the current `role_code`,
not a stale role embedded in the token. This adds a JDBC lookup but makes
account disablement and role changes effective on the next request.

Use a separate CSRF token for unsafe methods, paired with a custom request
header and strict `Origin` checking; do not rely on `SameSite` alone. Logout
clears the auth and CSRF cookies. It cannot revoke a copied stateless JWT:
that copy may remain usable until its short expiry, unless the account is
disabled. Document this limitation to users/operators.

Prefer a same-origin `/api` reverse proxy in production and the Vite dev proxy
in development. Do not expose the JWT to React, browser storage, URLs, logs, or
error responses. If deployment requires cross-origin API calls, allow only
explicit trusted origins, enable credentials only for those origins, and use
`credentials: "include"`; never combine credentialed CORS with wildcard
origins.

An opaque database-backed login session would be preferable for immediate
revocation, but is not available under the no-schema-change constraint. Do not
fake persistence using process memory or claim that cookie deletion revokes
the JWT.

## API-wide DTO and error conventions

- JSON request/response, UTF-8. Never accept/return `role_id`, `user_id` as a
  caller-selected identity, `password_hash`, account status, or authentication
  tokens in JSON fields.
- Return all unsigned numeric IDs as strings. Never serialize them through a
  JavaScript-unsafe numeric type.
- Use the established error envelope, extended consistently for validation:

  ```json
  {
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "Request data is invalid.",
      "details": [{ "field": "email", "reason": "invalid_format" }],
      "requestId": "..."
    }
  }
  ```

- `details` and `requestId` may be omitted when not applicable. Do not reveal
  whether an email exists on login, return SQL/stack traces, or include
  credentials, password hashes, or cookie values. The current Java error DTO
  is smaller; Phase 3B.1 must deliberately align its implementation with this
  contract rather than assuming these fields already exist.

## Endpoint contracts

The common user summary is:

```json
{
  "id": "18446744073709551615",
  "fullName": "Example Customer",
  "email": "customer@example.test",
  "phone": null,
  "role": "CUSTOMER",
  "accountStatus": "ACTIVE"
}
```

`id` is a string. Never include `password_hash` or `customer_segment` in this
summary. Authentication is cookie-based as described above; cookies are
transport/security metadata and are not DTO fields.

| Endpoint | Request and response DTO | Validation and status codes | Tables | Authentication and authorization |
|---|---|---|---|---|
| `POST /api/auth/register` | Request: `{ "fullName": "...", "email": "...", "phone": "...", "password": "..." }`. Response `201`: `{ "data": { "user": UserSummary } }`. Registration does not return a password/token and does not automatically log in; client proceeds to login. | Trim and require nonblank `fullName` (max 160), validate email syntax/max 254 and chosen normalization policy, validate optional phone/max 40 (the current legacy form marks it required; align that UX before implementation), and enforce an approved password policy (proposed 12–128 characters, no silent truncation). `400` malformed/validation, `409` duplicate email, `429` rate limit, generic `500/503` operational failure. | Read `roles` by `role_code='CUSTOMER'`; insert `users` with that role, password hash, and DB defaults for `customer_segment` and `account_status`. | Public. Role and account fields are server-controlled. If the `CUSTOMER` seed row is missing, fail explicitly; do not create a role or choose an ID fallback. |
| `POST /api/auth/login` | Request: `{ "email": "...", "password": "..." }`. Response `200`: `{ "data": { "user": UserSummary } }`; set the HttpOnly auth cookie and CSRF cookie in response headers. | Require syntactically valid bounded email and non-empty password. Do not trim or normalize the password. Return the same generic `401 INVALID_CREDENTIALS` for unknown email, bad password, and non-active account. `400` malformed request, `429` throttled, generic `500/503` operational failure. | Read `users` joined to `roles`; verify password hash and exact active status. | Public. No role selection. Apply rate limits per source and normalized account key; do not leak account existence. |
| `POST /api/auth/logout` | No body. Response `204 No Content`; expire auth and CSRF cookies with matching path/security attributes. | Idempotent cookie clearing; require valid CSRF/Origin checks when an auth cookie is present; return `403` for CSRF failure. Do not claim server-side revocation. | No write required. An optional `users` lookup is only needed if the implementation's request filter performs one. | Available to clear stale cookies even when already expired. A copied JWT remains valid until expiry or account disablement. |
| `GET /api/me` | No request body. Response `200`: `{ "data": { "user": UserSummary } }`. | `401` if no/invalid/expired token, unknown user, or non-active account. `500/503` for a database/service failure, without treating it as anonymous success. | Read current `users` and `roles`. | Authenticated active user of any of the three roles; returns only the caller represented by the verified token. |
| `PATCH /api/me` | Request permits only `{ "fullName": "...", "phone": "..." }`; at least one field. Response `200`: `{ "data": { "user": UserSummary } }`. | Reject unknown/immutable fields (`role`, IDs, email, password, segment, status) with `400`. Validate name max 160 and phone max 40; recommend `phone: null` clears the optional field. `401` unauthenticated, expired, unknown, or inactive principal; `403` for a separate authorization denial; `400` validation; `500/503` operational failure. | Update/read only the current row in `users`; join `roles` for response. | Any authenticated active user can update their own allowed profile fields only. Never accept a target user ID in the body/path. |

### Registration, password, and account lifecycle notes

- `password_hash` has no evidenced legacy format. Recommend Argon2id with a
  unique cryptographically generated salt and an encoded PHC-style value that
  includes algorithm/version/parameters/salt/hash. Use a vetted Java
  implementation (for example Spring Security's Argon2 encoder with its
  required provider), benchmark parameters on the deployment hardware, and
  confirm the complete encoded value fits `VARCHAR(255)`; never truncate it.
  A starting configuration to benchmark is 64 MiB memory, 3 iterations, 1
  lane, a 16-byte salt, and a 32-byte output. These are policy recommendations,
  not dependencies or configured source behavior.
- Before enabling login, inspect existing stored hash prefixes/lengths
  read-only under approved database access. If existing accounts use a
  recognized format, support it explicitly and rehash on successful login.
  Unknown/plaintext formats must never fall back to plaintext comparison. If
  compatibility cannot be safely implemented, password reset/re-enrollment
  policy is a launch blocker; the current schema has no reset-token storage.
- Registration currently has no `email_verified` field or verification-token
  persistence. The proposal above creates the account with the database default
  `ACTIVE`; approving unverified active accounts is a product/security decision
  that must be resolved before launch. Do not imply that the legacy UI's
  “email will be verified” copy is implemented.
- No password-change, reset, OTP, email-verification, or account-deletion
  endpoint is included. Each needs its own abuse controls and a persistence/
  delivery design compatible with the schema constraint.
- The legacy login UI's phone-or-email identifier, OTP option, password-reset
  link, and “remember me” checkbox are not part of this first contract. Start
  with email/password and the fixed short-lived cookie; do not make those
  controls appear functional until their policies, delivery, and persistence
  are designed.
- Unique email races must be handled through the database constraint in a
  transaction. Do not rely only on a prior `SELECT`.

### Guest checkout and identity ownership

- For an authenticated checkout, derive `user_id` exclusively from the
  verified server principal and ignore/reject any browser-supplied user ID.
- For a guest cart, the server generates a high-entropy random credential,
  for example 32 random bytes encoded Base64url, and returns it only in a
  `Secure`, `HttpOnly`, `SameSite=Lax` cookie. Store a one-way SHA-256 digest
  (64 hex characters, within `guest_token VARCHAR(128)`) in the existing cart
  row, and compare the digest of the cookie credential on each cart request.
  Treat the cookie as a bearer credential; never accept a browser-chosen
  `guest_token`, `cart_id`, or `user_id` as proof of ownership. On account
  login/cart merge, transactionally attach only the cookie-owned cart to the
  authenticated `user_id` and clear its guest token.
- Guest checkout accepts customer name/email/phone and shipping fields, but
  the server sets `orders.user_id = NULL`, resolves items/prices/stock from
  the owned cart, and writes the order and item snapshots transactionally.
  Browser-provided prices, totals, stock, role, or user ID are not trusted.
- The existing `orders` table does not bind guest orders to `guest_token`.
  Recommend a separate, signed, short-lived guest-order capability issued only
  by the server after a successful guest order. A separately approved
  `GET /api/guest/orders/{orderNumber}` endpoint would receive it from an
  `HttpOnly`, `Secure`, `SameSite=Lax` cookie scoped to that order's read-only
  endpoint. Include the exact order ID, purpose/audience, expiry (proposed
  24 hours), and a random identifier in signed claims. The endpoint must verify
  the signature/expiry and require the claimed ID to match the requested order
  before returning only minimum receipt/status fields. The browser must not
  choose the claim or mint a capability by sending an order number/email.
  Without a persistence table, the capability is not one-time or individually
  revocable and cannot be recovered if its cookie is lost; it grants bearer
  access until expiry. Do not expose broader order history, shipping PII, or
  mutating operations through it. Approval is required before adding this
  endpoint; email-based recovery would need an approved delivery provider and
  still requires a design for one-time use.

## Role-permission matrix

The three codes below are from the SQL role seed and Node Prisma seed. The
database role rows must be confirmed/provisioned separately; role descriptions
are not a permission matrix. Until explicit policy is implemented, deny by
default.

| Capability | `CUSTOMER` | `SALES` | `ADMIN` |
|---|---|---|---|
| Public active catalog browse | Allow | Allow | Allow |
| Register self as customer | Allow; server assigns `CUSTOMER` | Deny; staff accounts are provisioned through approved operations | Deny; never permit public self-registration as admin |
| Login and own `GET/PATCH /api/me` | Allow; own record only | Allow; own record only | Allow; own record only |
| Own authenticated cart/order/build/review actions when later implemented | Allow; ownership-filter every query | No customer impersonation; any support access needs a separate, least-privilege policy | No implicit access to customer data solely from role; explicit operational endpoint/purpose |
| Guest cart/checkout | Allow without login, using guest credential; no browser-selected user ID | Allow as a shopper only if product policy permits; guest is not granted staff authority | Same as any shopper; admin role does not bypass checkout ownership |
| Order support and status/tracking operations | Own permitted customer actions only | Allow only approved order-support fields/status transitions; no role/user administration | Allow; high-impact actions need narrowly scoped rules |
| Catalog, offer, category, brand, compatibility-rule writes | Deny | Deny unless separately approved granular permission is added | Allow, with input/state validation |
| User lookup, account status, role assignment | Deny | Deny | Allow only approved user/staff administration; no self-escalation |
| Create/manage roles or grant `ADMIN` | Deny | Deny | Reserved for tightly controlled admin operation; schema has no permission matrix/audit trail |

The schema has only one role per user and no permission/role-grant history.
`SALES` must not inherit `ADMIN` merely because both are staff. There are no
runtime authorization rules today; every protected API must enforce server-side
role and ownership checks, not just hide frontend controls.

## Security considerations

1. **Token integrity and key management:** pin token issuer/audience and
   accepted algorithms; validate `exp`, `nbf` if used, and `sub`; use a strong
   signing key from a secret manager/environment, never source control. Plan
   key rotation and prevent algorithm/key-confusion attacks.
2. **Short lifetime and revocation:** use a fixed short access-token lifetime
   and re-read active user/role each request. Cookie clearing is not token
   revocation. Disabling an account blocks requests on the next DB check, but
   standalone logout cannot invalidate a stolen token before expiry.
3. **Cookie and CSRF:** `HttpOnly; Secure; SameSite=Lax; Path=/api`, no broad
   `Domain`; set matching attributes on deletion. For state-changing requests,
   require a CSRF header whose token is bound/signed for the authenticated
   token, validate `Origin`, and reject unsafe content types. Protect login
   against login-CSRF as well. `SameSite` is defense-in-depth, not the only
   check.
4. **CORS and origins:** prefer same-origin deployment. If credentialed
   cross-origin calls are needed, explicitly allow the exact web origin,
   credentials, and required headers/methods; never wildcard. Revisit the
   current Java `allowCredentials(false)` configuration only in implementation.
5. **XSS and browser storage:** do not expose auth JWT to JavaScript or put it
   in local/session storage, URLs, analytics, or console logs. HttpOnly does
   not stop injected JavaScript from making same-origin requests, so prevent
   XSS and keep legacy inline script behavior constrained.
6. **Password handling:** hash with an approved password-hashing algorithm,
   use constant-time verifier behavior provided by the library, never log
   request bodies/passwords, throttle login/register, and return generic login
   errors. Apply a request-size limit and never silently truncate passwords.
7. **Database and SQL:** use Spring JDBC with parameterized SQL. Resolve role
   by code. Map unique email violations deliberately; do not expose database
   errors. Use a transaction for registration/profile updates.
8. **Account state and authorization:** fail closed on unknown status or role;
   load current status/role, enforce role and ownership in service/repository
   access paths, and deny by default. UI route guards are not security controls.
9. **Sensitive-data minimization:** never return/store password hashes in DTOs,
   logs, telemetry, browser state, or errors. Restrict staff access to customer
   PII. No audit table exists for privileged changes.
10. **Abuse and lifecycle:** rate-limit and monitor credential stuffing,
    duplicate registration, and enumeration attempts. No schema-backed lockout,
    MFA, password reset, email verification, or session revocation exists.
    Avoid indefinite lockouts that attackers can trigger.

## Frontend integration plan

### Observed frontend behavior

- React Router in `App.tsx` maps the listed customer, admin, and build-PC
  screens directly to `LegacyScreen`; there are currently no protected-route
  wrappers or authentication state provider.
- `pages.ts` maps `/customer/register`, `/customer/login`, `/admin/login`,
  account, cart, checkout, and order screens to legacy HTML. `LegacyScreen`
  fetches and injects that markup, executes legacy page scripts, and mounts the
  React catalog page only for the catalog routes.
- The register page asks for name/email/phone/password/confirmation/terms; the
  login page also presents phone/OTP and “remember me” concepts. These are UI
  affordances, not implemented services. The shared legacy interaction handler
  intercepts `data-requires-backend` actions/forms and shows a pending-feature
  message; logout is likewise pending. The checkout markup has address-book
  UI, but the schema has no address book.
- The API base defaults to same-origin `/api`; the current health/catalog
  clients do not implement auth state or credentials/CSRF handling.

### Integration sequence for a later phase

1. Add a React auth provider with `loading | anonymous | authenticated` states.
   On app boot, call `GET /api/me`; treat `401` as anonymous and surface network
   or server failures separately rather than silently treating them as logged
   out. Refresh state after login, logout, and profile update. Keep user DTO and
   CSRF token in memory; never store the JWT.
2. Implement login/register routes as React-owned forms, preserving existing
   HTML styling/assets by extracting or translating markup without changing
   the legacy renderer globally. Connect the legacy route paths to those
   components. Do not let the generic `data-requires-backend` handler swallow
   real auth form submissions.
3. Use server `GET /api/me` and backend authorization for access decisions.
   Add customer/admin route guards only where intended; preserve public
   catalog/product/compare pages and guest cart/checkout. A React redirect or
   hidden admin link is only UX, never authorization.
4. On login, send credentials, accept the HttpOnly cookie, store only the
   response user/CSRF value in memory, and navigate to a validated same-origin
   `returnTo` path. Do not honor arbitrary external redirect URLs. On register,
   show validation/duplicate-email errors safely and route to login because
   the proposed registration does not create an authenticated session.
5. On logout, call the API with CSRF protection, clear in-memory user state,
   then navigate to a public page. Handle expired sessions consistently;
   do not claim other-device/global logout.
6. Guest checkout remains accessible without an account. The server manages
   guest-cart cookies and totals; React does not send an identity or decide
   cart ownership. Keep account-only routes protected. Do not enable guest
   order retrieval until the order-scoped capability policy is approved and
   implemented.
7. Keep existing product/catalog screens and React catalog data flow unchanged.
   Replace legacy account forms incrementally, route by route, with contract
   tests so the 30-screen compatibility renderer is not broadly disrupted.
8. For same-origin deployment use the existing `/api` base with an explicit
   Vite proxy in development. If API is cross-origin, use explicit CORS
   credentials and fetch `credentials: "include"` plus CSRF headers. Never
   move auth credentials into `VITE_*` values.

## Known schema limitations and unresolved decisions

- There is no session, refresh-token, revocation, OTP, password-reset,
  email-verification, MFA, permission, audit, address-book, or guest-order
  ownership table. The schema must remain unchanged for this phase; no design
  below invents one.
- Live `roles` and `users` rows were not queried. The source-defined role codes
  are known, but whether `CUSTOMER`, `SALES`, and `ADMIN` currently exist in
  the disposable database is unresolved. The migration has no seed inserts.
- Existing user hashes (if any), hash algorithm, and whether account emails
  are verified are unknown. No user rows are created by the inspected seed.
- The only `account_status` value found as a source literal is the schema
  default `ACTIVE`. The column is not constrained to an enum and source code
  does not implement status handling. Any other values in live data are
  unknown; the recommendation is to deny login for every value except exact
  `ACTIVE`.
- Approve email normalization/case behavior consistent with the ICU unique
  constraint; approve password minimum/maximum and password-hash parameters.
- Decide whether unverified self-registration may create an `ACTIVE` account;
  the schema cannot record email verification.
- Decide whether registration phone is required. The database allows null,
  while the current registration screen marks it required.
- Decide terms/privacy consent evidence. The registration screen requires a
  checkbox, but `users` has no consent timestamp/version fields.
- Decide if customer profile email changes or password changes are in scope;
  both need verification/reauthentication flows not in the requested contracts.
- Decide exact Sales permissions, especially PII visibility, order transitions,
  and escalation boundaries. Role descriptions are not sufficient policy.
- Decide account lockout/rate-limit storage, global logout, remember-me policy,
  and approval for the short-lived guest-order capability. Current tables
  cannot persist those guarantees.
- Decide whether admin role assignment is allowed without audit/approval
  controls; the schema cannot provide an audit trail.
- Decide session signing key management, cookie domain/origin topology, and
  final access-token lifetime before deployment.

## Final Decisions and Remaining Assumptions

Each item is explicitly classified. “Confirmed from source” describes code or
DDL evidence, not an implemented authentication behavior.

### CONFIRMED FROM SOURCE

- The schema declares `roles.role_code` unique and the SQL/Prisma seed
  declares exactly `CUSTOMER`, `SALES`, and `ADMIN`. `backend/prisma/seed.ts`
  inserts roles only; it has no `INSERT INTO users`. The PostgreSQL migration
  is DDL-only, and live role/user rows were not queried in this review.
- `users.password_hash` is a required `VARCHAR(255)`. No inspected Java or
  Node source implements password hashing, hash verification, or a legacy
  hash format. This does not establish that the database has no user rows.
- `users.account_status` is required with default `ACTIVE`; it has no
  enum/check constraint. `ACTIVE` is the only account-status literal found in
  the inspected schema/source. There is no source-code authentication logic
  that allows or denies any account status.
- User IDs are MySQL `BIGINT UNSIGNED` and PostgreSQL `NUMERIC(20,0)` with an
  unsigned 64-bit range check. Email is unique by `uq_users_email`.
  `customer_segment` is constrained to `IT`, `NON_IT`, or `UNSPECIFIED` and
  defaults to `UNSPECIFIED`.
- `carts.guest_token` is nullable `VARCHAR(128)` with a unique constraint;
  `user_id` is nullable and at least one owner field must be present.
  `orders.user_id` is nullable; orders have no guest-token/capability field.
- Neither Java nor Node has registration/login endpoints or role assignment
  logic. The Java CORS config currently disables credentialed CORS.
- The legacy register screen requires name, email, phone, password,
  confirmation, and terms checkbox. The login screen presents email-or-phone,
  password, OTP, password-reset, and “remember me” affordances. Shared legacy
  interactions intercept backend-marked actions and show a pending-feature
  message; these screens do not prove authentication works.

### RECOMMENDED PROJECT POLICY

- Allow public self-registration only as `CUSTOMER`; resolve the role by code
  from `roles`, never accept role/role ID from the client, and fail closed if
  the required role row is missing.
- Permit `SALES` and `ADMIN` creation only through a separately authorized
  admin-provisioning process. Do not expose public staff/admin registration.
  Until a protected staff-provisioning endpoint and audit policy are approved,
  provision staff outside the public registration API.
- Use Argon2id through a vetted Java password encoder, with unique random
  salts, versioned self-describing encoded hashes, benchmarked work parameters,
  and a complete encoded value verified to fit 255 characters. A suggested
  starting point is 64 MiB/3 iterations/1 lane/16-byte salt/32-byte output;
  benchmark and review before deployment. Never store plaintext or silently
  fall back to plaintext verification.
- Permit login only when `account_status` is exactly `ACTIVE`. Reject
  non-active, null, and unrecognized statuses with the same generic
  `401 INVALID_CREDENTIALS` used for an unknown account or wrong password.
  Apply the same active-status check on every authenticated request so a
  disabled account is denied at the next request.
- For the capstone/demo scope, recommend **not requiring email verification**
  for initial registration, because no email-delivery service or verification
  persistence exists and it is not necessary to demonstrate the core
  authentication flow. Do not tell users their email is verified. For a
  public production commerce service, require verification before account
  privileges/order-history access; that cannot be implemented reliably under
  the fixed schema without an approved external capability-delivery design or
  schema change.
- Use a signed access JWT only in an `HttpOnly`, `Secure` (HTTPS deployments),
  `SameSite=Lax` cookie, with a fixed **15-minute** expiry, host-only scope,
  and no refresh token. Clearing the cookie logs out that browser, but a copied
  JWT remains usable until expiry or account disablement. Do not advertise
  global/device logout.
- Require CSRF protection for cookie-authenticated mutations: validate
  `Origin`, use a CSRF token in a custom header, and reject unsafe cross-site
  fetches. Login/registration also need Origin/SameSite defenses against
  login-CSRF. Issue a readable CSRF token separately from the HttpOnly auth
  credential (for example via a narrowly scoped bootstrap response); confirm
  whether an additional CSRF bootstrap endpoint is in scope before coding.
- Prefer same-origin deployment. If cross-origin is unavoidable, allow only
  explicit trusted origins, enable credentials only for them, and configure
  React fetch calls to include credentials. Never use wildcard CORS with
  credentials. The current Java CORS setting must be intentionally changed
  only as part of approved implementation.
- Rate-limit register/login at the edge/API gateway and by source plus
  normalized account key; use generic login errors and constant-time password
  verification (including a dummy hash verification for unknown emails to
  reduce timing-based enumeration). Do not rely on process-local counters as a
  multi-instance production control; no lockout/rate-limit persistence exists
  in the schema.
- For guest carts, issue a server-generated 256-bit random credential in a
  secure HttpOnly cookie; persist only its SHA-256 digest in `carts.guest_token`.
  Authenticate cart access by comparing the digest of the cookie value. Never
  trust a browser-supplied `user_id`, `cart_id`, or guest token. For guest
  order receipt retrieval, issue a separate order-scoped, signed, read-only
  capability cookie after order creation; expire it after 24 hours and return
  only minimal order receipt/status data. It is bearer access and remains
  replayable until expiry; lost-cookie recovery and one-time revocation are not
  available.
- Keep login email-only in the initial contract; phone login, OTP, password
  reset, remember-me, email change, and password change are not implemented
  and require separate contracts/persistence/delivery decisions.

### REQUIRES TEACHER/OWNER APPROVAL

- Confirm the capstone email-verification policy and accept the residual risk
  of an active account with an unverified/mistyped email. If verification is
  required, approve a compatible design; do not silently add a schema table.
- Approve the exact password policy (recommend at least 12 characters, maximum
  128 characters without truncation), Argon2id parameters after benchmarking,
  and handling for any pre-existing hashes discovered in the live database.
- Approve email normalization/case behavior consistent with the database's
  nondeterministic unique collation, and whether duplicate registration may
  return `409` (which reveals that the email is registered) or needs a
  non-enumerating response policy.
- Approve optional registration phone despite the current form marking it
  required; otherwise keep it required and align API/UI contract. Confirm
  privacy/terms consent evidence: current checkbox has no corresponding schema
  field, so the system cannot persist proof of acceptance.
- Approve the account lifecycle beyond `ACTIVE` (such as suspended/disabled)
  and the administrative procedure for changing status. No other status values
  are defined by inspected source.
- Approve fine-grained `SALES` permissions, PII visibility, admin creation and
  role assignment controls, plus compensating audit controls because the
  schema has no audit table.
- Approve the 15-minute JWT lifetime, cookie domain/origin topology, signing
  key storage/rotation, and acceptance that logout does not revoke a copied
  stateless JWT.
- Approve the proposed 24-hour guest-order capability endpoint and the limited
  same-browser retrieval model. If that model is insufficient, approve an
  external email delivery/one-time capability design or a schema change in a
  separately scoped task.
- Approve whether an anonymous CSRF-token bootstrap endpoint is allowed, and
  the final exact error envelope/request-ID convention for auth errors.

### BLOCKER BEFORE IMPLEMENTATION

- Perform a read-only inventory of existing `users` rows and hash prefixes
  under approved database access; no user/hash rows were inspected here. Decide
  an explicit compatible verifier/rehash path or approved account
  reset/re-enrollment plan before accepting logins.
- Verify that the required seed-defined role rows actually exist in the target
  database. The live DB was not accessible from this review; registration and
  staff provisioning must not start with missing/assumed role IDs.
- Obtain decisions above for email verification, password/hash migration,
  phone/consent behavior, account statuses, Sales/admin permissions, token
  revocation expectations, guest-order retrieval, and CSRF bootstrap.
- Select the approved Java password/JWT implementation and secret-management
  mechanism before adding dependencies or accepting credentials. Verify the
  chosen encoded Argon2id hash fits `VARCHAR(255)`.
- Define how rate limiting is enforced in the actual deployment and ensure
  HTTPS, exact CORS origins, cookie flags, CSRF, and signing-key rotation are
  testable in the target environment.

## Phase 3B.1 implementation tasks

This checklist is a future plan only; Phase 3B.1 was not started:

1. Obtain approval for all items marked `REQUIRES TEACHER/OWNER APPROVAL` and
   clear every `BLOCKER BEFORE IMPLEMENTATION`.
2. Read-only inspect existing role rows and password-hash formats; do not run
   seed or migration SQL.
3. Implement approved Argon2id/JWT/CSRF/cookie/rate-limit configuration and
   parameterized JDBC auth/profile services with exact numeric IDs.
4. Implement the five approved endpoints with validation, generic errors,
   CUSTOMER-only public registration, and fail-closed account/role checks.
5. Test unit/API behavior and PostgreSQL integration against the unchanged
   schema, including duplicate email, hash compatibility, cookie/CSRF,
   account statuses, authorization, and ownership.
6. Integrate React auth state and replace only the required legacy auth
   interactions; preserve public catalog and guest checkout behavior.
7. Review deployment security and the documented logout/guest-order residual
   risks before release.

No Phase 3B.1 code, database operation, dependency change, commit, or push is
authorized by this design review.
