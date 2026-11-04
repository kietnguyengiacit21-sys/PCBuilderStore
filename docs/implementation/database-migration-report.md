# Báo cáo migration database

## Trạng thái

Migration PostgreSQL và Prisma schema đã được sinh từ `schema_35_tables.sql` (MySQL 8). Migration chưa được chạy trên Neon hoặc PostgreSQL khác; chưa có dữ liệu được chuyển/import. Không dùng trạng thái validate/generate làm bằng chứng database đích đã tương thích.

## Đối chiếu cấu trúc

| Hạng mục | DDL MySQL nguồn | Migration PostgreSQL sinh ra |
|---|---:|---:|
| Bảng / Prisma model | 35 | 35 |
| Cột | 305 | Giữ theo 35 bảng nguồn |
| Unique constraints | 22 | Đã port |
| Indexes | 40 | 40 |
| Foreign keys | 55 | 55 |
| Check constraints | 28 | 132 |

Migration có thêm check constraints để giữ phạm vi `UNSIGNED` và các invariant chuyển đổi cần thiết; do đó số check ở đích cao hơn số check tường minh trong DDL nguồn. Các phép đếm này là so sánh artifact sinh ra, chưa phải so sánh catalog của một database đã triển khai.

## Quyết định chuyển đổi cần lưu ý

- `UNSIGNED` được biểu diễn bằng kiểu số có dấu cùng check giới hạn; unsigned 64-bit ID dùng cặp sequence signed và hàm `next_unsigned_bigint` để giữ phạm vi ID.
- `TINYINT(1)` chuyển thành boolean, `JSON` thành JSONB, và các kiểu text/date được ánh xạ sang kiểu PostgreSQL tương ứng.
- `ON UPDATE CURRENT_TIMESTAMP` được mô phỏng bằng trigger PostgreSQL.
- MySQL `utf8mb4_0900_ai_ci` được xấp xỉ bằng ICU collation `mysql_0900_ai_ci` (`und-u-ks-level1`). Ngữ nghĩa/version ICU có thể khác MySQL và cần xác minh trên Neon.
- Một số check có biểu thức boolean được viết lại cho PostgreSQL; chi tiết triển khai là trong [migration SQL](../../backend/prisma/migrations/20261102000000_initial/migration.sql) và [script port](../../backend/scripts/port_mysql_schema.py).

Prisma schema không mô tả đầy đủ các custom collation, check constraints, triggers, sequences và helper function. Sau khi áp dụng migration, cần kiểm tra drift trước mọi lần sửa schema tiếp theo; không tái tạo migration ban đầu bằng Prisma để thay thế các đối tượng tùy chỉnh.

## Quy trình đề nghị cho môi trường staging

1. Tạo database staging riêng và thiết lập quyền/backup phù hợp. Không dùng production credentials cho Preview.
2. Đặt `DATABASE_URL` (runtime/pooler) và `DIRECT_URL` (kết nối migration) trong `backend/.env`; không commit file này.
3. Chạy `npm run db:validate`, rà soát migration, rồi `npm run db:migrate:deploy` đúng một lần từ quy trình có kiểm soát.
4. Chạy `npm run db:seed` nếu cần dữ liệu nền. Seed chỉ upsert các role, product types và use cases tối thiểu; không tạo user quản trị hay catalog sản phẩm.
5. Đối chiếu catalog PostgreSQL với DDL nguồn: bảng, cột, nullability, kiểu, defaults, PK/unique/index/FK/check, sequence, triggers và collation.
6. Kiểm tra insert ID biên, hành vi cập nhật timestamp, so sánh chuỗi/case, các FK/check và Prisma client trên đúng PostgreSQL/ICU version.
7. Ghi lại kết quả, chấp thuận và cách khôi phục trước khi lặp quy trình cho production.

`npm run db:migrate:deploy` và `npm run db:seed` thay đổi dữ liệu/schema. Chỉ chạy khi đã chọn đúng database và được phép; chúng không được chạy trong báo cáo này.
