# Báo cáo làm sạch giao diện PC Builder Store

## Phạm vi

Đã kiểm tra 31 trang HTML hiện có trong các nhóm Customer, Admin và Build-PC: 12 trang Customer, 10 trang Admin, 8 màn hình Build-PC và 1 tệp tham chiếu B06. Không xóa trang nghiệp vụ, đổi tên tệp hoặc thay đổi schema dữ liệu.

## Thành phần đã xóa hoặc chỉnh sửa

- Gỡ thanh điều hướng prototype, mã tự chèn thanh này cùng CSS/JavaScript dùng riêng cho preview; loại bỏ các launcher và tài liệu chỉ phục vụ preview.
- Xóa thanh kiểm thử trạng thái rỗng trên trang lịch sử đơn hàng.
- Loại bỏ mã màn hình, nhãn dành cho designer/developer và các cụm từ tiếng Anh không cần thiết khỏi nội dung hiển thị.
- Đồng nhất shell Customer và Build-PC; chuẩn hóa shell quản trị, breadcrumb, sidebar và nhãn chức năng bằng tiếng Việt.
- Thay các tuyên bố, trạng thái hoặc dữ liệu không có căn cứ bằng nội dung trung tính: ví dụ trạng thái tồn kho chưa xác nhận, thông báo dữ liệu minh họa và thông báo chức năng chưa kết nối.
- Loại bỏ thông tin liên hệ, điểm hội viên, đánh giá sản phẩm, mã giao dịch và trạng thái benchmark giả lập có thể gây hiểu nhầm.

## Chức năng được giữ lại

Giữ nguyên các màn hình và luồng nghiệp vụ hiện có, gồm tìm kiếm/lọc/so sánh sản phẩm, giỏ hàng, thanh toán, đăng nhập/đăng ký, theo dõi đơn hàng, tra cứu bảo hành, quản trị sản phẩm/danh mục/thương hiệu/đơn hàng/khách hàng/nhân viên và các bước xây dựng cấu hình PC.

Các thao tác cần máy chủ vẫn giữ nút và giao diện. Khi chưa có backend, chúng hiển thị trạng thái chưa kết nối thay vì giả lập lưu, đặt hàng, thanh toán hoặc cập nhật thành công. Đã kiểm tra thực tế thông báo này trên thao tác thêm vào giỏ hàng và thao tác cấu hình PC.

## Dữ liệu mẫu và phụ thuộc backend

Dữ liệu tĩnh vẫn được giữ để bảo toàn bố cục và luồng giao diện, gồm danh mục/sản phẩm/giá/tồn kho, đơn hàng và thông tin tài khoản minh họa, dữ liệu quản trị, cấu hình đề xuất, thông tin tương thích và số liệu đo kiểm. Các số liệu benchmark trong B06 là dữ liệu tham khảo minh họa, không phải kết quả kiểm thử thực tế.

Dữ liệu mẫu vẫn nằm trong nội dung HTML hiện có, chưa được tách thành một mô-đun seed/mock riêng. Không coi các dữ liệu này là dữ liệu doanh nghiệp thật; khi tích hợp backend, cần thay thế bằng API hoặc lớp dữ liệu mock/seed riêng.

Các phần cần backend trước khi vận hành thật:

- Xác thực tài khoản, OTP và quyền nhân viên.
- Danh mục, giá, tồn kho, tìm kiếm và lọc sản phẩm.
- Giỏ hàng, tạo đơn, thanh toán, vận chuyển, trạng thái đơn và hủy đơn.
- Hồ sơ khách hàng, lịch sử giao dịch và tra cứu/đăng ký bảo hành.
- Các thao tác thêm/sửa/xóa, nhập CSV, tra cứu và cập nhật dữ liệu trong Admin.
- Lưu cấu hình PC, kiểm tra tương thích/điện năng, tồn kho, giá, chia sẻ cấu hình và gợi ý linh kiện.

Không thay đổi schema database hoặc khẳng định đã có kết nối database/API.

## Kiểm tra sau khi làm sạch

- Mở 31 trang màn hình ở viewport 390px và 1366px: tất cả trả HTTP 200; không phát hiện tràn ngang theo `document.documentElement.scrollWidth`.
- Không phát hiện lỗi JavaScript runtime hoặc lỗi console trong lượt kiểm tra. Điều hướng Customer, Build-PC và Admin đã được thử; 28 giá trị `data-path` đều có route tương ứng.
- Kiểm tra cú pháp 39 script JavaScript dùng chung/inline: không có lỗi.
- Kiểm tra 198 tham chiếu tài nguyên/liên kết nội bộ: không có đường dẫn hỏng.
- Quét nội dung hiển thị: không còn nhãn preview/prototype, mã Cxx/Axx/Bxx, trạng thái giả lập đã nêu hoặc các nhãn tiếng Anh đã rà soát.
- Sau khi thiết lập Vite, Tailwind được biên dịch vào CSS production; compatibility renderer bỏ qua các script Tailwind CDN và cấu hình Tailwind còn trong HTML gốc. Kiểm tra lại 30 route ứng dụng ở viewport 390px và 1366px: HTTP 200, không tràn ngang, không lỗi JavaScript/console và không chèn script `cdn.tailwindcss.com`.
- `npm run build` hoàn tất; các route HTML được nạp theo chunk riêng thay vì gộp tất cả vào bundle ban đầu.

## Lỗi còn lại

Không phát hiện lỗi trang, lỗi JavaScript hoặc đường dẫn nội bộ hỏng trong lượt kiểm tra. Tailwind CDN không còn được nạp bởi ứng dụng; dữ liệu tĩnh và các luồng chưa tích hợp backend vẫn cần xử lý trước production.
