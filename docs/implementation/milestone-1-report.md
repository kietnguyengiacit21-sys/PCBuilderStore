# Báo cáo triển khai Milestone 1

## Tóm tắt

Milestone 1 thiết lập nền tảng React/Vite, Express/Prisma/PostgreSQL và cấu hình triển khai Vercel, đồng thời giữ lại giao diện hiện có. Đây là bước chuyển đổi tăng dần: 30 màn được phục vụ qua React compatibility renderer từ HTML gốc, chưa phải chuyển từng màn thành JSX component.

## Phạm vi hoàn thành

- Đăng ký 30 route hiện có: 12 Customer, 10 Admin và 8 Build-PC. B06 corrected HTML là tài liệu tham chiếu, không phải route riêng.
- Thiết lập React, TypeScript, Vite, React Router và Tailwind CSS biên dịch khi build. Nội dung HTML được nạp lười theo route; script dùng chung được tải một lần và script CDN/cấu hình Tailwind cũ bị bỏ qua.
- Tạo Express app với middleware bảo mật cơ bản, logging có request ID, xử lý lỗi JSON, CORS allowlist và hai health endpoint: `GET /api/health` và `GET /api/health/db`.
- Tạo Prisma 7, PostgreSQL migration từ DDL MySQL hiện có và seed tối thiểu cho role, product type, use case.
- Thêm API function entry và cấu hình static build/fallback cho Vercel.

## Trạng thái chức năng

- Frontend vẫn chứa dữ liệu minh họa và logic giao diện gốc. Các thao tác nghiệp vụ chưa kết nối API/database; không coi đây là storefront vận hành thật.
- Backend mới có health endpoints. Chưa có API xác thực, catalog, cart, checkout, order, Admin hoặc Build-PC.
- Health database trả 503 khi `DATABASE_URL` không được cấu hình hoặc PostgreSQL không sẵn có.
- PostgreSQL migration đã được sinh nhưng chưa chạy trên Neon hay bất kỳ môi trường database nào. Chưa xác minh collation ICU, triggers, constraints hoặc schema drift trên PostgreSQL đích.
- Chưa có Vercel deployment được tạo hoặc xác minh.

## Kiểm tra đã chạy

- `npm run build`: frontend TypeScript/Vite build và backend TypeScript typecheck đều đạt.
- `npm test`: 2 test files, 10 tests đạt.
- Prisma schema validation/client generation đã chạy với cấu hình URL placeholder; điều này không xác nhận kết nối database.
- Kiểm tra trình duyệt 30 route ở viewport 390px và 1366px: không có route lỗi, tràn ngang, lỗi JavaScript/console hoặc script Tailwind CDN được chèn.
- Kiểm tra API health local: `/api/health` trả 200; `/api/health/db` trả 503 khi chưa có database là hành vi dự kiến.

## Hạng mục còn lại trước khi vận hành

1. Cấu hình Neon staging và chạy migration có kiểm soát; xác minh schema, ICU collation, trigger, sequence, constraints và Prisma drift.
2. Xác định backup/restore, connection pooling, secret management và quy trình migration production.
3. Hoàn thiện API nghiệp vụ, auth/authorization, validation, transaction, kiểm thử và thay dữ liệu tĩnh bằng API.
4. Cấu hình Vercel project/environment, xác minh function routing và chạy smoke test trên deployment Preview.
5. Hoàn tất tích hợp giao diện theo từng màn khi contract backend đã được chốt.

Xem [báo cáo migration database](./database-migration-report.md), [hướng dẫn phát triển local](./local-development-guide.md) và [hướng dẫn triển khai Vercel](./vercel-deployment-guide.md).
