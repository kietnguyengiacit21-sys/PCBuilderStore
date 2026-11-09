PC BUILDER STORE — IMPORT CATALOG V10

1) Extract this ZIP into the PCBuilderStore repository root and allow it to replace the existing files.
2) Open PowerShell in the repository root.
3) Run:

   .\scripts\import-catalog-v10.ps1

4) Enter the local PostgreSQL password for user postgres.
5) Wait until the Spring log prints "Development catalog import committed".
   The backend stays running after importing. Open a second PowerShell window at the repository root and run:

   npm run dev --workspace=frontend

6) Open http://localhost:5173/ . The existing frontend already calls /api/catalog; no CSV parsing or frontend rewiring is needed.

Stop the backend/import window with Ctrl+C when finished. For later normal development, use .\scripts\dev.ps1 (without the one-time import script).

The script targets only localhost PostgreSQL database pc_builder_store_dev, uses the existing 35-table schema, does not reset the database, and imports the CSV in apply mode. It does not commit or push Git changes.
