# Quy trình tạo nhân vật tông môn: Thanh Vân Tu Tiên

Tài liệu này ghi lại cách đã làm nhân vật **Kiếm Tu** (bộ `kiem_ai`). Các tông môn sau (Nho Đạo, Quỷ Tu, Linh Thú…) làm theo đúng quy trình này.
Mục **9. Việc còn dang dở** liệt kê những phần chưa xong để hoàn thiện sau.

---

## 1. Nguyên tắc chung

- **Ảnh nhân vật do AI tạo (Gemini, miễn phí)**, Claude **không** tự vẽ nhân vật. Vẽ bằng code chỉ ra chất lượng "chibi thô", đã bỏ.
- Claude lo phần còn lại:
  - soạn câu lệnh, kiểm tra ảnh đạt hay chưa;
  - tách nền, cắt khung, căn chân, chỉnh cỡ, lật hướng, đóng gói vào game;
  - làm hiệu ứng chiêu thức (code + beanfx + pixelfx).
- **Không sao chép tạo hình nhân vật của game khác** (ví dụ Tu Tiên Ký), kể cả cắt khung từ video. Chỉ dùng ảnh tự tạo hoặc tài nguyên có giấy phép.
- Một nhân vật = **dạng gốc (base form)**. Trang phục, vũ khí thay đổi sau bằng hệ thống trang bị (mục 7).
- **Bộ động tác chung (chốt 13/11/2026):** mọi nhân vật cơ bản, kể cả các tông môn khác, có **đúng bộ động tác của Kiếm Tu** (mục 3: cùng tên động tác, số khung, khung chạm, 8 hướng). Giữa các nhân vật chỉ khác:
  - **ngoại hình** (thân, y phục, vật cầm tay);
  - **vật cưỡi khi ngự kiếm/phi hành** (Kiếm Tu cưỡi kiếm; tông môn khác cưỡi vật riêng).

  Hệ quả khi làm nhân vật mới:
  - câu lệnh tạo ảnh giữ nguyên phần mô tả động tác của Kiếm Tu (`docs/CAU_LENH_KIEM_TU.md`), chỉ thay phần ngoại hình;
  - `SETS` trong `ai_sheet.py` dùng chung khối `anims` của `kiem_ai`, chỉ khác `sources`/`dirsets`;
  - code game (`world.js`, chiêu thức, khung chạm) không cần nhánh riêng cho từng nhân vật;
  - người bay vẽ **không vật cưỡi**, vật cưỡi là lớp ảnh riêng ghép dưới chân (cùng cơ chế lớp vũ khí, mục 6).

## 2. Cách tạo ảnh bằng AI (đã kiểm chứng)

**Quy tắc vàng:**

1. **Mỗi lần chỉ một hàng 6 khung** (một động tác, một hướng). Vẽ cả sheet 6×6 một lúc thì AI hay "trôi" về góc chéo và lẫn động tác.
2. **Chỉ gắn ảnh mẫu đúng hướng cần vẽ.** Gắn ảnh góc chéo thì AI sẽ vẽ góc chéo, dù câu lệnh nói gì.
3. **Đổi hướng thì mở cuộc trò chuyện mới**, vì AI nhớ kiểu cũ trong cùng cuộc.
4. **Nền trắng thuần** (`plain pure white background`). Không yêu cầu nền trong suốt: công cụ tách nền của AI làm dính vệt màu.
5. **Tải bằng nút tải về**, không chụp màn hình. Ảnh chụp bị nút che và mờ hơn.
6. Hướng **nhìn ngang** rất khó: mở đầu câu lệnh bằng `2D side-scrolling platformer game sprite strip, pure side view facing RIGHT, only one eye visible`. Nếu chưa có ảnh mẫu nhìn ngang thì làm 2 bước: tạo **một hình đứng nhìn ngang** trước, rồi dùng nó làm mẫu.
7. Hướng **sau lưng**: thêm `The face is never visible.`
8. **Tay cầm vũ khí:** luôn là **tay gần người xem** (tay trái thật). Trên ảnh: chéo trước và thẳng → bên **phải** ảnh; ngang → cánh tay **gần**; sau lưng → bên **trái** ảnh. Tay kia **không cầm gì**. Mỗi câu lệnh phải có câu `SWORD RULE` nói rõ điều này, nếu không AI hay vẽ thêm tua/chuôi ở tay kia, cho kiếm đổi tay, hoặc bỏ mất kiếm khi chạy. Lý do: vũ khí là **lớp tách rời** (xem mục 7), tay kia cầm gì sẽ lộ ra khi đổi vũ khí.
9. Sheet 6×6 cũ hay vẽ **sai góc** ở các hàng dưới (hàng "thẳng" thực ra là chéo trước, hàng "sau lưng" thực ra là chéo sau). Luôn rà lại góc từng hàng.

