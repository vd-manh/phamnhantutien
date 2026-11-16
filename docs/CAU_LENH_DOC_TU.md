# Câu lệnh vẽ Độc Tu (`doc_ai`)

Độc Tu là nam tu sĩ "lấy độc nhập đạo": gầy, da tái, mắt xanh lục lạnh, áo choàng tím than viền xanh rêu, hoa văn rết và rắn. **Vũ khí: độc phiến (quạt)**. Khi cầm thì quạt **gấp lại** như một đoản kiếm; khi bay thì đứng trên **quạt xoè lớn**.

Làm theo **bộ động tác chuẩn** (mục 3 của `QUY_TRINH_NHAN_VAT.md`, mẫu là Đạo Gia):

- chỉ vẽ 4 hàng đứng, chạy, đánh, thi pháp × 5 hướng;
- Gemini vẽ tay không, tay cầm quạt nắm như cầm chuôi; code vẽ quạt vào tay;
- hai hướng chéo cầm quạt bằng tay phải thật, các hướng khác bằng tay trái thật.

Ảnh lưu vào thư mục `doc/`. Mỗi bước là **một cuộc trò chuyện Gemini mới**, tải ảnh bằng nút tải về, gửi Claude kiểm tra trước khi làm bước tiếp.

## Thứ tự làm

1. Ảnh tạo hình `doc/doc_design.png`.
2. Bảng xoay 5 hướng `doc/doc_turnaround.png`. Claude cắt thành ảnh mẫu 5 hướng.
3. Bảng xoay không quạt `doc/doc_turnaround_nb.png`. Claude cắt thành ảnh mẫu không vũ khí và bản khổ rộng.
4. Ảnh quạt riêng: `doc/doc_quat_gap.png` (gấp, để cầm) và `doc/doc_quat_mo.png` (xoè, để cưỡi khi bay).
5. Các hàng động tác (Claude sinh câu lệnh sau, theo mẫu `tools/gen_cau_lenh_dao.py`).

---

## Bước 1: ảnh tạo hình `doc/doc_design.png`

Gắn **`dao/dao_design_v2.png`** (chỉ để Gemini lấy nét vẽ, tỉ lệ chibi, cỡ người; câu lệnh dặn không chép tạo hình).

```
The attached image is ONLY a style reference: match its pixel-art style, chibi proportions, head-to-body ratio, outline thickness and character size exactly. Do NOT copy its face, hair, crown, outfit or weapon. Design a NEW character: a young male POISON cultivator who walks the path of the Dao through poison, quiet, cold and mysterious. Gaunt face with pale grayish skin, cold narrow eyes glowing toxic green, faint dark shadows under the eyes, thin purple lips. Long straight black hair, the upper half tied back with a silver hairpin shaped like a coiled snake, loose strands framing the face. Outfit: long deep purple-black robe with wide sleeves; inner collar and sleeve cuffs moss green edged with a thin silver line; the robe hem darkens into toxic green like dripping poison; subtle silver-green embroidery of a centipede and a snake on the robe; a dark hooded mantle over the shoulders with the hood DOWN; black sash with a jade-green scorpion buckle; two small dark glass poison vials hanging from the sash; black boots. WEAPON: ONE folding fan, CLOSED, about one third of the character's height: black iron ribs with dark green lacquer and a small jade bead tassel-free end cap. Draw ONE single full-body standing figure, front view facing the viewer, calm cold stance, feet together. WEAPON RULE: the closed fan is held in the hand on the RIGHT side of the picture, gripped in a fist at the end of the fan like a sword hilt, hanging at the side pointing down; the other hand is empty and relaxed. No poison mist, no smoke, no snakes or insects around the character. Simple clean chibi hands with correct anatomy. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no shadow.
```

## Bước 2: bảng xoay `doc/doc_turnaround.png` (gắn `doc/doc_design.png`)

Bước 1 (16/11/2026) đạt tạo hình. Riêng quạt trong ảnh màu sáng, đang xoè hé và cầm dựng lên; câu lệnh bước 2 yêu cầu sửa thành quạt gấp kín, xương đen, cầm ở đầu và chĩa xuống.

