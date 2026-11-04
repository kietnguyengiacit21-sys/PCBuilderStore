# Phân tích schema 35 bảng

## Nguồn và tương thích

Đã đọc `schema_35_tables.sql` và đối chiếu `frontend/schema-35-tables-reference.sql`: hai tệp giống byte-for-byte (38,965 bytes; SHA-256 `664ad5a5e67e4f6207f3bc94eaf044afa2a2829692ad5040a41242efdf822b11`). DDL ghi rõ MySQL 8.0.16+, `InnoDB`, `CREATE DATABASE`, `USE`, `AUTO_INCREMENT`, `UNSIGNED`, `TINYINT(1)`, `JSON` và `ON UPDATE CURRENT_TIMESTAMP`. Đây **không phải DDL PostgreSQL**.

Do yêu cầu đích là PostgreSQL nhưng không được đổi mô hình 35 bảng, cần port ngữ nghĩa tương đương trước khi triển khai: `AUTO_INCREMENT` → identity/sequence; `UNSIGNED` → kiểu signed cùng constraint không âm; `TINYINT(1)` → boolean; `DATETIME` → `timestamp` phù hợp; `MEDIUMTEXT` → `text`; JSON có thể thành `jsonb`; `ON UPDATE CURRENT_TIMESTAMP` → cập nhật timestamp qua ứng dụng/trigger. Đây là hướng dẫn tương thích, không phải migration đã viết hoặc thay đổi schema được duyệt. Tên bảng/cột, nullability, PK, unique, FK, check và cascade phải được đối chiếu sau khi chủ dự án duyệt.

## Danh mục đầy đủ

Các danh sách cột dưới đây giữ nguyên tên trong DDL. PK/FK/unique được nêu để chỉ ra quan hệ và ràng buộc; không suy ra thêm bảng/field.

### Identity

| # | Bảng | Cột | PK / unique / quan hệ chính |
|---:|---|---|---|
| 1 | `roles` | `role_id`, `role_code`, `role_name`, `description` | PK `role_id`; unique `role_code`. |
| 2 | `users` | `user_id`, `role_id`, `full_name`, `email`, `password_hash`, `phone`, `customer_segment`, `account_status`, `created_at`, `updated_at` | PK `user_id`; unique `email`; FK `role_id → roles`. Check segment: `IT`, `NON_IT`, `UNSPECIFIED`. User chỉ có một role. |

### Catalog và tương thích sản phẩm

| # | Bảng | Cột | PK / unique / quan hệ chính |
|---:|---|---|---|
| 3 | `brands` | `brand_id`, `brand_name`, `website_url`, `description`, `is_active` | PK `brand_id`; unique `brand_name`. |
| 4 | `categories` | `category_id`, `parent_category_id`, `category_code`, `category_name`, `description`, `is_active` | PK `category_id`; unique `category_code`; self-FK `parent_category_id`, delete đặt NULL. |
| 5 | `product_types` | `product_type_id`, `type_code`, `type_name`, `description`, `is_build_component`, `is_active` | PK `product_type_id`; unique `type_code`. |
| 6 | `products` | `product_id`, `product_type_id`, `category_id`, `brand_id`, `model_code`, `product_name`, `short_description`, `description`, `product_status`, `created_at`, `updated_at` | PK `product_id`; unique `model_code`; FK loại, danh mục và thương hiệu. |
| 7 | `product_images` | `image_id`, `product_id`, `image_url`, `alt_text`, `is_primary`, `sort_order` | PK `image_id`; FK sản phẩm, cascade delete. |
| 8 | `product_attribute_definitions` | `attribute_definition_id`, `product_type_id`, `attribute_code`, `attribute_name`, `data_type`, `unit`, `is_filterable`, `is_build_critical`, `validation_json` | PK `attribute_definition_id`; unique (`product_type_id`, `attribute_code`); FK loại sản phẩm. `data_type`: `TEXT`, `DECIMAL`, `INTEGER`, `BOOLEAN`, `JSON`. |
| 9 | `product_attribute_values` | `product_id`, `attribute_definition_id`, `value_text`, `value_decimal`, `value_integer`, `value_boolean`, `value_json`, `updated_at` | Composite PK (`product_id`, `attribute_definition_id`); FK product và attribute definition. Check đúng một cột value được đặt; Boolean là 0/1. |
| 10 | `product_offers` | `offer_id`, `product_id`, `offer_code`, `condition_code`, `price`, `currency_code`, `stock_quantity`, `reserved_quantity`, `warranty_months`, `offer_status`, `created_at`, `updated_at` | PK `offer_id`; unique `offer_code`; FK product. Check giá không âm, `reserved_quantity ≤ stock_quantity`. |
| 11 | `product_connectors` | `product_connector_id`, `product_id`, `connector_code`, `direction_code`, `quantity`, `notes` | PK `product_connector_id`; unique (`product_id`, `connector_code`, `direction_code`); FK product. Direction `PROVIDED`/`REQUIRED`; quantity > 0. |
| 12 | `product_relationships` | `relationship_id`, `source_product_id`, `target_product_id`, `relationship_type`, `status_code`, `source_note`, `created_at` | PK `relationship_id`; unique (`source_product_id`, `target_product_id`, `relationship_type`); hai FK product; không cho self-relation. |
| 13 | `compatibility_rules` | `rule_id`, `rule_code`, `rule_name`, `source_product_type_id`, `target_product_type_id`, `evaluator_key`, `severity_code`, `parameters_json`, `explanation_template`, `priority`, `is_active` | PK `rule_id`; unique `rule_code`; FK source/target type, delete đặt NULL. Severity `ERROR`, `WARNING`, `INFO`. Evaluator implementation không nằm trong schema. |

