# PC Builder Store V2 — Stitch Design Reference Bundle

**Included screens:** 22 / 22 expected.

This package contains the 22 approved Stitch exports, arranged by customer and admin area. Each screen folder contains:

- `code.html` — Stitch-generated HTML reference. It is **not** a ready-to-use React component.
- `screen.png` — visual screenshot reference.
- `DESIGN.md` — Stitch design tokens and typography guidance.

## Important integration notes

1. Treat these exports as visual/source references. Rebuild them within the existing React + TypeScript + Vite app using the current route registry.
2. Do not replace the existing frontend wholesale and do not embed each static HTML page in an iframe.
3. Reuse shared React components for the customer shell, admin shell, product cards, form controls, tables, badges, and responsive behavior.
4. Preserve the Java Spring Boot + Spring JDBC backend, existing API contracts, PostgreSQL schema (35 tables), and the working catalog integration. Do not add JPA/Hibernate.
5. Existing live Java endpoints are catalog and health only. Other designed workflows are visual targets/prototypes until matching APIs are implemented. Do not fake backend connectivity.
6. Preserve guest checkout and simulated payment constraints. Build-PC remains Coming Soon.
7. Do not add wishlist, reviews, coupons, address book, real OTP/email verification, social login, payment gateway, shipment event tracking, RMA/repair history, AI recommendations, benchmark service, or compatibility engine.
8. Product prices and stock in the seed dataset are illustrative. Product image URLs are blank; use neutral category fallbacks rather than unrelated images.
9. Maintain actual role codes `ADMIN`, `SALES`, `CUSTOMER`; customer segments `IT`, `NON_IT`; product conditions `NEW`, `LIKE_NEW`, `USED`.
10. Keep all existing local user changes, untracked files, `.vscode/settings.json`, and unrelated project assets. Do not switch branches, reset, clean, or discard changes.

## Approved route manifest

See `SCREEN_MANIFEST.csv` for the complete route-to-export mapping. The scope is 22 approved screens: 12 customer route slots (C01, C02, C03, C04, C05, C06, C07, C08, C10, C11, C12, C17) and 10 admin route slots (A01, A02, A03, A04, A05, A07, A08, A09, A10, A12).

## External resources in Stitch HTML

Some generated `code.html` files reference Tailwind CDN, Google Fonts, and Material Symbols from external URLs. Check whether equivalent dependencies already exist in the app before adopting them. Prefer the project's existing build pipeline and dependencies over runtime CDN injection.
