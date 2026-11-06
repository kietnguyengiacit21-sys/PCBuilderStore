# Java API Migration Inventory

## 1. Mục đích và phạm vi

Tài liệu này kiểm kê API hiện có để chuyển backend nghiệp vụ từ Node.js/Express sang Java Spring Boot. Đây là ảnh chụp source code, không phải danh sách tính năng suy diễn từ giao diện.

**Snapshot được kiểm tra**

- Node/frontend baseline: `main` tại `897badb4e75b041a2ad270ba9ad2dcd67618df30`.
- Java migration: `migration/java-spring-boot` tại `f4fbaa4f8875e2a6f9ba5dc0a69cc65b96970351`.
- Schema nguồn: `schema_35_tables.sql` (MySQL 8).
- PostgreSQL migration: `backend/prisma/migrations/20261102000000_initial/migration.sql`.
- Database local `pc_builder_store_it`: migration đã được áp dụng; báo cáo Phase 3A ghi nhận 8 PostgreSQL integration tests pass trên PostgreSQL 18.

Các endpoint ở phần **đang tồn tại** được xác minh từ route/controller trong source. Các endpoint ở phần **mục tiêu/đề xuất** được rút từ `docs/system-design/rest-api.md`, không phải API đã triển khai.

## 2. Tóm tắt hiện trạng

| Hạng mục | Node.js trên `main` | Java trên `migration/java-spring-boot` |
|---|---|---|
| Health API | 2 GET routes | Có 2 GET routes tương ứng |
| Catalog read API | 3 GET routes | Có 3 GET routes tương ứng |
| Catalog write/admin API | Chưa có | Chưa có |
| Authentication/user API | Chưa có | Chưa có |
| Cart/checkout/order API | Chưa có | Chưa có |
| Admin/customer operations | Chưa có | Chưa có |
| Build-PC/questionnaire/compatibility/benchmark API | Chưa có | Chưa có |

Express app hiện mount `createHealthRouter` và `createCatalogRouter`. Hai file route hiện có:

- `backend/src/routes/health.ts`
- `backend/src/catalog/routes.ts`

Không có POST, PUT, PATCH hoặc DELETE route trong hai router hiện tại. Request không khớp route đi vào 404 handler.

Java branch hiện có hai controller:

- `backend-java/src/main/java/com/pc_builder_store/controller/HealthController.java`
- `backend-java/src/main/java/com/pc_builder_store/catalog/controller/CatalogController.java`

Vì vậy, không nên hiểu 30 màn UI hiện tại là 30 luồng backend đã hoạt động.

## 3. API đang tồn tại và mức độ tương đương Java

| Method | Endpoint | Node/Express | Java/Spring Boot | Ghi chú |
|---|---|---|---|---|
| GET | `/api/health` | Có | Có | Health của process/API; không xác nhận DB đang hoạt động |
| GET | `/api/health/db` | Có | Có | DB probe; Express trả trạng thái disconnected/503 khi probe lỗi, Java dùng JDBC `SELECT 1` |
| GET | `/api/catalog/facets` | Có | Có | Product types, categories, brands và filterable attribute facets |
| GET | `/api/catalog/products` | Có | Có | Search, filters, sorting, pagination |
| GET | `/api/catalog/products/:modelCode` | Có | Có | Chi tiết model; Java hỗ trợ encoded slash cho model code có `/` |

### 3.1 Catalog list contract

Query parameters đang được hỗ trợ:

- `page`, `limit`
- `q`
- `type`, `category`, `brand`
- `minPrice`, `maxPrice`
- `sort=name|price`, `order=asc|desc`
- Lặp `attribute=code=value`

Các quy tắc cần giữ khi phát triển tiếp:

- Chỉ trả sản phẩm active.
- Min/max price phải áp dụng trên cùng một active offer.
- Price sort dùng giá active offer thấp nhất, null last; tie-break theo product name.
- Attribute filter chỉ nhận attribute definition được đánh dấu filterable.
- Query dùng parameterized SQL; không lấy tên cột/order trực tiếp từ input.
- Offer response tính available quantity từ stock trừ reserved quantity.
- Giá/tồn kho của offer có prefix `DEMO-` là dữ liệu minh họa, không phải tồn kho bán hàng thực tế.

