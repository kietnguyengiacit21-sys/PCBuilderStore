# REST API đề xuất

## Trạng thái và quy ước chung

Đây là hợp đồng mục tiêu cho API nghiệp vụ; hiện chỉ có `GET /api/health` và `GET /api/health/db`. Các endpoint còn lại chưa được triển khai. Base path nghiệp vụ đề xuất `/api/v1`, JSON UTF-8, HTTPS, cùng origin với web app. ID trả về dạng chuỗi để tránh giới hạn số nguyên JavaScript. Thời gian ISO-8601 UTC; tiền trả dạng decimal string và currency code, không dùng floating point ở client. Các DTO không trả `password_hash`, guest token hoặc trường nội bộ không cần thiết.

### Response và lỗi

Thành công dạng resource trực tiếp, danh sách có `data` và `pagination`:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 24, "total": 0 }
}
```

Lỗi thống nhất:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu gửi lên chưa hợp lệ.",
    "details": [{ "field": "quantity", "reason": "must_be_positive" }],
    "requestId": "..."
  }
}
```

HTTP semantics: `400` sai cú pháp/validation, `401` chưa xác thực, `403` không đủ quyền, `404` không tồn tại hoặc không thuộc quyền truy cập, `409` xung đột trạng thái/stock/unique, `413` body quá lớn, `429` rate limit, `500` lỗi không dự kiến. Không trả SQL, stack trace, token hoặc PII trong lỗi. Danh sách dùng `page`, `pageSize` giới hạn server, `sort`, `order`, filter allowlist; tìm kiếm không chuyển trực tiếp tên cột từ request vào query.

### Định danh, phiên và quyền

- Tất cả route `/admin/*` yêu cầu danh tính đã xác thực và role được chủ dự án chỉ định là quyền quản trị. Không suy diễn role code hay tạo role mặc định từ UI.
- `/me/*` chỉ truy cập dữ liệu người hiện tại; order/cart/build phải được lọc theo user hoặc guest credential sở hữu. Không nhận `user_id` để chọn chủ thể từ browser.
- Catalog public chỉ trả record active/published theo trạng thái sau khi được duyệt. Việc DDL có status string không tự xác định danh sách giá trị hợp lệ.
- DDL không có session/token/OTP/reset-token hoặc permission matrix. Cookie/JWT, thời hạn, logout/revocation, CSRF và OTP cần được quyết định trước khi phát hành auth. Không hứa logout thu hồi access token nếu cơ chế không hỗ trợ.
- Các ký hiệu `{id}` là placeholder định tuyến, không đại diện cho ID bảng/kiểu cụ thể.

## Authentication và hồ sơ

| Method & path | Quyền | Request chính | Response |
|---|---|---|---|
| `POST /auth/register` | Public | `{ "fullName": "...", "email": "...", "phone": "...", "password": "..." }` | `201 { "data": { "user": { "id": "...", "fullName": "...", "email": "...", "role": "...", "accountStatus": "..." } } }` |
| `POST /auth/login` | Public | `{ "email": "...", "password": "..." }` | `200 { "data": { "user": { "id": "...", "fullName": "...", "role": "..." } } }`; cookie credential theo cơ chế được duyệt |
| `POST /auth/logout` | Auth | Không có body | `204`; hiệu lực thu hồi phụ thuộc thiết kế phiên được duyệt |
| `GET /me` | Auth | — | `{ "data": { "id": "...", "fullName": "...", "email": "...", "phone": "...", "role": "...", "accountStatus": "..." } }` |
| `PATCH /me` | Auth | Chỉ field hồ sơ được cho phép, ví dụ `{ "fullName": "...", "phone": "..." }` | `{ "data": { "user": { ... } } }` |
| `GET /me/orders` | Auth | `page`, `pageSize`, `status`, `from`, `to`, `sort` | Danh sách đơn của chính user |

Không có endpoint reset password/OTP/verify account trong hợp đồng này vì thiếu token persistence và nhà cung cấp. Không nhận `role_id`, `account_status`, `password_hash` hoặc `customer_segment` tùy ý trong registration/update.

## Catalog và tìm kiếm

| Method & path | Quyền | Query/body | Kết quả chính |
|---|---|---|---|
| `GET /categories` | Public | `parentId`, `page`, `pageSize` | Danh mục active; parent/children nếu dữ liệu hiện có |
| `GET /product-types` | Public | `componentOnly` | Loại sản phẩm active |
| `GET /product-types/{typeId}/attributes` | Public | — | Định nghĩa thuộc tính; chỉ gồm filterable khi cần lọc |
| `GET /products` | Public | `q`, `categoryId`, `brandId`, `typeId`, filter thuộc tính allowlist, `minPrice`, `maxPrice`, `condition`, `sort`, `page`, `pageSize` | Danh sách sản phẩm/offer hiển thị; giá và tồn kho từ server |
| `GET /products/{productId}` | Public | — | Sản phẩm, ảnh, thuộc tính, offer đang hiển thị |
| `GET /products/{productId}/reviews` | Public | `page`, `pageSize` | Review được công bố theo chính sách review được duyệt |

