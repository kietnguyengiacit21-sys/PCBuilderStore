# Hướng dẫn triển khai Vercel

## Trạng thái và phạm vi

Repository đã có `vercel.json`, Vite static build và `api/[[...path]].ts` làm Node function entry. Chưa tạo project hoặc deployment Vercel; function routing, Neon connectivity, Preview smoke test và production deploy chưa được xác minh. Thực hiện trước trên Preview, không trỏ Preview đến production database.

## Cấu hình project

Tạo/import Vercel project từ root repository và giữ cấu hình:

- Install command: `npm install`
- Build command: `npm run build --workspace=@pc-builder-store/frontend`
- Output directory: `frontend/dist`
- Root directory: repository root
- Framework preset: Other (cấu hình build đang được khai báo trong `vercel.json`)

Vite build biên dịch Tailwind CSS và tạo SPA assets. `api/[[...path]].ts` là function entry cho Express app; API path hiện có là `/api/health` và `/api/health/db`. Cấu hình hiện tại chưa tạo route API nghiệp vụ hay `/api/v1`.

## Environment variables

Đặt biến trong Vercel Project Settings theo đúng environment:

| Biến | Dùng ở đâu | Ghi chú |
|---|---|---|
| `DATABASE_URL` | Runtime API | Pooled Neon URL; server-only secret. Không bắt buộc cho health endpoint cơ bản, nhưng cần để DB health hoạt động. |
| `DIRECT_URL` | Prisma CLI/migration | Direct URL; chỉ cần trong job migration có kiểm soát, không đưa vào frontend. |
| `NODE_ENV` | Runtime | Vercel quản lý môi trường production; không đặt thành `development`. |
| `CORS_ORIGINS` | API | Danh sách origin chính xác, phân tách bằng dấu phẩy khi cần cross-origin. Ưu tiên frontend và API cùng origin. |
| `VITE_API_BASE_URL` | Build frontend, tùy chọn | Mặc định `/api`; chỉ chứa URL/path public, không bao giờ chứa secret. |

Tách Preview/Production variables. Không dùng dữ liệu production trong Preview. Không chạy migration tự động trong mỗi function invocation hoặc như một bước deploy không có approval.

## Kiểm tra sau khi tạo Preview

1. Kiểm tra Vercel build logs xác nhận static assets build và Node function được nhận diện.
2. Mở `/customer/home`, một route con khác và `/system/health`; xác nhận SPA fallback và assets trả về đúng.
3. Gọi `/api/health` để xác nhận function trả JSON/HTTP 200.
4. Nếu có database staging đã được migrate, gọi `/api/health/db`; nếu chưa có DB, HTTP 503 là trạng thái dự kiến.
5. Xác minh request/response, log và browser network không làm lộ secret; không có request Tailwind CDN.
6. Kiểm tra CORS, security headers, function logs, lỗi 404/500 và đường dẫn refresh sâu trước khi duyệt.

Global SPA rewrite trong `vercel.json` cần được kiểm tra cùng API function routing trên Preview, đặc biệt `/api/*`; không coi local dev proxy là bằng chứng rewrite/function routing production đúng.

## Trước production

- Hoàn tất staging migration và đối chiếu database theo [báo cáo migration](./database-migration-report.md).
- Chốt domain, database region/backup/restore, pool limits, secret rotation và quyền truy cập.
- Xác minh function routing, giới hạn runtime/body, database pooling và observability trên Preview.
- Chỉ deploy production sau khi đã duyệt data migration/rollback, smoke tests và environment variables.

Việc tạo hoặc cấu hình project chưa được thực hiện trong Milestone 1; các bước trên là hướng dẫn, không phải xác nhận đã deploy.