**Bước đầu cho nhân vật mới:**

1. Tạo **ảnh mẫu nhìn chéo trước** (một hình đứng, hoặc một sheet) từ mô tả tạo hình.
2. Từ ảnh mẫu đó, tạo hình đứng cho từng hướng: thẳng, ngang, sau lưng. Mỗi hình đạt thì **lưu lại làm ảnh mẫu của hướng đó**.
3. Sau đó tạo từng hàng động tác theo câu lệnh chung ở dưới.

**Cách nhanh hơn, đã kiểm chứng với Đạo Gia (13/11/2026):** sau khi có một ảnh đạt về tạo hình (góc nào cũng được), vẽ **bảng xoay**: một hàng 5 tư thế đứng (thẳng, chéo trước, ngang, chéo sau, sau lưng), gắn đúng ảnh tạo hình đó. Rồi cắt từng tư thế làm ảnh mẫu 5 hướng. Cách này thay cho bước 1–2 và giữ tạo hình đồng nhất giữa các hướng. Ép AI xoay góc từng lần (kể cả gắn hai ảnh) thì nó hay chép nguyên tư thế nhìn thẳng. Câu lệnh mẫu: `docs/CAU_LENH_DAO_GIA.md`.

**Câu lệnh chung (một hàng):**

```
The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. Draw ONE horizontal row of 6 frames: [ĐỘNG TÁC]. Only one [VŨ KHÍ], simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

**Mô tả động tác chuẩn** (thay `[ĐỘNG TÁC]`; Kiếm Tu dùng kiếm, phái khác đổi vũ khí):

| Động tác | `[ĐỘNG TÁC]` |
|---|---|
| Đứng | `idle breathing loop, hair and ribbon swaying gently, weapon held at the side` |
| Chạy | `running loop` (nhìn ngang: `running to the right`) |
| Chém (đòn 1) | `horizontal weapon swing leaving a pale [MÀU] arc` |
| Đòn 2 | `rising diagonal swing from low behind to high in front leaving a crescent arc, then guard` |
| Đòn 3 | `powerful finishing blow: small leap, weapon raised overhead, smashed down in front, large arc and a shockwave ring on the ground, then recover` |
| Thi pháp | `frames 1-2 the free hand forms a sword-finger seal (index and middle fingers straight together) held in front of the chest; frames 3-6 the arm extends forward pointing with the two fingers, energy gathering on the weapon` |
| Trúng đòn | `getting hit: jerking back, eyes shut, small impact marks, then recovering` |
| Ngã | `death: knees buckling, falling, lying flat on the ground, the weapon on the ground beside the body` |
| Bay (người) | `riding an INVISIBLE flying sword, NO sword drawn anywhere: crouch and rise, then steady riding pose with both feet together on an invisible platform, one hand in a seal pose, clothes and hair streaming back` |

**Tên file** đặt trong thư mục nguồn của tông môn (Kiếm Tu: `sword/`), theo mẫu `<phái>_<hướng>_<động tác>.png`.
Hướng: `se` (chéo trước), `s` (thẳng), `e` (ngang), `n` (sau lưng), `ne` (chéo sau).

## 3. Hướng và động tác cần có

Game dùng **8 hướng**, chỉ cần vẽ **5 hướng** bên phải:

- chéo trước (SE);
- thẳng (S);
- ngang (E);
- chéo sau (NE);
- sau lưng (N).

Ba hướng bên trái lấy bằng lật ngang. Hướng nào thiếu ảnh thì công cụ mượn hướng gần nhất.

**Động tác của game** (tên trong `rig.json`):

| Tên | Nguồn | Ghi chú |
|---|---|---|
| `idle` | hàng đứng, 6 khung, lặp | |
| `run` | hàng chạy, 6 khung, lặp | |
| `attack1` / `attack2` / `attack3` | đòn 1, 2, 3 (đang tạm dùng chung đòn 1) | có "khung chạm" (contact) để gây sát thương đúng lúc |
| `cast` | thi pháp **khung 1–2**: tay bắt ấn trước ngực, giữ nguyên | dùng khi tụ lực, thi pháp nhanh, thiền |
| `cast_point` | thi pháp **khung 3–6**: tay chỉ thẳng | dùng lúc phóng chiêu |
| `hurt` | 3 khung của hàng trúng đòn | |
| `dead` | hàng ngã, giữ chuyển động rơi | |
| `fly_up` / `fly` / `fly_land` | cất cánh / bay / hạ cánh | xem mục 6 |

## 4. Đóng gói vào game

- **Công cụ:** `tools/ai_sheet.py`. Mỗi nhân vật khai báo một mục trong `SETS`:
  - `sources`: từng ảnh nguồn (đường dẫn, số hàng/cột, tên các hàng, `size_from` để đo cỡ, `fix` để thay khung hỏng);
  - `dirsets`: hướng nào lấy từ ảnh nào, có lật ngang không. `mirror()` tự điền hướng trái;
  - `anims`: động tác game lấy hàng nào, những khung nào, fps, lặp, khung chạm, kiểu căn chân (`frame` căn từng khung, `row` giữ chuyển động như nhảy hoặc ngã).
- **Chạy:** `python tools/ai_sheet.py <key> [--preview <thư mục>]`
  - Kết quả ghi vào `assets/casters/chibi/<key>/` (sheet và `rig.json`).
- **Công cụ tự động làm:**
  - tách nền trắng (kể cả nền lọt giữa vệt chém), giữ phần trắng của áo;
  - cắt ô theo lưới (tìm đường cắt ít mực nhất);
  - căn chân theo giày;
  - **tự chỉnh cỡ** để mọi ảnh cùng chiều cao với ảnh "front";
  - thu nhỏ 0,45 và đặt vào khung 128×104, chân ở (64, 96).
- **Gắn vào game:** thêm `TT.CUSTOM_CASTERS[<tông môn>] = '<key>'` trong `src/casters.js`. Tông môn đó sẽ dùng bộ này ở mọi cảnh giới và cả hai giới tính.
- **Bài học:** ảnh AI thỉnh thoảng vẽ **sai góc trong một vài hàng**. Ví dụ hàng chém và thi pháp nhìn ngang bị vẽ quay lưng. Khi đó, khai báo `dirset` riêng để mượn hàng của hướng khác, hoặc vẽ lại hàng đó thành ảnh 1 hàng riêng (như `kiem_side_attack.png` với dirset `atk`).

## 5. Chiêu thức

**Quy ước của Kiếm Tu** (làm mẫu cho các phái):

| Ô | Mở ở cảnh giới | Chiêu |
|---|---|---|
| K | Luyện Khí | Kiếm Khí |
| L | Trúc Cơ | Lưu Vân |
| U | Kim Đan | Vạn Kiếm Quy Tông (beanfx) |
| I | Nguyên Anh | **Thanh Nhiên Kiếm Quyết** (`src/skill_thanh_nhien.js`) |
| O | Hóa Thần | **Đại Canh Kiếm Trận** (`src/skill_dai_canh.js`) |

**Cách làm một chiêu:**

- **Chuyển động bám tình huống** (bay tới đúng mục tiêu, xoắn ốc, chớp di quanh mục tiêu) thì **viết bằng code Phaser**, mỗi chiêu một file `src/skill_<tên>.js`:
  - đăng ký `TT.Skills.<tên>`;
  - khai báo trong `TT.DATA.skills` (`src/data.js`) và đặt vào `classes.<phái>.skills`;
  - thêm thẻ `<script>` vào `index.html`.
- **Hình ảnh từng phần** (pháp trận, sét, vụ nổ, vệt chém, đồng hồ…) lấy từ thư viện:
  - **pixelfx** (MIT, 244 hiệu ứng): `python tools/pack_pixelfx.py <thư mục sheets> <id> <tên> --hue <sắc độ>`, đổi màu theo chiêu;
  - **beanfx**: hiệu ứng lớn vẽ riêng (Cửu Long, Giáng Long, Kim Chung Tráo…), đóng gói bằng `tools/pack_beanfx.py`.
- **Phát hiệu ứng:** `TT.FX.beanfx(w, tên, x, y, { scale, depth, flip, loopMs, startAt })`. Hàm trả về `setPos()` và `stop()`.
- **Luôn có đường lui:** nếu hiệu ứng chưa nạp được (`TT.FX.bfx[tên]` không có), chiêu vẫn chạy bằng phần vẽ code.
- **Thông số dễ chỉnh** đặt thành hằng số ở đầu file (số kiếm, thời gian, bán kính…).

**Quy ước hình ảnh của chiêu:**

- Thi pháp dùng tư thế **bắt ấn trước ngực** (`cast`); lúc phóng chiêu chuyển sang **chỉ tay** (`cast_point`).
- Mỗi tông môn có **màu chủ đạo** cho kiếm khí, pháp trận. Kiếm Tu ở 2 chiêu mới dùng **xanh lục** (`#5dffa0`).
- Pháp trận vẽ **phối cảnh mặt đất** (ellipse ép dẹt 0,5), xoay bằng cách vẽ lại mỗi khung.
- Màn chớp toàn màn hình giữ nhẹ (alpha ≤ 0,15). Hiệu ứng sét của game cũng tự chớp, đừng cộng dồn.
- Chiêu chớp di quanh mục tiêu thì cho **camera bám tâm trận**, hết chiêu trả lại nhân vật.
- Nhiều vật thể (72 phi kiếm) thì chỉ một phần có vệt đuôi, âm thanh, tia lửa để giữ mượt.
- Trạng thái yêu thú có sẵn trong `world.js`:
  - `e.slowUntil`: làm chậm;
  - `e.stunUntil`: choáng ngắn;
  - `e.frozenUntil`: **bất động** (đứng im, dừng hoạt ảnh, không bị đẩy, không gây sát thương khi chạm).