Response hiện có `data`, `pagination` gồm `page/limit/total/totalPages`, và `notice`. Product detail có model metadata, active offers, specifications và images.

**Mức kiểm chứng:** Báo cáo Phase 3A ghi nhận 8 PostgreSQL integration tests trên PostgreSQL 18 đã pass cho catalog routes/repository; 32 unit/controller tests cũng pass. 8 integration tests không có nghĩa các API nghiệp vụ khác đã được test.

### 3.2 Frontend đang gọi gì?

API client đã tìm thấy:

- `frontend/src/api.ts`: `fetchApiHealth()` gọi `GET /api/health`.
- `frontend/src/catalog-api.ts`: `fetchCatalogFacets()`, `fetchCatalogProducts()`, `fetchCatalogProduct()`.
- `frontend/src/CatalogPage.tsx`: dùng catalog client cho homepage, parts listing, product detail và compare.

Product comparison **không có API riêng**. Browser lưu tối đa 4 model codes trong `localStorage`, sau đó gọi product detail cho từng model để dựng bảng so sánh.

Frontend chưa có client gọi `GET /api/health/db`; endpoint này tồn tại ở backend, nhưng trang health hiện gọi `/api/health`.

## 4. UI hiện có nhưng chưa nối backend nghiệp vụ

`frontend/src/pages.ts` đăng ký 30 routes. Trong `LegacyScreen.tsx`, chỉ 4 route được mount React `CatalogPage`:

- `/customer/home`
- `/customer/parts`
- `/customer/product`
- `/customer/compare`

Các màn còn lại vẫn được render qua legacy HTML/compatibility renderer. Frontend có hai API client modules ở trên; không tìm thấy API client cho các luồng commerce, auth, admin hoặc Build-PC trong phần source đã kiểm tra.

| Nhóm màn | Routes | Backend hiện tại |
|---|---|---|
| Customer – catalog | home, parts, product, compare | Đã dùng catalog read API |
| Customer – commerce/account | `/customer/cart`, `/customer/checkout`, `/customer/order-result`, `/customer/register`, `/customer/login`, `/customer/account`, `/customer/orders`, `/customer/order-detail` | Chưa có API nghiệp vụ |
| Admin | `/admin/login`, `/admin/dashboard`, `/admin/products`, `/admin/product-edit`, `/admin/csv-import`, `/admin/categories`, `/admin/brands`, `/admin/orders`, `/admin/customers`, `/admin/staff` | Chưa có API nghiệp vụ |
| Build-PC | `/build-pc/start`, `/build-pc/advanced`, `/build-pc/guided`, `/build-pc/compatibility`, `/build-pc/summary`, `/build-pc/benchmark`, `/build-pc/replacements`, `/build-pc/export` | Chưa có API nghiệp vụ |

Các trang HTML có thể có tương tác prototype hoặc trạng thái phía browser. Điều đó không được xem là persistence/backend API cho đến khi có route và integration test tương ứng.

## 5. Đối chiếu miền nghiệp vụ với 35 bảng

