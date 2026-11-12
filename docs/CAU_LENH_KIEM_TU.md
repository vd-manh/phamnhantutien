# Câu lệnh vẽ lại Kiếm Tu (sau đợt rà soát 13/11/2026)

Mỗi mục là **một cuộc trò chuyện Gemini mới**. Chỉ gắn **đúng một ảnh mẫu** ghi ở đầu nhóm hướng. Tải bằng nút tải về, lưu vào `sword/` đúng tên file.
Gửi ảnh cho Claude kiểm tra trước khi làm hàng tiếp theo cùng hướng.

## Quy tắc cầm kiếm (đã chốt)

Kiếm luôn ở **tay gần người xem** (tay trái thật của nhân vật). Tay kia **không cầm gì**: không tua, không chuôi, không bao kiếm.

| Hướng | Ảnh mẫu | Kiếm nằm ở |
|---|---|---|
| Chéo trước (se) | `sword/kiem_se_ref_clean.png` | bên **phải** ảnh |
| Thẳng (s) | `sword/kiem_s_ref_L.png` | bên **phải** ảnh |
| Ngang (e) | `sword/kiem_e_ref.png` (cắt từ khung 1 của `kiem_side_attack`; ảnh cũ `kiem_side_ref.png` không có kiếm, đừng dùng) | cánh tay **gần** người xem |
| Sau lưng (n) | `sword/kiem_n_ref.png` (cắt từ `kiem_back_dead`; ảnh cũ `kiem_back_ref.png` mờ, AI tự đổi trâm và vạt áo) | bên **trái** ảnh |

## Thứ tự làm

1. **Ưu tiên 1 (động tác gặp nhiều nhất):** `kiem_s_idle`, `kiem_se_run`, `kiem_s_run`, `kiem_n_run`
2. **Ưu tiên 2:** `kiem_se_attack`, `kiem_s_attack`, `kiem_n_attack`
3. **Ưu tiên 3:** `kiem_se_cast`, `kiem_s_cast`, `kiem_se_hurt`, `kiem_s_hurt`, `kiem_n_hurt`, `kiem_s_dead`
4. **Ưu tiên 4:** `kiem_e_cast` (lỗi nhẹ: kiếm đang ở tay xa)
5. **Ưu tiên 5:** đòn 2, đòn 3 của combo (`*_atk2`, `*_atk3`)

Khi `kiem_s_idle` đạt, Claude cắt một khung của nó làm ảnh mẫu nhìn thẳng mới, nét hơn `kiem_s_ref_L.png`.

---

## Chéo trước: gắn `sword/kiem_se_ref_clean.png`

