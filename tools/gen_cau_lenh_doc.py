# Sinh docs/CAU_LENH_DOC_TU_DONG_TAC.md (các hàng động tác của Độc Tu, theo bộ động tác chuẩn).
# Chạy: python -I tools/gen_cau_lenh_doc.py docs/CAU_LENH_DOC_TU_DONG_TAC.md
# Mọi hàng dùng cách B: Gemini vẽ tay KHÔNG, tay cầm quạt nắm như cầm chuôi; code vẽ quạt (doc_quat) vào nắm tay.
import sys

OUT = sys.argv[1]
LOOK = ("face, pale skin, toxic-green eyes, black hair with the silver snake hairpin, deep purple-black robe with moss-green cuffs "
        "and toxic-green hem, hooded mantle with the hood down, black sash with jade scorpion buckle, two poison vials, black boots, colors, size")
KEEP = ("The attached image shows my character from this exact camera angle. Keep EXACTLY this character design "
        f"({LOOK}) and EXACTLY this camera angle, do not rotate the character.")
TAIL = ("simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. "
        "Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no written characters, no grid lines, no shadow.")
CANVAS = ("The attached image is a wide canvas: the character at the far LEFT ONLY shows the exact SIZE of one frame. "
          "Redraw ALL 6 frames of the new motion across the whole width at exactly that size; frame 1 is also part of the motion, "
          "not a copy of the standing pose. ")
LAYOUT = ("LAYOUT: exactly 6 frames side by side in ONE single horizontal line, evenly spaced, not overlapping, no second line. "
          "Draw the 6 figures SMALL so that all 6 fit completely inside the image, with white space between them and around the edges; "
          "each figure is at most one sixth of the image width, nothing cut off by the image edge.")
RUN = ("a light jogging run, NOT jumping and NOT hopping: in EVERY frame at least one foot touches the ground and the body stays at the same height "
       "(only a tiny 2-pixel bob), the feet never leave the baseline together. The legs ALTERNATE, every frame different, the robe hem swinging with them: "
       "frames 1 and 5: {A} steps forward and {B} pushes off behind; frame 3: the OPPOSITE, {B} steps forward and {A} pushes off behind; "
       "frames 2, 4 and 6: passing pose, both feet close together under the body, one of them slightly lifted")
FX_RULE = ("Keep any poison effect SMALL and close to the hand, inside the frame; nothing flies far away; "
           "no snakes, no insects, no needles drawn")

# hướng: tay cầm quạt (nắm tay) theo quy tắc chuẩn: chéo = tay phải thật (SE tay xa / NE bên phải ảnh), còn lại tay trái thật
D = {
 "se": dict(name="Chéo trước", cam="Three-quarter front view: the character faces diagonally down-right toward the viewer, both eyes visible.",
            fist="the FAR hand, the hand on the LEFT side of the picture", open="the near hand on the RIGHT side of the picture",
            swap="IMPORTANT: this is DIFFERENT from the attached image, where the near hand is the fist: here the fist is the FAR hand and the near hand is open. ",
            run="running loop toward the viewer and to the right", toward="toward the lower RIGHT of the picture",
            legA="the foot on the RIGHT side of the picture", legB="the foot on the LEFT side of the picture"),
 "s": dict(name="Thẳng", cam="Pure front view: the character faces straight toward the viewer, both eyes visible, NOT a three-quarter view.",
           fist="the hand on the RIGHT side of the picture", open="the hand on the LEFT side of the picture", swap="",
           run="running loop straight toward the viewer", toward="straight toward the viewer",
           legA="the foot on the RIGHT side of the picture", legB="the foot on the LEFT side of the picture"),
 "e": dict(name="Ngang", cam="2D side-scrolling platformer game sprite strip, pure side view facing RIGHT, only one eye visible, never turn the back or the chest toward the viewer.",
           fist="the NEAR hand (the arm closest to the viewer)", open="the far hand", swap="",
           run="running to the right", toward="to the RIGHT",
           legA="the NEAR leg (closest to the viewer)", legB="the FAR leg"),
 "ne": dict(name="Chéo sau", cam="Three-quarter back view: the character faces diagonally up-right AWAY from the viewer, we see the back and only the edge of the right cheek. The eyes are never visible.",
            fist="the hand on the RIGHT side of the picture", open="the hand on the LEFT side of the picture",
            swap="IMPORTANT: this is DIFFERENT from the attached image: here the fist is the hand on the RIGHT side of the picture; the hand on the LEFT side of the picture is open and rests on the sash in front of the body, it never goes behind the back. ",
            run="running loop away from the viewer and to the right", toward="toward the upper RIGHT of the picture",
            legA="the foot on the LEFT side of the picture", legB="the foot on the RIGHT side of the picture"),
 "n": dict(name="Sau lưng", cam="2D game sprite strip, pure back view: the character faces AWAY from the viewer, we only see the back of the head, hair and back. The face is never visible, NOT a three-quarter view.",
           fist="the hand on the LEFT side of the picture", open="the hand on the RIGHT side of the picture", swap="",
           run="running loop straight away from the viewer", toward="straight away from the viewer, up into the picture",
           legA="the foot on the LEFT side of the picture", legB="the foot on the RIGHT side of the picture"),
}