| Miền | Bảng hiện có | Nhận định cho API |
|---|---|---|
| Identity/roles | `roles`, `users` | Có dữ liệu cơ bản cho user, password hash, role và account status; chưa có session/token/OTP/reset-token persistence |
| Catalog | `brands`, `categories`, `product_types`, `products`, `product_images`, `product_attribute_definitions`, `product_attribute_values`, `product_offers` | Hỗ trợ read API hiện tại và admin catalog CRUD |
| Catalog relationships | `product_connectors`, `product_relationships`, `compatibility_rules` | Có dữ liệu cho connector/relationship/rule; evaluator logic vẫn phải được code |
| Cart/orders | `carts`, `cart_items`, `orders`, `order_items` | Hỗ trợ cart, guest/user owner, order và item snapshots; cần transaction/state rules |
| Reviews | `product_reviews` | Có bảng, chưa có API hoặc frontend flow được nối |
| Questionnaire | `use_cases`, `questionnaire_templates`, `questionnaire_questions`, `questionnaire_options`, `questionnaire_sessions`, `questionnaire_answers` | Dữ liệu cho tư vấn/segmentation |
| Build-PC | `pc_builds`, `pc_build_revisions`, `pc_build_items`, `build_check_runs`, `build_check_results` | Hỗ trợ lưu cấu hình, revisions và kết quả kiểm tra |
| Benchmarks | `benchmark_scenarios`, `benchmark_results`, `system_benchmark_results` | Cần phân biệt measured và estimated, lưu nguồn/provenance |
| Recommendations | `recommendation_runs`, `recommendation_items`, `replacement_suggestions` | Có persistence cho recommendation và replacement |

### 5.1 Ràng buộc schema ảnh hưởng API

- `users` liên kết trực tiếp một `role_id`; schema chưa có permission matrix.
- Không có bảng session, refresh token, OTP, password reset token hoặc audit log. Không thiết kế OTP/reset/revocation như tính năng đã được hỗ trợ sẵn.
- `carts` cho phép `user_id` nullable và có `guest_token`; guest cart phải được gắn với credential/token đủ an toàn, không dùng user id do browser tự khai.
- `orders` có `user_id` nullable cùng customer name/email/phone/shipping fields; hỗ trợ lưu thông tin guest order nhưng API vẫn phải xác định cách bảo vệ việc đọc order của guest.
- Payment và shipment được giữ đơn giản trên `orders` bằng status/reference/carrier/tracking fields. Không có payment transaction/event ledger, refund record, shipment event history hay webhook event table. Có thể mô phỏng trạng thái order-level theo yêu cầu MVP; không tuyên bố đã tích hợp cổng thanh toán thực.
- Không có bảng coupon/discount campaign, wishlist, address book, import-job history hoặc warranty/repair/RMA history.
- Status/condition phần lớn là varchar, không phải enum/check đầy đủ. Java service cần allowlist và state-transition rules được duyệt; không tự suy diễn danh sách status từ tên UI.
- `compatibility_rules.evaluator_key` chỉ là định danh evaluator, không phải engine tự thực thi. Cần code và test từng evaluator; thiếu dữ liệu phải trả trạng thái chưa đủ dữ liệu, không báo tương thích.
- Schema không có BOM riêng để tính tồn kho PC lắp sẵn từ linh kiện; không được tuyên bố khả năng tính stock prebuilt từ component stock nếu chưa có quy tắc và persistence phù hợp.
- File CSV 150 sản phẩm là nguồn dữ liệu staging, chưa phải bằng chứng sản phẩm đã được import vào PostgreSQL. Node có seed/import helper nhưng không có HTTP CSV-import endpoint; Java import endpoint chưa được triển khai. Không tự ý chạy seed SQL có upsert cũ.

## 6. API backlog và thứ tự migrate đề xuất

Hợp đồng mục tiêu đã có tại `docs/system-design/rest-api.md`. Danh sách dưới đây tóm lược và sắp theo phụ thuộc, không tạo API spec mới thay thế tài liệu đó.

### Phase 3B.0 — Chốt contract trước mutation API

Quyết định các điểm sau và ghi vào contract trước khi code:

1. **Base path:** REST design doc đề xuất `/api/v1`, trong khi frontend và API đang chạy dùng `/api`. Trong lúc migrate, giữ path hiện tại để không phá client; chỉ chuyển sang `/api/v1` trong một thay đổi đồng bộ backend + frontend.
2. **Error contract:** thống nhất `code/message/details/requestId` giữa Node và Java trước khi form bắt đầu gọi mutation.
3. **ID và money:** contract design muốn ID dạng string và money dạng decimal string. Catalog client hiện chấp nhận `string | number` ở price; không âm thầm đổi catalog response đã nghiệm thu. Chốt format chuẩn cho API mới.
4. **Authentication/session:** chọn cookie/JWT/session strategy, logout/revocation, CSRF, rate-limit và guest policy trước protected routes. Không gửi secret vào frontend `VITE_*`.
5. **Status/role policy:** xác nhận role codes, product/offer/order/payment/shipment status và transition allowlist.
6. **Guest ownership:** định nghĩa guest credential, thời hạn và cách truy cập guest order; browser không được chọn user/order owner bằng id tùy ý.