### `kiem_se_run.png`
```
Three-quarter front view: the character faces diagonally down-right toward the viewer, both eyes visible. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the RIGHT side of the picture, exactly like the attached image; the other hand never holds anything (no tassel, no hilt, no scabbard). Draw ONE horizontal row of 6 frames: running loop toward the viewer and to the right, the sword held low and angled backward, clearly visible in every frame, hair and ribbon streaming back. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_se_attack.png`
```
Three-quarter front view: the character faces diagonally down-right toward the viewer, both eyes visible. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the RIGHT side of the picture, exactly like the attached image; the other hand never holds anything (no tassel, no hilt, no scabbard). Draw ONE horizontal row of 6 frames: horizontal sword swing leaving a pale cyan arc. Frame 1 ready stance, frame 2 sword pulled back, frame 3 swinging, frame 4 full extension with the arc in front of the character, frame 5 follow-through, frame 6 return to guard. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_se_cast.png`
```
Three-quarter front view: the character faces diagonally down-right toward the viewer, both eyes visible. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the RIGHT side of the picture, held low at the side in EVERY frame; it never moves to the other hand. Draw ONE horizontal row of 6 frames: frames 1-2 the FREE hand (left side of the picture) forms a sword-finger seal (index and middle fingers straight together) held in front of the chest; frames 3-6 that free arm extends forward pointing with the two fingers, while pale cyan energy gathers along the sword blade. The pointing hand holds nothing. Only one sword, no tassel, no second hilt, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_se_hurt.png`
```
Three-quarter front view: the character faces diagonally down-right toward the viewer, both eyes visible. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the RIGHT side of the picture, exactly like the attached image; the other hand never holds anything (no tassel, no hilt, no scabbard). Draw ONE horizontal row of 6 frames: getting hit: jerking back, eyes shut, small impact marks, then recovering, the sword still in hand. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

---

## Thẳng: gắn `sword/kiem_s_ref_L.png` (sau khi `kiem_s_idle` đạt, Claude đổi sang ảnh mẫu mới)

### `kiem_s_idle.png`
```
Pure front view: the character faces straight toward the viewer. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the RIGHT side of the picture, exactly like the attached image; the other hand is EMPTY and relaxed and never holds anything (no tassel, no hilt, no scabbard). Draw ONE horizontal row of 6 frames: idle breathing loop, hair and ribbon swaying gently, the sword held at the side, blade pointing down. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_s_run.png`
```
Pure front view: the character runs straight toward the viewer. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the RIGHT side of the picture; the other hand never holds anything (no tassel, no hilt, no scabbard). Draw ONE horizontal row of 6 frames: running loop toward the viewer, the sword held low and angled outward to the side, clearly visible in every frame, hair and ribbon streaming back. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_s_attack.png`
```
Pure front view: the character faces straight toward the viewer, both eyes visible, NOT a three-quarter view. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the RIGHT side of the picture; the other hand never holds anything (no tassel, no hilt, no scabbard). Draw ONE horizontal row of 6 frames: horizontal sword swing across the body toward the viewer leaving a pale cyan arc in front of the character. Frame 1 ready stance, frame 2 sword pulled back to the side, frame 3 swinging across, frame 4 full extension with the arc, frame 5 follow-through, frame 6 return to guard. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_s_cast.png`
```
Pure front view: the character faces straight toward the viewer, NOT a three-quarter view. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the RIGHT side of the picture, held low at the side in EVERY frame; it never moves to the other hand. Draw ONE horizontal row of 6 frames: frames 1-2 the FREE hand (left side of the picture) forms a sword-finger seal (index and middle fingers straight together) held in front of the chest; frames 3-6 that free arm extends forward toward the viewer pointing with the two fingers, while pale cyan energy gathers along the sword blade. The pointing hand holds nothing. Only one sword, no tassel, no second hilt, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_s_hurt.png`
```
Pure front view: the character faces straight toward the viewer, NOT a three-quarter view. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the RIGHT side of the picture; the other hand never holds anything (no tassel, no hilt, no scabbard). Draw ONE horizontal row of 6 frames: getting hit: jerking back, eyes shut, small impact marks, then recovering, the sword still in hand. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_s_dead.png`
```
Pure front view: the character faces straight toward the viewer, NOT a three-quarter view. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. The sword starts in the hand on the RIGHT side of the picture; the other hand never holds anything. Draw ONE horizontal row of 6 frames: death animation. Frame 1 hit and staggering, frame 2 knees buckling, frame 3 kneeling and tipping forward toward the viewer, frame 4 falling, frames 5-6 lying flat face-down on the ground, the sword dropped on the ground beside the body. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

---

## Sau lưng: gắn `sword/kiem_n_ref.png`

Hàng chém và trúng đòn "sau lưng" cũ thực ra vẽ góc **chéo sau**, nên được giữ lại cho hướng chéo sau (NE).