## 6. Ngự kiếm phi hành (F)

- Mở từ **Trúc Cơ**. Khi bay:
  - nhanh gấp 1,9 lần, bay xuyên vật cản;
  - yêu thú không chạm tới được;
  - không đánh, không ra chiêu, không thiền hay độ kiếp.
- Code nằm trong `world.js`: `toggleFly`, `land`, `setLift` (nâng sprite mà giữ thân va chạm ở chân).
- **Thiết kế đã thống nhất:** **người và kiếm tách riêng**. Người bay **không kiếm** (đủ 5 hướng), kiếm bay là ảnh riêng theo **vũ khí đang trang bị**. Code ghép kiếm dưới chân và làm hoạt ảnh kiếm bay từ tay ra, quay về tay.
- **Hiện tại:** đang tạm dùng ảnh bay **dính kiếm** (`Gemini_…y4hs`, 4 hướng).
- **Vật cưỡi theo nhân vật:** tư thế bay là chung cho mọi nhân vật (mục 1); chỉ vật cưỡi đổi theo tông môn hoặc trang bị. Vì vậy ảnh người bay luôn vẽ không vật cưỡi, vật cưỡi là ảnh riêng 5 hướng.

## 7. Trang bị và ngoại hình (đã thống nhất, chưa làm)

