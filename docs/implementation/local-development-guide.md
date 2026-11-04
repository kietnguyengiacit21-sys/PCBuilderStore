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

## Cấu hình môi trường

Backend dùng `backend/.env`; frontend dùng `frontend/.env`. Có thể tạo từ các file mẫu:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
Copy-Item .\frontend\.env.example .\frontend\.env
```

Thiết lập `DATABASE_URL` bằng pooled/runtime URL và `DIRECT_URL` bằng URL dùng cho Prisma CLI/migration. `CORS_ORIGINS` mặc định cho phép `http://localhost:5173`. `VITE_API_BASE_URL` mặc định là `/api`. Không commit secrets hoặc đưa database URL vào biến `VITE_*`.

Các màn danh mục gọi API backend:

- `GET /api/catalog/facets`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:modelCode`

Trang chủ, tìm kiếm/danh sách linh kiện, chi tiết sản phẩm và so sánh dùng dữ liệu API. Khi API hoặc database chưa khả dụng, màn hiển thị trạng thái lỗi thay vì quay lại dữ liệu sản phẩm tĩnh. Hình ảnh chỉ hiển thị khi bản ghi trong `product_images` có URL HTTP(S) hợp lệ; seed CSV hiện không cung cấp ảnh.

## Lệnh kiểm tra

```powershell
npm run build
npm test
npm run db:validate
npm run db:generate
```

`npm run build` build frontend và typecheck backend. Nếu cần build backend riêng: `npm run build --workspace=@pc-builder-store/backend`. Prisma validation và generation cần `DIRECT_URL` trong `backend/.env` hoặc môi trường lệnh; hai lệnh này không kết nối để áp dụng migration.

Các lệnh migration/seed có tác động:

```powershell
npm run db:migrate:deploy
npm run db:seed
```

Chỉ chạy với database development/staging đã chọn rõ ràng, sau khi xác minh target URL. Seed đọc `seed/catalog-150-products.csv`, từ chối catalog không có đúng 150 model và thực hiện các ghi catalog trong một transaction. Lệnh không chạy migration tự động. Dữ liệu giá/tồn kho có offer code `DEMO-` chỉ là minh họa. Không chạy seed trên production hoặc trên database có schema chưa được xác minh.

## Giới hạn hiện tại

Các màn không thuộc danh mục vẫn được render từ HTML cũ qua compatibility component. Catalog API chỉ đọc; chưa có đăng nhập/admin CRUD, checkout, tồn kho fulfillment, hoặc kiểm chứng tương thích linh kiện. Đọc [báo cáo tích hợp catalog](./catalog-integration-report.md) và [báo cáo migration](./database-migration-report.md) trước khi cấu hình staging.
