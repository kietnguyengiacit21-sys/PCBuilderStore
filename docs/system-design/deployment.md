# Kiến trúc triển khai tương thích Vercel

## Đề xuất topology

```text
Browser
  ├── React + TypeScript + Vite static assets (Vercel)
  └── /api/v1/* → Express app trong Vercel Node.js Function
                     └── PostgreSQL managed service
```

Đây là topology mục tiêu; frontend React/Vite, Express app, Prisma adapter và Vercel configuration đã được tạo trong Milestone 1. Chưa cấu hình domain, kết nối Neon hoặc deploy production. Xem [hướng dẫn triển khai hiện tại](../implementation/vercel-deployment-guide.md).

## Web và API

- Build React/Vite thành static assets trên Vercel. Web và `/api/v1` cùng origin giảm CORS/cookie complexity.
- Đóng gói Express app dưới dạng Node.js Function theo hướng dẫn Vercel; route `/api/v1/*` được rewrite đến function. Không dựa vào Express process local, filesystem persistent, in-memory session/cache hay long-lived WebSocket.
- Handler stateless; mọi request xác thực độc lập. Background/long-running jobs không chạy trong request nếu vượt giới hạn function; CSV import MVP nên đồng bộ, giới hạn kích thước, hoặc cần một nền tảng job riêng được duyệt.
- API response có request ID, log an toàn và lỗi có cấu trúc. Tránh ghi PII, password, cookie, access token, payment details. Không gửi secret tới bundle client.
- Mỗi function instance có thể khởi tạo riêng; Prisma client nên được tái sử dụng trong phạm vi instance theo khuyến nghị adapter/runtime đã chọn, nhưng không giả định instance duy trì lâu dài.

## PostgreSQL và Prisma

- Dùng PostgreSQL managed provider tương thích với môi trường/serverless; provider, region, backup/PITR, SLA và network policy chưa được chọn.
- DDL gốc là MySQL; Prisma schema và migration PostgreSQL cho 35 bảng đã được sinh. Chưa chạy migration trên Neon; collation ICU và custom migration objects cần xác minh trên môi trường PostgreSQL đích.
- Runtime dùng URL/pooler phù hợp với serverless và giới hạn kết nối; lựa chọn Prisma driver/adapter, pool mode và giới hạn pool cần xác minh với provider cụ thể. Không để mỗi invocation tạo pool lớn hoặc giữ connection không giới hạn.
- Nếu dùng transaction/row locks, xác minh pooler hỗ trợ transaction semantics cần thiết; checkout/stock transaction không được chạy qua mode làm hỏng transaction.
- Dùng credential runtime có quyền tối thiểu và credential migration riêng. Migration kết nối trực tiếp hoặc endpoint/session mode được provider yêu cầu; không chạy `prisma migrate deploy` song song trong từng function invocation.
- Chỉ chạy migration có kiểm soát qua CI/CD job một lần sau approval, backup/recovery plan và môi trường staging; trong phạm vi thiết kế hiện tại không tạo schema/migration hay chạy lệnh migration.

## Environments và secret management

Tách ít nhất Development, Preview/Staging và Production với DB/credentials riêng. Preview deployment không được trỏ production DB mặc định.

Biến môi trường dự kiến (tên cuối chưa chốt):

| Nhóm | Ví dụ cấu hình | Ràng buộc |
|---|---|---|
| Database | URL runtime, direct/migration URL | Server-only; không prefix `VITE_`; không ghi log |
| Auth | cookie signing/JWT secrets, allowed origin | Server-only, rotation; phải khớp session mechanism được duyệt |
| Web/API | public API base path, app origin | Chỉ thông tin public; ưu tiên cùng origin |
| Integrations | payment/shipping credentials nếu được duyệt | Không tồn tại ở MVP hiện thiết kế; scope riêng, least privilege |

Vercel project environment variables/secret store quản lý secrets; access được giới hạn theo môi trường và người vận hành. Thay secret theo quy trình rotation, không commit `.env` thật. Không dùng dữ liệu production trong Preview.

## Build, route và bảo mật

- Build/check/lint/test chạy trong CI; pin Node.js major, package manager/lockfile và Prisma version sau khi project được tạo.
- `vercel.json` rewrite cần tránh nuốt asset/static routes; xác minh `/api/v1/*`, fallback SPA, HTTP methods, body/file size và cache headers khi implement.
- Admin routes cần server-side role authorization; same-origin cookie cần CSRF mitigation. CORS allowlist không thay thế authentication/authorization.
- TLS từ Vercel đến browser; kết nối database dùng TLS/provider certificate verification.
- Static product data có thể cache có thời hạn ngắn sau khi có invalidation policy; không cache cart, account, admin hoặc dữ liệu order riêng tư trong CDN.
- Không đưa service account/DB credential vào client, không dùng filesystem của function để lưu ảnh/CSV/report lâu dài. Product image upload cần object storage riêng; hiện schema chỉ lưu `image_url`.

## Quan sát vận hành và phục hồi

- Structured logs/metrics theo request ID, status, duration, DB error category; loại trừ thông tin xác thực và PII không cần thiết.
- Theo dõi function errors/latency, database connections, pool saturation, query latency, rate limit và deploy health. Không hiển thị “System Online” hay trạng thái kết nối cho người mua nếu chưa có health check thật.
- Health/readiness endpoint (nếu bổ sung) không trả thông tin secret/schema; kiểm tra DB chỉ qua server và không dùng như bằng chứng mọi nghiệp vụ đã hoạt động.
- Chốt backup/PITR, retention, restore test, incident owner và rollback strategy với provider trước production.
- Vercel functions không phải job queue. Webhook cần xác minh chữ ký, idempotency và durable event handling; schema hiện không có payment webhook/event persistence. Không giả định tự động retry không gây trùng.

## Tài liệu nền tảng

- [Express trên Vercel](https://vercel.com/docs/frameworks/backend/express)
- [Node.js Functions trên Vercel](https://vercel.com/docs/functions/runtimes/node-js)
- [Prisma ORM: PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)

Hướng dẫn nền tảng là tài liệu tham khảo, không phải xác nhận đã deploy hay tương thích với provider chưa chọn. Cần xác minh giới hạn runtime, pooling, adapter và deployment config tại thời điểm triển khai.
