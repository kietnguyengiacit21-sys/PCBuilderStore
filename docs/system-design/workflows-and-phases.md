# Luồng nghiệp vụ và phân kỳ triển khai

## Nguyên tắc phân kỳ

- Giữ nguyên toàn bộ 30 màn hiện tại (12 Customer, 10 Admin, 8 Build-PC); phân kỳ chỉ quyết định backend nào được triển khai trước, không xóa hoặc gộp màn.
- Source hiện tại là HTML/CSS/JavaScript tĩnh; tất cả dữ liệu và hành động minh họa là mock/tĩnh hoặc backend-pending. Chưa có chức năng nào đã kết nối backend.
- Ưu tiên E-commerce MVP có thể vận hành an toàn với các trường schema hiện có. Không bật/giả vờ các phần cần payment, thuế, vận chuyển, xác minh hay lưu trữ mà schema/provider chưa hỗ trợ.
- Toàn bộ backend Build-PC là phase cuối, sau khi catalog và account nền tảng ổn định.

## E-commerce MVP và hạng mục sau

| Nhóm | MVP đề xuất | Sau MVP / cần quyết định |
|---|---|---|
| Authentication | Đăng ký/đăng nhập email-password, hồ sơ cơ bản, role server-side, danh sách đơn; chỉ khi chốt session/cookie/CSRF và role codes | OTP, xác minh email/phone, quên/đổi mật khẩu self-service, MFA, social login, session/device management |
| Catalog | Danh mục, loại sản phẩm, thương hiệu, sản phẩm/ảnh URL/typed attributes/offers, search/filter/sort/page; Admin CRUD có quyền | Upload ảnh, CMS/banners, campaign, full-text/search service, review workflow nếu chưa có chính sách status |
| Cart | Giỏ user hoặc guest, add/update/remove, tính lại giá/tồn kho | Wishlist/mua sau, merge guest cart chính sách nâng cao nếu chưa định nghĩa, coupon/promotion |
| Checkout/Order | Tạo order và order item snapshots transactionally; lưu thông tin khách/địa chỉ một lần, subtotal/fee/discount/total theo policy rõ; Admin tra cứu và cập nhật trạng thái được cho phép | Payment gateway/webhooks/refunds, shipping quote/label/events, nhiều địa chỉ, VAT/e-invoice, notes, delivery options, stock reservation expiry |
| Operations | Admin quản lý catalog, đơn và tra cứu khách trong phạm vi cần thiết | KPI/dashboard chưa định nghĩa, audit log, import history, granular permissions |
| Review | Không bắt buộc cho MVP commerce; đọc review chỉ khi được xác định status công bố | Moderation, report, ảnh review nếu có lưu trữ |
| Build-PC | Không có backend trong MVP; giữ UI B01–B08, không loại bỏ | **Phase cuối:** questionnaire, saved builds/revisions, recommendation, compatibility, power/thermal, benchmark, replacement, public builds |

“MVP” chưa đồng nghĩa hệ thống thương mại đầy đủ: DDL hiện tại không mô tả payment provider, shipment execution, VAT, coupon hay refund. Trước khi go-live cần owner xác định fulfillment/payment operating model và chấp thuận các giới hạn/policy.

## Luồng authentication

1. Browser gửi registration DTO; server normalize email, validate, kiểm tra unique và hash password bằng thuật toán chuyên dụng.
2. Role/account status do server cấp theo seed/policy đã duyệt; không lấy role từ payload. Nếu xác minh email/OTP là bắt buộc, flow dừng ở trạng thái pending do schema chưa có token/verification persistence.
3. Login xác minh mật khẩu, account status và role; lỗi không tiết lộ email có tồn tại hay không.
4. Server thiết lập credential qua cookie/session mechanism được duyệt. Bảo vệ mutation bằng CSRF nếu dùng cookie; rate-limit login/register.
5. `/me` trả thông tin tối thiểu. Logout chỉ được quảng bá là thu hồi khi token/session mechanism hỗ trợ revocation; schema hiện không có session table.

**Cần duyệt:** cơ chế phiên, thời hạn, key rotation, CSRF, verify/reset flow, bootstrap admin và role code.

## Luồng product/catalog

1. Admin tạo category/brand/type và attribute definitions; validate unique, category tree và kiểu dữ liệu.
2. Admin tạo product, ảnh URL, thuộc tính và offer. Server kiểm tra attribute definition thuộc cùng product type, đúng kiểu/đúng một giá trị; kiểm tra price/stock/reserved.
3. Public catalog chỉ trả record/offer được xem là active theo các status values đã được duyệt. Giá và stock trả từ DB, không lấy từ mock UI.
4. Search/filter chỉ dùng field/attribute được phép; phân trang và sort allowlist. Cache invalidation cần xem xét nếu bật cache; không cache nội dung theo user.
5. Product detail và cart/order dùng `offer_id`; snapshot order lấy tên/mã/condition tại thời điểm đặt để lịch sử không đổi theo catalog hiện tại.

## Luồng cart, checkout và order

