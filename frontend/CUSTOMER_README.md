# PC Builder Store — Frontend

## Phạm vi

Frontend sử dụng React, TypeScript, Vite và React Router. 30 màn Customer, Admin và Build-PC được đăng ký thành route trực tiếp. Để bảo toàn giao diện đã duyệt, các màn hiện được render qua component tương thích từ HTML gốc; đây là bước chuyển đổi trung gian, chưa phải việc tách toàn bộ màn hình thành JSX/component độc lập.

Dữ liệu trong các màn hình vẫn là dữ liệu tĩnh/minh họa. Backend hiện chỉ cung cấp health endpoints; chưa triển khai xác thực, catalog, giỏ hàng, thanh toán hoặc nghiệp vụ quản trị.

## Chạy local

Từ thư mục gốc:

```powershell
npm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm run dev
```

Mở `http://localhost:5173/`. Frontend proxy `/api` tới backend local ở cổng 3000. Khi chưa cấu hình `DATABASE_URL`, API vẫn hoạt động nhưng `/api/health/db` trả HTTP 503.

Để build:

```powershell
npm run build
```

## Tài liệu

- [FRONTEND_CLEANUP_REPORT.md](./FRONTEND_CLEANUP_REPORT.md): lịch sử làm sạch giao diện.
- [INVENTORY.md](./INVENTORY.md): số màn và tình trạng migration.
- [SCHEMA_AUDIT.md](./SCHEMA_AUDIT.md): đối chiếu giao diện và giới hạn schema.
- [Hướng dẫn local](../docs/implementation/local-development-guide.md).
