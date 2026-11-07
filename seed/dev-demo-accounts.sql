-- LOCAL DEVELOPMENT ONLY. Never run this seed against production or pc_builder_store_it.
-- Before execution, inspect any email conflicts and verify the active datasource and schema.
-- This transaction aborts rather than overwriting any account that is not an exact fixture.
BEGIN;

DO $$
DECLARE
    expected RECORD;
    existing RECORD;
BEGIN
    IF current_database() <> 'pc_builder_store_dev' THEN
        RAISE EXCEPTION 'Refusing demo-account seed: expected pc_builder_store_dev.';
    END IF;

    IF inet_client_addr() IS NOT NULL
       AND NOT (
           inet_client_addr() <<= '127.0.0.0/8'::cidr
           OR inet_client_addr() = '::1'::inet
       ) THEN
        RAISE EXCEPTION 'Refusing demo-account seed: connection is not from a local host.';
    END IF;

    FOR expected IN
        SELECT * FROM (VALUES
            ('ADMIN', 'admin@pcbuilder.test', 'Admin Demo', 'UNSPECIFIED',
             '$2a$12$p4btf2qxsva6UwnRLY.lve190nb5QZ9y6E1tSC30Ietnt94UQuiZq'),
            ('SALES', 'sales@pcbuilder.test', 'Sales Demo', 'UNSPECIFIED',
             '$2a$12$LmPGQ0eybspfe9i.VKI9QuDc7Gj7/.cpHbmHQ2n27PFdVLNycwe.2'),
            ('CUSTOMER', 'customer@pcbuilder.test', 'Nguyễn Văn An', 'IT',
             '$2a$12$n/zLopQOflcLsSMxm7zpou4C2eaurm3URvv9Euybom7ngdbI38EZu')
        ) AS fixtures(role_code, email, full_name, customer_segment, password_hash)
    LOOP
        SELECT r."role_code", u."email", u."full_name", u."customer_segment",
               u."account_status", u."password_hash"
          INTO existing
          FROM "users" u
          JOIN "roles" r ON r."role_id" = u."role_id"
         WHERE u."email" COLLATE "C" = expected.email COLLATE "C";

        IF NOT FOUND THEN
            SELECT r."role_code", u."email", u."full_name", u."customer_segment",
                   u."account_status", u."password_hash"
              INTO existing
              FROM "users" u
              JOIN "roles" r ON r."role_id" = u."role_id"
             WHERE u."email" = expected.email;

            IF FOUND THEN
                RAISE EXCEPTION 'Demo email % already exists with different account data; inspect it before proceeding.',
                    expected.email;
            END IF;
        ELSE
            IF existing."role_code" IS DISTINCT FROM expected.role_code
               OR existing."email" IS DISTINCT FROM expected.email
               OR existing."full_name" IS DISTINCT FROM expected.full_name
               OR existing."customer_segment" IS DISTINCT FROM expected.customer_segment
               OR existing."account_status" IS DISTINCT FROM 'ACTIVE'
               OR existing."password_hash" IS DISTINCT FROM expected.password_hash THEN
                RAISE EXCEPTION 'Demo email % already exists with different account data; inspect it before proceeding.',
                    expected.email;
            END IF;
        END IF;
    END LOOP;
END;
$$;

INSERT INTO "roles" ("role_code", "role_name", "description")
VALUES
    ('ADMIN', 'Administrator', 'Local development demo role'),
    ('SALES', 'Sales', 'Local development demo role'),
    ('CUSTOMER', 'Customer', 'Local development demo role')
ON CONFLICT ("role_code") DO NOTHING;

INSERT INTO "users" (
    "role_id", "full_name", "email", "password_hash", "phone",
    "customer_segment", "account_status"
)
SELECT r."role_id", fixture.full_name, fixture.email, fixture.password_hash,
       NULL, fixture.customer_segment, 'ACTIVE'
  FROM (VALUES
      ('ADMIN', 'admin@pcbuilder.test', 'Admin Demo', 'UNSPECIFIED',
       '$2a$12$p4btf2qxsva6UwnRLY.lve190nb5QZ9y6E1tSC30Ietnt94UQuiZq'),
      ('SALES', 'sales@pcbuilder.test', 'Sales Demo', 'UNSPECIFIED',
       '$2a$12$LmPGQ0eybspfe9i.VKI9QuDc7Gj7/.cpHbmHQ2n27PFdVLNycwe.2'),
      ('CUSTOMER', 'customer@pcbuilder.test', 'Nguyễn Văn An', 'IT',
       '$2a$12$n/zLopQOflcLsSMxm7zpou4C2eaurm3URvv9Euybom7ngdbI38EZu')
  ) AS fixture(role_code, email, full_name, customer_segment, password_hash)
  JOIN "roles" r ON r."role_code" COLLATE "C" = fixture.role_code COLLATE "C"
ON CONFLICT ("email") DO NOTHING;

DO $$
DECLARE
    expected RECORD;
    actual RECORD;
    demo_email_count INTEGER;
BEGIN
    FOR expected IN
        SELECT * FROM (VALUES
            ('ADMIN', 'admin@pcbuilder.test', 'Admin Demo', 'UNSPECIFIED',
             '$2a$12$p4btf2qxsva6UwnRLY.lve190nb5QZ9y6E1tSC30Ietnt94UQuiZq'),
            ('SALES', 'sales@pcbuilder.test', 'Sales Demo', 'UNSPECIFIED',
             '$2a$12$LmPGQ0eybspfe9i.VKI9QuDc7Gj7/.cpHbmHQ2n27PFdVLNycwe.2'),
            ('CUSTOMER', 'customer@pcbuilder.test', 'Nguyễn Văn An', 'IT',
             '$2a$12$n/zLopQOflcLsSMxm7zpou4C2eaurm3URvv9Euybom7ngdbI38EZu')
        ) AS fixtures(role_code, email, full_name, customer_segment, password_hash)
    LOOP
        SELECT r."role_code", u."email", u."full_name", u."customer_segment",
               u."account_status", u."password_hash"
          INTO actual
          FROM "users" u
          JOIN "roles" r ON r."role_id" = u."role_id"
         WHERE u."email" COLLATE "C" = expected.email COLLATE "C";

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Demo account verification failed for %; transaction will roll back.',
                expected.email;
        END IF;

        IF actual."role_code" IS DISTINCT FROM expected.role_code
           OR actual."email" IS DISTINCT FROM expected.email
           OR actual."full_name" IS DISTINCT FROM expected.full_name
           OR actual."customer_segment" IS DISTINCT FROM expected.customer_segment
           OR actual."account_status" IS DISTINCT FROM 'ACTIVE'
           OR actual."password_hash" IS DISTINCT FROM expected.password_hash THEN
            RAISE EXCEPTION 'Demo account verification failed for %; transaction will roll back.',
                expected.email;
        END IF;
    END LOOP;

    SELECT COUNT(*)
      INTO demo_email_count
      FROM "users"
     WHERE "email" IN (
         'admin@pcbuilder.test',
         'sales@pcbuilder.test',
         'customer@pcbuilder.test'
     );

    IF demo_email_count <> 3 THEN
        RAISE EXCEPTION 'Expected exactly three demo account emails; transaction will roll back.';
    END IF;
END;
$$;

COMMIT;
