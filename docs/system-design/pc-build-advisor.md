# Build PC thông minh: thuật toán tư vấn cấu hình

Mã nguồn: `frontend/src/v2/build-planner.ts` (hàm thuần, không gọi mạng), giao diện `frontend/src/v2/PcBuilderPage.tsx` (gợi ý theo nhu cầu), `frontend/src/v2/PcBuilderExpert.tsx` (phân tích chi tiết) và `frontend/src/v2/BuilderCheckout.tsx` (kiểm tra tương thích + thêm vào giỏ, dùng chung), kiểm thử `frontend/tests/build-planner.test.mjs`. Backend `PcBuilderCompatibilityService` kiểm tra lại cấu hình cuối cùng.

## 1. Đầu vào

| Câu hỏi cho khách | Giá trị |
| --- | --- |
| Dùng máy để làm gì | chơi game, game + livestream, đồ họa/dựng phim, lập trình/AI, văn phòng/học tập |
| Ngân sách | 8–150 triệu (mức trần, không vượt) |
| Màn hình (chỉ game) | Full HD, 2K, 4K |
| Hãng CPU | không quan tâm, Intel, AMD |
| Ưu tiên | hiệu năng tối đa, cân bằng, mát và êm |

Dữ liệu: mọi linh kiện đang bán của 8 nhóm (CPU, bo mạch chủ, RAM, VGA, SSD, nguồn, case, tản nhiệt) cùng giá của offer mua được.

## 2. Chuẩn hóa dữ liệu

Thông số catalog được đưa về dạng thống nhất trước khi so khớp. Ví dụ "Intel LGA1700" và "LGA1700" cùng là `LGA1700`; "mATX" và "Micro-ATX" cùng là `MATX`. Một số thông số được suy ra thêm:

- Chiều dài nguồn ATX: lấy từ ba cạnh lưu không theo thứ tự, bỏ cạnh 150 mm (rộng) và 86 mm (cao).
- Cỡ radiator danh nghĩa: chiều dài thật được quy về cỡ chuẩn gần nhất không vượt quá nó (277 mm → 240, 458 mm → 420).
- Sức tản nhiệt ước tính theo loại tản: AIO 360 khoảng 320 W, AIO 240 khoảng 230 W, tản tháp hai quạt khoảng 220 W.

## 3. Chỉ số hiệu năng

Thông số trong catalog (số nhân xử lý, cache…) không đủ nhất quán để xếp hạng chip, nên thuật toán dùng **chỉ số tương đối tham khảo theo tên chip**. Đây là giá trị ước lượng làm tròn từ kết quả benchmark công khai, chưa ghi nguồn đối chiếu cụ thể:

- VGA: hiệu năng 2K raster, RTX 5090 = 100 (ví dụ RTX 4060 = 29, RTX 5070 = 55).
- CPU chơi game: 9800X3D = 100. CPU đa nhân: 9950X = 100.

Khi không nhận ra chip, thuật toán ước lượng từ thông số catalog.

**Tốc độ khung hình bị giới hạn bởi bên chậm hơn** (giống một khung hình thật):

```
VGA = chỉ_số_VGA × tải_độ_phân_giải × hệ_số_VRAM     (1080p = 1, 2K = 0,75, 4K = 0,45)
CPU = chỉ_số_CPU_game × 1,2
điểm_game = (min(VGA, CPU) + 0,08 × chỉ_số_CPU_game) / tải_độ_phân_giải
```

Điểm hiệu năng theo nhu cầu:

| Nhu cầu | Công thức |
| --- | --- |
| Chơi game | `điểm_game` |
| Game + stream | `0,7 × điểm_game + 0,3 × CPU_đa_nhân` |
| Đồ họa | `0,55 × CPU_đa_nhân + 0,35 × VGA + 0,1 × CPU_game` |
| AI | `0,6 × VGA × (0,55 + 0,45 × VRAM/24) × (1,1 nếu NVIDIA/CUDA) + 0,4 × CPU_đa_nhân` |
| Văn phòng | bão hòa: vượt mức "đủ nhanh" (40 điểm) chỉ được tính 20 % |