- **6 ô trang bị:**
  - Y phục, Dây buộc tóc, Vũ khí: **đổi ngoại hình**;
  - Giáp tay, Giày, Đai lưng: chỉ cộng chỉ số.
- **Y phục:** mỗi bộ là **một bộ sprite AI riêng** (vẽ phức tạp, không chỉ đổi màu), tạo bằng cùng quy trình, gắn ảnh mẫu để giữ khuôn mặt và tóc, cầm sẵn vũ khí mặc định.
- **Vũ khí độc lập với y phục:** đổi vũ khí thì chỉ hình vũ khí đổi. Hướng làm:
  - code dò thanh vũ khí mặc định trong từng khung (vị trí, góc), xoá đi rồi vẽ hình vũ khí mới vào (cần thử nghiệm);
  - mỗi vũ khí cần: một ảnh nằm ngang (cho tay cầm) và một ảnh 5 hướng (kiếm bay).
- **Dây buộc tóc:** đổi màu bằng code.
- **Phẩm cấp:** Phàm, Linh, Huyền, Địa, Thiên.
- **Nhận đồ:** rơi từ yêu thú, thưởng khi đột phá.
- **Túi đồ:** phím E.

## 8. Thư mục và tệp liên quan

| Đường dẫn | Nội dung |
|---|---|
| `sword/` | ảnh nguồn AI của Kiếm Tu (`kiem_side_ref.png`, `kiem_side_ref_sheet.png` là ảnh mẫu nhìn ngang đã làm sạch) |
| `assets/casters/chibi/kiem_ai/` | bộ nhân vật đã đóng gói |
| `assets/fx/` + `manifest.json` | hiệu ứng (beanfx, pixelfx `px_*`) |
| `tools/ai_sheet.py` | đóng gói ảnh AI thành nhân vật |
| `tools/pack_pixelfx.py`, `tools/pack_beanfx.py` | đóng gói hiệu ứng |
| `src/casters.js` | nạp nhân vật, `TT.CUSTOM_CASTERS` |
| `src/skill_*.js` | chiêu viết riêng |
| `src/scenes/world.js` | cơ chế chính (di chuyển, chiêu, bay, trạng thái yêu thú) |

