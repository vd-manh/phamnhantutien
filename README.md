# Thanh Vân Tu Tiên (prototype)

Game pixel tu tiên chạy trên trình duyệt, viết bằng Phaser 3. Không cần build, không cần cài gì thêm.
Toàn bộ pixel art và hiệu ứng hiện tại được vẽ bằng code làm bản tạm. Có thể thay từng hiệu ứng
bằng sprite sheet xuất từ [beanfx](https://github.com/baenv/beanfx).

## Làm tiếp trên máy khác

1. Cài **Git**, **Python 3.10+** (nhớ tích "Add python.exe to PATH") và **VS Code** kèm Claude Code.
2. Tải dự án: `git clone <địa chỉ kho GitHub>`, hoặc trên GitHub bấm **Code → Download ZIP**.
3. Nháy đúp **`setup.bat`** (chỉ cần lần đầu) để cài thư viện cho các công cụ.
4. Nháy đúp **`start.bat`** để chạy game.
5. Mở thư mục trong VS Code. Claude tự đọc `CLAUDE.md` và `docs/QUY_TRINH_NHAN_VAT.md`. Việc còn dang dở nằm ở **mục 9** của tài liệu đó.

Lưu game nằm trong trình duyệt (localStorage), không đi theo kho. Máy mới bắt đầu lại từ đầu.

## Chạy game

Nháy đúp **`start.bat`**. File này mở http://localhost:8080 và chạy server cục bộ (`tools/serve.py`, cần có Python).

Nếu mở thẳng `index.html` thì game vẫn chạy, nhưng dùng nhân vật vẽ tạm, vì trình duyệt chặn tải ảnh từ `file://`.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| WASD / phím mũi tên | Di chuyển (nhân vật xoay 8 hướng) |
| J (giữ) | Đánh thường, 3 đòn liên hoàn |
| K L U I O (hoặc 1 2 3 4 5) | 5 ô chiêu thức. Bấm chuột vào ô cũng được, rê chuột để xem mô tả |
| Giữ SPACE | Thiền: hấp thu linh khí, hồi khí huyết và linh lực |
| B | Độ kiếp khi đã chạm bình cảnh |
| P | Đổi môn phái, giữ nguyên tu vi |
| M | Bật/tắt âm thanh |

## Hệ tu luyện và chiêu thức

Chọn hệ ở màn hình đầu. Nếu đã có bản lưu, nút "Tiếp tục" sẽ hiện ra. Ô chiêu thứ i mở khóa khi đạt đại cảnh
giới thứ i.

| Ô | Mở khóa | Kiếm Tu (nhiều khí huyết, công cao) | Pháp Tu (nhiều linh lực, tầm xa) |
|---|---|---|---|
| K | Luyện Khí | Kiếm Khí Trảm: kiếm khí bay xuyên địch | Lôi Pháp: sét đánh yêu thú gần nhất |
| L | Trúc Cơ | Lưu Vân Bộ: lướt, cuồng phong nổ khi dừng ★ | Băng Vũ Trận: mưa băng 4 giây, làm chậm ★ |
| U | Kim Đan | Vạn Kiếm Quy Tông: 48 phi kiếm, cự kiếm cắm xuống ★ | Lôi Thần Hộ Thể: lôi quấn thân, tự giật địch ★ |
| I | Nguyên Anh | Kiếm Vực: 3 phi kiếm xoay quanh 5 giây | Tinh Long Kích: đầu rồng tinh tú xuyên thẳng ★ |
| O | Hóa Thần | Phi Long Tại Thiên: kim long bổ xuống ★ | Phật Nộ Hỏa Liên: hỏa liên nổ tung ★ |

Nhân vật **Kiếm Tu bạch y** được tạo bằng `tools/make_kiem_tu.py` từ tu sĩ cầm kiếm của beanfx. Script gỡ nón và
mạng che mặt, vẽ tóc đen buộc đuôi ngựa có kim quan, rồi đổi sang bạch y và kiếm bạc. Quanh người có lửa linh khí xanh
lam (khai báo bằng `aura` trong `classes.kiem`).

**Quỷ Tu** (nội tại Hấp Hồn: mỗi yêu thú bị diệt hồi 6% khí huyết):

| Ô | Mở khóa | Chiêu |
|---|---|---|
| K | Luyện Khí | Câu Hồn Trảo: 3 âm hồn tự truy đuổi yêu thú, hút máu |
| L | Trúc Cơ | Huyết Ảnh Độn: dịch chuyển tức thời, nổ huyết vụ ở hai đầu, hút máu |
| U | Kim Đan | Âm Hỏa Trận: 8 ma trơi xoay quanh thân 5 giây, hút máu |
| I | Nguyên Anh | Bách Quỷ Dạ Hành: 4 quỷ hồn tự đi săn 8 giây |
| O | Hóa Thần | Vạn Hồn Phiên: vạn âm hồn nuốt chửng mục tiêu, hồi 15% khí huyết ★ |

Nhân vật Quỷ Tu được tạo bằng `tools/make_quy_tu.py`: script đổi màu tu sĩ cầm trượng của beanfx rồi vẽ thêm cờ hồn
lên đầu trượng ở từng frame. Phím P (hoặc nút "Đổi môn phái") chuyển lần lượt qua 3 hệ mà giữ nguyên tu vi.

**Võ Tu**: nhân vật tay không tạo bằng `tools/make_vo_tu.py`. Script gỡ kiếm, nón và mạng che, vẽ tóc búi cao, rồi đổi sang áo trắng ngọc với áo trong xanh ngọc bích. Ô K là **Cửu Long Đế Vương
Công**: chín kim long tụ thành vầng quạt sau lưng, gầm, lần lượt bay tới ngoạm mục tiêu cách khoảng 6 ô. Chiêu có 3 mốc
sát thương (nhẹ, nặng, kết liễu). Ô I là **Kim Chung Tráo** (mở ở Nguyên Anh): bóng chuông vàng úp xuống rồi tan, để lại hào quang 6 giây, giảm 50% sát thương nhận vào và tăng 30% công lực (`drafts/kim_chung_trao/`). Ô O là **Giáng Long Thập Bát Chưởng** (mở ở Hóa Thần): đứng vận lực gọi mây giông xanh (cách dựng mây mượn từ Vạn Kiếm Quy Tông), chưởng phong bắn sét lên mắt bão, 18 tử long quấn sét tím lao từ mây xuống mục tiêu, kết bằng thiên lôi và đầu rồng khổng lồ (`drafts/giang_long_chuong/`; bản rồng vàng cũ lưu ở `giang_long_chuong_v1_gold.py.bak`). Ô L và U tạm mượn chiêu Kiếm Tu. Hiệu ứng được vẽ bằng skill beanfx trong
`drafts/cuu_long_de_vuong/`.

★ là chiêu dùng hiệu ứng mẫu của beanfx. Phi Long Tại Thiên, Tinh Long Kích và Phật Nộ Hỏa Liên có vẽ sẵn "kim thân",
nên nhân vật được ẩn đi trong lúc tung chiêu. Khi đột phá đại cảnh giới, game phát `dot_pha_hoa_than`.
Nếu chưa nạp được hiệu ứng (ví dụ mở thẳng `index.html`), các chiêu ★ tự quay về bản vẽ tạm.

Chỉ số và chiêu được khai báo trong `src/data.js` (`classes`, `skills`), còn cách hoạt động của từng chiêu nằm trong
`src/skills.js`. Muốn thêm chiêu thì thêm một mục vào `skills` và một hàm cùng tên vào `TT.Skills`.

## Lối chơi

- **Cảnh giới**: Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư. Mỗi cảnh giới
  có Sơ kỳ, Trung kỳ, Hậu kỳ. Lên tiểu cảnh giới là tự động, lên đại cảnh giới phải độ kiếp.
- **Linh tuyền** ở giữa bản đồ: thiền tại đây được x2.5 tu vi. Trận pháp quanh linh tuyền chặn yêu thú.
- **Yêu thú** rơi linh khí (quả cầu xanh) khi bị diệt. Cảnh giới càng cao thì yêu thú càng mạnh.
- **Độ kiếp**: trời tối, thiên lôi đánh xuống các vòng đỏ, phải né. Đạo lôi cuối bám theo người chơi
  và không né được, giữ SPACE để vận công hộ thể (giảm 60% sát thương). Thua thì mất tu vi.
- Tiến độ tự lưu vào localStorage. Nút "Chơi lại" xóa dữ liệu lưu.

## Cấu trúc

```
index.html            khung trang + HUD
css/style.css         giao diện HUD
src/data.js           cảnh giới, yêu thú, hằng số cân bằng, lưu game
src/pixel.js          công cụ vẽ pixel (ellipse, line, outline, sprite sheet)
src/textures.js       sinh sprite: tu sĩ, yêu thú, cây, linh tuyền, thiên lôi, kiếm khí...
src/fx.js             hiệu ứng: sét, chém, nổ hạt, vòng sáng, đột phá (ưu tiên beanfx nếu có)
src/sfx.js            âm thanh tổng hợp WebAudio
src/hud.js            cập nhật thanh máu/linh lực/tu vi, log, banner
src/scenes/boot.js    sinh asset + nạp nhân vật/hiệu ứng beanfx
src/scenes/select.js  màn hình chọn hệ tu luyện
src/skills.js         10 chiêu thức của 2 hệ
src/scenes/world.js   gameplay chính
assets/fx/            nơi đặt hiệu ứng beanfx
```

Muốn chỉnh độ khó thì sửa `src/data.js` (lượng tu vi cần, chỉ số, số đạo thiên lôi, tốc độ thiền...).

## Nhân vật và hiệu ứng beanfx

Asset trong `assets/casters/` và `assets/fx/sigil_thunder_strike/` lấy từ [beanfx](https://github.com/baenv/beanfx)
(MIT, xem `assets/LICENSE-beanfx.txt`).

- **Nhân vật**: tu sĩ top-down 8 hướng, gồm idle, chạy, thi pháp, 3 đòn chém, bị đánh, chết. Sát thương rơi đúng
  frame "contact" ghi trong `rig.json`. Kiếm Tu dùng `nghich_tien_kiem_topdown`, Pháp Tu dùng `nghich_tien_truong_topdown`
  (khai báo ở `classes` trong `src/data.js`).
- **Ấn chú thiên lôi** (`sigil_thunder`) dùng cho đạo lôi cuối khi độ kiếp, phát kèm lớp ánh sáng cộng dồn.
- Game chạy ở 960x540, camera zoom x2: bối cảnh giữ cỡ pixel cũ, còn nhân vật và hiệu ứng beanfx hiển thị đúng 1:1.

### Tạo hiệu ứng mới bằng skill beanfx

Skill đã được cài ở `.claude/skills/beanfx`, gọi bằng `/beanfx <mô tả>` trong Claude Code. Trên Windows có hai điểm
khác so với hướng dẫn gốc của skill:
- `setup.sh` không chạy được, vì nó tìm Python ở `.venv/bin`. Môi trường Python của dự án nằm ở `.venv\Scripts\python.exe`
  (đã cài numpy và pillow). Thư mục draft tạo bằng cách chép `.claude/skills/beanfx/kit` vào `drafts/<tên>/kit`.
- Kit đã được sửa để đọc file bằng UTF-8 (bảng mã mặc định của Windows làm vỡ chữ tiếng Việt).

Chạy draft: `cd drafts/<tên>` rồi `..\..\.venv\Scripts\python.exe <tên>.py`. Mở `out/<tên>.html` để xem từng frame.
Sau đó đóng gói vào game bằng `tools/pack_beanfx.py drafts/<tên>/out`.

### Thêm hiệu ứng beanfx mới

Các mẫu trong thư mục `drafts/` của repo beanfx là code Python, phải chạy để xuất ảnh (cần `numpy` và `pillow`):

```
python <repo beanfx>/drafts/<tên>/<tên>.py
python tools/pack_beanfx.py <repo beanfx>/drafts/<tên>/out [--speed 1.4] [--max-fps 15] [--max-px 16000000]
```

`tools/pack_beanfx.py` đọc mọi kiểu xuất của beanfx (dải ngang, lưới, nhiều trang). Script cắt phần trong suốt, giảm
fps nếu quá nặng, xếp lại thành lưới không quá 4096 px, ghi vào `assets/fx/<tên>/` rồi tự thêm vào
`assets/fx/manifest.json`.

Trong code, gọi:

```js
TT.FX.beanfx(scene, 'ten', x, y, {
  flip: true,                         // lật sang trái (giữ đúng điểm chân)
  speed: 1.25, startAt: 0.5, loopMs: 4000,
  at: { burst: () => { /* sát thương khi tới state "burst" */ }, 1.2: () => { /* hoặc tới giây 1.2 */ } }
});
```
