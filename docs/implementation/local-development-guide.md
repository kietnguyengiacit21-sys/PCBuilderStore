# Hướng dẫn phát triển local

## Yêu cầu

- Node.js `>=20.19.0 <25` và npm tương thích với lockfile.
- PostgreSQL/Neon chỉ cần khi kiểm tra database hoặc migration. Frontend và health API có thể chạy local mà không cấu hình database.

## Cài đặt và khởi chạy

Từ thư mục gốc dự án:

```powershell
npm install
npm run dev
```

Vite chạy tại `http://localhost:5173`, Express tại `http://localhost:3000`. Vite proxy `/api` sang Express.

- Giao diện: `http://localhost:5173/customer/home`
- API health: `http://localhost:3000/api/health`
- Trạng thái DB: `http://localhost:3000/api/health/db`
- Trang kiểm tra API: `http://localhost:5173/system/health`

Khi không cấu hình database, health API vẫn hoạt động; endpoint health DB trả 503. Đây không phải lỗi của frontend.

## Cấu hình môi trường tùy chọn

Backend dùng `backend/.env`; frontend dùng `frontend/.env`. Có thể tạo từ các file mẫu:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Thiết lập `DATABASE_URL` bằng pooled/runtime URL và `DIRECT_URL` bằng URL dùng cho Prisma CLI/migration. `CORS_ORIGINS` mặc định cho phép `http://localhost:5173`. `VITE_API_BASE_URL` mặc định là `/api`. Không commit secrets hoặc đưa database URL vào biến `VITE_*`.

## Lệnh kiểm tra

```powershell
npm run build
npm test
npm run db:validate
```

`npm run build` build frontend và typecheck backend. Nếu cần build riêng backend: `npm run build --workspace=@pc-builder-store/backend`. Prisma validation yêu cầu `DIRECT_URL` hợp lệ trong môi trường lệnh.

Các lệnh migration/seed có tác động:

```powershell
npm run db:migrate:deploy
npm run db:seed
```

Chỉ chạy với database development/staging đã chọn rõ ràng. Migration chưa được xác minh trên database thật; đọc [báo cáo migration](./database-migration-report.md) trước khi chạy.

## Giới hạn hiện tại

Các màn vẫn được render từ HTML cũ qua compatibility component. Backend chỉ có health endpoints; dữ liệu trong giao diện là tĩnh/minh họa. Cấu hình database không tự động bật nghiệp vụ commerce.