### `kiem_n_run.png`
```
2D game sprite strip, pure back view: the character runs AWAY from the viewer, we only see the back of the head, hair and back. The face is never visible. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (hair, topknot, hairpin, ribbon, outfit, colors, size): the hairpin is a STRAIGHT rod with two round jade ends, the robe skirt is PLAIN white-blue with NO blue panels or tassels, dark trousers. Keep EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the LEFT side of the picture, exactly like the attached image; the other hand never holds anything (no tassel, no hilt, no scabbard). Draw ONE horizontal row of 6 frames: running loop away from the viewer, the sword held low and angled outward to the left side, clearly visible in every frame, hair and ribbon streaming back toward the viewer. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_n_attack.png`
```
2D game sprite strip, pure back view: the character faces AWAY from the viewer, we only see the back of the head, hair and back. The face is never visible, NOT a three-quarter view. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (hair, topknot, hairpin, ribbon, outfit, colors, size): the hairpin is a STRAIGHT rod with two round jade ends, the robe skirt is PLAIN white-blue with NO blue panels or tassels, dark trousers. Keep EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is held in the hand on the LEFT side of the picture in ALL 6 frames, it never changes hands and never disappears; the right hand is empty in every frame. LAYOUT: exactly 6 frames side by side in ONE single horizontal line, evenly spaced, not overlapping, no second line. Draw a diagonal downward sword slash away from the viewer: frame 1 ready stance, sword low at the left side; frame 2 the left arm raises the sword high above the left shoulder; frame 3 slashing diagonally down and forward; frame 4 the sword at the end of the slash low in front, a thin pale cyan crescent arc beside it; frame 5 the arc fading; frame 6 back to ready stance. The arc is a thin crescent only, never a full ring, never covering the body. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

### `kiem_n_hurt.png`
```
2D game sprite strip, pure back view: the character faces AWAY from the viewer, we only see the back of the head, hair and back. The face is never visible, NOT a three-quarter view. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (hair, topknot, hairpin, ribbon, outfit, colors, size): the hairpin is a STRAIGHT rod with two round jade ends, the robe skirt is PLAIN white-blue with NO blue panels or tassels, dark trousers. Keep EXACTLY this camera angle, do not rotate the character. SWORD RULE: the only sword is always held in the hand on the LEFT side of the picture; the other hand never holds anything (no tassel, no hilt, no scabbard). Draw ONE horizontal row of 6 frames: getting hit from the front: the body jerks backward toward the viewer, head tilting back, small impact marks, then recovering, the sword still in hand. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

---

## Ngang: gắn `sword/kiem_e_ref.png`

### `kiem_e_cast.png` (thay `kiem_side_cast.png`)
```
2D side-scrolling platformer game sprite strip, pure side view facing RIGHT, only one eye visible. The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character, never turn the back or the chest toward the viewer. SWORD RULE: the only sword is always held in the NEAR hand (the arm closest to the viewer), held low at the side in EVERY frame, exactly like the attached image. Draw ONE horizontal row of 6 frames: frames 1-2 the FAR hand forms a sword-finger seal (index and middle fingers straight together) in front of the chest; frames 3-6 the far arm extends forward to the right pointing with the two fingers, while pale cyan energy gathers along the sword blade. The pointing hand holds nothing. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

---

## Đòn 2, đòn 3 của combo (làm sau cùng)

Dùng ảnh mẫu và câu **SWORD RULE** của đúng hướng ở trên, ghép với phần động tác dưới đây.
Thay `[CAMERA]`, `[SWORD RULE]` bằng câu đầu và câu SWORD RULE của hướng đó.
Tên file: `kiem_{se,s,e,n}_atk2.png`, `kiem_{se,s,e,n}_atk3.png`.

**Đòn 2**, chém trúng ở khung 3:
```
[CAMERA] The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. [SWORD RULE] Draw ONE horizontal row of 6 frames: second combo attack, a rising diagonal sword slash. Frame 1 guard stance, frame 2 sword lowered behind the body near the ground, frame 3 rising slash from low to high leaving a wide pale cyan crescent arc in front of the character, frame 4 sword held high, the arc fading, frames 5-6 returning to guard. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```

**Đòn 3**, đập xuống ở khung 4:
```
[CAMERA] The attached image shows my character from this exact camera angle. Keep EXACTLY this character design (face, hair, topknot, hairpin, ribbon, outfit, colors, size) and EXACTLY this camera angle, do not rotate the character. [SWORD RULE] Draw ONE horizontal row of 6 frames: powerful finishing blow. Frame 1 crouching to jump, frame 2 small leap with the sword raised overhead, frame 3 swinging down, frame 4 sword smashed down in front with a large pale cyan arc and a flat shockwave ring on the ground, frame 5 the ring fading, frame 6 standing back up in guard. Only one sword, simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline except the leap. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no grid lines, no shadow.
```