Ví dụ sản phẩm:

```json
{
  "data": {
    "id": "123",
    "name": "Tên sản phẩm",
    "brand": { "id": "4", "name": "Nhãn hiệu" },
    "attributes": [{ "code": "memory_size", "name": "Dung lượng", "value": 16, "unit": "GB" }],
    "offers": [{
      "id": "456",
      "code": "OFFER-456",
      "condition": "NEW",
      "price": "2500000.00",
      "currency": "VND",
      "availableQuantity": 3
    }]
  }
}
```

`condition`, status, filter operators, sort keys và review visibility phải lấy từ dữ liệu/chính sách được chốt. Giá/tồn kho có thể thay đổi giữa request và checkout; client không phải nguồn sự thật. Không có API banner/campaign, coupon, wishlist hoặc lưu bộ lọc vì schema không có dữ liệu tương ứng.

## Cart, checkout và đơn hàng

| Method & path | Quyền | Request | Response |
|---|---|---|---|
| `GET /cart` | Auth hoặc guest credential | — | Giỏ hiện hành, line offer/giá hiện tại, subtotal được server tính |
| `POST /cart/items` | Auth hoặc guest | `{ "offerId": "...", "quantity": 1 }` | `201` hoặc cập nhật cart line theo quy tắc unique offer |
| `PATCH /cart/items/{cartItemId}` | Chủ cart | `{ "quantity": 2 }` | Cart cập nhật sau validate số nguyên dương và stock |
| `DELETE /cart/items/{cartItemId}` | Chủ cart | — | `204` |
| `POST /orders` | Auth hoặc guest theo chính sách được duyệt | Xem ví dụ dưới đây | `201` đơn và order items snapshot; không đồng nghĩa đã thanh toán |
| `GET /orders/{orderNumber}` | Order owner; admin theo policy | — | Đơn, snapshot items, trạng thái hiện tại |
| `POST /orders/{orderNumber}/cancel` | Order owner; state policy | `{ "reason": "..." }` | `200` order cập nhật nếu chuyển trạng thái được phép |

Request tạo đơn chỉ nhận các trường có căn cứ trong schema:

```json
{
  "customer": { "name": "...", "email": "...", "phone": "..." },
  "shippingAddress": "...",
  "shippingRegion": "...",
  "shippingPostalCode": "...",
  "paymentMethod": "...",
  "items": [{ "offerId": "...", "quantity": 1 }]
}
```

Response mẫu:

```json
{
  "data": {
    "orderNumber": "...",
    "status": "...",
    "paymentStatus": "...",
    "subtotal": "2500000.00",
    "shippingFee": "0.00",
    "discountAmount": "0.00",
    "totalAmount": "2500000.00",
    "items": [{
      "productName": "...",
      "offerCode": "...",
      "quantity": 1,
      "unitPrice": "2500000.00",
      "lineTotal": "2500000.00"
    }]
  }
}
```

Không nhận client totals/discount/status/stock hoặc tin vào price đã gửi từ UI. Giá, line totals, tồn kho và snapshot được tính ở server trong transaction. Các field checkout UI không có cột (`shipping method`, note, VAT/invoice) chưa được nhận như dữ liệu được lưu. Payment provider, allowed `paymentMethod`, trạng thái đầu và hủy đơn phải được duyệt. Không tích hợp provider/webhook hay tuyên bố thanh toán thành công bằng API này.

## API quản trị

Các API sau yêu cầu role admin được cấu hình/duyệt. Các route CRUD chỉ ghi field có trong schema; thay đổi status phải dùng allowlist/state transition đã được chốt.

| Method & path | Nội dung |
|---|---|
| `GET /admin/dashboard` | KPI đã được định nghĩa rõ; chưa thể triển khai trước khi chốt semantics |
| `GET /admin/products` | Danh sách sản phẩm, filter/page |
| `POST /admin/products` / `PATCH /admin/products/{productId}` | Tạo/cập nhật `products` |
| `GET/POST/PATCH/DELETE /admin/categories[/{categoryId}]` | CRUD category; kiểm tra parent và vòng lặp |
| `GET/POST/PATCH/DELETE /admin/brands[/{brandId}]` | CRUD brands |
| `GET/POST/PATCH/DELETE /admin/product-types[/{typeId}]` | CRUD product type theo dữ liệu cho phép |
| `PUT /admin/products/{productId}/images` | Thay metadata URL/alt/order; upload file cần storage provider riêng |
| `PUT /admin/products/{productId}/attributes` | Upsert typed values; kiểm tra definition cùng product type và đúng một value |
| `GET/POST/PATCH/DELETE /admin/products/{productId}/offers[/{offerId}]` | CRUD offer; không vượt tồn kho reserved |
| `GET /admin/orders` / `GET /admin/orders/{orderNumber}` | Tra cứu/phân trang đơn; bảo vệ PII |
| `PATCH /admin/orders/{orderNumber}` | Chỉ field/status transition được phép; không tạo payment/refund/shipment event |
| `GET /admin/customers?phone=...` / `GET /admin/customers/{userId}/orders` | Tra cứu tối thiểu cần thiết, có kiểm soát quyền |
| `GET /admin/users` / `PATCH /admin/users/{userId}/role` | Quản lý role; không có permission matrix/audit trail |
| `GET/POST/PATCH /admin/roles[/{roleId}]` | Chỉ khi role management được duyệt; tránh tự khóa tài khoản admin cuối cùng |
| `POST /admin/catalog/import` | CSV xử lý đồng bộ, giới hạn file; chỉ upsert dữ liệu schema có và trả lỗi từng dòng, không lưu lịch sử import |