### Phase 3B.1 — Authentication và hồ sơ người dùng

Endpoint mục tiêu lấy từ `docs/system-design/rest-api.md`:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `PATCH /me`
- `GET /me/orders`

Phạm vi đầu tiên: register/login cơ bản, hash/verify password, role/account status checks, current-user profile, authorization foundation cho admin. Chưa bao gồm OTP, reset password, 2FA hoặc token revocation đầy đủ khi chưa có storage/policy tương ứng.

**Gate:** PostgreSQL tests cho register/login, duplicate email, disabled user, wrong password, role guard, ownership isolation; response không bao giờ lộ `password_hash`.

### Phase 3B.2 — Admin catalog CRUD và CSV import

Các endpoint mục tiêu:

- CRUD `/admin/categories`, `/admin/brands`, `/admin/product-types`
- `GET/POST/PATCH /admin/products`
- `PUT /admin/products/{productId}/images`
- `PUT /admin/products/{productId}/attributes`
- CRUD `/admin/products/{productId}/offers`
- `POST /admin/catalog/import`

Đây là nền cho A03/A04/A05/A07/A08. API phải enforce admin role, kiểm tra foreign keys và typed EAV values, bảo vệ reserved stock, validate URL ảnh và transaction/rollback cho import. CSV import nên có giới hạn kích thước/dòng, báo lỗi theo dòng và không ghi đè dữ liệu đang bán ngoài policy. Không tạo import history feature vì schema hiện không có bảng job/history.

**Gate:** integration tests cho create/update, duplicate model/offer, typed attributes, inactive visibility, reserved quantity invariant, CSV transaction rollback và non-overwrite behavior.

### Phase 3B.3 — Cart, checkout và customer orders