### Giỏ hàng, đơn và review

| # | Bảng | Cột | PK / unique / quan hệ chính |
|---:|---|---|---|
| 14 | `carts` | `cart_id`, `user_id`, `guest_token`, `cart_status`, `created_at`, `updated_at` | PK `cart_id`; unique `guest_token`; FK user, delete đặt NULL. Check có `user_id` hoặc `guest_token` (DDL cho phép có cả hai). |
| 15 | `cart_items` | `cart_item_id`, `cart_id`, `offer_id`, `quantity`, `added_at` | PK `cart_item_id`; unique (`cart_id`, `offer_id`); FK cart (cascade) và offer (restrict); quantity > 0. |
| 16 | `orders` | `order_id`, `order_number`, `user_id`, `customer_name`, `customer_email`, `customer_phone`, `shipping_address`, `shipping_region`, `shipping_postal_code`, `order_status`, `payment_method`, `payment_status`, `payment_reference`, `shipment_status`, `shipping_carrier`, `tracking_number`, `subtotal`, `shipping_fee`, `discount_amount`, `total_amount`, `placed_at`, `updated_at` | PK `order_id`; unique `order_number`; FK user, delete đặt NULL; các amount không âm. |
| 17 | `order_items` | `order_item_id`, `order_id`, `offer_id`, `product_name_snapshot`, `offer_code_snapshot`, `condition_snapshot`, `quantity`, `unit_price`, `line_total` | PK `order_item_id`; FK order (cascade) và offer (restrict); quantity > 0, giá/tổng không âm. Snapshot lưu tên/mã/condition tại thời điểm đặt. |
| 18 | `product_reviews` | `review_id`, `product_id`, `user_id`, `rating`, `review_title`, `review_text`, `review_status`, `created_at` | PK `review_id`; unique (`product_id`, `user_id`); FK product/user (cascade); rating 1–5. Không có trạng thái được duyệt cụ thể trong DDL. |

### Use case và questionnaire

| # | Bảng | Cột | PK / unique / quan hệ chính |
|---:|---|---|---|
| 19 | `use_cases` | `use_case_id`, `use_case_code`, `use_case_name`, `description`, `is_active` | PK `use_case_id`; unique `use_case_code`. |
| 20 | `questionnaire_templates` | `template_id`, `template_code`, `template_name`, `audience_segment`, `version_number`, `is_active` | PK `template_id`; unique (`template_code`, `version_number`); audience `IT`, `NON_IT`, `BOTH`. |
| 21 | `questionnaire_questions` | `question_id`, `template_id`, `depends_on_question_id`, `question_code`, `question_text`, `answer_type`, `is_required`, `sort_order`, `display_condition_json` | PK `question_id`; unique (`template_id`, `question_code`); FK template (cascade) và self-dependency (set NULL). Answer type `SINGLE_CHOICE`, `MULTI_CHOICE`, `TEXT`, `NUMBER`, `BOOLEAN`. |
| 22 | `questionnaire_options` | `option_id`, `question_id`, `mapped_use_case_id`, `option_code`, `option_label`, `numeric_value`, `option_data_json`, `sort_order` | PK `option_id`; unique (`question_id`, `option_code`); FK question (cascade) và use case (set NULL). |
| 23 | `questionnaire_sessions` | `questionnaire_session_id`, `template_id`, `user_id`, `audience_segment`, `session_status`, `budget_min`, `budget_max`, `region_code`, `created_at`, `completed_at` | PK `questionnaire_session_id`; FK template (restrict), user (set NULL); budget min ≤ max; segment `IT`/`NON_IT`. |
| 24 | `questionnaire_answers` | `answer_id`, `questionnaire_session_id`, `question_id`, `selected_option_id`, `answer_text`, `answer_number`, `answer_boolean`, `answer_json`, `created_at` | PK `answer_id`; FK session (cascade), question (restrict), option (set NULL); check một giá trị trả lời theo DDL. |

