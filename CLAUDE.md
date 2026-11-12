# Thanh Vân Tu Tiên: ghi chú cho Claude

Game pixel tu tiên chạy trên trình duyệt (Phaser 3.80 qua CDN, script thường, namespace toàn cục `TT`, không build).
Người dùng viết tiếng Việt, **luôn trả lời bằng tiếng Việt**.

## Đọc trước khi làm

- **`docs/QUY_TRINH_NHAN_VAT.md`**: quy trình chuẩn tạo nhân vật tông môn (Kiếm Tu `kiem_ai` là mẫu) và **mục 9: việc còn dang dở**. Khi người dùng muốn làm nhân vật hay tông môn mới, hoặc làm tiếp phần còn thiếu, làm theo tài liệu này. Xong việc thì cập nhật mục 9.
- `README.md`: điều khiển, hệ tu luyện, cách chạy.

## Chạy và kiểm thử

- Lần đầu trên máy mới: `setup.bat` (tạo `.venv`, cài numpy, pillow, opencv, scipy). Chạy game: `start.bat` (server không cache `tools/serve.py` ở cổng 8080).
- Python công cụ: `./.venv/Scripts/python.exe -I tools/<tool>.py ...` (Windows; console cần `sys.stdout.reconfigure(encoding="utf-8")` để in tiếng Việt).
- Kiểm thử không giao diện:
  - chạy `python tools/serve.py 8765` ẩn;
  - mở Edge `--headless=new --remote-debugging-port=9333`;
  - điều khiển bằng một script Node qua CDP: đặt bản lưu vào `localStorage` khoá `thanh-van-tu-tien-v1`, gọi `game.scene.getScene('Select').start('continue')`, gọi `w.useSkill(i)`, chụp `Page.captureScreenshot`, đọc lỗi trong `#err`;
  - xong việc thì tắt Edge và server.
  - Trước khi tải lại trang, tắt `TT.Save.save`, vì game tự lưu khi thoát.

## Cách làm việc với người dùng

- **Ảnh nhân vật do người dùng tạo bằng Gemini**, theo câu lệnh Claude soạn. Claude **không** vẽ nhân vật bằng code: người dùng đã chê là thô.
- Khi soạn câu lệnh: viết bằng tiếng Anh, giải thích bằng tiếng Việt; mỗi lần một hàng 6 khung; chỉ gắn ảnh mẫu đúng hướng; nền trắng thuần; tải bằng nút tải về. Chi tiết ở mục 2 của tài liệu quy trình.
- Khi người dùng gửi ảnh: kiểm tra kỹ (góc nhìn, số hàng, lỗi tay, vũ khí thừa) và **nói thẳng đạt hay chưa**. Người dùng muốn sửa đến khi đạt, không bỏ qua phần khó.
- **Không sao chép hay cắt khung tạo hình nhân vật từ game khác** (đã từ chối Tu Tiên Ký). Tài nguyên được phép dùng:
  - ảnh AI tự tạo;
  - gegx hero-128 (bản đã chỉnh trong `assets/`; không phân phối lại zip gốc);
  - pixelfx (MIT);
  - beanfx.
- Hiệu ứng chiêu: chuyển động bám tình huống thì viết code (`src/skill_<tên>.js`); hình ảnh từng phần lấy từ pixelfx (`tools/pack_pixelfx.py`, đổi màu) hoặc beanfx (skill `.claude/skills/beanfx`, `tools/pack_beanfx.py`).

## pixelfx trên máy mới

Các hiệu ứng `px_*` đã đóng gói sẵn trong `assets/fx/`. Muốn thêm hiệu ứng mới thì cần sheet gốc:

```
git clone --depth 1 https://github.com/patch-gg/pixelfx.git <thư mục ngoài dự án>
cd <thư mục đó> && node tools/sheets.mjs
```

Bước `node tools/sheets.mjs` để người dùng tự chạy hoặc cấp quyền, vì đó là code tải về. Sau đó:

```
python tools/pack_pixelfx.py <thư mục>/sheets <nhóm/tên> <px_tên_game> --hue <sắc độ>
```

## Git

Kho trên GitHub (private). Chỉ commit hoặc push khi người dùng yêu cầu. Không đưa lên:
- `.venv`;
- video `*.mp4`;
- zip `*-hero-128-assets.zip`;
- `drafts/*/out`.
