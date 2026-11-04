# PC Builder Store — System Design

## Mục đích và trạng thái

Tài liệu này ghi lại kiến trúc mục tiêu và hợp đồng nghiệp vụ dựa trên source frontend cùng DDL 35 bảng. Tình trạng triển khai hiện tại được cập nhật trong [báo cáo Milestone 1](../implementation/milestone-1-report.md); các phần nghiệp vụ trong tài liệu này vẫn là thiết kế, không phải tính năng đã hoàn thành.

- Frontend React/Vite, Express health API, Prisma schema và PostgreSQL migration foundation đã được tạo. Chưa có kết nối Neon hoặc API nghiệp vụ.
- DDL đầu vào là MySQL 8.0.16+, không phải PostgreSQL. Hai bản `schema_35_tables.sql` và `frontend/schema-35-tables-reference.sql` hiện giống byte-for-byte; thiết kế không sửa bản nào.
- Có 12 màn Customer, 10 màn Admin và 8 màn Build-PC trong source hiện tại. `B06_corrected_HTML_reference` là tệp tham chiếu, không tính là màn hình/route riêng. Vì vậy, 30 màn được dùng để lập bản đồ nghiệp vụ.
- `frontend/INVENTORY.md`, `frontend/DESIGN.md` và `frontend/SCHEMA_AUDIT.md` còn nội dung cũ nói Build-PC không có trong source và tổng cộng 22 route. Source HTML hiện tại được ưu tiên; các ghi chú cũ không được dùng để loại B01–B08 khỏi phạm vi.
- Dữ liệu và trạng thái trên frontend vẫn tĩnh/minh họa. Chỉ API health đã được triển khai; không có nghiệp vụ E-commerce/Build-PC nào đã kết nối.

## Tài liệu

1. [Kiến trúc mục tiêu](./architecture.md)
2. [Phân tích schema 35 bảng](./database.md)
3. [Bản đồ frontend → API → bảng](./frontend-api-map.md)
4. [REST API đề xuất](./rest-api.md)
5. [Luồng nghiệp vụ và phân kỳ MVP](./workflows-and-phases.md)
6. [Deployment Vercel](./deployment.md)

## Quy ước đọc

- **Có giao diện**: trang hoặc thao tác được thể hiện trong source; điều này không xác nhận nghiệp vụ chạy thật.
- **Mock/tĩnh**: nội dung ví dụ, trạng thái, giá, dữ liệu hoặc tính toán được viết sẵn trong HTML/JavaScript.
- **Có backend**: API health có; các luồng nghiệp vụ chưa kết nối database/API.
- **API đề xuất**: hợp đồng thiết kế tương lai, chưa tồn tại. Các API chỉ được đề xuất cho nhu cầu có căn cứ từ UI và/hoặc 35 bảng; API không đồng nghĩa với việc hiện tại đã hoạt động.
- **Ngoài phạm vi schema**: UI có nhưng 35 bảng không lưu dữ liệu cần thiết. Không thiết kế endpoint làm như thể dữ liệu đó đã được lưu bền vững.

## Điều kiện cần duyệt trước khi triển khai

1. Chấp thuận chuyển ngữ nghĩa DDL MySQL sang PostgreSQL tương đương mà không thêm/bớt bảng, cột hay quan hệ; việc chuyển đổi vật lý vẫn cần được duyệt trước khi tạo migration.
2. Chốt mã role/authorization, trạng thái đơn hàng, trạng thái thanh toán, chính sách giao hàng, chính sách hủy đơn và phương thức thanh toán.
3. Chốt các trường checkout không có trong schema: địa chỉ lưu, ghi chú giao hàng, loại dịch vụ vận chuyển, thông tin VAT/hóa đơn và thời hạn giữ hàng.
4. Chốt lựa chọn xác thực (đặc biệt OTP, khôi phục mật khẩu, phiên đăng nhập/đăng xuất) và nhà cung cấp thanh toán/giao vận; các phần này không được DDL hiện tại hỗ trợ đầy đủ.
5. Duyệt thứ tự triển khai: E-commerce MVP trước, toàn bộ backend Build-PC là giai đoạn cuối; giao diện Build-PC tiếp tục được giữ nguyên.

## Nguồn tham khảo

- Source hiện tại trong `frontend/`, đặc biệt các màn `C01-C17`, `A01-A15`, `B01-B08` và `frontend/components/interactions.js`.
- DDL gốc `schema_35_tables.sql` (35 bảng, 38,965 bytes); bản sao `frontend/schema-35-tables-reference.sql` có cùng SHA-256: `664ad5a5e67e4f6207f3bc94eaf044afa2a2829692ad5040a41242efdf822b11`.
- Tài liệu triển khai chính thức: [Express trên Vercel](https://vercel.com/docs/frameworks/backend/express), [Node.js Functions trên Vercel](https://vercel.com/docs/functions/runtimes/node-js), [PostgreSQL với Prisma ORM](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql).
