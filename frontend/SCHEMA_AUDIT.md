# Kiểm kê frontend theo schema MySQL 35 bảng

## Phạm vi và kết quả

Đối chiếu mã giao diện với `schema-35-tables-reference.sql` và giữ nguyên schema. Source có 12 màn Customer, 10 màn Admin và 8 màn Build-PC; cả 30 màn hiện có đều được route qua React. B06 corrected là tài liệu tham chiếu, không phải màn thứ 31. Các màn vẫn là UI preview, không phải tính năng backend nghiệp vụ đã triển khai.

Đã gỡ 10 màn không được dữ liệu/quan hệ trong schema hỗ trợ:

- A06 lịch sử nhập CSV
- A11 tra cứu bảo hành
- A13 hàng đợi RMA
- A14 chi tiết RMA
- A15 sửa chữa/hoàn trả
- C09 quên mật khẩu
- C13 wishlist
- C14 trung tâm bảo hành
- C15 tạo yêu cầu bảo hành
- C16 chi tiết yêu cầu bảo hành

## Ma trận các màn còn lại

| Màn | Phân loại | Bảng cần dùng | Backend cần triển khai / giới hạn |
|---|---|---|---|
| C01 Trang chủ | KEEP AS UI PREVIEW | `products`, `categories`, `brands`, `product_images`, `product_offers` | Truy vấn sản phẩm/danh mục đang hoạt động, ảnh chính và offer có thể bán; nội dung gợi ý phải được tính từ dữ liệu thật. |
| C02 Tìm kiếm linh kiện | KEEP AS UI PREVIEW | `products`, `categories`, `brands`, `product_types`, `product_attribute_definitions`, `product_attribute_values`, `product_offers` | Tìm kiếm, lọc thuộc tính, sắp xếp, phân trang và trạng thái tồn kho cần API truy vấn catalog. |
| C03 Chi tiết sản phẩm | KEEP AS UI PREVIEW | `products`, `product_images`, `product_attribute_definitions`, `product_attribute_values`, `product_offers`, `product_reviews`, `compatibility_rules` | Lấy offer/thuộc tính/ảnh; tổng hợp review theo trạng thái cho phép. Chỉ hiển thị thời hạn bảo hành của offer; không có serial hoặc claim. |
| C04 Giỏ hàng | KEEP AS UI PREVIEW | `carts`, `cart_items`, `product_offers`, `products` | Tạo/đọc/sửa/xóa giỏ, kiểm tra số lượng và giá/tồn kho hiện tại. Không được giả định lưu vĩnh viễn trước khi có API. |
| C05 Checkout | KEEP AS UI PREVIEW | `carts`, `cart_items`, `orders`, `order_items`, `users` | Kiểm tra dữ liệu nhận hàng, chốt giá/offer, tạo order và snapshot order items trong giao dịch. `payment_method` là thông tin đơn hàng; không đồng nghĩa có cổng thanh toán. |
| C06 Kết quả đặt hàng | KEEP AS UI PREVIEW | `orders`, `order_items`, `products`, `product_offers` | Chỉ hiển thị order đã lưu và trạng thái payment hiện tại nếu API cung cấp. Không tuyên bố giao dịch cổng thanh toán thành công khi chưa tích hợp. |
| C07 Đăng ký | KEEP AS UI PREVIEW | `users`, `roles` | Tạo tài khoản, băm mật khẩu, kiểm tra email trùng và gán role được backend cho phép. Không OTP/SMS hoặc xác thực serial. |
| C08 Đăng nhập | KEEP AS UI PREVIEW | `users`, `roles` | Xác thực mật khẩu băm và trạng thái tài khoản. Không OTP, 2FA, OAuth, “ghi nhớ phiên” hoặc luồng khôi phục mật khẩu. |
| C10 Tài khoản | KEEP AS UI PREVIEW | `users`, `roles`, `orders` | Đọc hồ sơ và các order thuộc user hiện tại. Không có điểm VIP, thông báo, wishlist hoặc tài sản/serial bảo hành. |
| C11 Lịch sử đơn hàng | KEEP AS UI PREVIEW | `orders`, `order_items`, `products`, `product_offers` | Truy vấn order theo user, lọc trạng thái và mở order detail. Chỉ có trạng thái hiện thời, không có lịch sử sự kiện. |
| C12 Chi tiết đơn hàng | SIMPLIFY / KEEP AS UI PREVIEW | `orders`, `order_items`, `products`, `product_offers` | Có thể hiển thị trạng thái, mã vận đơn, hãng vận chuyển và payment status hiện tại. Không có timeline, tọa độ, ETA, tài xế, refund hay claim serial. |
| C17 So sánh | KEEP AS UI PREVIEW | `products`, `product_types`, `product_attribute_definitions`, `product_attribute_values`, `product_offers`, `product_connectors`, `compatibility_rules` | So sánh giá trị thuộc tính đã lưu; backend đánh giá tương thích theo rule/evaluator. Thiếu thuộc tính phải báo không đủ dữ liệu; không suy diễn hiệu năng. |
| A01 Đăng nhập nhân viên | KEEP AS UI PREVIEW | `users`, `roles` | Xác thực tài khoản theo role. Không có session audit, 2FA hoặc thiết bị/IP trust data. |
| A02 Dashboard | SIMPLIFY / KEEP AS UI PREVIEW | `orders`, `product_offers`, `products`, `users` | KPI chỉ tính bằng truy vấn trên dữ liệu có thật (ví dụ doanh thu từ order totals theo điều kiện xác định, số offer/product, số user). Không có snapshot/activity/RMA KPI. |
| A03 Quản lý sản phẩm | KEEP AS UI PREVIEW | `products`, `product_types`, `categories`, `brands`, `product_offers` | CRUD catalog và offer, phân trang/lọc server-side; không giả lập sản phẩm đang lưu. |
| A04 Tạo/sửa sản phẩm | KEEP AS UI PREVIEW | `products`, `product_types`, `categories`, `brands`, `product_images`, `product_attribute_definitions`, `product_attribute_values`, `product_offers`, `product_connectors` | Validate theo kiểu thuộc tính, lưu ảnh URL, offer và connector; mọi field phải khớp schema thực. |
| A05 Nhập CSV | KEEP AS UI PREVIEW | `products`, `product_types`, `categories`, `brands`, `product_attribute_values`, `product_offers` | Parser/validator có thể nhập dữ liệu catalog; backend cần giao dịch/kiểm tra trùng. Không lưu batch history, row errors, rollback hay analytics. |
| A07 Danh mục | KEEP AS UI PREVIEW | `categories` | CRUD cây danh mục, kiểm tra `parent_category_id` và `category_code`. |
| A08 Thương hiệu | KEEP AS UI PREVIEW | `brands` | CRUD tên, website, mô tả và trạng thái hoạt động. |
| A09 Quản lý đơn | KEEP AS UI PREVIEW | `orders`, `order_items`, `users`, `product_offers` | Tìm kiếm, lọc và cập nhật các trường order được phép. Không lưu payment/shipment event history hoặc hoàn tiền. |
| A10 Tra cứu khách | KEEP AS UI PREVIEW | `users`, `orders` | Tra cứu theo dữ liệu user và order có quyền truy cập; bảo vệ dữ liệu cá nhân theo authorization backend. |
| A12 Nhân viên/role | SIMPLIFY / KEEP AS UI PREVIEW | `users`, `roles` | Quản lý user và role; schema role chỉ có `role_code`, tên, mô tả, không có ma trận quyền chi tiết hay audit log. |