## 4. Hàm mục tiêu

```
điểm(cấu_hình) = điểm_hiệu_năng + điểm_chất_lượng − λ × giá (triệu đồng)
```

- **Điểm chất lượng** cộng cho: dung lượng RAM và SSD theo bảng của từng nhu cầu (ví dụ chơi game 16 GB = 0, 32 GB = +5), SSD PCIe 4.0, nguồn 80 Plus Gold/Platinum và dư công suất, có cáp 16-pin gốc khi VGA cần, tản dư sức, bo mạch có Wi-Fi/DDR5/nhiều khe, case có sẵn quạt và USB-C. Chọn "Mát và êm" thì điểm tản nhiệt, nguồn và quạt được nhân đôi.
- **λ** là số điểm mỗi triệu đồng phải mang lại: game 0,45, đồ họa/AI 0,35, văn phòng 3 (văn phòng không tiêu tiền vào sức mạnh thừa). Chọn "Hiệu năng tối đa" thì λ nhân 0,6.

## 5. Ràng buộc tương thích (cứng)

Socket CPU = socket bo mạch; CPU hỗ trợ loại RAM của bo mạch; loại RAM, số thanh và tổng dung lượng phải nằm trong giới hạn bo mạch; SSD có cổng M.2/SATA tương ứng; case hỗ trợ kích cỡ bo mạch, chiều dài VGA, chiều dài nguồn, chiều cao tản khí hoặc cỡ radiator; tản hỗ trợ socket CPU và đủ sức (≥ 85 % công suất CPU, ≥ 100 % khi ưu tiên êm); nguồn ≥ max((100 + CPU + VGA) × hệ số dư, mức khuyến nghị của VGA); đủ đầu 8-pin; CPU từ 150 W không ghép bo mạch phổ thông H610/A520. Riêng nhu cầu văn phòng không bắt buộc VGA rời nếu CPU có đồ họa tích hợp.

## 6. Tìm cấu hình tốt nhất

1. **Liệt kê lõi.** Duyệt mọi bộ ba (CPU, VGA hoặc không VGA, loại RAM DDR4/DDR5 mà CPU hỗ trợ). Với mỗi bộ, ghép các nhóm còn lại bằng linh kiện **rẻ nhất vẫn hợp lệ** và đạt mức tối thiểu của nhu cầu, theo thứ tự bo mạch → RAM → SSD → nguồn → case → tản. Bỏ bộ nào vượt ngân sách.
2. **Giữ 30 lõi điểm cao nhất.**
3. **Tiêu phần tiền còn lại (tham lam theo lợi ích biên).** Lặp lại: thử mọi phép đổi một linh kiện ở bo mạch/RAM/SSD/nguồn/case/tản sao cho vẫn tương thích và không vượt ngân sách; chọn phép có *điểm tăng ÷ tiền tăng* lớn nhất (đổi sang món rẻ hơn mà điểm tăng thì ưu tiên tuyệt đối). Dừng khi không còn phép nào làm điểm tăng (đã trừ chi phí λ).
4. **Chọn cấu hình điểm cao nhất**, hòa thì chọn cấu hình rẻ hơn.

Độ phức tạp: khoảng 25 CPU × 30 VGA × 2 loại RAM lõi, mỗi lõi ghép trong O(số linh kiện). Với catalog khoảng 300 sản phẩm, một lần tư vấn chạy 10–170 ms ngay trên trình duyệt.

## 7. Sau khi có cấu hình