### Build-PC

| # | Bảng | Cột | PK / unique / quan hệ chính |
|---:|---|---|---|
| 25 | `pc_builds` | `build_id`, `user_id`, `build_name`, `description`, `budget_min`, `budget_max`, `primary_use_case_id`, `target_resolution`, `build_status`, `is_public`, `created_at`, `updated_at` | PK `build_id`; FK user và use case; budget min ≤ max. |
| 26 | `pc_build_revisions` | `build_revision_id`, `build_id`, `revision_number`, `revision_name`, `estimated_total`, `created_by`, `created_at` | PK `build_revision_id`; unique (`build_id`, `revision_number`); FK build (cascade), user creator (set NULL); total không âm. |
| 27 | `pc_build_items` | `build_item_id`, `build_revision_id`, `component_slot_code`, `offer_id`, `quantity`, `unit_price_snapshot`, `added_at` | PK `build_item_id`; unique (`build_revision_id`, `component_slot_code`); FK revision (cascade) và offer (restrict); quantity > 0, giá snapshot không âm. |
| 28 | `build_check_runs` | `build_check_run_id`, `build_revision_id`, `overall_status`, `total_price`, `checked_rule_count`, `error_count`, `warning_count`, `checked_at`, `summary_json` | PK `build_check_run_id`; FK revision (cascade); tổng giá không âm. |
| 29 | `build_check_results` | `build_check_result_id`, `build_check_run_id`, `rule_id`, `source_build_item_id`, `target_build_item_id`, `severity_code`, `result_status`, `message`, `details_json` | PK `build_check_result_id`; FK run (cascade), rule/source/target item (set NULL); severity `ERROR`, `WARNING`, `INFO`. |

### Benchmark và đề xuất

| # | Bảng | Cột | PK / unique / quan hệ chính |
|---:|---|---|---|
| 30 | `benchmark_scenarios` | `benchmark_scenario_id`, `scenario_code`, `scenario_name`, `workload_type`, `workload_name`, `resolution`, `quality_preset`, `scenario_version`, `extra_parameters_json` | PK `benchmark_scenario_id`; unique `scenario_code`. |
| 31 | `benchmark_results` | `benchmark_result_id`, `product_id`, `benchmark_scenario_id`, `metric_code`, `metric_value`, `unit`, `result_kind`, `source_name`, `source_url`, `confidence_score`, `equipment_json`, `recorded_at` | PK `benchmark_result_id`; FK product/scenario; confidence NULL hoặc 0–100; mặc định `result_kind=MEASURED`. |
| 32 | `system_benchmark_results` | `system_benchmark_result_id`, `build_revision_id`, `benchmark_scenario_id`, `metric_code`, `metric_value`, `unit`, `result_kind`, `source_name`, `confidence_score`, `notes`, `created_at` | PK `system_benchmark_result_id`; FK revision (cascade) và scenario; confidence NULL hoặc 0–100; mặc định `result_kind=ESTIMATED`. |
| 33 | `recommendation_runs` | `recommendation_run_id`, `user_id`, `questionnaire_session_id`, `build_revision_id`, `recommendation_type`, `method_key`, `run_status`, `budget_target`, `summary`, `analysis_json`, `created_at` | PK `recommendation_run_id`; FK user/session/revision, các FK tùy chọn đặt NULL khi xóa. Không có check buộc một context cụ thể. |
| 34 | `recommendation_items` | `recommendation_item_id`, `recommendation_run_id`, `offer_id`, `component_slot_code`, `rank_number`, `reason`, `price_snapshot`, `estimated_metrics_json`, `is_selected` | PK `recommendation_item_id`; FK run (cascade) và offer; snapshot giá không âm. |
| 35 | `replacement_suggestions` | `replacement_suggestion_id`, `recommendation_run_id`, `source_build_item_id`, `replacement_offer_id`, `rank_number`, `price_difference`, `performance_delta_percent`, `compatibility_status`, `explanation`, `analysis_json`, `created_at` | PK `replacement_suggestion_id`; FK run (set NULL), build item (cascade), offer (restrict). |