## Các phần giao diện đã loại bỏ/simplify

- Các màn hiện có được ánh xạ sang route React; các trang đã bị loại ở giai đoạn cleanup trước đó không được khôi phục.
- C12 bỏ bản đồ/tracking trực tiếp, thông tin tài xế/phương tiện, ETA và timeline mẫu; chỉ giữ các trường trạng thái vận chuyển ở mức order.
- A02 bỏ KPI yêu cầu bảo hành/RMA.
- Giữ nguyên navigation Build-PC; các thao tác cần máy chủ vẫn báo chưa kết nối.
- Gắn nhãn rõ “BẢN XEM TRƯỚC · DỮ LIỆU MINH HỌA” trên các trang C và A.

## Chức năng có bảng nhưng vẫn cần backend logic/API

- Catalog/search/filter/sort/pagination: nối nhiều bảng, kiểm tra trạng thái hoạt động và tồn kho.
- Giỏ và checkout: xử lý guest/user cart, lock/validate stock, snapshot giá/offer, tạo order/order items an toàn.
- Authentication: hash/verify mật khẩu, duplicate email, authorization theo role; schema không thay thế được hệ thống session.
- Product reviews: chỉ dùng review đã được backend duyệt theo `review_status`.
- Build-PC: schema có thể lưu questionnaire/session/answers, builds/revisions/items, compatibility runs/results, benchmark and recommendation records. Cần seed dữ liệu thật, evaluator các rule, thuật toán tương thích và API riêng; chưa có backend Build-PC và không được hiển thị tính tương thích/benchmark/recommendation như dữ liệu thật.
- Dashboard/order administration: xác định định nghĩa KPI, phân quyền, truy vấn tổng hợp và quy tắc chuyển trạng thái.
- CSV: parser, mapping/validation, upsert và xử lý lỗi. Bảng catalog lưu được kết quả nhưng không lưu lịch sử batch.
- Export/print: chỉ tạo tài liệu phía trình duyệt từ dữ liệu đã tải; không được gọi là hóa đơn VAT hoặc bằng chứng thanh toán nếu không có tích hợp/dữ liệu tương ứng.

## Khoảng trống schema (không tự thêm bảng)

- Wishlist.
- Warranty claim/RMA, serial theo từng thiết bị, hồ sơ/tệp đính kèm, phân công kỹ thuật, sửa chữa/thay thế và lịch sử xử lý.
- Import job, batch audit và lỗi theo từng dòng CSV.
- Shipment event/timeline, tọa độ, ETA, vị trí tài xế.
- Payment gateway event/history, refund và hóa đơn/thuế chi tiết.
- Session/refresh token, OTP/reset token, 2FA/OAuth, security audit và quyền chi tiết.
- VIP/loyalty points, voucher/coupon, promotion rules, shipping promise/SLA.
- Một số dữ liệu vật lý/hiệu năng (ví dụ BIOS support, clearance, thermal behavior) nếu không được cấu hình dưới thuộc tính/JSON phù hợp và kiểm chứng bởi backend.

## Kiểm tra trước khi React migration

- Tải các route retained trên local preview và kiểm tra status/console.
- Kiểm tra đường dẫn asset/link cục bộ.
- Kiểm tra cú pháp JS shared và inline.
- Thử navigation preview, trạng thái mẫu C12 và loại bỏ control bản đồ/tracking.

Các kết quả trên là baseline trước migration. Kiểm tra sau migration được ghi trong `docs/implementation/milestone-1-report.md`. Chưa kết nối Neon hoặc truy vấn PostgreSQL; responsive layout cần kiểm tra trực quan sau migration.
