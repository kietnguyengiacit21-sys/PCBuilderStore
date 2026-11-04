# A09 — Quản lý & điều phối đơn hàng

- **Schema liên quan:** orders, order_items, product_offers, products, users
- **Nguồn dữ liệu:** chỉ API/backend có thể cung cấp dữ liệu thực tế.
- **Quy tắc:** Trạng thái đơn/thanh toán/vận chuyển lấy từ orders; không tự tạo lịch sử giao nhận chi tiết khi schema chỉ có carrier/tracking/status.
- **Trạng thái:** giao diện khung; chưa kết nối backend.