- **Ước tính FPS** cho 8 game (4 AAA, 4 eSports) với cùng bộ game gốc của bộ ước tính PC lắp sẵn: `FPS = FPS_gốc × chỉ_số_VGA/25 × hệ_số_độ_phân_giải × VRAM × RAM`, giới hạn trên bởi CPU (AAA: 1,8 × chỉ số CPU game; eSports: 5×). Mỗi kết quả ghi lại bên nào đặt ra con số (`limit`: CPU hay VGA).
- **Phát hiện nghẽn cổ chai.** Tỷ lệ = sức VGA ở độ phân giải đã chọn ÷ sức CPU. Lớn hơn 1,15 thì CPU kìm VGA (báo phần trăm sức mạnh bị bỏ phí); nhỏ hơn 0,5 thì VGA là giới hạn chính; ở giữa là cân bằng.
- **Nâng cấp đáng tiền nhất.** Với VGA, CPU, RAM, SSD, tản và nguồn: thử từng món đắt hơn, **tự sửa dây chuyền** (nâng nguồn, đổi case, đổi tản nếu món mới làm phá vỡ tương thích), tính `(% hiệu năng tăng + 1,5 × điểm chất lượng tăng) ÷ triệu đồng thêm`. Lấy phương án tốt nhất của mỗi nhóm, rồi hiển thị 4 phương án xếp theo giá trị.
- **Phương án khác:** chạy lại thuật toán với 80 % ngân sách (tiết kiệm) và 125 % ngân sách (mạnh hơn).
- **Giải thích bằng lời** cho từng linh kiện: số FPS, dung lượng chứa được bao nhiêu game, nguồn dư bao nhiêu phần trăm, case chứa VGA dài bao nhiêu…
- Cấu hình cuối cùng luôn được gửi lên backend kiểm tra lại (15 bước). Nút "thêm cả cấu hình vào giỏ" bị khóa khi còn lỗi tương thích.

## 8. Phân tích cấu hình chi tiết

Trang Build PC mặc định là phần gợi ý theo nhu cầu (mục 1–7). Phần phân tích chi tiết được mở bằng liên kết nhỏ "⚙ Phân tích chi tiết" ở góc tiêu đề, hoặc "Xem benchmark chi tiết →" cạnh danh sách linh kiện. Giao diện không phân loại người dùng theo trình độ. Phần này dùng cùng catalog, cùng chỉ số và cùng ràng buộc, nhưng để người dùng tự cầm lái:

- **Bảng cấu hình.** Nạp sẵn cấu hình mà bộ tư vấn vừa đề xuất (cùng mục đích, độ phân giải, ưu tiên). Mỗi ô chọn liệt kê toàn bộ linh kiện đang bán; món không hợp bị khóa kèm lý do.
- **Benchmark cấu hình** (`benchmarkBuild`): chỉ số CPU chơi game và đa nhân, chỉ số VGA, VRAM, dung lượng và bus RAM, tốc độ đọc SSD, điện năng tải nặng, phần trăm tải nguồn, độ dư tản nhiệt (công suất tản ÷ công suất đỉnh CPU), điểm theo mục đích sử dụng và tổng giá.
- **Cân bằng CPU ↔ VGA** ở cả Full HD, 2K và 4K, kèm phần trăm VGA/CPU được dùng. Đây là công thức tỷ lệ ở mục 7.
- **Ma trận FPS** 8 game × 3 độ phân giải. Ô bị CPU giới hạn được gạch chân chấm: đổi VGA mạnh hơn không làm số đó tăng.
- **Hiệu năng công việc** (`workloadBench`) cho người build máy để làm việc chứ không chỉ chơi game. Mọi số là ước tính tham khảo:
  - *AI chạy trên máy.* Tốc độ chat (token/s) với các model Q4 phổ biến: Llama 3.1 8B (4,9 GB), Qwen 2.5 14B (9 GB), Qwen 2.5 32B (19,9 GB), Llama 3.3 70B (42,5 GB). Khi sinh từng token, model đọc lại toàn bộ trọng số, nên `thời gian/token = phần trong VRAM ÷ (băng thông VRAM × 0,6) + phần trong RAM ÷ (băng thông RAM × 0,65)`. Hệ số VGA AMD/Intel là 0,5. VRAM chừa 1,5 GB cho ngữ cảnh, RAM chừa 6 GB cho hệ điều hành; không đủ chỗ thì báo không chạy được. Ngoài ra có: model lớn nhất chạy trọn trong VRAM, thời gian tạo một ảnh SDXL 1024×1024 30 bước (theo chỉ số VGA; VGA AMD/Intel × 0,55; VRAM dưới 8 GB × 2, dưới 10 GB × 1,15), băng thông VRAM, thời gian nạp model 14B từ SSD.
  - *Dựng video & đồ họa.* Thời gian xuất video 4K dài 10 phút: `2,6 phút × (0,5·(100/CPU đa nhân)^0,6 + 0,5·(100/VGA)^0,6)`. Bộ mã hóa phần cứng: NVENC/VCN/Quick Sync, có AV1 hay không, xác định theo thế hệ VGA vì cờ AV1 trong catalog chưa đáng tin. Điểm Blender (RTX 5090 ≈ 14 500; AMD × 0,45) và Cinebench 2024 đa nhân (Ryzen 9 9950X ≈ 2 240).
  - *Lập trình & đa nhiệm.* Thời gian biên dịch Linux kernel (9950X ≈ 38 giây), số nhân/luồng, số máy ảo 2 vCPU · 4 GB chạy song song (đã chừa 8 GB RAM và 2 luồng), băng thông RAM theo số kênh.

  Thứ tự các nhóm đổi theo mục đích sử dụng đang chọn. Khi đã ghim mốc, mỗi số hiện Δ; tác vụ chuyển từ "không chạy được" sang chạy được thì cũng được ghi rõ.
