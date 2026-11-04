-- Ported from schema_35_tables.sql (MySQL 8) without seed statements.
-- ICU primary-strength collation approximates utf8mb4_0900_ai_ci.
CREATE COLLATION mysql_0900_ai_ci (
  provider = icu,
  locale = 'und-u-ks-level1',
  deterministic = false
);

CREATE SEQUENCE "roles_role_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "roles_role_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "users_user_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "users_user_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "brands_brand_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "brands_brand_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "categories_category_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "categories_category_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "product_types_product_type_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "product_types_product_type_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "products_product_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "products_product_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "product_images_image_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "product_images_image_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "product_attribute_definitions_attribute_definition_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "product_attribute_definitions_attribute_definition_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;


CREATE SEQUENCE "product_offers_offer_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "product_offers_offer_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "product_connectors_product_connector_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "product_connectors_product_connector_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "product_relationships_relationship_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "product_relationships_relationship_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "compatibility_rules_rule_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "compatibility_rules_rule_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "carts_cart_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "carts_cart_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "cart_items_cart_item_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "cart_items_cart_item_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "orders_order_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "orders_order_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "order_items_order_item_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "order_items_order_item_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "product_reviews_review_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "product_reviews_review_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "use_cases_use_case_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "use_cases_use_case_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "questionnaire_templates_template_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "questionnaire_templates_template_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "questionnaire_questions_question_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "questionnaire_questions_question_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "questionnaire_options_option_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "questionnaire_options_option_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "questionnaire_sessions_questionnaire_session_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "questionnaire_sessions_questionnaire_session_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "questionnaire_answers_answer_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "questionnaire_answers_answer_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "pc_builds_build_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "pc_builds_build_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "pc_build_revisions_build_revision_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "pc_build_revisions_build_revision_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "pc_build_items_build_item_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "pc_build_items_build_item_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "build_check_runs_build_check_run_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "build_check_runs_build_check_run_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "build_check_results_build_check_result_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "build_check_results_build_check_result_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "benchmark_scenarios_benchmark_scenario_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "benchmark_scenarios_benchmark_scenario_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "benchmark_results_benchmark_result_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "benchmark_results_benchmark_result_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "system_benchmark_results_system_benchmark_result_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "system_benchmark_results_system_benchmark_result_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "recommendation_runs_recommendation_run_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "recommendation_runs_recommendation_run_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "recommendation_items_recommendation_item_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "recommendation_items_recommendation_item_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE SEQUENCE "replacement_suggestions_replacement_suggestion_id_seq_low" AS BIGINT START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 NO CYCLE;
CREATE SEQUENCE "replacement_suggestions_replacement_suggestion_id_seq_high" AS BIGINT START WITH -9223372036854775808 MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;

CREATE FUNCTION next_unsigned_bigint(low_sequence REGCLASS, high_sequence REGCLASS)
RETURNS NUMERIC(20, 0)
LANGUAGE plpgsql AS $$
DECLARE
  next_value BIGINT;
BEGIN
  BEGIN
    next_value := nextval(low_sequence);
    RETURN next_value::NUMERIC(20, 0);
  EXCEPTION WHEN sequence_generator_limit_exceeded THEN
    next_value := nextval(high_sequence);
    RETURN next_value::NUMERIC(20, 0) + 18446744073709551616;
  END;
END;
$$;

CREATE TABLE "roles" (
  "role_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('roles_role_id_seq_low'::regclass, 'roles_role_id_seq_high'::regclass),
  CONSTRAINT "ck_u_roles_role_id_b0a90581" CHECK ("role_id" >= 0 AND "role_id" <= 18446744073709551615),
  "role_code" VARCHAR(40) COLLATE mysql_0900_ai_ci NOT NULL,
  "role_name" VARCHAR(100) COLLATE mysql_0900_ai_ci NOT NULL,
  "description" VARCHAR(500) COLLATE mysql_0900_ai_ci,
  PRIMARY KEY ("role_id"),
  CONSTRAINT "uq_roles_code" UNIQUE ("role_code")
);
ALTER SEQUENCE "roles_role_id_seq_low" OWNED BY "roles"."role_id";
ALTER SEQUENCE "roles_role_id_seq_high" OWNED BY "roles"."role_id";

CREATE TABLE "users" (
  "user_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('users_user_id_seq_low'::regclass, 'users_user_id_seq_high'::regclass),
  CONSTRAINT "ck_u_users_user_id_3472f9c2" CHECK ("user_id" >= 0 AND "user_id" <= 18446744073709551615),
  "role_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_users_role_id_62343548" CHECK ("role_id" >= 0 AND "role_id" <= 18446744073709551615),
  "full_name" VARCHAR(160) COLLATE mysql_0900_ai_ci NOT NULL,
  "email" VARCHAR(254) COLLATE mysql_0900_ai_ci NOT NULL,
  "password_hash" VARCHAR(255) COLLATE mysql_0900_ai_ci NOT NULL,
  "phone" VARCHAR(40) COLLATE mysql_0900_ai_ci,
  "customer_segment" VARCHAR(20) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'UNSPECIFIED',
  "account_status" VARCHAR(20) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id"),
  CONSTRAINT "uq_users_email" UNIQUE ("email"),
  CONSTRAINT "fk_users_role" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_users_segment" CHECK (customer_segment IN ('IT','NON_IT','UNSPECIFIED'))
);
CREATE INDEX "ix_users_role" ON "users" ("role_id");
ALTER SEQUENCE "users_user_id_seq_low" OWNED BY "users"."user_id";
ALTER SEQUENCE "users_user_id_seq_high" OWNED BY "users"."user_id";

CREATE TABLE "brands" (
  "brand_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('brands_brand_id_seq_low'::regclass, 'brands_brand_id_seq_high'::regclass),
  CONSTRAINT "ck_u_brands_brand_id_9c28f844" CHECK ("brand_id" >= 0 AND "brand_id" <= 18446744073709551615),
  "brand_name" VARCHAR(120) COLLATE mysql_0900_ai_ci NOT NULL,
  "website_url" VARCHAR(500) COLLATE mysql_0900_ai_ci,
  "description" TEXT COLLATE mysql_0900_ai_ci,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY ("brand_id"),
  CONSTRAINT "uq_brands_name" UNIQUE ("brand_name")
);
ALTER SEQUENCE "brands_brand_id_seq_low" OWNED BY "brands"."brand_id";
ALTER SEQUENCE "brands_brand_id_seq_high" OWNED BY "brands"."brand_id";