Endpoint mục tiêu:

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/{cartItemId}`
- `DELETE /cart/items/{cartItemId}`
- `POST /orders`
- `GET /orders/{orderNumber}`
- `POST /orders/{orderNumber}/cancel`
- `GET /me/orders` (hoàn thiện semantics đã tạo ở Phase 3B.1)

Đây là nền cho C04/C05/C06/C11/C12. Checkout phải tính lại giá/line totals/tổng tiền ở server, kiểm tra active offer và stock, dùng transaction, snapshot tên/offer/condition/price vào order items, và tránh tạo đơn trùng khi retry. Guest và signed-in ownership phải được xử lý riêng, không tin totals hoặc stock từ client.

Payment MVP có thể mô phỏng kết quả và cập nhật trường order-level đã có sau khi state machine được duyệt; không gọi đó là payment gateway integration. Không tạo coupon/refund/event history ngoài schema.

**Gate:** test guest + logged-in cart, concurrent stock/checkout, idempotency/retry, order snapshots, cancel transition, owner-only access, rollback khi một line invalid.

### Phase 3B.4 — Admin order/customer operations

Endpoint mục tiêu:

- `GET /admin/orders`
- `GET /admin/orders/{orderNumber}`
- `PATCH /admin/orders/{orderNumber}` với state/field allowlist
- `GET /admin/customers?phone=...`
- `GET /admin/customers/{userId}/orders`
- Role/user administration theo policy được duyệt

Đây là nền cho A02/A09/A10/A12. Dashboard KPI cần định nghĩa cụ thể trước, không tạo số liệu giả. PII chỉ trả cho staff có quyền; role assignment phải tránh tự khóa admin cuối cùng. Không có audit trail trong schema nên cần ghi rõ giới hạn trước khi bật thay đổi nhạy cảm.

### Phase 3B.5 — Reviews (có thể defer)

Schema `product_reviews` cho phép product/user/rating/title/text/status. REST proposal có `GET /products/{productId}/reviews`; create/update/moderation cần policy ownership, verified purchase hay không, status visibility và UI scope. Không bắt đầu nếu reviews vẫn được defer khỏi MVP.

### Phase cuối — Build-PC

Giữ Build-PC sau các luồng e-commerce theo scope đã thống nhất. Nhóm API mục tiêu:

- Questionnaire templates/sessions/answers/recommendations.
- Builds, revisions và items.
- Compatibility/build checks.
- Product/system benchmarks.
- Recommendation runs và replacement suggestions.
- Public/private build visibility.

Trước implementation phải chốt slot codes, revision rules, evaluator keys, compatibility algorithm, measured-vs-estimated provenance, guest ownership, atomicity và behavior khi thiếu attributes. Không triển khai toàn bộ B01–B08 chỉ vì HTML screens đã tồn tại.

## 7. Nguyên tắc triển khai mỗi API trên Java

- Java 21 + Spring Boot + Spring JDBC (`JdbcTemplate`/`NamedParameterJdbcTemplate`); không thêm JPA/Hibernate ORM.
- Luồng Controller → Service → Repository → parameterized SQL.
- Giữ schema 35 bảng và migration hiện tại; không tự thêm/đổi bảng/cột trong một phase API.
- ID `NUMERIC(20,0)` phải giữ an toàn dạng string/`BigDecimal`; money dùng `BigDecimal`.
- Tách DTO khỏi entity/database rows; không trả password hash, guest token hoặc nội bộ không cần thiết.
- Mỗi module có unit tests, controller/API contract tests và PostgreSQL integration tests cho transaction/query/permissions.
- Không coi mock tests là PostgreSQL integration tests. Mọi phase phải báo rõ test nào chạy với DB thật.
- Node backend tiếp tục được giữ làm reference/fallback cho đến khi API Java và frontend cutover được nghiệm thu.
- Migrate theo branch riêng; không merge vào `main` tự động. Không chạy seed hoặc migration trên database dùng chung khi chưa xác nhận target.

## 8. Việc tiếp theo

Bắt đầu Phase 3B.0, sau đó triển khai **Phase 3B.1 Authentication/User foundation** trước khi mở các mutation admin. Không chuyển frontend sang Java ở thời điểm này.

## 9. Source code và tài liệu đã đối chiếu

### Branch `main`

- [Express app mounts](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/backend/src/app.ts)
- [Express health routes](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/backend/src/routes/health.ts)
- [Express catalog routes](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/backend/src/catalog/routes.ts)
- [Frontend API health client](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/frontend/src/api.ts)
- [Frontend catalog API client](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/frontend/src/catalog-api.ts)
- [Frontend screen routes](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/frontend/src/pages.ts)
- [Legacy screen renderer](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/frontend/src/LegacyScreen.tsx)
- [System REST API proposal](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/docs/system-design/rest-api.md)
- [System architecture proposal](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/docs/system-design/architecture.md)
- [MySQL 35-table schema](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/main/schema_35_tables.sql)

### Branch `migration/java-spring-boot`

- [Java health controller](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/migration/java-spring-boot/backend-java/src/main/java/com/pc_builder_store/controller/HealthController.java)
- [Java catalog controller](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/migration/java-spring-boot/backend-java/src/main/java/com/pc_builder_store/catalog/controller/CatalogController.java)
- [PostgreSQL integration report](https://github.com/kietnguyengiacit21-sys/PCBuilderStore/blob/migration/java-spring-boot/docs/implementation/java-catalog-postgres-integration-report.md)

---

**Trạng thái tài liệu:** source inventory và migration plan. Chưa thay đổi route, frontend, database schema hay migration. Các endpoint mục tiêu phải được phê duyệt và kiểm thử theo từng phase trước khi được coi là đã triển khai.