## 9. Việc còn dang dở (hoàn thiện sau)

**Kiếm Tu: ảnh còn thiếu** (câu lệnh ở mục 2):

| Ưu tiên | File | Nội dung |
|---|---|---|
| ~~1~~ | ~~`kiem_side_attack.png`, `kiem_side_cast.png`~~ | **xong** (13/11/2026): dirset `atk`, `cst` trong `ai_sheet.py` |
| ~~2~~ | ~~`kiem_back_dead.png`~~ | **xong** (13/11/2026): nguồn `back_dead`, dùng cho hướng N và NE. Ảnh mẫu sau lưng: `sword/kiem_back_ref.png` |
| 3 | **14 hàng vẽ lại sau rà soát 13/11/2026** + đòn 2, 3 | danh sách và câu lệnh đầy đủ: **`docs/CAU_LENH_KIEM_TU.md`**. Đã xong và đã đóng gói: `kiem_back_cast`, `kiem_se_{idle,run,attack,cast,hurt}`, `kiem_s_{idle,run,attack,cast,hurt,dead}`, `kiem_e_cast`. `kiem_n_run` đạt. **Dùng tạm, sửa sau:** `kiem_n_attack` (khung 2–5 kiếm sang tay phải), `kiem_n_hurt` (khung 3–5 hai kiếm / đổi tay). Mẹo khi làm lại hướng sau lưng: gắn ảnh 1 hàng `kiem_back_cast.png` làm mẫu để Gemini giữ bố cục 1 hàng. Còn: đòn 2, 3 |
| 4 | `kiem_fly_{se,s,e,ne,n}.png` | người bay **không kiếm** |
| 4 | `sword_thanh_phong.png` | kiếm bay riêng, 5 hướng |

**Hệ thống:**