CREATE TABLE "categories" (
  "category_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('categories_category_id_seq_low'::regclass, 'categories_category_id_seq_high'::regclass),
  CONSTRAINT "ck_u_categories_category_id_79a7284b" CHECK ("category_id" >= 0 AND "category_id" <= 18446744073709551615),
  "parent_category_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_categories_parent_category_id_f15e371c" CHECK ("parent_category_id" >= 0 AND "parent_category_id" <= 18446744073709551615),
  "category_code" VARCHAR(60) COLLATE mysql_0900_ai_ci NOT NULL,
  "category_name" VARCHAR(160) COLLATE mysql_0900_ai_ci NOT NULL,
  "description" TEXT COLLATE mysql_0900_ai_ci,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY ("category_id"),
  CONSTRAINT "uq_categories_code" UNIQUE ("category_code"),
  CONSTRAINT "fk_categories_parent" FOREIGN KEY ("parent_category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL
);
CREATE INDEX "ix_categories_parent" ON "categories" ("parent_category_id");
ALTER SEQUENCE "categories_category_id_seq_low" OWNED BY "categories"."category_id";
ALTER SEQUENCE "categories_category_id_seq_high" OWNED BY "categories"."category_id";

CREATE TABLE "product_types" (
  "product_type_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('product_types_product_type_id_seq_low'::regclass, 'product_types_product_type_id_seq_high'::regclass),
  CONSTRAINT "ck_u_product_types_product_type_id_61db1733" CHECK ("product_type_id" >= 0 AND "product_type_id" <= 18446744073709551615),
  "type_code" VARCHAR(60) COLLATE mysql_0900_ai_ci NOT NULL,
  "type_name" VARCHAR(120) COLLATE mysql_0900_ai_ci NOT NULL,
  "description" TEXT COLLATE mysql_0900_ai_ci,
  "is_build_component" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY ("product_type_id"),
  CONSTRAINT "uq_product_types_code" UNIQUE ("type_code")
);
ALTER SEQUENCE "product_types_product_type_id_seq_low" OWNED BY "product_types"."product_type_id";
ALTER SEQUENCE "product_types_product_type_id_seq_high" OWNED BY "product_types"."product_type_id";

CREATE TABLE "products" (
  "product_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('products_product_id_seq_low'::regclass, 'products_product_id_seq_high'::regclass),
  CONSTRAINT "ck_u_products_product_id_428c6c3b" CHECK ("product_id" >= 0 AND "product_id" <= 18446744073709551615),
  "product_type_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_products_product_type_id_8a7f08d4" CHECK ("product_type_id" >= 0 AND "product_type_id" <= 18446744073709551615),
  "category_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_products_category_id_42137c8b" CHECK ("category_id" >= 0 AND "category_id" <= 18446744073709551615),
  "brand_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_products_brand_id_8fb26b57" CHECK ("brand_id" >= 0 AND "brand_id" <= 18446744073709551615),
  "model_code" VARCHAR(100) COLLATE mysql_0900_ai_ci NOT NULL,
  "product_name" VARCHAR(240) COLLATE mysql_0900_ai_ci NOT NULL,
  "short_description" VARCHAR(500) COLLATE mysql_0900_ai_ci,
  "description" TEXT COLLATE mysql_0900_ai_ci,
  "product_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("product_id"),
  CONSTRAINT "uq_products_model_code" UNIQUE ("model_code"),
  CONSTRAINT "fk_products_type" FOREIGN KEY ("product_type_id") REFERENCES "product_types" ("product_type_id") ON DELETE RESTRICT,
  CONSTRAINT "fk_products_category" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE RESTRICT,
  CONSTRAINT "fk_products_brand" FOREIGN KEY ("brand_id") REFERENCES "brands" ("brand_id") ON DELETE SET NULL
);
CREATE INDEX "ix_products_type_status" ON "products" ("product_type_id", "product_status");
CREATE INDEX "ix_products_category" ON "products" ("category_id");
CREATE INDEX "ix_products_brand" ON "products" ("brand_id");
CREATE INDEX "ix_products_name" ON "products" ("product_name");
ALTER SEQUENCE "products_product_id_seq_low" OWNED BY "products"."product_id";
ALTER SEQUENCE "products_product_id_seq_high" OWNED BY "products"."product_id";

CREATE TABLE "product_images" (
  "image_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('product_images_image_id_seq_low'::regclass, 'product_images_image_id_seq_high'::regclass),
  CONSTRAINT "ck_u_product_images_image_id_373ad45e" CHECK ("image_id" >= 0 AND "image_id" <= 18446744073709551615),
  "product_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_images_product_id_93907253" CHECK ("product_id" >= 0 AND "product_id" <= 18446744073709551615),
  "image_url" VARCHAR(1000) COLLATE mysql_0900_ai_ci NOT NULL,
  "alt_text" VARCHAR(300) COLLATE mysql_0900_ai_ci,
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("image_id"),
  CONSTRAINT "fk_product_images_product" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE
);
CREATE INDEX "ix_product_images_product" ON "product_images" ("product_id", "sort_order");
ALTER SEQUENCE "product_images_image_id_seq_low" OWNED BY "product_images"."image_id";
ALTER SEQUENCE "product_images_image_id_seq_high" OWNED BY "product_images"."image_id";

CREATE TABLE "product_attribute_definitions" (
  "attribute_definition_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('product_attribute_definitions_attribute_definition_id_seq_low'::regclass, 'product_attribute_definitions_attribute_definition_id_seq_high'::regclass),
  CONSTRAINT "ck_u_product_attribute_defi_attribute_definition_83c19ef3" CHECK ("attribute_definition_id" >= 0 AND "attribute_definition_id" <= 18446744073709551615),
  "product_type_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_attribute_defi_product_type_id_2d0b0590" CHECK ("product_type_id" >= 0 AND "product_type_id" <= 18446744073709551615),
  "attribute_code" VARCHAR(100) COLLATE mysql_0900_ai_ci NOT NULL,
  "attribute_name" VARCHAR(160) COLLATE mysql_0900_ai_ci NOT NULL,
  "data_type" VARCHAR(20) COLLATE mysql_0900_ai_ci NOT NULL,
  "unit" VARCHAR(40) COLLATE mysql_0900_ai_ci,
  "is_filterable" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_build_critical" BOOLEAN NOT NULL DEFAULT FALSE,
  "validation_json" JSONB,
  PRIMARY KEY ("attribute_definition_id"),
  CONSTRAINT "uq_attribute_def_type_code" UNIQUE ("product_type_id", "attribute_code"),
  CONSTRAINT "fk_attribute_def_type" FOREIGN KEY ("product_type_id") REFERENCES "product_types" ("product_type_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_attribute_data_type" CHECK (data_type IN ('TEXT','DECIMAL','INTEGER','BOOLEAN','JSON'))
);
CREATE INDEX "ix_attribute_def_type" ON "product_attribute_definitions" ("product_type_id");
ALTER SEQUENCE "product_attribute_definitions_attribute_definition_id_seq_low" OWNED BY "product_attribute_definitions"."attribute_definition_id";
ALTER SEQUENCE "product_attribute_definitions_attribute_definition_id_seq_high" OWNED BY "product_attribute_definitions"."attribute_definition_id";

CREATE TABLE "product_attribute_values" (
  "product_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_attribute_valu_product_id_a625d29a" CHECK ("product_id" >= 0 AND "product_id" <= 18446744073709551615),
  "attribute_definition_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_attribute_valu_attribute_definition_5721e777" CHECK ("attribute_definition_id" >= 0 AND "attribute_definition_id" <= 18446744073709551615),
  "value_text" TEXT COLLATE mysql_0900_ai_ci,
  "value_decimal" NUMERIC(20, 6),
  "value_integer" NUMERIC(20, 0),
  "value_boolean" BOOLEAN,
  "value_json" JSONB,
  "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("product_id", "attribute_definition_id"),
  CONSTRAINT "fk_attribute_values_product" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE,
  CONSTRAINT "fk_attribute_values_definition" FOREIGN KEY ("attribute_definition_id") REFERENCES "product_attribute_definitions" ("attribute_definition_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_attribute_value_one_type" CHECK (num_nonnulls(value_text, value_decimal, value_integer, value_boolean, value_json) = 1),
  CONSTRAINT "chk_attribute_value_boolean" CHECK (value_boolean IS NULL OR value_boolean IN (FALSE, TRUE))
);
CREATE INDEX "ix_attribute_values_definition" ON "product_attribute_values" ("attribute_definition_id");

CREATE TABLE "product_offers" (
  "offer_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('product_offers_offer_id_seq_low'::regclass, 'product_offers_offer_id_seq_high'::regclass),
  CONSTRAINT "ck_u_product_offers_offer_id_d438d1a0" CHECK ("offer_id" >= 0 AND "offer_id" <= 18446744073709551615),
  "product_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_offers_product_id_e51244af" CHECK ("product_id" >= 0 AND "product_id" <= 18446744073709551615),
  "offer_code" VARCHAR(100) COLLATE mysql_0900_ai_ci NOT NULL,
  "condition_code" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'NEW',
  "price" NUMERIC(15, 2) NOT NULL,
  "currency_code" CHAR(3) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'VND',
  "stock_quantity" NUMERIC(10, 0) NOT NULL DEFAULT 0,
  CONSTRAINT "ck_u_product_offers_stock_quantity_e43504ac" CHECK ("stock_quantity" >= 0 AND "stock_quantity" <= 4294967295),
  "reserved_quantity" NUMERIC(10, 0) NOT NULL DEFAULT 0,
  CONSTRAINT "ck_u_product_offers_reserved_quantity_96f50e41" CHECK ("reserved_quantity" >= 0 AND "reserved_quantity" <= 4294967295),
  "warranty_months" NUMERIC(5, 0) NOT NULL DEFAULT 0,
  CONSTRAINT "ck_u_product_offers_warranty_months_75866dc3" CHECK ("warranty_months" >= 0 AND "warranty_months" <= 65535),
  "offer_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("offer_id"),
  CONSTRAINT "uq_product_offers_code" UNIQUE ("offer_code"),
  CONSTRAINT "fk_offers_product" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_offer_price" CHECK (price >= 0),
  CONSTRAINT "chk_offer_reserved" CHECK (reserved_quantity <= stock_quantity)
);
CREATE INDEX "ix_offers_product_status" ON "product_offers" ("product_id", "offer_status");
CREATE INDEX "ix_offers_price" ON "product_offers" ("price");
ALTER SEQUENCE "product_offers_offer_id_seq_low" OWNED BY "product_offers"."offer_id";
ALTER SEQUENCE "product_offers_offer_id_seq_high" OWNED BY "product_offers"."offer_id";

CREATE TABLE "product_connectors" (
  "product_connector_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('product_connectors_product_connector_id_seq_low'::regclass, 'product_connectors_product_connector_id_seq_high'::regclass),
  CONSTRAINT "ck_u_product_connectors_product_connector_id_1528806b" CHECK ("product_connector_id" >= 0 AND "product_connector_id" <= 18446744073709551615),
  "product_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_connectors_product_id_75f954fa" CHECK ("product_id" >= 0 AND "product_id" <= 18446744073709551615),
  "connector_code" VARCHAR(80) COLLATE mysql_0900_ai_ci NOT NULL,
  "direction_code" VARCHAR(16) COLLATE mysql_0900_ai_ci NOT NULL,
  "quantity" NUMERIC(5, 0) NOT NULL DEFAULT 1,
  CONSTRAINT "ck_u_product_connectors_quantity_97c7623f" CHECK ("quantity" >= 0 AND "quantity" <= 65535),
  "notes" VARCHAR(500) COLLATE mysql_0900_ai_ci,
  PRIMARY KEY ("product_connector_id"),
  CONSTRAINT "uq_product_connector" UNIQUE ("product_id", "connector_code", "direction_code"),
  CONSTRAINT "fk_product_connectors_product" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE,
  CONSTRAINT "chk_connector_direction" CHECK (direction_code IN ('PROVIDED','REQUIRED')),
  CONSTRAINT "chk_connector_quantity" CHECK (quantity > 0)
);
ALTER SEQUENCE "product_connectors_product_connector_id_seq_low" OWNED BY "product_connectors"."product_connector_id";
ALTER SEQUENCE "product_connectors_product_connector_id_seq_high" OWNED BY "product_connectors"."product_connector_id";

CREATE TABLE "product_relationships" (
  "relationship_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('product_relationships_relationship_id_seq_low'::regclass, 'product_relationships_relationship_id_seq_high'::regclass),
  CONSTRAINT "ck_u_product_relationships_relationship_id_29231311" CHECK ("relationship_id" >= 0 AND "relationship_id" <= 18446744073709551615),
  "source_product_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_relationships_source_product_id_b64e7f2d" CHECK ("source_product_id" >= 0 AND "source_product_id" <= 18446744073709551615),
  "target_product_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_relationships_target_product_id_20de60a7" CHECK ("target_product_id" >= 0 AND "target_product_id" <= 18446744073709551615),
  "relationship_type" VARCHAR(40) COLLATE mysql_0900_ai_ci NOT NULL,
  "status_code" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'CONFIRMED',
  "source_note" VARCHAR(500) COLLATE mysql_0900_ai_ci,
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("relationship_id"),
  CONSTRAINT "uq_product_relationship" UNIQUE ("source_product_id", "target_product_id", "relationship_type"),
  CONSTRAINT "fk_relationship_source" FOREIGN KEY ("source_product_id") REFERENCES "products" ("product_id") ON DELETE RESTRICT,
  CONSTRAINT "fk_relationship_target" FOREIGN KEY ("target_product_id") REFERENCES "products" ("product_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_relationship_not_self" CHECK (source_product_id <> target_product_id)
);
CREATE INDEX "ix_relationship_target" ON "product_relationships" ("target_product_id", "relationship_type");
ALTER SEQUENCE "product_relationships_relationship_id_seq_low" OWNED BY "product_relationships"."relationship_id";
ALTER SEQUENCE "product_relationships_relationship_id_seq_high" OWNED BY "product_relationships"."relationship_id";

CREATE TABLE "compatibility_rules" (
  "rule_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('compatibility_rules_rule_id_seq_low'::regclass, 'compatibility_rules_rule_id_seq_high'::regclass),
  CONSTRAINT "ck_u_compatibility_rules_rule_id_df0f51e0" CHECK ("rule_id" >= 0 AND "rule_id" <= 18446744073709551615),
  "rule_code" VARCHAR(100) COLLATE mysql_0900_ai_ci NOT NULL,
  "rule_name" VARCHAR(180) COLLATE mysql_0900_ai_ci NOT NULL,
  "source_product_type_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_compatibility_rules_source_product_type__17059997" CHECK ("source_product_type_id" >= 0 AND "source_product_type_id" <= 18446744073709551615),
  "target_product_type_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_compatibility_rules_target_product_type__32a07055" CHECK ("target_product_type_id" >= 0 AND "target_product_type_id" <= 18446744073709551615),
  "evaluator_key" VARCHAR(100) COLLATE mysql_0900_ai_ci NOT NULL,
  "severity_code" VARCHAR(16) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'WARNING',
  "parameters_json" JSONB,
  "explanation_template" VARCHAR(1000) COLLATE mysql_0900_ai_ci,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY ("rule_id"),
  CONSTRAINT "uq_compatibility_rules_code" UNIQUE ("rule_code"),
  CONSTRAINT "fk_compat_rules_source_type" FOREIGN KEY ("source_product_type_id") REFERENCES "product_types" ("product_type_id") ON DELETE SET NULL,
  CONSTRAINT "fk_compat_rules_target_type" FOREIGN KEY ("target_product_type_id") REFERENCES "product_types" ("product_type_id") ON DELETE SET NULL,
  CONSTRAINT "chk_compat_rule_severity" CHECK (severity_code IN ('ERROR','WARNING','INFO'))
);
CREATE INDEX "ix_compatibility_rule_types" ON "compatibility_rules" ("source_product_type_id", "target_product_type_id", "is_active");
ALTER SEQUENCE "compatibility_rules_rule_id_seq_low" OWNED BY "compatibility_rules"."rule_id";
ALTER SEQUENCE "compatibility_rules_rule_id_seq_high" OWNED BY "compatibility_rules"."rule_id";

CREATE TABLE "carts" (
  "cart_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('carts_cart_id_seq_low'::regclass, 'carts_cart_id_seq_high'::regclass),
  CONSTRAINT "ck_u_carts_cart_id_d339c009" CHECK ("cart_id" >= 0 AND "cart_id" <= 18446744073709551615),
  "user_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_carts_user_id_60cf64fa" CHECK ("user_id" >= 0 AND "user_id" <= 18446744073709551615),
  "guest_token" VARCHAR(128) COLLATE mysql_0900_ai_ci,
  "cart_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("cart_id"),
  CONSTRAINT "uq_carts_guest_token" UNIQUE ("guest_token"),
  CONSTRAINT "fk_carts_user" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL,
  CONSTRAINT "chk_cart_owner" CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL)
);
CREATE INDEX "ix_carts_user_status" ON "carts" ("user_id", "cart_status");
ALTER SEQUENCE "carts_cart_id_seq_low" OWNED BY "carts"."cart_id";
ALTER SEQUENCE "carts_cart_id_seq_high" OWNED BY "carts"."cart_id";

CREATE TABLE "cart_items" (
  "cart_item_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('cart_items_cart_item_id_seq_low'::regclass, 'cart_items_cart_item_id_seq_high'::regclass),
  CONSTRAINT "ck_u_cart_items_cart_item_id_545fc5de" CHECK ("cart_item_id" >= 0 AND "cart_item_id" <= 18446744073709551615),
  "cart_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_cart_items_cart_id_07b01481" CHECK ("cart_id" >= 0 AND "cart_id" <= 18446744073709551615),
  "offer_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_cart_items_offer_id_c98270f7" CHECK ("offer_id" >= 0 AND "offer_id" <= 18446744073709551615),
  "quantity" NUMERIC(5, 0) NOT NULL DEFAULT 1,
  CONSTRAINT "ck_u_cart_items_quantity_0e2532f7" CHECK ("quantity" >= 0 AND "quantity" <= 65535),
  "added_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("cart_item_id"),
  CONSTRAINT "uq_cart_item_offer" UNIQUE ("cart_id", "offer_id"),
  CONSTRAINT "fk_cart_items_cart" FOREIGN KEY ("cart_id") REFERENCES "carts" ("cart_id") ON DELETE CASCADE,
  CONSTRAINT "fk_cart_items_offer" FOREIGN KEY ("offer_id") REFERENCES "product_offers" ("offer_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_cart_item_quantity" CHECK (quantity > 0)
);
ALTER SEQUENCE "cart_items_cart_item_id_seq_low" OWNED BY "cart_items"."cart_item_id";
ALTER SEQUENCE "cart_items_cart_item_id_seq_high" OWNED BY "cart_items"."cart_item_id";

CREATE TABLE "orders" (
  "order_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('orders_order_id_seq_low'::regclass, 'orders_order_id_seq_high'::regclass),
  CONSTRAINT "ck_u_orders_order_id_9a725999" CHECK ("order_id" >= 0 AND "order_id" <= 18446744073709551615),
  "order_number" VARCHAR(60) COLLATE mysql_0900_ai_ci NOT NULL,
  "user_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_orders_user_id_029736a5" CHECK ("user_id" >= 0 AND "user_id" <= 18446744073709551615),
  "customer_name" VARCHAR(160) COLLATE mysql_0900_ai_ci NOT NULL,
  "customer_email" VARCHAR(254) COLLATE mysql_0900_ai_ci NOT NULL,
  "customer_phone" VARCHAR(40) COLLATE mysql_0900_ai_ci,
  "shipping_address" TEXT COLLATE mysql_0900_ai_ci NOT NULL,
  "shipping_region" VARCHAR(160) COLLATE mysql_0900_ai_ci,
  "shipping_postal_code" VARCHAR(30) COLLATE mysql_0900_ai_ci,
  "order_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'PENDING',
  "payment_method" VARCHAR(40) COLLATE mysql_0900_ai_ci,
  "payment_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'UNPAID',
  "payment_reference" VARCHAR(180) COLLATE mysql_0900_ai_ci,
  "shipment_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'NOT_SHIPPED',
  "shipping_carrier" VARCHAR(100) COLLATE mysql_0900_ai_ci,
  "tracking_number" VARCHAR(180) COLLATE mysql_0900_ai_ci,
  "subtotal" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "shipping_fee" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "discount_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "total_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "placed_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("order_id"),
  CONSTRAINT "uq_orders_number" UNIQUE ("order_number"),
  CONSTRAINT "fk_orders_user" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL,
  CONSTRAINT "chk_order_amounts" CHECK (subtotal >= 0 AND shipping_fee >= 0 AND discount_amount >= 0 AND total_amount >= 0)
);
CREATE INDEX "ix_orders_user_date" ON "orders" ("user_id", "placed_at");
CREATE INDEX "ix_orders_status_date" ON "orders" ("order_status", "placed_at");
ALTER SEQUENCE "orders_order_id_seq_low" OWNED BY "orders"."order_id";
ALTER SEQUENCE "orders_order_id_seq_high" OWNED BY "orders"."order_id";

CREATE TABLE "order_items" (
  "order_item_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('order_items_order_item_id_seq_low'::regclass, 'order_items_order_item_id_seq_high'::regclass),
  CONSTRAINT "ck_u_order_items_order_item_id_b441bfab" CHECK ("order_item_id" >= 0 AND "order_item_id" <= 18446744073709551615),
  "order_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_order_items_order_id_0fff8a92" CHECK ("order_id" >= 0 AND "order_id" <= 18446744073709551615),
  "offer_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_order_items_offer_id_df9dd6f4" CHECK ("offer_id" >= 0 AND "offer_id" <= 18446744073709551615),
  "product_name_snapshot" VARCHAR(240) COLLATE mysql_0900_ai_ci NOT NULL,
  "offer_code_snapshot" VARCHAR(100) COLLATE mysql_0900_ai_ci NOT NULL,
  "condition_snapshot" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL,
  "quantity" NUMERIC(5, 0) NOT NULL,
  CONSTRAINT "ck_u_order_items_quantity_0dfa6a06" CHECK ("quantity" >= 0 AND "quantity" <= 65535),
  "unit_price" NUMERIC(15, 2) NOT NULL,
  "line_total" NUMERIC(15, 2) NOT NULL,
  PRIMARY KEY ("order_item_id"),
  CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") ON DELETE CASCADE,
  CONSTRAINT "fk_order_items_offer" FOREIGN KEY ("offer_id") REFERENCES "product_offers" ("offer_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_order_item_values" CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0)
);
CREATE INDEX "ix_order_items_order" ON "order_items" ("order_id");
CREATE INDEX "ix_order_items_offer" ON "order_items" ("offer_id");
ALTER SEQUENCE "order_items_order_item_id_seq_low" OWNED BY "order_items"."order_item_id";
ALTER SEQUENCE "order_items_order_item_id_seq_high" OWNED BY "order_items"."order_item_id";

CREATE TABLE "product_reviews" (
  "review_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('product_reviews_review_id_seq_low'::regclass, 'product_reviews_review_id_seq_high'::regclass),
  CONSTRAINT "ck_u_product_reviews_review_id_7556e207" CHECK ("review_id" >= 0 AND "review_id" <= 18446744073709551615),
  "product_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_reviews_product_id_6619fef9" CHECK ("product_id" >= 0 AND "product_id" <= 18446744073709551615),
  "user_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_product_reviews_user_id_24a42490" CHECK ("user_id" >= 0 AND "user_id" <= 18446744073709551615),
  "rating" NUMERIC(3, 0) NOT NULL,
  CONSTRAINT "ck_u_product_reviews_rating_75a116c6" CHECK ("rating" >= 0 AND "rating" <= 255),
  "review_title" VARCHAR(180) COLLATE mysql_0900_ai_ci,
  "review_text" TEXT COLLATE mysql_0900_ai_ci,
  "review_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("review_id"),
  CONSTRAINT "uq_product_review_user" UNIQUE ("product_id", "user_id"),
  CONSTRAINT "fk_product_reviews_product" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE CASCADE,
  CONSTRAINT "fk_product_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE,
  CONSTRAINT "chk_product_review_rating" CHECK (rating BETWEEN 1 AND 5)
);
CREATE INDEX "ix_product_reviews_status" ON "product_reviews" ("product_id", "review_status");
ALTER SEQUENCE "product_reviews_review_id_seq_low" OWNED BY "product_reviews"."review_id";
ALTER SEQUENCE "product_reviews_review_id_seq_high" OWNED BY "product_reviews"."review_id";

CREATE TABLE "use_cases" (
  "use_case_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('use_cases_use_case_id_seq_low'::regclass, 'use_cases_use_case_id_seq_high'::regclass),
  CONSTRAINT "ck_u_use_cases_use_case_id_1bc0087d" CHECK ("use_case_id" >= 0 AND "use_case_id" <= 18446744073709551615),
  "use_case_code" VARCHAR(60) COLLATE mysql_0900_ai_ci NOT NULL,
  "use_case_name" VARCHAR(140) COLLATE mysql_0900_ai_ci NOT NULL,
  "description" TEXT COLLATE mysql_0900_ai_ci,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY ("use_case_id"),
  CONSTRAINT "uq_use_cases_code" UNIQUE ("use_case_code")
);
ALTER SEQUENCE "use_cases_use_case_id_seq_low" OWNED BY "use_cases"."use_case_id";
ALTER SEQUENCE "use_cases_use_case_id_seq_high" OWNED BY "use_cases"."use_case_id";

CREATE TABLE "questionnaire_templates" (
  "template_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('questionnaire_templates_template_id_seq_low'::regclass, 'questionnaire_templates_template_id_seq_high'::regclass),
  CONSTRAINT "ck_u_questionnaire_template_template_id_85e3fe7c" CHECK ("template_id" >= 0 AND "template_id" <= 18446744073709551615),
  "template_code" VARCHAR(80) COLLATE mysql_0900_ai_ci NOT NULL,
  "template_name" VARCHAR(180) COLLATE mysql_0900_ai_ci NOT NULL,
  "audience_segment" VARCHAR(20) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'BOTH',
  "version_number" NUMERIC(10, 0) NOT NULL DEFAULT 1,
  CONSTRAINT "ck_u_questionnaire_template_version_number_d57a89fa" CHECK ("version_number" >= 0 AND "version_number" <= 4294967295),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY ("template_id"),
  CONSTRAINT "uq_questionnaire_template_version" UNIQUE ("template_code", "version_number"),
  CONSTRAINT "chk_questionnaire_audience" CHECK (audience_segment IN ('IT','NON_IT','BOTH'))
);
ALTER SEQUENCE "questionnaire_templates_template_id_seq_low" OWNED BY "questionnaire_templates"."template_id";
ALTER SEQUENCE "questionnaire_templates_template_id_seq_high" OWNED BY "questionnaire_templates"."template_id";

CREATE TABLE "questionnaire_questions" (
  "question_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('questionnaire_questions_question_id_seq_low'::regclass, 'questionnaire_questions_question_id_seq_high'::regclass),
  CONSTRAINT "ck_u_questionnaire_question_question_id_5ff946df" CHECK ("question_id" >= 0 AND "question_id" <= 18446744073709551615),
  "template_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_questionnaire_question_template_id_187f2eb4" CHECK ("template_id" >= 0 AND "template_id" <= 18446744073709551615),
  "depends_on_question_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_questionnaire_question_depends_on_question__02b901fd" CHECK ("depends_on_question_id" >= 0 AND "depends_on_question_id" <= 18446744073709551615),
  "question_code" VARCHAR(80) COLLATE mysql_0900_ai_ci NOT NULL,
  "question_text" VARCHAR(1000) COLLATE mysql_0900_ai_ci NOT NULL,
  "answer_type" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT FALSE,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "display_condition_json" JSONB,
  PRIMARY KEY ("question_id"),
  CONSTRAINT "uq_question_code" UNIQUE ("template_id", "question_code"),
  CONSTRAINT "fk_questions_template" FOREIGN KEY ("template_id") REFERENCES "questionnaire_templates" ("template_id") ON DELETE CASCADE,
  CONSTRAINT "fk_questions_dependency" FOREIGN KEY ("depends_on_question_id") REFERENCES "questionnaire_questions" ("question_id") ON DELETE SET NULL,
  CONSTRAINT "chk_question_answer_type" CHECK (answer_type IN ('SINGLE_CHOICE','MULTI_CHOICE','TEXT','NUMBER','BOOLEAN'))
);
CREATE INDEX "ix_questions_template_order" ON "questionnaire_questions" ("template_id", "sort_order");
ALTER SEQUENCE "questionnaire_questions_question_id_seq_low" OWNED BY "questionnaire_questions"."question_id";
ALTER SEQUENCE "questionnaire_questions_question_id_seq_high" OWNED BY "questionnaire_questions"."question_id";

CREATE TABLE "questionnaire_options" (
  "option_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('questionnaire_options_option_id_seq_low'::regclass, 'questionnaire_options_option_id_seq_high'::regclass),
  CONSTRAINT "ck_u_questionnaire_options_option_id_cf896420" CHECK ("option_id" >= 0 AND "option_id" <= 18446744073709551615),
  "question_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_questionnaire_options_question_id_7148c43f" CHECK ("question_id" >= 0 AND "question_id" <= 18446744073709551615),
  "mapped_use_case_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_questionnaire_options_mapped_use_case_id_024f9752" CHECK ("mapped_use_case_id" >= 0 AND "mapped_use_case_id" <= 18446744073709551615),
  "option_code" VARCHAR(80) COLLATE mysql_0900_ai_ci NOT NULL,
  "option_label" VARCHAR(300) COLLATE mysql_0900_ai_ci NOT NULL,
  "numeric_value" NUMERIC(18, 4),
  "option_data_json" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("option_id"),
  CONSTRAINT "uq_question_option_code" UNIQUE ("question_id", "option_code"),
  CONSTRAINT "fk_options_question" FOREIGN KEY ("question_id") REFERENCES "questionnaire_questions" ("question_id") ON DELETE CASCADE,
  CONSTRAINT "fk_options_use_case" FOREIGN KEY ("mapped_use_case_id") REFERENCES "use_cases" ("use_case_id") ON DELETE SET NULL
);
CREATE INDEX "ix_question_options_use_case" ON "questionnaire_options" ("mapped_use_case_id");
ALTER SEQUENCE "questionnaire_options_option_id_seq_low" OWNED BY "questionnaire_options"."option_id";
ALTER SEQUENCE "questionnaire_options_option_id_seq_high" OWNED BY "questionnaire_options"."option_id";

CREATE TABLE "questionnaire_sessions" (
  "questionnaire_session_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('questionnaire_sessions_questionnaire_session_id_seq_low'::regclass, 'questionnaire_sessions_questionnaire_session_id_seq_high'::regclass),
  CONSTRAINT "ck_u_questionnaire_sessions_questionnaire_sessio_c7ef1459" CHECK ("questionnaire_session_id" >= 0 AND "questionnaire_session_id" <= 18446744073709551615),
  "template_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_questionnaire_sessions_template_id_c06f272d" CHECK ("template_id" >= 0 AND "template_id" <= 18446744073709551615),
  "user_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_questionnaire_sessions_user_id_91ae13b5" CHECK ("user_id" >= 0 AND "user_id" <= 18446744073709551615),
  "audience_segment" VARCHAR(20) COLLATE mysql_0900_ai_ci NOT NULL,
  "session_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'IN_PROGRESS',
  "budget_min" NUMERIC(15, 2),
  "budget_max" NUMERIC(15, 2),
  "region_code" VARCHAR(80) COLLATE mysql_0900_ai_ci,
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(0) WITHOUT TIME ZONE,
  PRIMARY KEY ("questionnaire_session_id"),
  CONSTRAINT "fk_questionnaire_sessions_template" FOREIGN KEY ("template_id") REFERENCES "questionnaire_templates" ("template_id") ON DELETE RESTRICT,
  CONSTRAINT "fk_questionnaire_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL,
  CONSTRAINT "chk_questionnaire_session_budget" CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max),
  CONSTRAINT "chk_questionnaire_session_audience" CHECK (audience_segment IN ('IT','NON_IT'))
);
CREATE INDEX "ix_questionnaire_sessions_user" ON "questionnaire_sessions" ("user_id", "created_at");
CREATE INDEX "ix_questionnaire_sessions_template" ON "questionnaire_sessions" ("template_id", "session_status");
ALTER SEQUENCE "questionnaire_sessions_questionnaire_session_id_seq_low" OWNED BY "questionnaire_sessions"."questionnaire_session_id";
ALTER SEQUENCE "questionnaire_sessions_questionnaire_session_id_seq_high" OWNED BY "questionnaire_sessions"."questionnaire_session_id";

CREATE TABLE "questionnaire_answers" (
  "answer_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('questionnaire_answers_answer_id_seq_low'::regclass, 'questionnaire_answers_answer_id_seq_high'::regclass),
  CONSTRAINT "ck_u_questionnaire_answers_answer_id_ba4448ae" CHECK ("answer_id" >= 0 AND "answer_id" <= 18446744073709551615),
  "questionnaire_session_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_questionnaire_answers_questionnaire_sessio_74288f32" CHECK ("questionnaire_session_id" >= 0 AND "questionnaire_session_id" <= 18446744073709551615),
  "question_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_questionnaire_answers_question_id_9f9192f8" CHECK ("question_id" >= 0 AND "question_id" <= 18446744073709551615),
  "selected_option_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_questionnaire_answers_selected_option_id_42bb7570" CHECK ("selected_option_id" >= 0 AND "selected_option_id" <= 18446744073709551615),
  "answer_text" TEXT COLLATE mysql_0900_ai_ci,
  "answer_number" NUMERIC(20, 6),
  "answer_boolean" BOOLEAN,
  "answer_json" JSONB,
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("answer_id"),
  CONSTRAINT "fk_answers_session" FOREIGN KEY ("questionnaire_session_id") REFERENCES "questionnaire_sessions" ("questionnaire_session_id") ON DELETE CASCADE,
  CONSTRAINT "fk_answers_question" FOREIGN KEY ("question_id") REFERENCES "questionnaire_questions" ("question_id") ON DELETE RESTRICT,
  CONSTRAINT "fk_answers_option" FOREIGN KEY ("selected_option_id") REFERENCES "questionnaire_options" ("option_id") ON DELETE SET NULL,
  CONSTRAINT "chk_answer_one_value" CHECK ((selected_option_id IS NOT NULL AND answer_text IS NULL AND answer_number IS NULL AND answer_boolean IS NULL AND answer_json IS NULL) OR (selected_option_id IS NULL AND num_nonnulls(answer_text, answer_number, answer_boolean, answer_json) = 1))
);
CREATE INDEX "ix_answers_session_question" ON "questionnaire_answers" ("questionnaire_session_id", "question_id");
CREATE INDEX "ix_answers_option" ON "questionnaire_answers" ("selected_option_id");
ALTER SEQUENCE "questionnaire_answers_answer_id_seq_low" OWNED BY "questionnaire_answers"."answer_id";
ALTER SEQUENCE "questionnaire_answers_answer_id_seq_high" OWNED BY "questionnaire_answers"."answer_id";

CREATE TABLE "pc_builds" (
  "build_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('pc_builds_build_id_seq_low'::regclass, 'pc_builds_build_id_seq_high'::regclass),
  CONSTRAINT "ck_u_pc_builds_build_id_ec3704e7" CHECK ("build_id" >= 0 AND "build_id" <= 18446744073709551615),
  "user_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_pc_builds_user_id_b3189fc7" CHECK ("user_id" >= 0 AND "user_id" <= 18446744073709551615),
  "build_name" VARCHAR(180) COLLATE mysql_0900_ai_ci NOT NULL,
  "description" TEXT COLLATE mysql_0900_ai_ci,
  "budget_min" NUMERIC(15, 2),
  "budget_max" NUMERIC(15, 2),
  "primary_use_case_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_pc_builds_primary_use_case_id_d47bae7b" CHECK ("primary_use_case_id" >= 0 AND "primary_use_case_id" <= 18446744073709551615),
  "target_resolution" VARCHAR(40) COLLATE mysql_0900_ai_ci,
  "build_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'DRAFT',
  "is_public" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("build_id"),
  CONSTRAINT "fk_pc_builds_user" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL,
  CONSTRAINT "fk_pc_builds_use_case" FOREIGN KEY ("primary_use_case_id") REFERENCES "use_cases" ("use_case_id") ON DELETE SET NULL,
  CONSTRAINT "chk_pc_build_budget" CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)
);
CREATE INDEX "ix_pc_builds_user" ON "pc_builds" ("user_id", "updated_at");
CREATE INDEX "ix_pc_builds_use_case" ON "pc_builds" ("primary_use_case_id");
ALTER SEQUENCE "pc_builds_build_id_seq_low" OWNED BY "pc_builds"."build_id";
ALTER SEQUENCE "pc_builds_build_id_seq_high" OWNED BY "pc_builds"."build_id";

CREATE TABLE "pc_build_revisions" (
  "build_revision_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('pc_build_revisions_build_revision_id_seq_low'::regclass, 'pc_build_revisions_build_revision_id_seq_high'::regclass),
  CONSTRAINT "ck_u_pc_build_revisions_build_revision_id_dfde75dd" CHECK ("build_revision_id" >= 0 AND "build_revision_id" <= 18446744073709551615),
  "build_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_pc_build_revisions_build_id_e3a8662a" CHECK ("build_id" >= 0 AND "build_id" <= 18446744073709551615),
  "revision_number" NUMERIC(10, 0) NOT NULL,
  CONSTRAINT "ck_u_pc_build_revisions_revision_number_9a00d7da" CHECK ("revision_number" >= 0 AND "revision_number" <= 4294967295),
  "revision_name" VARCHAR(180) COLLATE mysql_0900_ai_ci,
  "estimated_total" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "created_by" NUMERIC(20, 0),
  CONSTRAINT "ck_u_pc_build_revisions_created_by_90dc70f2" CHECK ("created_by" >= 0 AND "created_by" <= 18446744073709551615),
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("build_revision_id"),
  CONSTRAINT "uq_build_revision_number" UNIQUE ("build_id", "revision_number"),
  CONSTRAINT "fk_build_revisions_build" FOREIGN KEY ("build_id") REFERENCES "pc_builds" ("build_id") ON DELETE CASCADE,
  CONSTRAINT "fk_build_revisions_user" FOREIGN KEY ("created_by") REFERENCES "users" ("user_id") ON DELETE SET NULL,
  CONSTRAINT "chk_build_revision_total" CHECK (estimated_total >= 0)
);
ALTER SEQUENCE "pc_build_revisions_build_revision_id_seq_low" OWNED BY "pc_build_revisions"."build_revision_id";
ALTER SEQUENCE "pc_build_revisions_build_revision_id_seq_high" OWNED BY "pc_build_revisions"."build_revision_id";

CREATE TABLE "pc_build_items" (
  "build_item_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('pc_build_items_build_item_id_seq_low'::regclass, 'pc_build_items_build_item_id_seq_high'::regclass),
  CONSTRAINT "ck_u_pc_build_items_build_item_id_59e73050" CHECK ("build_item_id" >= 0 AND "build_item_id" <= 18446744073709551615),
  "build_revision_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_pc_build_items_build_revision_id_29c64c9d" CHECK ("build_revision_id" >= 0 AND "build_revision_id" <= 18446744073709551615),
  "component_slot_code" VARCHAR(60) COLLATE mysql_0900_ai_ci NOT NULL,
  "offer_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_pc_build_items_offer_id_e19c9e06" CHECK ("offer_id" >= 0 AND "offer_id" <= 18446744073709551615),
  "quantity" NUMERIC(5, 0) NOT NULL DEFAULT 1,
  CONSTRAINT "ck_u_pc_build_items_quantity_56f7e90e" CHECK ("quantity" >= 0 AND "quantity" <= 65535),
  "unit_price_snapshot" NUMERIC(15, 2) NOT NULL,
  "added_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("build_item_id"),
  CONSTRAINT "uq_build_item_slot" UNIQUE ("build_revision_id", "component_slot_code"),
  CONSTRAINT "fk_build_items_revision" FOREIGN KEY ("build_revision_id") REFERENCES "pc_build_revisions" ("build_revision_id") ON DELETE CASCADE,
  CONSTRAINT "fk_build_items_offer" FOREIGN KEY ("offer_id") REFERENCES "product_offers" ("offer_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_build_item_values" CHECK (quantity > 0 AND unit_price_snapshot >= 0)
);
CREATE INDEX "ix_build_items_offer" ON "pc_build_items" ("offer_id");
ALTER SEQUENCE "pc_build_items_build_item_id_seq_low" OWNED BY "pc_build_items"."build_item_id";
ALTER SEQUENCE "pc_build_items_build_item_id_seq_high" OWNED BY "pc_build_items"."build_item_id";

CREATE TABLE "build_check_runs" (
  "build_check_run_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('build_check_runs_build_check_run_id_seq_low'::regclass, 'build_check_runs_build_check_run_id_seq_high'::regclass),
  CONSTRAINT "ck_u_build_check_runs_build_check_run_id_25f3fea4" CHECK ("build_check_run_id" >= 0 AND "build_check_run_id" <= 18446744073709551615),
  "build_revision_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_build_check_runs_build_revision_id_3e15cb68" CHECK ("build_revision_id" >= 0 AND "build_revision_id" <= 18446744073709551615),
  "overall_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'NOT_CHECKED',
  "total_price" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "checked_rule_count" NUMERIC(10, 0) NOT NULL DEFAULT 0,
  CONSTRAINT "ck_u_build_check_runs_checked_rule_count_8ea60c3b" CHECK ("checked_rule_count" >= 0 AND "checked_rule_count" <= 4294967295),
  "error_count" NUMERIC(10, 0) NOT NULL DEFAULT 0,
  CONSTRAINT "ck_u_build_check_runs_error_count_8b4d9db0" CHECK ("error_count" >= 0 AND "error_count" <= 4294967295),
  "warning_count" NUMERIC(10, 0) NOT NULL DEFAULT 0,
  CONSTRAINT "ck_u_build_check_runs_warning_count_cf9f3a7e" CHECK ("warning_count" >= 0 AND "warning_count" <= 4294967295),
  "checked_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "summary_json" JSONB,
  PRIMARY KEY ("build_check_run_id"),
  CONSTRAINT "fk_build_checks_revision" FOREIGN KEY ("build_revision_id") REFERENCES "pc_build_revisions" ("build_revision_id") ON DELETE CASCADE,
  CONSTRAINT "chk_build_check_total" CHECK (total_price >= 0)
);
CREATE INDEX "ix_build_checks_revision" ON "build_check_runs" ("build_revision_id", "checked_at");
ALTER SEQUENCE "build_check_runs_build_check_run_id_seq_low" OWNED BY "build_check_runs"."build_check_run_id";
ALTER SEQUENCE "build_check_runs_build_check_run_id_seq_high" OWNED BY "build_check_runs"."build_check_run_id";

CREATE TABLE "build_check_results" (
  "build_check_result_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('build_check_results_build_check_result_id_seq_low'::regclass, 'build_check_results_build_check_result_id_seq_high'::regclass),
  CONSTRAINT "ck_u_build_check_results_build_check_result_i_7ec279fc" CHECK ("build_check_result_id" >= 0 AND "build_check_result_id" <= 18446744073709551615),
  "build_check_run_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_build_check_results_build_check_run_id_77c47cb2" CHECK ("build_check_run_id" >= 0 AND "build_check_run_id" <= 18446744073709551615),
  "rule_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_build_check_results_rule_id_d6952351" CHECK ("rule_id" >= 0 AND "rule_id" <= 18446744073709551615),
  "source_build_item_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_build_check_results_source_build_item_id_e73457b6" CHECK ("source_build_item_id" >= 0 AND "source_build_item_id" <= 18446744073709551615),
  "target_build_item_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_build_check_results_target_build_item_id_a2f81366" CHECK ("target_build_item_id" >= 0 AND "target_build_item_id" <= 18446744073709551615),
  "severity_code" VARCHAR(16) COLLATE mysql_0900_ai_ci NOT NULL,
  "result_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL,
  "message" VARCHAR(1200) COLLATE mysql_0900_ai_ci NOT NULL,
  "details_json" JSONB,
  PRIMARY KEY ("build_check_result_id"),
  CONSTRAINT "fk_build_check_results_run" FOREIGN KEY ("build_check_run_id") REFERENCES "build_check_runs" ("build_check_run_id") ON DELETE CASCADE,
  CONSTRAINT "fk_build_check_results_rule" FOREIGN KEY ("rule_id") REFERENCES "compatibility_rules" ("rule_id") ON DELETE SET NULL,
  CONSTRAINT "fk_build_check_source_item" FOREIGN KEY ("source_build_item_id") REFERENCES "pc_build_items" ("build_item_id") ON DELETE SET NULL,
  CONSTRAINT "fk_build_check_target_item" FOREIGN KEY ("target_build_item_id") REFERENCES "pc_build_items" ("build_item_id") ON DELETE SET NULL,
  CONSTRAINT "chk_build_check_result_severity" CHECK (severity_code IN ('ERROR','WARNING','INFO'))
);
CREATE INDEX "ix_build_check_results_run" ON "build_check_results" ("build_check_run_id", "severity_code");
CREATE INDEX "ix_build_check_results_rule" ON "build_check_results" ("rule_id");
ALTER SEQUENCE "build_check_results_build_check_result_id_seq_low" OWNED BY "build_check_results"."build_check_result_id";
ALTER SEQUENCE "build_check_results_build_check_result_id_seq_high" OWNED BY "build_check_results"."build_check_result_id";

CREATE TABLE "benchmark_scenarios" (
  "benchmark_scenario_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('benchmark_scenarios_benchmark_scenario_id_seq_low'::regclass, 'benchmark_scenarios_benchmark_scenario_id_seq_high'::regclass),
  CONSTRAINT "ck_u_benchmark_scenarios_benchmark_scenario_i_a27a6e90" CHECK ("benchmark_scenario_id" >= 0 AND "benchmark_scenario_id" <= 18446744073709551615),
  "scenario_code" VARCHAR(100) COLLATE mysql_0900_ai_ci NOT NULL,
  "scenario_name" VARCHAR(240) COLLATE mysql_0900_ai_ci NOT NULL,
  "workload_type" VARCHAR(40) COLLATE mysql_0900_ai_ci NOT NULL,
  "workload_name" VARCHAR(240) COLLATE mysql_0900_ai_ci NOT NULL,
  "resolution" VARCHAR(40) COLLATE mysql_0900_ai_ci,
  "quality_preset" VARCHAR(80) COLLATE mysql_0900_ai_ci,
  "scenario_version" VARCHAR(80) COLLATE mysql_0900_ai_ci,
  "extra_parameters_json" JSONB,
  PRIMARY KEY ("benchmark_scenario_id"),
  CONSTRAINT "uq_benchmark_scenario_code" UNIQUE ("scenario_code")
);
ALTER SEQUENCE "benchmark_scenarios_benchmark_scenario_id_seq_low" OWNED BY "benchmark_scenarios"."benchmark_scenario_id";
ALTER SEQUENCE "benchmark_scenarios_benchmark_scenario_id_seq_high" OWNED BY "benchmark_scenarios"."benchmark_scenario_id";

CREATE TABLE "benchmark_results" (
  "benchmark_result_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('benchmark_results_benchmark_result_id_seq_low'::regclass, 'benchmark_results_benchmark_result_id_seq_high'::regclass),
  CONSTRAINT "ck_u_benchmark_results_benchmark_result_id_94f0e571" CHECK ("benchmark_result_id" >= 0 AND "benchmark_result_id" <= 18446744073709551615),
  "product_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_benchmark_results_product_id_cc74ab7a" CHECK ("product_id" >= 0 AND "product_id" <= 18446744073709551615),
  "benchmark_scenario_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_benchmark_results_benchmark_scenario_i_d1a9d2e4" CHECK ("benchmark_scenario_id" >= 0 AND "benchmark_scenario_id" <= 18446744073709551615),
  "metric_code" VARCHAR(80) COLLATE mysql_0900_ai_ci NOT NULL,
  "metric_value" NUMERIC(20, 6) NOT NULL,
  "unit" VARCHAR(40) COLLATE mysql_0900_ai_ci NOT NULL,
  "result_kind" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'MEASURED',
  "source_name" VARCHAR(240) COLLATE mysql_0900_ai_ci,
  "source_url" VARCHAR(1000) COLLATE mysql_0900_ai_ci,
  "confidence_score" NUMERIC(5, 2),
  "equipment_json" JSONB,
  "recorded_at" TIMESTAMP(0) WITHOUT TIME ZONE,
  PRIMARY KEY ("benchmark_result_id"),
  CONSTRAINT "fk_benchmark_result_product" FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") ON DELETE RESTRICT,
  CONSTRAINT "fk_benchmark_result_scenario" FOREIGN KEY ("benchmark_scenario_id") REFERENCES "benchmark_scenarios" ("benchmark_scenario_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_benchmark_confidence" CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);
CREATE INDEX "ix_benchmark_product_scenario" ON "benchmark_results" ("product_id", "benchmark_scenario_id", "metric_code");
CREATE INDEX "ix_benchmark_scenario_metric" ON "benchmark_results" ("benchmark_scenario_id", "metric_code");
ALTER SEQUENCE "benchmark_results_benchmark_result_id_seq_low" OWNED BY "benchmark_results"."benchmark_result_id";
ALTER SEQUENCE "benchmark_results_benchmark_result_id_seq_high" OWNED BY "benchmark_results"."benchmark_result_id";

CREATE TABLE "system_benchmark_results" (
  "system_benchmark_result_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('system_benchmark_results_system_benchmark_result_id_seq_low'::regclass, 'system_benchmark_results_system_benchmark_result_id_seq_high'::regclass),
  CONSTRAINT "ck_u_system_benchmark_resul_system_benchmark_res_4d8334c7" CHECK ("system_benchmark_result_id" >= 0 AND "system_benchmark_result_id" <= 18446744073709551615),
  "build_revision_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_system_benchmark_resul_build_revision_id_6bd7fabe" CHECK ("build_revision_id" >= 0 AND "build_revision_id" <= 18446744073709551615),
  "benchmark_scenario_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_system_benchmark_resul_benchmark_scenario_i_ad1c79fc" CHECK ("benchmark_scenario_id" >= 0 AND "benchmark_scenario_id" <= 18446744073709551615),
  "metric_code" VARCHAR(80) COLLATE mysql_0900_ai_ci NOT NULL,
  "metric_value" NUMERIC(20, 6) NOT NULL,
  "unit" VARCHAR(40) COLLATE mysql_0900_ai_ci NOT NULL,
  "result_kind" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'ESTIMATED',
  "source_name" VARCHAR(240) COLLATE mysql_0900_ai_ci,
  "confidence_score" NUMERIC(5, 2),
  "notes" VARCHAR(1000) COLLATE mysql_0900_ai_ci,
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("system_benchmark_result_id"),
  CONSTRAINT "fk_system_benchmark_revision" FOREIGN KEY ("build_revision_id") REFERENCES "pc_build_revisions" ("build_revision_id") ON DELETE CASCADE,
  CONSTRAINT "fk_system_benchmark_scenario" FOREIGN KEY ("benchmark_scenario_id") REFERENCES "benchmark_scenarios" ("benchmark_scenario_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_system_benchmark_confidence" CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);
CREATE INDEX "ix_system_benchmark_revision" ON "system_benchmark_results" ("build_revision_id", "benchmark_scenario_id");
ALTER SEQUENCE "system_benchmark_results_system_benchmark_result_id_seq_low" OWNED BY "system_benchmark_results"."system_benchmark_result_id";
ALTER SEQUENCE "system_benchmark_results_system_benchmark_result_id_seq_high" OWNED BY "system_benchmark_results"."system_benchmark_result_id";

CREATE TABLE "recommendation_runs" (
  "recommendation_run_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('recommendation_runs_recommendation_run_id_seq_low'::regclass, 'recommendation_runs_recommendation_run_id_seq_high'::regclass),
  CONSTRAINT "ck_u_recommendation_runs_recommendation_run_i_53733ac0" CHECK ("recommendation_run_id" >= 0 AND "recommendation_run_id" <= 18446744073709551615),
  "user_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_recommendation_runs_user_id_acf1e4ac" CHECK ("user_id" >= 0 AND "user_id" <= 18446744073709551615),
  "questionnaire_session_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_recommendation_runs_questionnaire_sessio_a466d4a1" CHECK ("questionnaire_session_id" >= 0 AND "questionnaire_session_id" <= 18446744073709551615),
  "build_revision_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_recommendation_runs_build_revision_id_915ad587" CHECK ("build_revision_id" >= 0 AND "build_revision_id" <= 18446744073709551615),
  "recommendation_type" VARCHAR(40) COLLATE mysql_0900_ai_ci NOT NULL,
  "method_key" VARCHAR(100) COLLATE mysql_0900_ai_ci NOT NULL,
  "run_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'COMPLETED',
  "budget_target" NUMERIC(15, 2),
  "summary" TEXT COLLATE mysql_0900_ai_ci,
  "analysis_json" JSONB,
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("recommendation_run_id"),
  CONSTRAINT "fk_recommendations_user" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL,
  CONSTRAINT "fk_recommendations_questionnaire" FOREIGN KEY ("questionnaire_session_id") REFERENCES "questionnaire_sessions" ("questionnaire_session_id") ON DELETE SET NULL,
  CONSTRAINT "fk_recommendations_revision" FOREIGN KEY ("build_revision_id") REFERENCES "pc_build_revisions" ("build_revision_id") ON DELETE SET NULL
);
CREATE INDEX "ix_recommendation_user_date" ON "recommendation_runs" ("user_id", "created_at");
CREATE INDEX "ix_recommendation_questionnaire" ON "recommendation_runs" ("questionnaire_session_id");
CREATE INDEX "ix_recommendation_build_revision" ON "recommendation_runs" ("build_revision_id");
ALTER SEQUENCE "recommendation_runs_recommendation_run_id_seq_low" OWNED BY "recommendation_runs"."recommendation_run_id";
ALTER SEQUENCE "recommendation_runs_recommendation_run_id_seq_high" OWNED BY "recommendation_runs"."recommendation_run_id";

CREATE TABLE "recommendation_items" (
  "recommendation_item_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('recommendation_items_recommendation_item_id_seq_low'::regclass, 'recommendation_items_recommendation_item_id_seq_high'::regclass),
  CONSTRAINT "ck_u_recommendation_items_recommendation_item__7091c147" CHECK ("recommendation_item_id" >= 0 AND "recommendation_item_id" <= 18446744073709551615),
  "recommendation_run_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_recommendation_items_recommendation_run_i_658ea73a" CHECK ("recommendation_run_id" >= 0 AND "recommendation_run_id" <= 18446744073709551615),
  "offer_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_recommendation_items_offer_id_6b453e27" CHECK ("offer_id" >= 0 AND "offer_id" <= 18446744073709551615),
  "component_slot_code" VARCHAR(60) COLLATE mysql_0900_ai_ci NOT NULL,
  "rank_number" NUMERIC(10, 0) NOT NULL DEFAULT 1,
  CONSTRAINT "ck_u_recommendation_items_rank_number_e50ba293" CHECK ("rank_number" >= 0 AND "rank_number" <= 4294967295),
  "reason" TEXT COLLATE mysql_0900_ai_ci,
  "price_snapshot" NUMERIC(15, 2) NOT NULL,
  "estimated_metrics_json" JSONB,
  "is_selected" BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY ("recommendation_item_id"),
  CONSTRAINT "fk_recommendation_items_run" FOREIGN KEY ("recommendation_run_id") REFERENCES "recommendation_runs" ("recommendation_run_id") ON DELETE CASCADE,
  CONSTRAINT "fk_recommendation_items_offer" FOREIGN KEY ("offer_id") REFERENCES "product_offers" ("offer_id") ON DELETE RESTRICT,
  CONSTRAINT "chk_recommendation_item_price" CHECK (price_snapshot >= 0)
);
CREATE INDEX "ix_recommendation_items_run" ON "recommendation_items" ("recommendation_run_id", "component_slot_code", "rank_number");
ALTER SEQUENCE "recommendation_items_recommendation_item_id_seq_low" OWNED BY "recommendation_items"."recommendation_item_id";
ALTER SEQUENCE "recommendation_items_recommendation_item_id_seq_high" OWNED BY "recommendation_items"."recommendation_item_id";

CREATE TABLE "replacement_suggestions" (
  "replacement_suggestion_id" NUMERIC(20, 0) NOT NULL DEFAULT next_unsigned_bigint('replacement_suggestions_replacement_suggestion_id_seq_low'::regclass, 'replacement_suggestions_replacement_suggestion_id_seq_high'::regclass),
  CONSTRAINT "ck_u_replacement_suggestion_replacement_suggesti_5c753481" CHECK ("replacement_suggestion_id" >= 0 AND "replacement_suggestion_id" <= 18446744073709551615),
  "recommendation_run_id" NUMERIC(20, 0),
  CONSTRAINT "ck_u_replacement_suggestion_recommendation_run_i_0b53b691" CHECK ("recommendation_run_id" >= 0 AND "recommendation_run_id" <= 18446744073709551615),
  "source_build_item_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_replacement_suggestion_source_build_item_id_ad069e9e" CHECK ("source_build_item_id" >= 0 AND "source_build_item_id" <= 18446744073709551615),
  "replacement_offer_id" NUMERIC(20, 0) NOT NULL,
  CONSTRAINT "ck_u_replacement_suggestion_replacement_offer_id_5e3679cf" CHECK ("replacement_offer_id" >= 0 AND "replacement_offer_id" <= 18446744073709551615),
  "rank_number" NUMERIC(10, 0) NOT NULL DEFAULT 1,
  CONSTRAINT "ck_u_replacement_suggestion_rank_number_6d25a8b8" CHECK ("rank_number" >= 0 AND "rank_number" <= 4294967295),
  "price_difference" NUMERIC(15, 2) NOT NULL,
  "performance_delta_percent" NUMERIC(9, 3),
  "compatibility_status" VARCHAR(24) COLLATE mysql_0900_ai_ci NOT NULL DEFAULT 'NOT_CHECKED',
  "explanation" TEXT COLLATE mysql_0900_ai_ci,
  "analysis_json" JSONB,
  "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("replacement_suggestion_id"),
  CONSTRAINT "fk_replacement_run" FOREIGN KEY ("recommendation_run_id") REFERENCES "recommendation_runs" ("recommendation_run_id") ON DELETE SET NULL,
  CONSTRAINT "fk_replacement_source_item" FOREIGN KEY ("source_build_item_id") REFERENCES "pc_build_items" ("build_item_id") ON DELETE CASCADE,
  CONSTRAINT "fk_replacement_offer" FOREIGN KEY ("replacement_offer_id") REFERENCES "product_offers" ("offer_id") ON DELETE RESTRICT
);
CREATE INDEX "ix_replacement_source_item" ON "replacement_suggestions" ("source_build_item_id", "rank_number");
CREATE INDEX "ix_replacement_run" ON "replacement_suggestions" ("recommendation_run_id");
ALTER SEQUENCE "replacement_suggestions_replacement_suggestion_id_seq_low" OWNED BY "replacement_suggestions"."replacement_suggestion_id";
ALTER SEQUENCE "replacement_suggestions_replacement_suggestion_id_seq_high" OWNED BY "replacement_suggestions"."replacement_suggestion_id";

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "tr_users_updated_at"
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "tr_products_updated_at"
BEFORE UPDATE ON "products"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "tr_product_attribute_values_updated_at"
BEFORE UPDATE ON "product_attribute_values"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "tr_product_offers_updated_at"
BEFORE UPDATE ON "product_offers"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "tr_carts_updated_at"
BEFORE UPDATE ON "carts"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "tr_orders_updated_at"
BEFORE UPDATE ON "orders"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "tr_pc_builds_updated_at"
BEFORE UPDATE ON "pc_builds"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