1. Cart được xác định bởi user đã đăng nhập hoặc guest credential đủ ngẫu nhiên; server kiểm tra ownership từng request. Schema cho phép user và guest token cùng tồn tại nên guest-to-user merge phải có policy tường minh.
2. Khi add/update, kiểm tra offer có thể bán và quantity hợp lệ; không coi giá/tồn kho trên browser là dữ liệu có thẩm quyền.
3. Checkout yêu cầu thông tin customer và địa chỉ gửi hàng theo field hiện hữu. UI có method giao hàng, VAT và note; schema không lưu các giá trị đó nên trường không được tuyên bố đã được ghi nhận.
4. Trong transaction, khóa/điều kiện cập nhật stock, đọc lại giá và availability, tạo `orders` + `order_items` snapshot và cập nhật cart/stock theo quyết định reservation. Việc giữ/trừ kho, thời hạn giữ và tính phí shipping chưa được quyết định.
5. Trạng thái order/payment ban đầu và allowlisted transitions phải được chốt. Order được tạo không có nghĩa payment đã thành công. Không mô phỏng provider callback.
6. Người dùng/admin đọc order theo ownership/permission. Hủy chỉ khi state policy cho phép; cột lý do hủy và event history không tồn tại. Không hứa refund, VAT invoice hay tracking timeline.
7. Không có idempotency key/persistence; trước go-live phải xác định chống gửi lặp (ví dụ thiết kế DB hiện hành không có cột khóa). Không tạo đơn giả thành công để bù thiếu provider.

## Luồng Admin

1. Đăng nhập qua auth chung; middleware kiểm tra danh tính, trạng thái và role code đã duyệt tại server.
2. Catalog writes validate DTO, FK, unique, typed attributes và tồn kho. Phản hồi không chứa secret/PII thừa.
3. Order list/detail phân trang và giới hạn PII; status update kiểm tra transition. Không hỗ trợ refund, shipment event hoặc audit history do thiếu model.
4. Customer lookup yêu cầu quyền cụm staff phù hợp, tra cứu tối thiểu theo dữ liệu user/order. Không dùng phone làm bằng chứng xác thực.
5. Role change không cho client tự cấp quyền; chặn thao tác tự khóa admin cuối cùng là policy cần quy định. DDL chỉ hỗ trợ một role/user và không lưu permission chi tiết.
6. CSV import nếu được bật xử lý có giới hạn kích thước/định dạng, validate toàn bộ trước khi ghi hoặc có transaction theo policy; trả lỗi dòng trong response. Không ghi nhận “import history” vì schema không có bảng.

## Build-PC — phase cuối

1. Chốt questionnaire templates/version, câu hỏi/conditional logic, option mapping, use cases và segment.
2. Tạo questionnaire session và validate câu trả lời với template đang dùng.
3. Recommendation engine ghi run/items; thuật toán, ranking, budget semantics và cách xử lý offer hết hàng cần chủ nghiệp vụ duyệt.
4. Tạo build/revision/items theo các slot code đã chốt; sản phẩm phải là component phù hợp và offer hợp lệ.
5. Compatibility engine dùng product attributes, connectors, rules/evaluator keys; thiếu thuộc tính trả “chưa đủ dữ liệu”, không báo pass.
6. Power/thermal chỉ tính khi có dữ liệu có đơn vị, nguồn tin cậy và rule được kiểm chứng.
7. Benchmark giữ phân biệt measured/estimated, nguồn, thời điểm và độ tin cậy. Không ghi mock values như kết quả thật.
8. Thay thế linh kiện tạo revision mới hoặc cập nhật theo policy; chạy compatibility lại trước khi cho lưu/chia sẻ.
9. Public build chỉ đọc khi `is_public`; ownership kiểm tra cho mọi thao tác sửa/xóa. Lưu/share/export chỉ hiển thị thành công sau persistence thật.

## Thứ tự triển khai đề xuất

1. **Foundation & schema decision:** duyệt PostgreSQL semantic port 35 bảng, index/constraints, seed role/status, session/auth, môi trường và quyền; chưa viết migration trước khi được duyệt.
2. **Catalog + Admin catalog:** React app/API client nền tảng, catalog public, CRUD admin, validation và catalog test data tách biệt.
3. **Auth + Cart:** account/session, ownership, guest policy, cart recalculation và race/stock tests.
4. **Checkout + Order + Admin order:** state transitions, transaction/concurrency, payment/fulfillment operating model, PII authorization; go-live chỉ sau khi các khoảng trống thương mại được giải quyết.
5. **Customer account/support:** hồ sơ, order history/detail, chức năng chỉ trong phạm vi schema; phần ngoài schema vẫn được đánh dấu unavailable.
6. **Build-PC (cuối):** questionnaire, recommendation, build revisions, compatibility, benchmark, replacement, saved/public builds.
7. **Hardening/release:** accessibility/responsive, security, logs/alerts, backup/restore, performance, Vercel preview/production checks.

Phân kỳ này không phê duyệt thay đổi frontend hay schema; đó là sequencing kiến trúc cần owner chấp thuận.
