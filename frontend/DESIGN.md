# PC Builder Store — Frontend Design & Schema Handoff

## Cấu trúc thư mục
- `components/`: CSS/JS dùng chung được lấy từ ZIP gốc, cộng `admin-shell.css`.
- `C01-C17/`: 12 màn khách hàng, được React route qua `src/pages.ts`.
- `A01-A15/`: 10 màn quản trị/bán hàng, được React route qua `src/pages.ts`.
- `B01-B08/B01-B08/`: 8 màn Build-PC; `B06_corrected_HTML_reference` chỉ là tài liệu tham chiếu.
- `src/`: React application, route registry, API client và HTML compatibility renderer.
- `DESIGN.md`: tài liệu thiết kế tổng thể, quy tắc dữ liệu và các điểm schema chưa đáp ứng.
- `SCHEMA_AUDIT.md`: ma trận phân loại từng màn, bảng schema cần dùng, API/logic còn thiếu và schema gaps.

## Nguyên tắc dữ liệu — tuyệt đối không bịa dữ liệu backend
1. Dữ liệu thật (tên khách hàng, đơn hàng, giá, tồn kho, trạng thái, số lượng, thương hiệu, ảnh, thuộc tính sản phẩm) phải đến từ API/schema. Nếu chưa có API hoặc dữ liệu thì hiển thị loading/empty/error state, không dùng số mẫu như thật.
2. Nội dung cố định được phép: nhãn giao diện, tiêu đề, hướng dẫn, tên bước, mô tả chức năng, thông báo trạng thái chưa kết nối.
3. Không được tự bịa: doanh thu/KPI, số đơn, số SKU, điểm VIP, số điện thoại, mã đơn, tracking, serial, hãng phân phối, người phụ trách, SLA, RMA, kết quả benchmark/stress-test, % tiến độ, số lượng hồ sơ, số dòng CSV hợp lệ/lỗi.
4. Mọi con số ví dụ trong screenshot chỉ là mock data và không được coi là dữ liệu thực.
5. Chưa có API nghiệp vụ không đồng nghĩa đã hoàn thành tính năng. Các trang A và màn Customer/Build-PC vẫn dùng dữ liệu tĩnh; backend hiện chỉ có health endpoints.
6. Các màn được render qua React compatibility component để tránh làm lệch thiết kế; chưa tách toàn bộ nội dung thành JSX components.

## Kết quả rà soát

- Tất cả trang vẫn là UI preview; chỉ các health endpoints có backend.
- Các trang wishlist, bảo hành/RMA, sửa chữa, CSV import history và password recovery đã được gỡ khỏi preview.
- C12 chỉ được dùng các trường order hiện có như trạng thái, carrier, tracking number, phương thức/trạng thái thanh toán; không có timeline, ETA hoặc định vị trực tiếp.
- A02 không hiển thị KPI bảo hành/RMA. Số liệu dashboard chỉ hợp lệ khi tính từ các bảng có dữ liệu thật.
- B01-B08 được giữ lại và có route React; chưa có backend Build-PC.
- Xem ma trận phân loại đầy đủ và danh sách gaps ở [SCHEMA_AUDIT.md](./SCHEMA_AUDIT.md).

## Schema SQL gốc — 35 bảng
- `roles`
- `users`
- `brands`
- `categories`
- `product_types`
- `products`
- `product_images`
- `product_attribute_definitions`
- `product_attribute_values`
- `product_offers`
- `product_connectors`
- `product_relationships`
- `compatibility_rules`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `product_reviews`
- `use_cases`
- `questionnaire_templates`
- `questionnaire_questions`
- `questionnaire_options`
- `questionnaire_sessions`
- `questionnaire_answers`
- `pc_builds`
- `pc_build_revisions`
- `pc_build_items`
- `build_check_runs`
- `build_check_results`
- `benchmark_scenarios`
- `benchmark_results`
- `system_benchmark_results`
- `recommendation_runs`
- `recommendation_items`
- `replacement_suggestions`

## Quy tắc layout chung
- Desktop: vùng nội dung chính `min-width:0`, sidebar có chiều rộng cố định; hai cột nội dung phải căn theo cùng một grid row và `align-items:start`.
- C11–C16: sidebar tài khoản là cột trái; nội dung chính là cột phải. Không để card/khung bên phải bị tụt xuống do `float`, margin riêng, width vượt grid hoặc wrapper đóng sai.
- C17: nút/toggle “Chỉ hiển thị điểm khác biệt” phải luôn có label tương phản, trạng thái ON/OFF rõ; không chỉ dựa vào màu.
- Table rộng phải có wrapper `overflow-x:auto`, không kéo toàn bộ page tràn ngang.
- Button: màu chữ có contrast đủ; không đặt chữ trắng trên nền trắng/xám nhạt. Có `:focus-visible`, hover, disabled state.
- Responsive: dưới 900px sidebar chuyển sang menu thu gọn; card/grid xếp lại, không làm nội dung bị cắt.
- Dùng dữ liệu động; không hard-code số lượng, giá, trạng thái hoặc bản ghi.