## Quan hệ tổng quát

- `roles 1—N users`; `product_types/categories/brands 1—N products`; `products 1—N offers/images/connectors/relationships/benchmark_results`.
- `product_types 1—N attribute_definitions`; `products N—N attribute_definitions` thông qua `product_attribute_values`.
- `carts 1—N cart_items`; `orders 1—N order_items`; cart/order/build items tham chiếu offer, không tham chiếu trực tiếp model sản phẩm.
- `questionnaire_templates 1—N questions`; question `1—N options`; session `1—N answers`; option có thể ánh xạ sang use case.
- `pc_builds 1—N revisions`; revision `1—N items/check_runs/system_benchmark_results`; run `1—N check_results`.
- `recommendation_runs` liên kết tùy chọn user/questionnaire session/build revision; run `1—N recommendation_items`; replacement suggestion tham chiếu item cũ và offer thay thế.

## Ràng buộc, thiếu hụt và hệ quả API

- Các status fields phần lớn là `VARCHAR` không có CHECK/enum. Không áp đặt mã trạng thái cụ thể cho `product_status`, `offer_status`, `cart_status`, `order_status`, `payment_status`, `shipment_status`, `review_status`, session/build/recommendation states nếu chưa được nghiệp vụ duyệt.
- `roles` chỉ gán **một** role/user và không có permission table. A12 không thể triển khai ma trận quyền chi tiết bằng schema hiện tại.
- Không có bảng session/refresh token, OTP/reset-token, audit log, payment transaction/event, shipment event, coupon, address book, wishlist, warranty/serial/RMA, invoice/VAT hoặc lịch sử CSV. UI tương ứng phải bị đánh dấu chưa hỗ trợ, không trả dữ liệu giả.
- `orders` lưu trạng thái/phương thức/payment reference/tracking hiện tại; không chứng minh đã thanh toán qua cổng, không có lịch sử chuyển trạng thái/refund/webhook.
- `shipping_method`, delivery ETA, địa chỉ đã lưu, ghi chú checkout, VAT/business identity và email invoice không có cột trong `orders`.
- `product_images` giữ URL nhưng không lưu binary/metadata upload. Không có dịch vụ lưu ảnh được chỉ định.
- EAV không bảo đảm attribute definition thuộc cùng product type; `product_images.is_primary` không có uniqueness; questionnaire answer không bảo đảm question thuộc template session; build item không bảo đảm offer thuộc slot type. Service phải kiểm tra các invariant này.
- `pc_builds.is_public` cho phép biểu diễn cờ public, nhưng không có share token. Route chia sẻ phải chỉ xuất dữ liệu public được phép; không coi ID bí mật.
- Không có idempotency key/checkout record liên kết cart→order. Giao dịch DB vẫn cần thiết; thiết kế retry checkout an toàn là quyết định cần duyệt trước vận hành giao dịch thật.
- Search/filter trên EAV và JSON có thể cần index/tối ưu vật lý; không tự thêm index/schema trong tài liệu này.

## Prisma/PostgreSQL mapping cần được duyệt

Prisma sẽ mô hình hóa đúng 35 bảng và tên cột bằng mapping; giữ PK/unique/FK/delete actions và semantics check tương đương. Lưu ý đặc biệt:

- `BIGINT UNSIGNED` lớn hơn miền `BIGINT` có dấu PostgreSQL; cần chứng minh ID không vượt miền hoặc thống nhất representation trước chuyển đổi.
- `DECIMAL` → PostgreSQL `numeric`/Prisma `Decimal`; giữ độ chính xác tiền và không dùng float trong tính tổng.
- PostgreSQL `jsonb` khác MySQL `JSON` về lưu trữ/so sánh; giữ nội dung JSON, xác định chuẩn serialize trước khi chọn kiểu.
- `CHECK`/trigger và cập nhật `updated_at` có thể cần SQL thủ công ngoài Prisma schema; không được bỏ qua constraint tương đương.
- Không chạy `prisma migrate` cho đến khi DDL dialect mapping và mapping `ON DELETE` được duyệt.