- [x] **Lớp vũ khí tách rời** (xong phần chính 13/11/2026):
  - [x] Đánh dấu chuôi/mũi: **xong 138/141 khung** (`python tools/mark_weapon.py kiem_ai 8090`, lưu `sword/weapon_marks.json`). 3 khung `side_dead/dead/2–4` không có kiếm, cố ý bỏ trống.
  - [x] Ảnh kiếm mặc định: `assets/weapons/thanh_phong.png` + `weapons.json` (tách từ khung ngã nhìn ngang; grip/tip theo toạ độ ảnh, mũi sang phải).
  - [x] Code đóng gói trong `tools/ai_sheet.py` (khoá `weapon` của bộ `kiem_ai`): xoá kiếm khỏi thân (`weapon_detect.erase_weapon`), xuất `<anim>_<hướng>_hand.png`, ghi vào `rig.json` mỗi khung `[gx, gy, góc, dài, sau_lưng]` và `rig.weapon.nominal`; ảnh xem trước vẽ thử kiếm.
  - [x] **Đã đóng gói bản có lớp kiếm** (13/11/2026): `python -I tools/ai_sheet.py kiem_ai --preview drafts/weapon_layer/out` (~1,5 phút, cần ~1 GB RAM). `assets/casters/chibi/kiem_ai/` giờ là thân đã xoá kiếm + `*_hand.png`; kiếm do code vẽ.
    - Khung `side/idle/0` gốc không thấy kiếm (thân che), dấu cũ đặt nhầm mũi vào tua. Đã đặt lại theo tư thế khung 1 và gắn cờ **`noerase`** (không xoá gì, chỉ lấy bàn tay). Cờ này sửa tay trong `weapon_marks.json`; `mark_weapon.py` lưu đè sẽ làm mất cờ, nhớ thêm lại nếu đánh dấu lại khung đó.
  - [x] `src/weapon_layer.js` (13/11/2026): `TT.attachWeapon(scene, sprite, rig)` gắn ở `world.createPlayer` và màn chọn. Mỗi `postupdate` đọc texture/khung đang hiện của sprite, vẽ kiếm (grip tại (gx, gy), xoay `góc`, dọc lưỡi `dài`, ngang `nominal`; `sau_lưng` = 1 thì dưới thân), rồi bàn tay `_hand` đè lên. `TT.loadCasters` nạp thêm `weapons.json`, ảnh vũ khí, sheet `_hand`. Đổi vũ khí: `world.weapon.setWeapon(id)` (id trong `weapons.json`). Đã kiểm thử không giao diện: 6 hướng, đánh, tung chiêu, màn chọn, không lỗi.
  - [ ] Chưa làm: bóng ảnh `ghost()` chưa có kiếm; `emitPoint` có thể lấy mũi kiếm từ dữ liệu `weapon` thay cho `emit.point`.
  - [x] **Ngự kiếm hướng nam/bắc** (13/11/2026): ảnh bay chỉ có kiếm nằm ngang mũi sang phải, nên bay thẳng xuống/lên trông sai hướng. Đã đánh dấu 8 khung (`fly_se`, `fly_n`: hàng `fly` và `up/1`) với cờ **`band`** (xoá nguyên dải quanh trục kiếm, giữ giày; `weapon_detect.erase_band`). Khoá `turn` trong cấu hình `weapon` của `ai_sheet.py` xoay kiếm: nam 80° (mũi về người xem, nhân vật đứng giữa kiếm, nửa chuôi khuất sau người), bắc -90° (chắn kiếm dưới chân, chuôi lộ ra trước, lưỡi khuất sau người). Phần tử thứ 4 của `turn` là điểm trên kiếm đặt dưới bàn chân (0 = đốc, 0.5 = giữa). Phần tử thứ 6 của dữ liệu khung là bề ngang riêng (kiếm bay to hơn kiếm cầm tay). Hướng đông/đông bắc chưa tách (vẫn kiếm dính ảnh, đúng hướng sẵn).
  - Cách cắt ô mới cho ảnh 1 hàng (`split_parts`): mảng hình dính người nào thuộc khung đó, vệt chém rời thuộc người gần nhất, nên kiếm/vệt chém không còn bị cắt đôi sang khung bên.