- **Ghim làm mốc.** Lưu cấu hình hiện tại; từ đó mọi ô benchmark và ô FPS hiện chênh lệch (Δ) so với mốc.
- **What-if: đổi linh kiện** (`whatIfRows`). Chọn một nhóm (CPU, VGA…), hệ thống thử thay *từng* sản phẩm trong nhóm vào cấu hình:
  1. Nếu vẫn hợp lệ thì giữ nguyên các món khác ("Lắp được").
  2. Nếu không, chạy **sửa dây chuyền**. Đổi bo mạch khi lệch socket/RAM (giá ≥ 60 % bo cũ, ưu tiên cùng kích thước). Đổi RAM sang loại hợp lệ có dung lượng không nhỏ hơn. Sau đó lần lượt sửa SSD, nguồn, case, tản bằng món rẻ nhất hợp lệ. Kết quả hiện "Đổi kèm …".
  3. Không sửa được thì đánh dấu "Không lắp được" kèm lý do. Các dòng này ẩn mặc định.

  Mỗi dòng báo Δ tổng giá (đã tính món đổi kèm), Δ hiệu năng theo mục đích, Δ của *tác vụ chính* theo mục đích (`taskDelta`: FPS AAA cho chơi game, tốc độ xuất video 4K cho dựng phim, tốc độ LLM 14B cho AI; văn phòng thì không có cột này) và **% hiệu năng / triệu đồng**. Có thể sắp xếp theo tác vụ chính. Dòng nào mà mọi game AAA đã chạm trần CPU thì gắn nhãn "chạm trần CPU" (`cpuCapped`), tức là bỏ thêm tiền cho VGA cũng không tăng FPS.
- **So sánh chi tiết.** Bấm một dòng để xem bảng thông số kỹ thuật cũ ↔ mới (ô khác nhau được tô), benchmark, các số hiệu năng công việc bị thay đổi và FPS của cấu hình sau khi đổi kèm Δ, và nút "Áp dụng thay đổi".
- **Bảng thông số kỹ thuật** của từng linh kiện lấy thẳng từ catalog, dùng cùng nhãn và định dạng với trang sản phẩm.

Mọi phép tính chạy trên trình duyệt. Đo trên catalog thật (297 sản phẩm): một bảng what-if khoảng 25–34 dòng, đã gồm sửa dây chuyền, tính xong dưới 2 ms.

## 9. Giới hạn đã biết

- Chỉ số hiệu năng, FPS và hiệu năng công việc là ước tính tham khảo, không phải kết quả đo trên chính cấu hình. Số liệu AI dựa trên băng thông VRAM trong catalog; trường `tensor_core_count` hiện là dữ liệu điền sẵn nên chưa được dùng.
- Thông số catalog hiện có phần là dữ liệu demo chưa xác minh, nên một số giới hạn kích thước có thể chưa chính xác.
- Chưa xét cập nhật BIOS cho CPU đời mới trên bo mạch cũ, và chưa xét độ dày khe của VGA.
