-- PC Builder Store MVP (35 tables)
-- Target: MySQL 8.0.16+
-- Scope: storefront, flexible component specifications, cart/order flow,
-- questionnaire, PC builder, compatibility checks, benchmarks and recommendations.
-- Chatbot, SEO, analytics, multi-warehouse stock and advanced refurbishing are intentionally excluded.

CREATE DATABASE IF NOT EXISTS pc_builder_store_mvp
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE pc_builder_store_mvp;

-- 1. Roles and users
CREATE TABLE IF NOT EXISTS roles (
    role_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_code VARCHAR(40) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    PRIMARY KEY (role_id),
    UNIQUE KEY uq_roles_code (role_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_id BIGINT UNSIGNED NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(40) NULL,
    customer_segment VARCHAR(20) NOT NULL DEFAULT 'UNSPECIFIED',
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),
    KEY ix_users_role (role_id),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT,
    CONSTRAINT chk_users_segment CHECK (customer_segment IN ('IT','NON_IT','UNSPECIFIED'))
) ENGINE=InnoDB;

-- 2. Catalogue and extensible product specification model
CREATE TABLE IF NOT EXISTS brands (
    brand_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    brand_name VARCHAR(120) NOT NULL,
    website_url VARCHAR(500) NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (brand_id),
    UNIQUE KEY uq_brands_name (brand_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
    category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_category_id BIGINT UNSIGNED NULL,
    category_code VARCHAR(60) NOT NULL,
    category_name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (category_id),
    UNIQUE KEY uq_categories_code (category_code),
    KEY ix_categories_parent (parent_category_id),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_types (
    product_type_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    type_code VARCHAR(60) NOT NULL,
    type_name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    is_build_component TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (product_type_id),
    UNIQUE KEY uq_product_types_code (type_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
    product_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_type_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    brand_id BIGINT UNSIGNED NULL,
    model_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(240) NOT NULL,
    short_description VARCHAR(500) NULL,
    description MEDIUMTEXT NULL,
    product_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id),
    UNIQUE KEY uq_products_model_code (model_code),
    KEY ix_products_type_status (product_type_id, product_status),
    KEY ix_products_category (category_id),
    KEY ix_products_brand (brand_id),
    KEY ix_products_name (product_name),
    CONSTRAINT fk_products_type FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_images (
    image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(1000) NOT NULL,
    alt_text VARCHAR(300) NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (image_id),
    KEY ix_product_images_product (product_id, sort_order),
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_attribute_definitions (
    attribute_definition_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_type_id BIGINT UNSIGNED NOT NULL,
    attribute_code VARCHAR(100) NOT NULL,
    attribute_name VARCHAR(160) NOT NULL,
    data_type VARCHAR(20) NOT NULL COMMENT 'TEXT, DECIMAL, INTEGER, BOOLEAN, JSON',
    unit VARCHAR(40) NULL,
    is_filterable TINYINT(1) NOT NULL DEFAULT 0,
    is_build_critical TINYINT(1) NOT NULL DEFAULT 0,
    validation_json JSON NULL,
    PRIMARY KEY (attribute_definition_id),
    UNIQUE KEY uq_attribute_def_type_code (product_type_id, attribute_code),
    KEY ix_attribute_def_type (product_type_id),
    CONSTRAINT fk_attribute_def_type FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id) ON DELETE RESTRICT,
    CONSTRAINT chk_attribute_data_type CHECK (data_type IN ('TEXT','DECIMAL','INTEGER','BOOLEAN','JSON'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_attribute_values (
    product_id BIGINT UNSIGNED NOT NULL,
    attribute_definition_id BIGINT UNSIGNED NOT NULL,
    value_text TEXT NULL,
    value_decimal DECIMAL(20,6) NULL,
    value_integer BIGINT NULL,
    value_boolean TINYINT(1) NULL,
    value_json JSON NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, attribute_definition_id),
    KEY ix_attribute_values_definition (attribute_definition_id),
    CONSTRAINT fk_attribute_values_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_attribute_values_definition FOREIGN KEY (attribute_definition_id) REFERENCES product_attribute_definitions(attribute_definition_id) ON DELETE RESTRICT,
    CONSTRAINT chk_attribute_value_one_type CHECK (
      (value_text IS NOT NULL) + (value_decimal IS NOT NULL) + (value_integer IS NOT NULL) + (value_boolean IS NOT NULL) + (value_json IS NOT NULL) = 1
    ),
    CONSTRAINT chk_attribute_value_boolean CHECK (value_boolean IS NULL OR value_boolean IN (0,1))
) ENGINE=InnoDB;

-- A product is a model; an offer is the actual sellable listing (new/used, price, stock, warranty).
CREATE TABLE IF NOT EXISTS product_offers (
    offer_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    offer_code VARCHAR(100) NOT NULL,
    condition_code VARCHAR(24) NOT NULL DEFAULT 'NEW',
    price DECIMAL(15,2) NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'VND',
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    reserved_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    warranty_months SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    offer_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (offer_id),
    UNIQUE KEY uq_product_offers_code (offer_code),
    KEY ix_offers_product_status (product_id, offer_status),
    KEY ix_offers_price (price),
    CONSTRAINT fk_offers_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    CONSTRAINT chk_offer_price CHECK (price >= 0),
    CONSTRAINT chk_offer_reserved CHECK (reserved_quantity <= stock_quantity)
) ENGINE=InnoDB;

-- Repeated connectors (e.g. two PCIe 8-pin plugs) are rows, not columns.
CREATE TABLE IF NOT EXISTS product_connectors (
    product_connector_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    connector_code VARCHAR(80) NOT NULL,
    direction_code VARCHAR(16) NOT NULL COMMENT 'PROVIDED or REQUIRED',
    quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    notes VARCHAR(500) NULL,
    PRIMARY KEY (product_connector_id),
    UNIQUE KEY uq_product_connector (product_id, connector_code, direction_code),
    CONSTRAINT fk_product_connectors_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT chk_connector_direction CHECK (direction_code IN ('PROVIDED','REQUIRED')),
    CONSTRAINT chk_connector_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_relationships (
    relationship_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    source_product_id BIGINT UNSIGNED NOT NULL,
    target_product_id BIGINT UNSIGNED NOT NULL,
    relationship_type VARCHAR(40) NOT NULL COMMENT 'COMPATIBLE, INCOMPATIBLE, ALTERNATIVE, REQUIRES, etc.',
    status_code VARCHAR(24) NOT NULL DEFAULT 'CONFIRMED',
    source_note VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (relationship_id),
    UNIQUE KEY uq_product_relationship (source_product_id, target_product_id, relationship_type),
    KEY ix_relationship_target (target_product_id, relationship_type),
    CONSTRAINT fk_relationship_source FOREIGN KEY (source_product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_relationship_target FOREIGN KEY (target_product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    CONSTRAINT chk_relationship_not_self CHECK (source_product_id <> target_product_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compatibility_rules (
    rule_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    rule_code VARCHAR(100) NOT NULL,
    rule_name VARCHAR(180) NOT NULL,
    source_product_type_id BIGINT UNSIGNED NULL,
    target_product_type_id BIGINT UNSIGNED NULL,
    evaluator_key VARCHAR(100) NOT NULL COMMENT 'Backend evaluator identifier; adding a rule may require backend code.',
    severity_code VARCHAR(16) NOT NULL DEFAULT 'WARNING',
    parameters_json JSON NULL,
    explanation_template VARCHAR(1000) NULL,
    priority INT NOT NULL DEFAULT 100,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (rule_id),
    UNIQUE KEY uq_compatibility_rules_code (rule_code),
    KEY ix_compatibility_rule_types (source_product_type_id, target_product_type_id, is_active),
    CONSTRAINT fk_compat_rules_source_type FOREIGN KEY (source_product_type_id) REFERENCES product_types(product_type_id) ON DELETE SET NULL,
    CONSTRAINT fk_compat_rules_target_type FOREIGN KEY (target_product_type_id) REFERENCES product_types(product_type_id) ON DELETE SET NULL,
    CONSTRAINT chk_compat_rule_severity CHECK (severity_code IN ('ERROR','WARNING','INFO'))
) ENGINE=InnoDB;

-- 3. Cart and basic order flow. Payment and shipping status are kept on the order for MVP simplicity.
CREATE TABLE IF NOT EXISTS carts (
    cart_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    guest_token VARCHAR(128) NULL,
    cart_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cart_id),
    UNIQUE KEY uq_carts_guest_token (guest_token),
    KEY ix_carts_user_status (user_id, cart_status),
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_cart_owner CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cart_id BIGINT UNSIGNED NOT NULL,
    offer_id BIGINT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cart_item_id),
    UNIQUE KEY uq_cart_item_offer (cart_id, offer_id),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_offer FOREIGN KEY (offer_id) REFERENCES product_offers(offer_id) ON DELETE RESTRICT,
    CONSTRAINT chk_cart_item_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
    order_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_number VARCHAR(60) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    customer_name VARCHAR(160) NOT NULL,
    customer_email VARCHAR(254) NOT NULL,
    customer_phone VARCHAR(40) NULL,
    shipping_address TEXT NOT NULL,
    shipping_region VARCHAR(160) NULL,
    shipping_postal_code VARCHAR(30) NULL,
    order_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(40) NULL,
    payment_status VARCHAR(24) NOT NULL DEFAULT 'UNPAID',
    payment_reference VARCHAR(180) NULL,
    shipment_status VARCHAR(24) NOT NULL DEFAULT 'NOT_SHIPPED',
    shipping_carrier VARCHAR(100) NULL,
    tracking_number VARCHAR(180) NULL,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id),
    UNIQUE KEY uq_orders_number (order_number),
    KEY ix_orders_user_date (user_id, placed_at),
    KEY ix_orders_status_date (order_status, placed_at),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_order_amounts CHECK (subtotal >= 0 AND shipping_fee >= 0 AND discount_amount >= 0 AND total_amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    offer_id BIGINT UNSIGNED NOT NULL,
    product_name_snapshot VARCHAR(240) NOT NULL,
    offer_code_snapshot VARCHAR(100) NOT NULL,
    condition_snapshot VARCHAR(24) NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    PRIMARY KEY (order_item_id),
    KEY ix_order_items_order (order_id),
    KEY ix_order_items_offer (offer_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_offer FOREIGN KEY (offer_id) REFERENCES product_offers(offer_id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_item_values CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_reviews (
    review_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    review_title VARCHAR(180) NULL,
    review_text TEXT NULL,
    review_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id),
    UNIQUE KEY uq_product_review_user (product_id, user_id),
    KEY ix_product_reviews_status (product_id, review_status),
    CONSTRAINT fk_product_reviews_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_product_reviews_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_product_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- 4. Use cases and data-driven questionnaire. Option rows can map to a use case.
CREATE TABLE IF NOT EXISTS use_cases (
    use_case_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    use_case_code VARCHAR(60) NOT NULL,
    use_case_name VARCHAR(140) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (use_case_id),
    UNIQUE KEY uq_use_cases_code (use_case_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questionnaire_templates (
    template_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    template_code VARCHAR(80) NOT NULL,
    template_name VARCHAR(180) NOT NULL,
    audience_segment VARCHAR(20) NOT NULL DEFAULT 'BOTH',
    version_number INT UNSIGNED NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (template_id),
    UNIQUE KEY uq_questionnaire_template_version (template_code, version_number),
    CONSTRAINT chk_questionnaire_audience CHECK (audience_segment IN ('IT','NON_IT','BOTH'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questionnaire_questions (
    question_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    template_id BIGINT UNSIGNED NOT NULL,
    depends_on_question_id BIGINT UNSIGNED NULL,
    question_code VARCHAR(80) NOT NULL,
    question_text VARCHAR(1000) NOT NULL,
    answer_type VARCHAR(24) NOT NULL COMMENT 'SINGLE_CHOICE, MULTI_CHOICE, TEXT, NUMBER, BOOLEAN',
    is_required TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    display_condition_json JSON NULL,
    PRIMARY KEY (question_id),
    UNIQUE KEY uq_question_code (template_id, question_code),
    KEY ix_questions_template_order (template_id, sort_order),
    CONSTRAINT fk_questions_template FOREIGN KEY (template_id) REFERENCES questionnaire_templates(template_id) ON DELETE CASCADE,
    CONSTRAINT fk_questions_dependency FOREIGN KEY (depends_on_question_id) REFERENCES questionnaire_questions(question_id) ON DELETE SET NULL,
    CONSTRAINT chk_question_answer_type CHECK (answer_type IN ('SINGLE_CHOICE','MULTI_CHOICE','TEXT','NUMBER','BOOLEAN'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questionnaire_options (
    option_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    question_id BIGINT UNSIGNED NOT NULL,
    mapped_use_case_id BIGINT UNSIGNED NULL,
    option_code VARCHAR(80) NOT NULL,
    option_label VARCHAR(300) NOT NULL,
    numeric_value DECIMAL(18,4) NULL,
    option_data_json JSON NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (option_id),
    UNIQUE KEY uq_question_option_code (question_id, option_code),
    KEY ix_question_options_use_case (mapped_use_case_id),
    CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES questionnaire_questions(question_id) ON DELETE CASCADE,
    CONSTRAINT fk_options_use_case FOREIGN KEY (mapped_use_case_id) REFERENCES use_cases(use_case_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questionnaire_sessions (
    questionnaire_session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    template_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    audience_segment VARCHAR(20) NOT NULL,
    session_status VARCHAR(24) NOT NULL DEFAULT 'IN_PROGRESS',
    budget_min DECIMAL(15,2) NULL,
    budget_max DECIMAL(15,2) NULL,
    region_code VARCHAR(80) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    PRIMARY KEY (questionnaire_session_id),
    KEY ix_questionnaire_sessions_user (user_id, created_at),
    KEY ix_questionnaire_sessions_template (template_id, session_status),
    CONSTRAINT fk_questionnaire_sessions_template FOREIGN KEY (template_id) REFERENCES questionnaire_templates(template_id) ON DELETE RESTRICT,
    CONSTRAINT fk_questionnaire_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_questionnaire_session_budget CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max),
    CONSTRAINT chk_questionnaire_session_audience CHECK (audience_segment IN ('IT','NON_IT'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questionnaire_answers (
    answer_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    questionnaire_session_id BIGINT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    selected_option_id BIGINT UNSIGNED NULL,
    answer_text TEXT NULL,
    answer_number DECIMAL(20,6) NULL,
    answer_boolean TINYINT(1) NULL,
    answer_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (answer_id),
    KEY ix_answers_session_question (questionnaire_session_id, question_id),
    KEY ix_answers_option (selected_option_id),
    CONSTRAINT fk_answers_session FOREIGN KEY (questionnaire_session_id) REFERENCES questionnaire_sessions(questionnaire_session_id) ON DELETE CASCADE,
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questionnaire_questions(question_id) ON DELETE RESTRICT,
    CONSTRAINT fk_answers_option FOREIGN KEY (selected_option_id) REFERENCES questionnaire_options(option_id) ON DELETE SET NULL,
    CONSTRAINT chk_answer_one_value CHECK (
      (selected_option_id IS NOT NULL AND answer_text IS NULL AND answer_number IS NULL AND answer_boolean IS NULL AND answer_json IS NULL)
      OR
      (selected_option_id IS NULL AND (answer_text IS NOT NULL) + (answer_number IS NOT NULL) + (answer_boolean IS NOT NULL) + (answer_json IS NOT NULL) = 1)
    )
) ENGINE=InnoDB;

-- 5. PC Builder. A build has multiple immutable-ish revisions for comparison/history.
CREATE TABLE IF NOT EXISTS pc_builds (
    build_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    build_name VARCHAR(180) NOT NULL,
    description TEXT NULL,
    budget_min DECIMAL(15,2) NULL,
    budget_max DECIMAL(15,2) NULL,
    primary_use_case_id BIGINT UNSIGNED NULL,
    target_resolution VARCHAR(40) NULL,
    build_status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    is_public TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (build_id),
    KEY ix_pc_builds_user (user_id, updated_at),
    KEY ix_pc_builds_use_case (primary_use_case_id),
    CONSTRAINT fk_pc_builds_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_pc_builds_use_case FOREIGN KEY (primary_use_case_id) REFERENCES use_cases(use_case_id) ON DELETE SET NULL,
    CONSTRAINT chk_pc_build_budget CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pc_build_revisions (
    build_revision_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    build_id BIGINT UNSIGNED NOT NULL,
    revision_number INT UNSIGNED NOT NULL,
    revision_name VARCHAR(180) NULL,
    estimated_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (build_revision_id),
    UNIQUE KEY uq_build_revision_number (build_id, revision_number),
    CONSTRAINT fk_build_revisions_build FOREIGN KEY (build_id) REFERENCES pc_builds(build_id) ON DELETE CASCADE,
    CONSTRAINT fk_build_revisions_user FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_build_revision_total CHECK (estimated_total >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pc_build_items (
    build_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    build_revision_id BIGINT UNSIGNED NOT NULL,
    component_slot_code VARCHAR(60) NOT NULL COMMENT 'CPU, GPU, MOTHERBOARD, RAM_1, STORAGE_1, etc.',
    offer_id BIGINT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    unit_price_snapshot DECIMAL(15,2) NOT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (build_item_id),
    UNIQUE KEY uq_build_item_slot (build_revision_id, component_slot_code),
    KEY ix_build_items_offer (offer_id),
    CONSTRAINT fk_build_items_revision FOREIGN KEY (build_revision_id) REFERENCES pc_build_revisions(build_revision_id) ON DELETE CASCADE,
    CONSTRAINT fk_build_items_offer FOREIGN KEY (offer_id) REFERENCES product_offers(offer_id) ON DELETE RESTRICT,
    CONSTRAINT chk_build_item_values CHECK (quantity > 0 AND unit_price_snapshot >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS build_check_runs (
    build_check_run_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    build_revision_id BIGINT UNSIGNED NOT NULL,
    overall_status VARCHAR(24) NOT NULL DEFAULT 'NOT_CHECKED',
    total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    checked_rule_count INT UNSIGNED NOT NULL DEFAULT 0,
    error_count INT UNSIGNED NOT NULL DEFAULT 0,
    warning_count INT UNSIGNED NOT NULL DEFAULT 0,
    checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    summary_json JSON NULL,
    PRIMARY KEY (build_check_run_id),
    KEY ix_build_checks_revision (build_revision_id, checked_at),
    CONSTRAINT fk_build_checks_revision FOREIGN KEY (build_revision_id) REFERENCES pc_build_revisions(build_revision_id) ON DELETE CASCADE,
    CONSTRAINT chk_build_check_total CHECK (total_price >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS build_check_results (
    build_check_result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    build_check_run_id BIGINT UNSIGNED NOT NULL,
    rule_id BIGINT UNSIGNED NULL,
    source_build_item_id BIGINT UNSIGNED NULL,
    target_build_item_id BIGINT UNSIGNED NULL,
    severity_code VARCHAR(16) NOT NULL,
    result_status VARCHAR(24) NOT NULL,
    message VARCHAR(1200) NOT NULL,
    details_json JSON NULL,
    PRIMARY KEY (build_check_result_id),
    KEY ix_build_check_results_run (build_check_run_id, severity_code),
    KEY ix_build_check_results_rule (rule_id),
    CONSTRAINT fk_build_check_results_run FOREIGN KEY (build_check_run_id) REFERENCES build_check_runs(build_check_run_id) ON DELETE CASCADE,
    CONSTRAINT fk_build_check_results_rule FOREIGN KEY (rule_id) REFERENCES compatibility_rules(rule_id) ON DELETE SET NULL,
    CONSTRAINT fk_build_check_source_item FOREIGN KEY (source_build_item_id) REFERENCES pc_build_items(build_item_id) ON DELETE SET NULL,
    CONSTRAINT fk_build_check_target_item FOREIGN KEY (target_build_item_id) REFERENCES pc_build_items(build_item_id) ON DELETE SET NULL,
    CONSTRAINT chk_build_check_result_severity CHECK (severity_code IN ('ERROR','WARNING','INFO'))
) ENGINE=InnoDB;

-- 6. Benchmark and performance estimation
CREATE TABLE IF NOT EXISTS benchmark_scenarios (
    benchmark_scenario_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    scenario_code VARCHAR(100) NOT NULL,
    scenario_name VARCHAR(240) NOT NULL,
    workload_type VARCHAR(40) NOT NULL COMMENT 'GAME, SOFTWARE, SYNTHETIC, OTHER',
    workload_name VARCHAR(240) NOT NULL,
    resolution VARCHAR(40) NULL,
    quality_preset VARCHAR(80) NULL,
    scenario_version VARCHAR(80) NULL,
    extra_parameters_json JSON NULL,
    PRIMARY KEY (benchmark_scenario_id),
    UNIQUE KEY uq_benchmark_scenario_code (scenario_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS benchmark_results (
    benchmark_result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    benchmark_scenario_id BIGINT UNSIGNED NOT NULL,
    metric_code VARCHAR(80) NOT NULL COMMENT 'FPS_AVG, FPS_1_LOW, SCORE, POWER_WATT, etc.',
    metric_value DECIMAL(20,6) NOT NULL,
    unit VARCHAR(40) NOT NULL,
    result_kind VARCHAR(24) NOT NULL DEFAULT 'MEASURED',
    source_name VARCHAR(240) NULL,
    source_url VARCHAR(1000) NULL,
    confidence_score DECIMAL(5,2) NULL,
    equipment_json JSON NULL,
    recorded_at DATETIME NULL,
    PRIMARY KEY (benchmark_result_id),
    KEY ix_benchmark_product_scenario (product_id, benchmark_scenario_id, metric_code),
    KEY ix_benchmark_scenario_metric (benchmark_scenario_id, metric_code),
    CONSTRAINT fk_benchmark_result_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_benchmark_result_scenario FOREIGN KEY (benchmark_scenario_id) REFERENCES benchmark_scenarios(benchmark_scenario_id) ON DELETE RESTRICT,
    CONSTRAINT chk_benchmark_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_benchmark_results (
    system_benchmark_result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    build_revision_id BIGINT UNSIGNED NOT NULL,
    benchmark_scenario_id BIGINT UNSIGNED NOT NULL,
    metric_code VARCHAR(80) NOT NULL,
    metric_value DECIMAL(20,6) NOT NULL,
    unit VARCHAR(40) NOT NULL,
    result_kind VARCHAR(24) NOT NULL DEFAULT 'ESTIMATED',
    source_name VARCHAR(240) NULL,
    confidence_score DECIMAL(5,2) NULL,
    notes VARCHAR(1000) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (system_benchmark_result_id),
    KEY ix_system_benchmark_revision (build_revision_id, benchmark_scenario_id),
    CONSTRAINT fk_system_benchmark_revision FOREIGN KEY (build_revision_id) REFERENCES pc_build_revisions(build_revision_id) ON DELETE CASCADE,
    CONSTRAINT fk_system_benchmark_scenario FOREIGN KEY (benchmark_scenario_id) REFERENCES benchmark_scenarios(benchmark_scenario_id) ON DELETE RESTRICT,
    CONSTRAINT chk_system_benchmark_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
) ENGINE=InnoDB;

-- One recommendation run can also persist performance analysis in analysis_json.
CREATE TABLE IF NOT EXISTS recommendation_runs (
    recommendation_run_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    questionnaire_session_id BIGINT UNSIGNED NULL,
    build_revision_id BIGINT UNSIGNED NULL,
    recommendation_type VARCHAR(40) NOT NULL COMMENT 'INITIAL_BUILD, REPLACEMENT, PERFORMANCE_ANALYSIS, etc.',
    method_key VARCHAR(100) NOT NULL COMMENT 'RULE_BASED, BENCHMARK_MATCH, AI_ASSISTED, etc.',
    run_status VARCHAR(24) NOT NULL DEFAULT 'COMPLETED',
    budget_target DECIMAL(15,2) NULL,
    summary TEXT NULL,
    analysis_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recommendation_run_id),
    KEY ix_recommendation_user_date (user_id, created_at),
    KEY ix_recommendation_questionnaire (questionnaire_session_id),
    KEY ix_recommendation_build_revision (build_revision_id),
    CONSTRAINT fk_recommendations_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_recommendations_questionnaire FOREIGN KEY (questionnaire_session_id) REFERENCES questionnaire_sessions(questionnaire_session_id) ON DELETE SET NULL,
    CONSTRAINT fk_recommendations_revision FOREIGN KEY (build_revision_id) REFERENCES pc_build_revisions(build_revision_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recommendation_items (
    recommendation_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    recommendation_run_id BIGINT UNSIGNED NOT NULL,
    offer_id BIGINT UNSIGNED NOT NULL,
    component_slot_code VARCHAR(60) NOT NULL,
    rank_number INT UNSIGNED NOT NULL DEFAULT 1,
    reason TEXT NULL,
    price_snapshot DECIMAL(15,2) NOT NULL,
    estimated_metrics_json JSON NULL,
    is_selected TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (recommendation_item_id),
    KEY ix_recommendation_items_run (recommendation_run_id, component_slot_code, rank_number),
    CONSTRAINT fk_recommendation_items_run FOREIGN KEY (recommendation_run_id) REFERENCES recommendation_runs(recommendation_run_id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_items_offer FOREIGN KEY (offer_id) REFERENCES product_offers(offer_id) ON DELETE RESTRICT,
    CONSTRAINT chk_recommendation_item_price CHECK (price_snapshot >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS replacement_suggestions (
    replacement_suggestion_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    recommendation_run_id BIGINT UNSIGNED NULL,
    source_build_item_id BIGINT UNSIGNED NOT NULL,
    replacement_offer_id BIGINT UNSIGNED NOT NULL,
    rank_number INT UNSIGNED NOT NULL DEFAULT 1,
    price_difference DECIMAL(15,2) NOT NULL COMMENT 'Negative means cheaper; positive means more expensive.',
    performance_delta_percent DECIMAL(9,3) NULL,
    compatibility_status VARCHAR(24) NOT NULL DEFAULT 'NOT_CHECKED',
    explanation TEXT NULL,
    analysis_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (replacement_suggestion_id),
    KEY ix_replacement_source_item (source_build_item_id, rank_number),
    KEY ix_replacement_run (recommendation_run_id),
    CONSTRAINT fk_replacement_run FOREIGN KEY (recommendation_run_id) REFERENCES recommendation_runs(recommendation_run_id) ON DELETE SET NULL,
    CONSTRAINT fk_replacement_source_item FOREIGN KEY (source_build_item_id) REFERENCES pc_build_items(build_item_id) ON DELETE CASCADE,
    CONSTRAINT fk_replacement_offer FOREIGN KEY (replacement_offer_id) REFERENCES product_offers(offer_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Seed roles, common product types, use cases, first compatibility rules and sample attributes.
INSERT INTO roles (role_code, role_name, description) VALUES
 ('ADMIN','Administrator','Manages products, users, rules and system configuration'),
 ('SALES','Sales Staff','Handles orders and customer assistance'),
 ('CUSTOMER','Customer','Browses products, buys items and builds PC configurations')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description);

INSERT INTO product_types (type_code, type_name, description, is_build_component) VALUES
 ('PC','Complete PC','Prebuilt desktop computer',0),
 ('CPU','Processor','Desktop CPU',1),
 ('GPU','Graphics Card','Discrete graphics card',1),
 ('MOTHERBOARD','Motherboard','Main board',1),
 ('RAM','Memory','Desktop RAM modules',1),
 ('STORAGE','Storage','SSD or HDD',1),
 ('PSU','Power Supply','Computer power supply',1),
 ('CASE','PC Case','Computer chassis',1),
 ('COOLER','CPU Cooler','CPU cooling solution',1),
 ('ACCESSORY','Accessory','Other PC accessories',0)
ON DUPLICATE KEY UPDATE type_name = VALUES(type_name), description = VALUES(description), is_build_component = VALUES(is_build_component);

INSERT INTO use_cases (use_case_code, use_case_name, description) VALUES
 ('GAMING','Gaming','Playing PC games'),
 ('OFFICE','Office','Office and everyday productivity'),
 ('PROGRAMMING','Programming','Software development'),
 ('VIDEO_EDITING','Video Editing','Video editing and rendering'),
 ('DESIGN_3D','3D Design','3D modelling and rendering'),
 ('AI_ML','AI / Machine Learning','Local AI or machine learning workloads'),
 ('STREAMING','Streaming','Game or desktop streaming')
ON DUPLICATE KEY UPDATE use_case_name = VALUES(use_case_name), description = VALUES(description);

-- Initial data-driven attribute definitions. Add future specs by inserting rows, not columns.
INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, src.attribute_code, src.attribute_name, src.data_type, src.unit, src.is_filterable, src.is_build_critical
FROM product_types pt
JOIN (
 SELECT 'CPU' type_code, 'socket' attribute_code, 'CPU socket' attribute_name, 'TEXT' data_type, NULL unit, 1 is_filterable, 1 is_build_critical UNION ALL
 SELECT 'CPU','core_count','Core count','INTEGER','cores',1,0 UNION ALL
 SELECT 'CPU','thread_count','Thread count','INTEGER','threads',1,0 UNION ALL
 SELECT 'CPU','tdp_watt','TDP','DECIMAL','W',1,1 UNION ALL
 SELECT 'CPU','memory_type','Supported memory type','TEXT',NULL,1,1 UNION ALL
 SELECT 'GPU','gpu_chip','GPU chip','TEXT',NULL,1,0 UNION ALL
 SELECT 'GPU','vram_gb','VRAM capacity','INTEGER','GB',1,0 UNION ALL
 SELECT 'GPU','length_mm','GPU length','DECIMAL','mm',0,1 UNION ALL
 SELECT 'GPU','power_watt','GPU power draw','DECIMAL','W',0,1 UNION ALL
 SELECT 'GPU','recommended_psu_watt','Recommended PSU wattage','INTEGER','W',0,1 UNION ALL
 SELECT 'MOTHERBOARD','socket','CPU socket','TEXT',NULL,1,1 UNION ALL
 SELECT 'MOTHERBOARD','memory_type','Supported memory type','TEXT',NULL,1,1 UNION ALL
 SELECT 'MOTHERBOARD','memory_slots','Memory slots','INTEGER','slots',0,0 UNION ALL
 SELECT 'MOTHERBOARD','max_memory_gb','Maximum memory','INTEGER','GB',0,1 UNION ALL
 SELECT 'MOTHERBOARD','form_factor','Motherboard form factor','TEXT',NULL,1,1 UNION ALL
 SELECT 'RAM','memory_type','Memory generation','TEXT',NULL,1,1 UNION ALL
 SELECT 'RAM','capacity_gb','Capacity per module','INTEGER','GB',1,0 UNION ALL
 SELECT 'RAM','speed_mhz','Memory speed','INTEGER','MHz',1,0 UNION ALL
 SELECT 'STORAGE','storage_type','Storage type','TEXT',NULL,1,0 UNION ALL
 SELECT 'STORAGE','capacity_gb','Storage capacity','INTEGER','GB',1,0 UNION ALL
 SELECT 'STORAGE','interface','Storage interface','TEXT',NULL,1,1 UNION ALL
 SELECT 'PSU','wattage','Rated output power','INTEGER','W',1,1 UNION ALL
 SELECT 'CASE','max_gpu_length_mm','Maximum GPU length','DECIMAL','mm',0,1 UNION ALL
 SELECT 'CASE','max_cooler_height_mm','Maximum cooler height','DECIMAL','mm',0,1 UNION ALL
 SELECT 'CASE','motherboard_form_factors','Supported motherboard form factors','JSON',NULL,0,1 UNION ALL
 SELECT 'COOLER','supported_sockets','Supported CPU sockets','JSON',NULL,0,1 UNION ALL
 SELECT 'COOLER','cooler_height_mm','Cooler height','DECIMAL','mm',0,1
) AS src ON src.type_code = pt.type_code
ON DUPLICATE KEY UPDATE
 attribute_name = VALUES(attribute_name), data_type = VALUES(data_type), unit = VALUES(unit),
 is_filterable = VALUES(is_filterable), is_build_critical = VALUES(is_build_critical);

-- Seed rule definitions; backend must implement each evaluator_key.
INSERT INTO compatibility_rules
 (rule_code, rule_name, source_product_type_id, target_product_type_id, evaluator_key, severity_code, parameters_json, explanation_template, priority, is_active)
SELECT 'CPU_MOTHERBOARD_SOCKET', 'CPU and motherboard socket match', cpu.product_type_id, mb.product_type_id,
       'ATTRIBUTE_EQUALS', 'ERROR',
       JSON_OBJECT('source_attribute','socket','target_attribute','socket','on_missing','WARNING'),
       'CPU socket must match the motherboard socket.', 10, 1
FROM product_types cpu JOIN product_types mb
WHERE cpu.type_code = 'CPU' AND mb.type_code = 'MOTHERBOARD'
ON DUPLICATE KEY UPDATE rule_name = VALUES(rule_name), parameters_json = VALUES(parameters_json), is_active = VALUES(is_active);

INSERT INTO compatibility_rules
 (rule_code, rule_name, source_product_type_id, target_product_type_id, evaluator_key, severity_code, parameters_json, explanation_template, priority, is_active)
SELECT 'MOTHERBOARD_RAM_TYPE', 'Motherboard and RAM generation match', mb.product_type_id, ram.product_type_id,
       'ATTRIBUTE_EQUALS', 'ERROR',
       JSON_OBJECT('source_attribute','memory_type','target_attribute','memory_type','on_missing','WARNING'),
       'RAM generation must be supported by the motherboard.', 20, 1
FROM product_types mb JOIN product_types ram
WHERE mb.type_code = 'MOTHERBOARD' AND ram.type_code = 'RAM'
ON DUPLICATE KEY UPDATE rule_name = VALUES(rule_name), parameters_json = VALUES(parameters_json), is_active = VALUES(is_active);

-- End of schema and seed data.