- [ ] Ngự kiếm tách người và kiếm, kiếm bay theo vũ khí trang bị.
- [ ] Hệ thống trang bị 6 ô, túi đồ (E), phẩm cấp, rơi đồ.
- [ ] Thử nghiệm thay vũ khí trên tay bằng code (dò lưỡi kiếm, vẽ đè).
- [ ] Bộ y phục thứ hai trở đi cho Kiếm Tu.
- [ ] Thay các hiệu ứng vẽ đơn giản còn lại bằng pixelfx: tia lửa khi trúng (`hit-spark`, `crit-hit`), vệt chém đòn thường, trạng thái quái (`frozen`, `poisoned`…), yêu thú chết (`soul-rise`).
- [ ] **Đạo Gia** (`dao_ai`, đang làm): đạo sĩ pha nét thư sinh, vũ khí bút lông, vật cưỡi là cây bút phóng to. Câu lệnh: **`docs/CAU_LENH_DAO_GIA.md`** (sinh bằng `tools/gen_cau_lenh_dao.py`), ảnh lưu `dao/`.
  - [x] Ảnh mẫu 5 hướng (bảng xoay), bản khổ rộng `dao_<hướng>_ref_wide.png` để Gemini vẽ đủ 6 khung.
  - [x] Bút: `assets/weapons/dao_but.png` (id `dao_but`).
  - [x] Hàng đứng `idle` 5 hướng. Đã đóng gói thử (`SETS["dao_ai"]` trong `ai_sheet.py`, tự sinh từ `DAO_ROWS`; động tác chưa có ảnh tạm mượn hàng đứng) và gắn tạm vào **Nho Đạo** (`TT.CUSTOM_CASTERS.nho`).
  - [x] Ảnh mẫu không bút `dao_<hướng>_ref_nb(_wide).png` (cắt từ `dao_turnaround_nb.png` bằng đường cắt uốn lượn). Từ hàng chạy dùng **cách B**: Gemini vẽ tay nắm không, code vẽ bút.
  - [x] Hàng chạy `run` 5 hướng (cách B, tay nắm không). Chân chưa đổi bên rõ (Gemini vẽ cùng một chân bước trước ở các khung sải bước); dùng tạm, để sửa sau. Trình đóng gói thêm `remove_ground_lines` (xoá vạch đất AI tự vẽ dưới chân).
  - **Đánh thường là đánh xa** (người dùng chốt 13/11/2026): vẽ chữ trên không bằng bút, nét mực đen viền trắng bùng thành hạt năng lượng trắng đen. Ảnh chỉ có nét mực và chùm hạt sát tay; **đạn bay xa do code** (cần nhánh đánh xa cho `nho` trong `doSlash` của `world.js`, khung chạm = khung 4). Đây là chỗ Đạo Gia khác bộ động tác chung: cùng số khung và khung chạm, khác tầm đánh.
  - [x] Hàng đánh `attack` 5 hướng + **đánh xa trong game** (13/11/2026): `world.inkShot` bắn viên mực trắng đen (texture `ink_ball`) từ khung trúng, trúng yêu thú đầu tiên trên đường (tầm 120, đòn 3: 150 và 3 tia toả quạt). Khung trúng đòn 1 = khung 4 (`DAO_CONTACT`). Khung 5 của `ne_attack`, `n_attack` bị Gemini vẽ mờ cả người, thay bằng khung 4 (`DAO_FIX`). Ở vài hướng tay vươn ra viết là tay không cầm bút: lớp bút theo tay đang viết.
  - **Thi pháp Đạo Gia** (người dùng chốt 13/11/2026): khung 1–2 viết liên tục trên không (động tác `cast`, giữ khi tụ chiêu), khung 3–6 phất tay **ném chữ vừa viết** vào địch (`cast_point`). **Mọi chiêu của Đạo Gia đều liên quan đến chữ** và dùng chung kiểu này: hiệu ứng chiêu (code) = một chữ/nét mực phát sáng bay từ tay tới mục tiêu rồi phát tác. Khi làm bộ chiêu riêng cho `nho` (hiện mượn của Pháp Tu) thì theo nguyên tắc này.
  - **Tay cầm bút = tay viết** ở mọi động tác (người dùng chốt). Ở **hai hướng chéo** bút ở **tay phải thật** của nhân vật, vì Gemini luôn viết/ném bằng tay này ở góc chéo: **SE** = tay xa (bên trái ảnh), **NE** = bên phải ảnh. Thẳng, ngang, sau lưng giữ tay trái thật. Phải vẽ lại `dao_se_idle`, `dao_se_run`, `dao_se_cast` theo câu lệnh mới; `dao_se_attack` hiện có đã đúng. Hàng đánh sau lưng lấy ảnh lật ngang (`DAO_FLIP`). `dao_ne_attack` giữ (đúng tay phải); `dao_ne_idle` đổi bút sang tay phải bằng `REGRIP` trong `mark_dao_brush.py`; `dao_ne_run`, `dao_ne_cast` đã vẽ lại (14/11). Còn: vẽ lại `dao_ne_idle` theo cách B nếu muốn bút rõ hơn.
  - [x] Hàng thi pháp `cast` 5 hướng + bút (13/11/2026), đã vào game (`cast` = khung 1–2 tụ chiêu, `cast_point` = khung 3–6 ném). Sau lưng lấy ảnh lật (`DAO_FLIP`). Chiêu hiện vẫn mượn hiệu ứng Pháp Tu; làm bộ chiêu chữ riêng sau.
  - [x] **Chiêu O: Giang Sơn Lưỡng Nghi Đồ** (`src/skill_giang_son.js`, id `giang_son`, thay `hoa_lien` ở ô O của `nho`; 14/11/2026): tụ chiêu 3,4 giây trên trận thái cực lưỡng nghi (vẽ code, phối cảnh), 18 nét mực bay lên tụ thành chữ 龍 trước mặt; ném chữ, trúng thì núi thuỷ mặc giáng xuống đè mục tiêu (bất động, tô xám qua `e.frozenTint`); hai mây thuỷ mặc chếch trên cao hai bên, hai rồng mực bổ xuống xuyên qua mục tiêu, núi vỡ thành mực. Toàn bộ trắng đen. Bản 3 (14/11): trận pháp bán kính 110 (gấp ~2 bản đầu); mây hiện cùng trận pháp, to bằng trận; rồng bay ra từ mây và ngoạm vào mục tiêu (dừng, lắc đầu, tan thành mực); rồng nối đốt (đầu `gs_dhead` + 44 lát thân `gs_dbody` cắt từ kim long) bay theo đường bézier lượn từ mây xuống, thân bám vết đầu; camera tự lùi ra vừa khung chiêu (`camAim`) rồi trả lại; mây = xoáy mây Vạn Kiếm Quy Tông, rồng = kim long Phi Long Tại Thiên, đều đổi sang màu mực, núi vẽ lại bằng numpy: tất cả do `tools/make_giang_son_fx.py` tạo vào `assets/fx/giang_son/`, `boot.js` nạp qua `giang_son.json`.
  - [ ] Các hàng còn lại theo ưu tiên: `hurt`, `dead` → `fly` → `atk2`, `atk3`. Có ảnh mới thì thêm hướng vào `DAO_ROWS[<động tác>]` rồi đóng gói lại.
  - [x] **Lớp bút** cho hàng đứng, chạy, đánh (13/11/2026): `tools/mark_dao_brush.py` ghi `dao/brush_marks.json` (toạ độ ảnh nguồn). Hàng cách B: bảng `HAND` (nắm tay + góc bút, đặt tay theo lưới `rowgrid`). Hàng đứng cách A có bút vẽ sẵn: bảng `PAINTED` (xoá bút cũ, vẽ lại bút mới ở nắm tay, cờ `draw_len`/`draw_grip` trong `ai_sheet.weapon_cell`). Dò tự động (`weapon_detect.detect`) bắt nhầm tóc, không dùng. Khi thêm hàng mới: thêm dòng vào `HAND`, chạy `mark_dao_brush.py` rồi `ai_sheet.py dao_ai`. Chưa ổn: bút hướng thẳng hơi khuất sau tay áo; chưa có lớp bàn tay đè lên chuôi (bút nằm trên nắm tay).
  - Trình đóng gói thêm: `stand_px` (chiều cao đứng đích trong khung, vì ảnh mỗi bộ một cỡ; Đạo Gia 82 do mũ cao) và `unmark` (tự xoá dấu sao Gemini ở góc dưới phải, `remove_gemini_mark`).

- [ ] Các tông môn khác:
  - Nho Đạo (bút + quyển trục tre);
  - Quỷ Tu (cờ phiên);
  - **Linh Thú** (phái mới: hộp gỗ sau lưng, chiêu triệu hồi);
  - Pháp Tu, Võ Tu.

  Hiện Pháp Tu và Quỷ Tu đang dùng bộ hero-128 đổi màu, Võ Tu và Nho Đạo dùng chibi vẽ code. Tất cả cần làm lại theo quy trình này.
- [ ] Câu lệnh tạo ảnh cho Nho Đạo, Quỷ Tu, Linh Thú đã soạn trong lịch sử trò chuyện (mỗi phái một câu lệnh lưới 6×6). Khi làm, chuyển sang cách **mỗi lần một hàng** như mục 2.
