# Kiến trúc hệ thống mục tiêu

## Trạng thái hiện tại đã xác minh

Milestone 1 đã bổ sung React/Vite, Express, Prisma và API client foundation. 30 màn hiện có được giữ nguyên qua React compatibility renderer. API hiện chỉ có health endpoints; chưa có kết nối database hoặc nghiệp vụ. Dữ liệu ví dụ và trạng thái UI vẫn nằm trong HTML/JavaScript. Xem [báo cáo triển khai](../implementation/milestone-1-report.md) để biết những phần đã kiểm chứng và giới hạn hiện tại.

Kiến trúc dưới đây là mục tiêu đề xuất, không phải mô tả code đã có.

## Sơ đồ logic

```text
Trình duyệt
  React SPA
    └── REST /api/v1 (cùng origin)
          Express modular monolith
            ├── Auth & Users
            ├── Catalog
            ├── Cart & Checkout
            ├── Orders
            ├── Admin Catalog / Orders
            └── Build-PC (giai đoạn cuối)
                  └── Prisma ORM
                        └── PostgreSQL managed service
```

Mô-đun API gọi use-case/service layer; service layer thực thi quyền, kiểm tra đầu vào, quy tắc nghiệp vụ và giao dịch Prisma. Route/controller không truy cập DB trực tiếp. DTO API được tách khỏi entity/field nội bộ; dữ liệu giá và quyền không bao giờ được tin cậy từ browser.

## Stack đề xuất

| Lớp | Lựa chọn | Lý do / giới hạn |
|---|---|---|
| Web | React + TypeScript + Vite | Đã tạo route cho 30 màn; HTML compatibility renderer giữ nguyên giao diện trong giai đoạn chuyển đổi. |
| API | Node.js + Express + TypeScript | App local và Vercel Function entry đã tạo; health API được kiểm thử. |
| ORM | Prisma 7 + Neon adapter | Schema 35 model được validate; adapter dùng pooled runtime URL, migration dùng `DIRECT_URL`. |
| DB | PostgreSQL / Neon | Migration được sinh nhưng chưa chạy trên Neon; credentials/provider deployment chưa được cấu hình. |
| Contract | JSON REST, `/api/v1` | Contract đề xuất trong [REST API](./rest-api.md); không phải API đang tồn tại. |

Prisma được chọn làm ORM mục tiêu; không tạo Prisma schema hoặc migration trong task thiết kế này.

## Ranh giới mô-đun backend

- **auth**: đăng ký/đăng nhập mật khẩu, kiểm tra trạng thái `users.account_status`, đọc `roles`; không tự cung cấp OTP/2FA/reset-token vì schema thiếu nơi lưu token.
- **users**: hồ sơ tài khoản và danh sách đơn của người dùng hiện tại; không quản lý sổ địa chỉ, điểm thưởng hoặc bảo hành serial.
- **catalog**: đọc danh mục, loại sản phẩm, thương hiệu, sản phẩm, ảnh, thuộc tính, offer và review đã được duyệt theo chính sách trạng thái được duyệt.
- **admin-catalog**: CRUD catalog, gói bán, thuộc tính, connector và quan hệ sản phẩm; quyền quản trị phải được chốt theo `roles.role_code`.
- **cart**: sở hữu giỏ bởi `user_id` hoặc `guest_token`, tính lại offer/giá/tồn kho phía server; không hỗ trợ lưu wishlist/“mua sau”.
- **checkout/orders**: xác nhận giỏ, ghi snapshot `order_items`, lưu trường order có trong schema và trả kết quả; không xử lý cổng thanh toán, thuế/VAT, shipment event hoặc hoàn tiền.
- **admin-orders**: tra cứu đơn và cập nhật trạng thái/tracking ở mức trường hiện có; không cung cấp audit/event history.
- **build-pc** *(giai đoạn cuối)*: questionnaire, build/revision/items, kiểm tra tương thích, benchmark và đề xuất linh kiện. Tách module khỏi MVP nhưng giữ nguyên toàn bộ B01–B08.

Các mô-đun chia sẻ `PrismaClient`, error mapping, input validation, logging và authorization middleware. Không cần microservices cho phạm vi hiện tại; Vercel serverless vốn không đảm bảo tiến trình nền lâu dài hoặc trạng thái trong bộ nhớ.

## Nguyên tắc dữ liệu và quy tắc

1. `products` là model sản phẩm; `product_offers` là đơn vị bán có condition, giá, tiền tệ, tồn kho và tháng bảo hành. Cart/order/build item tham chiếu `offer_id`.
2. Mọi giá trong giỏ/đơn được tính lại trên server từ offer hiện tại. `order_items` và `pc_build_items` có snapshot giá/tên phù hợp cho mục đích tương ứng.
3. Thuộc tính là EAV có kiểu: định nghĩa theo `product_type_id`, giá trị có đúng một trong các cột kiểu. Service phải xác minh loại sản phẩm khớp định nghĩa; FK hiện tại không đảm bảo điều đó.
4. Tương thích chỉ được báo khi có dữ liệu thuộc tính/connector/rule và evaluator đã được xác định. Thiếu dữ liệu trả trạng thái “chưa đủ dữ liệu”, không chuyển thành đạt.
5. Benchmark tách kết quả sản phẩm khỏi kết quả cấu hình; trường `result_kind`, nguồn và độ tin cậy phải được giữ để không trình bày ước tính như số đo thật.
6. Không cho browser tự gán `role_id`, `user_id`, giá, trạng thái thanh toán hoặc tồn kho.

## An toàn và độ tin cậy

- Chỉ HTTPS; cookie bảo mật `Secure`, `HttpOnly`, `SameSite`; CSRF protection cho mutation dùng cookie.
- Hash mật khẩu bằng thuật toán chuyên dụng (Argon2id hoặc lựa chọn đã được duyệt), rate limit đăng nhập/đăng ký, normalize email và trả lỗi không tiết lộ tài khoản tồn tại.
- Validate DTO ở biên API; parameterized queries qua Prisma; giới hạn kích thước body/file; lọc log để không ghi mật khẩu, token, địa chỉ đầy đủ hoặc dữ liệu thanh toán.
- Phân quyền tại service/middleware cho mọi route admin và truy vấn theo ownership cho user/cart/order/build. Ẩn nút ở UI không phải là kiểm soát truy cập.
- Transaction và row lock/cập nhật điều kiện khi trừ/giữ tồn kho. Giao dịch tạo order phải nhất quán giữa order, order items và số lượng offer.
- Không có bảng audit, session, idempotency, lịch sử trạng thái hay payment event. Không mô phỏng các chức năng đó bằng response thành công; các rủi ro/giới hạn được nêu trong [phân tích schema](./database.md).

## Ngoài phạm vi hiện tại

Không có cơ sở trong source/schema để thiết kế hoàn chỉnh: OTP, khôi phục mật khẩu, sổ địa chỉ, wishlist, mã giảm giá, hóa đơn VAT, payment gateway ledger/webhook, shipment timeline, warranty/RMA, role permission matrix, audit trail hoặc lịch sử nhập CSV. Các hạng mục này cần quyết định và schema/nhà cung cấp được chủ dự án phê duyệt; tài liệu này không thêm bảng cho chúng.