```
Character turnaround sheet of the attached character. Keep EXACTLY this character design: face, pale skin, toxic-green eyes, black hair with the silver snake hairpin, deep purple-black robe with moss-green cuffs and toxic-green hem, hooded mantle with the hood down, black sash with jade scorpion buckle, two poison vials, black boots, colors, chibi proportions and pixel-art style. Draw the SAME character 5 times in ONE horizontal row, evenly spaced, not overlapping, all the same size, feet on the same baseline, each in the same calm standing pose: 1) front view, facing the viewer; 2) three-quarter front view, body and face clearly rotated toward the lower RIGHT, both eyes visible; 3) pure side view facing RIGHT, only one eye visible; 4) three-quarter back view, rotated away toward the upper RIGHT, the face not visible; 5) pure back view, the face not visible. WEAPON: ONE folding fan, FULLY CLOSED into a slim straight baton about one third of the character's height (NOT open, NOT half-open, no visible fan leaf), with BLACK iron ribs and dark green lacquer and a small jade end cap; this is different from the attached image, where the fan is light colored and half open. In every view the closed fan is in the character's LEFT hand: on the RIGHT side of the picture in views 1 and 2, in the arm closest to the viewer in view 3, on the LEFT side of the picture in views 4 and 5. The hand grips the end of the closed fan like a sword hilt; the fan hangs down along the side, the tip pointing toward the ground. The other hand is empty and relaxed. Simple clean chibi hands with correct anatomy. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no numbers, no labels, no grid lines, no shadow.
```

## Bước 3: bảng xoay không quạt `doc/doc_turnaround_nb.png` (gắn `doc/doc_turnaround.png`)

```
Edit the attached image: remove the closed folding fan completely from all 5 views. In each view, the hand that held the fan stays in the same place as a tightly closed fist, as if gripping an invisible sword hilt; fill the area where the fan was with the robe or the white background. Change NOTHING else: same 5 views, same poses, same positions, same size, same design and colors, plain pure white background, no text.
```

## Bước 4: ảnh quạt riêng (gắn `doc/doc_design.png`)

**Quạt gấp** `doc/doc_quat_gap.png`:

```
The attached image shows my character holding a closed folding fan. Draw ONLY that closed fan, alone, with exactly the same design and colors (black iron ribs, dark green lacquer, jade end cap), lying perfectly horizontal and straight, seen from the side, the end the hand holds on the LEFT and the tip pointing to the RIGHT, large and detailed, filling most of the image width. No hand, no character. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no shadow.
```

**Quạt xoè** `doc/doc_quat_mo.png`: **không cần nữa**, vật cưỡi đổi thành độc xà (ảnh `doc/doc_ran.png`, câu lệnh ở cuối tài liệu).

```
The attached image shows my character holding a closed folding fan. Draw ONLY that same fan fully OPEN, alone, seen from directly above as a flat half-circle: black iron ribs radiating from the pivot, the fan leaf dark purple with a faint toxic-green gradient toward the outer edge and a subtle silver-green painting of a coiled snake on it. The pivot at the bottom center, the open arc at the top, large and detailed, filling most of the image. No hand, no character. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no shadow.
```

## Vật cưỡi + chiêu: độc xà xanh hai sừng `doc/doc_ran.png` (gắn `doc/doc_design.png`) — đã đạt 16/11/2026

```
The attached image shows my pixel-art character. Using EXACTLY the same pixel-art style and outline thickness, draw ONLY a giant venomous serpent, alone: a long green poison snake with TWO curved dark horns on its head, emerald and toxic-green scales with a darker green zigzag pattern along its back, a pale yellow-green belly line, glowing toxic-green eyes, a forked tongue. Seen from DIRECTLY ABOVE (top-down view), its body lying flat in a gentle S-curve, stretched HORIZONTALLY: the head on the RIGHT, the tail tip on the LEFT. Long, slim and elegant, the body thick enough for a person to stand on its middle. Large and detailed, filling most of the image width. No character, no rider, no poison mist. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no shadow.
```