def hand_rule(d):
    f = d["fist"]
    return ("HAND RULE: the character holds NO weapon in any frame: draw no fan, no stick, no sword (the weapon is added later by the game). "
            f"{f[0].upper() + f[1:]} is ALWAYS a tightly closed fist in all 6 frames, as if gripping an invisible closed folding fan by its end like a short-sword hilt, "
            "and it moves exactly as it would when holding it. "
            f"The other hand, {d['open']}, is OPEN with the fingers spread and visible, never a fist. Do not swap the two hands in any frame. " + d["swap"])


def acts(d):
    f = d["fist"]
    return [
        ("idle", 1, "idle breathing loop, long hair and the mantle swaying gently, a calm cold expression. BOTH arms stay DOWN at the sides in EVERY frame: the fist hangs relaxed beside the hip, the open hand hangs beside the other hip; the arms are never raised, never waving, never lifted above the waist; only the breathing, hair and mantle move"),
        ("run", 1, f"{d['run']}, {RUN.format(A=d['legA'], B=d['legB'])}; both arms swing naturally, the fist stays a closed fist in every frame, hair and mantle streaming back"),
        # đánh thường: phẩy quạt bắn độc châm (kim do code vẽ), ảnh chỉ có cú phẩy + chút sương độc sát tay
        ("attack", 2, f"a quick ranged poison attack, flicking an invisible closed fan held in the fist ({f}) like throwing hidden needles. "
                      f"Frame 1 ready stance, the fist held beside the shoulder; frame 2 the fist pulls back across the body; "
                      f"frame 3 the arm starts a fast horizontal flick; frame 4 the fist snaps {d['toward']} at full extension, a tiny puff of glowing toxic-green mist right at the fist; "
                      f"frame 5 follow-through, the mist fading; frame 6 return to ready stance. The open hand stays low beside the hip. {FX_RULE}"),
        # thi pháp: khung 1-2 tụ độc (giữ khi vận chiêu), 3-6 vung quạt phóng độc
        ("cast", 3, f"casting a poison spell. Frames 1-2 CHARGING: the fist ({f}) is held in front of the chest, the open hand forms a hand seal above it, "
                    f"a small swirl of glowing toxic-green poison mist gathering around the fist; frame 3 the SAME fist pulls back beside its own shoulder carrying the green swirl; "
                    f"frame 4 the SAME fist sweeps {d['toward']} in a strong fan-waving motion, releasing the green swirl {d['toward']} (never backward); "
                    f"frame 5 the arm fully extended, a little green mist near the fist; frame 6 back to ready stance. {FX_RULE}"),
    ]


L = []
w = L.append
w("# Câu lệnh các hàng động tác của Độc Tu (`doc_ai`)\n")
w("Sinh bằng `tools/gen_cau_lenh_doc.py`. Phần tạo hình, bảng xoay và vũ khí: `docs/CAU_LENH_DOC_TU.md`.\n")
w("Cách làm (bộ động tác chuẩn, mục 3 của `QUY_TRINH_NHAN_VAT.md`):\n")
w("- 4 hàng × 5 hướng, mỗi hàng là **một cuộc trò chuyện Gemini mới**; gắn ảnh `doc/doc_<hướng>_ref_nb_wide.png` của đúng hướng đó.")
w("- Gemini vẽ **tay không**: tay cầm quạt nắm chặt như cầm chuôi, tay kia mở. Code vẽ quạt vào nắm tay, vẽ độc châm bay ra.")
w("- Lưu ảnh thành `doc/doc_<hướng>_<động tác>.png`, gửi Claude kiểm tra từng ảnh.")
w("- **Đánh thường** (chốt 16/11/2026): phẩy quạt bắn 3 mũi độc châm toả hình quạt (code vẽ); trúng thì nhiễm độc, mất máu dần.")
w("- **Thi pháp**: khung 1–2 tụ sương độc trước ngực (giữ khi vận chiêu), khung 3–6 vung quạt phóng độc.\n")
w("Thứ tự: `idle`, `run` (5 hướng) → `attack` → `cast`.\n")
for k, d in D.items():
    w(f"## {d['name']} ({k}): gắn `doc/doc_{k}_ref_nb_wide.png`\n")
    for name, pri, body in acts(d):
        w(f"### `doc/doc_{k}_{name}.png` (ưu tiên {pri})\n")
        w("```\n" + f"{d['cam']} {KEEP} {hand_rule(d)}Draw ONE horizontal row of 6 frames: {body}. {CANVAS}{LAYOUT} No weapon anywhere, {TAIL}" + "\n```\n")
open(OUT, "w", encoding="utf8").write("\n".join(L))
print("ok", OUT)
