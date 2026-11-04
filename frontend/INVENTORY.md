# PC Builder Store — Frontend inventory

## Current implementation

- Customer screens: 12 (C01-C08, C10-C12, C17).
- Administration screens: 10 (A01-A05, A07-A10, A12).
- Build-PC screens: 8 (B01-B08).
- Total migrated screen routes: 30.
- `B06_corrected_HTML_reference` is a reference snapshot, not an additional route.
- React + TypeScript + Vite route screens use the original HTML as a compatibility view so the approved layout and interactions remain intact.
- Shared Tailwind CSS is compiled at build time; production screens do not execute the Tailwind CDN scripts retained in the source HTML.

The original HTML/CSS/JavaScript source and `schema-35-tables-reference.sql` remain available for review. Screen data is still static/demo data and is not connected to the database.

## Route groups

Customer routes use `/customer/*`, administration routes use `/admin/*`, and Build-PC routes use `/build-pc/*`. All screen route definitions are in `src/pages.ts`.

The compatibility renderer preserves legacy page markup and scripts. It is an incremental migration boundary, not a claim that every screen has already been decomposed into individual JSX components.