CRUD product có thể dùng thêm các resource route cho connectors/relationships nếu UI/admin thực sự quản lý chúng; chưa có UI xác nhận đầy đủ, vì vậy không đưa vào MVP mặc định.

### Ví dụ DTO ghi dữ liệu quản trị

Tất cả ví dụ là JSON API đề xuất, dùng tên camelCase ở biên và map rõ ràng sang cột schema. Server validate foreign keys, trạng thái được duyệt và mọi invariant; không tin role, giá hoặc tồn kho từ client.

Tạo/cập nhật product:

```json
{
  "productTypeId": "2",
  "categoryId": "10",
  "brandId": "4",
  "modelCode": "MODEL-001",
  "productName": "Tên sản phẩm",
  "shortDescription": "...",
  "description": "...",
  "productStatus": "..."
}
```

Tạo/cập nhật offer:

```json
{
  "offerCode": "OFFER-001",
  "conditionCode": "...",
  "price": "2500000.00",
  "currencyCode": "VND",
  "stockQuantity": 10,
  "reservedQuantity": 0,
  "warrantyMonths": 12,
  "offerStatus": "..."
}
```

Upsert thuộc tính của product:

```json
{
  "values": [{
    "attributeDefinitionId": "7",
    "value": { "decimal": "16.00" }
  }]
}
```

`value` chứa đúng một khóa theo `data_type` (`text`, `decimal`, `integer`, `boolean`, `json`); schema lưu vào đúng một cột typed. Ví dụ `data_type`/đơn vị phải khớp definition. `productStatus`, `offerStatus`, `conditionCode` là placeholder cho phép giá trị đã duyệt, không phải enum đã xác nhận.

Image metadata:

```json
{
  "images": [{
    "imageUrl": "https://...",
    "altText": "...",
    "isPrimary": true,
    "sortOrder": 0
  }]
}
```

Đây chỉ là metadata URL; không upload ảnh vào Express/Vercel function. Cơ chế bảo đảm tối đa một ảnh primary cần kiểm tra/serialize vì schema không có unique constraint tương ứng.

Order update và role update chỉ nhận allowlisted fields đã được policy phê duyệt, ví dụ `{ "orderStatus": "..." }` hoặc `{ "roleId": "..." }`; API không nhận tùy ý mọi cột. Role IDs/statuses và transition map phải lấy từ cấu hình/seed được duyệt.

## Build-PC API (giai đoạn cuối)

Các route dưới đây là hợp đồng mục tiêu, không thuộc MVP:

| Method & path | Vai trò |
|---|---|
| `GET /builder/questionnaire-templates` | Lấy template/version active |
| `POST /builder/questionnaire-sessions`; `PUT /builder/questionnaire-sessions/{sessionId}/answers` | Tạo session và ghi đáp án |
| `POST /builder/questionnaire-sessions/{sessionId}/recommendations` | Chạy thuật toán đã duyệt, ghi recommendation run/items |
| `GET/POST /me/builds`; `GET /builds/{buildId}`; `GET /builds/{buildId}/revisions` | Danh sách/tạo/đọc build có ownership/publicity |
| `POST /builds/{buildId}/revisions` | Tạo revision mới |
| `PUT /build-revisions/{revisionId}/items/{slotCode}`; `DELETE /build-revisions/{revisionId}/items/{slotCode}` | Gán/bỏ offer theo slot đã được xác định |
| `POST /build-revisions/{revisionId}/checks`; `GET /build-check-runs/{runId}` | Chạy/đọc compatibility và power/thermal checks |
| `GET /products/{productId}/benchmarks`; `GET /build-revisions/{revisionId}/benchmarks` | Đọc kết quả sản phẩm/cấu hình, phân biệt measured/estimated |
| `POST /build-revisions/{revisionId}/benchmark-estimates` | Estimate chỉ khi phương pháp và dữ liệu được duyệt |
| `POST /build-revisions/{revisionId}/recommendations`; `GET /recommendation-runs/{runId}` | Gợi ý/đọc thay thế linh kiện |
| `POST /build-revisions/{revisionId}/replacements` | Thay thế trên revision mới và chạy kiểm tra lại |
| `PATCH /builds/{buildId}/public` | Thay đổi trạng thái public theo ownership |

Các ví dụ này không làm rõ semantics cột nào trong từng bảng; xem [phân tích schema](./database.md). Trước khi implementation cần chốt state values, slot codes, evaluator keys, thuật toán, benchmark provenance, guest ownership, atomicity và idempotency.
