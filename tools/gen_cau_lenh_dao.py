# Sinh docs/CAU_LENH_DAO_GIA.md. Chạy: python -I tools/gen_cau_lenh_dao.py docs/CAU_LENH_DAO_GIA.md
import sys
OUT = sys.argv[1]
TAIL = ("simple clean chibi hands with correct anatomy, same size as the attached character, feet on the same baseline. "
        "Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no written characters, no grid lines, no shadow.")
LOOK = ("face, hair, black Taoist crown, wooden hairpin, black hair ribbons, ivory robe with wide sleeves, ink-gray vest, "
        "black sash with gold taiji buckle, brush, colors, size")
KEEP = ("The attached image shows my character from this exact camera angle. Keep EXACTLY this character design "
        f"({LOOK}) and EXACTLY this camera angle, do not rotate the character.")
D = {
 "se": dict(throw="toward the lower RIGHT of the picture", legA="the foot on the RIGHT side of the picture", legB="the foot on the LEFT side of the picture", name="Chéo trước", ref="dao/dao_se_ref.png",
            cam="Three-quarter front view: the character faces diagonally down-right toward the viewer, both eyes visible.",
            # SE: bút ở TAY XA (bên trái ảnh), người dùng chốt 13/11/2026: Gemini luôn dùng tay xa để viết/ném ở góc này
            hand="in the FAR hand, the hand on the LEFT side of the picture", nothand="in the near hand on the RIGHT side of the picture", free="the FREE near hand (RIGHT side of the picture)",
            run="running loop toward the viewer and to the right", toward="forward", back=False,
            dead="falling sideways to the ground, frames 5-6 lying on the ground on the side"),
 "s": dict(throw="straight toward the viewer", legA="the foot on the RIGHT side of the picture", legB="the foot on the LEFT side of the picture", name="Thẳng", ref="dao/dao_s_ref.png",
           cam="Pure front view: the character faces straight toward the viewer, both eyes visible, NOT a three-quarter view.",
           hand="in the hand on the RIGHT side of the picture", nothand="in the hand on the LEFT side of the picture", free="the FREE hand (LEFT side of the picture)",
           run="running loop straight toward the viewer", toward="forward toward the viewer", back=False,
           dead="kneeling and tipping forward toward the viewer, frames 5-6 lying flat face-down on the ground"),
 "e": dict(throw="to the RIGHT", legA="the NEAR leg (closest to the viewer)", legB="the FAR leg", name="Ngang", ref="dao/dao_e_ref.png",
           cam="2D side-scrolling platformer game sprite strip, pure side view facing RIGHT, only one eye visible, never turn the back or the chest toward the viewer.",
           hand="in the NEAR hand (the arm closest to the viewer)", nothand="in the far hand", free="the FAR hand",
           run="running to the right", toward="forward to the right", back=False,
           dead="falling backward to the left, frames 5-6 lying flat on the back"),
 "ne": dict(throw="toward the upper RIGHT of the picture", legA="the foot on the LEFT side of the picture", legB="the foot on the RIGHT side of the picture", name="Chéo sau", ref="dao/dao_ne_ref.png",
            cam="Three-quarter back view: the character faces diagonally up-right AWAY from the viewer, we see the back and only the edge of the right cheek. The eyes are never visible.",
            # NE: bút ở tay bên PHẢI ảnh (tay phải thật, như SE), người dùng chốt 13/11/2026: Gemini luôn viết bằng tay này ở góc chéo
            hand="in the hand on the RIGHT side of the picture", nothand="in the hand on the LEFT side of the picture", free="the FREE hand (LEFT side of the picture)",
            run="running loop away from the viewer and to the right", toward="forward away from the viewer", back=True,
            dead="tipping forward away from the viewer, frames 5-6 lying face-down on the ground"),
 "n": dict(throw="straight away from the viewer, up into the picture", legA="the foot on the LEFT side of the picture", legB="the foot on the RIGHT side of the picture", name="Sau lưng", ref="dao/dao_n_ref.png",
           cam="2D game sprite strip, pure back view: the character faces AWAY from the viewer, we only see the back of the head, hair and back. The face is never visible, NOT a three-quarter view.",
           hand="in the hand on the LEFT side of the picture", nothand="in the hand on the RIGHT side of the picture", free="the FREE hand (RIGHT side of the picture)",
           run="running loop straight away from the viewer", toward="forward away from the viewer", back=True,
           dead="tipping forward away from the viewer, frames 5-6 lying flat face-down on the ground"),
}
SIDE = {"se": "bên **trái** ảnh (tay **xa**; riêng hướng này)", "s": "bên **phải** ảnh", "e": "cánh tay **gần** người xem", "ne": "bên **phải** ảnh (tay phải thật, như chéo trước)", "n": "bên **trái** ảnh"}
GRIP = ("gripped in a fist at the end of the shaft just below the jade end cap, exactly like a sword hilt, "
        "so the whole shaft and bristle tip extend out from the fist")
NOHOLD = "(no scroll, no book, no talisman paper, no ink stone, no gourd, no second brush)"


def rule(d, cast=False):
    r = (f"BRUSH RULE: the only weapon is ONE calligraphy brush, exactly as long and with exactly the same design as the brush in the attached image, "
         f"always held {d['hand']} in ALL 6 frames and NEVER {d['nothand']}, {GRIP}; it stays straight, rigid and the same length in every frame, "
         "clearly visible in ALL 6 frames, never missing, never changing hands")
    if cast:
        r += ", held low at the side in EVERY frame"
    return r + f". The other hand never holds anything {NOHOLD}."


ARC = "a flowing black ink stroke arc with a faint gold glow"
STROKE = "a few glowing brush strokes of black ink outlined with bright white light"
STROKE_RULE = ("The strokes are ABSTRACT calligraphy swirls, loops and dashes, never readable letters or characters. "
               "Keep the strokes and particles close to the character, inside the frame; nothing flies far away")
CANVAS = ("The attached image is a wide canvas: the character at the far LEFT ONLY shows the exact SIZE of one frame. "
          "Redraw ALL 6 frames of the new motion across the whole width at exactly that size; frame 1 is also part of the motion, "
          "not a copy of the standing pose. ")
RUN = ("a light jogging run, NOT jumping and NOT hopping: in EVERY frame at least one foot touches the ground and the body stays at the same height "
       "(only a tiny 2-pixel bob), the feet never leave the baseline together. The legs ALTERNATE, every frame different, the robe hem swinging with them: "
       "frames 1 and 5: {A} steps forward and {B} pushes off behind; "
       "frame 3: the OPPOSITE, {B} steps forward and {A} pushes off behind; "
       "frames 2, 4 and 6: passing pose, both feet close together under the body, one of them slightly lifted")
LAYOUT = ("LAYOUT: exactly 6 frames side by side in ONE single horizontal line, evenly spaced, not overlapping, no second line. "
          "Draw the 6 figures SMALL so that all 6 fit completely inside the image, with white space between them and around the edges; "
          "each figure is at most one sixth of the image width, nothing cut off by the image edge.")


FIST = "the fist (gripping an invisible short sword)"
NB = ("Edit the attached image: remove the calligraphy brush completely from all 5 views. In each view, the hand that held the brush stays in the same place "
      "as a tightly closed fist, as if gripping an invisible sword hilt; fill the area where the brush was with the robe or the white background. "
      "Change NOTHING else: same 5 views, same poses, same positions, same size, same design and colors, plain pure white background, no text.")
KEEP_B = ("The attached image shows my character from this exact camera angle. Keep EXACTLY this character design "
          "(face, hair, black Taoist crown, wooden hairpin, black hair ribbons, ivory robe with wide sleeves, ink-gray vest, "
          "black sash with gold taiji buckle, colors, size) and EXACTLY this camera angle, do not rotate the character.")


def rule_b(d):
    # cách B: Gemini không vẽ bút; code vẽ bút vào nắm tay (lớp vũ khí)
    hand = d["hand"][3:]                       # "the hand on the RIGHT side of the picture" ...
    swap = (" IMPORTANT: this is DIFFERENT from the attached image, where the near hand is the fist: here the fist is the FAR hand and the near hand is open."
            if d is D["se"] else
            " IMPORTANT: this is DIFFERENT from the attached image: here the fist is the hand on the RIGHT side of the picture; the hand on the LEFT side of the picture is open and rests on the sash in front of the body, it never goes behind the back and never holds anything."
            if d is D["ne"] else "")
    return ("HAND RULE: the character holds NO weapon in any frame: draw no brush, no stick, no sword (the weapon is added later by the game). "
            f"{hand[0].upper() + hand[1:]} is ALWAYS a tightly closed fist in all 6 frames, as if gripping an invisible short-sword hilt, "
            "and it moves exactly as it would when holding a short sword. "
            f"The other hand, {d['nothand'][3:]}, is OPEN with the fingers spread and visible, never a fist. "
            "Do not swap the two hands in any frame." + swap)


def acts(k, d):
    hurt = ("getting hit from the front: the body jerks backward toward the viewer, head tilting back, small impact marks, then recovering, the fist still clenched"
            if d["back"] else "getting hit: jerking back, eyes shut, small impact marks, then recovering, the fist still clenched")
    # Đạo Gia đánh xa: vẽ chữ trên không bằng bút (vô hình, code vẽ bút), nét mực bùng thành hạt trắng đen.
    # Đạn bay xa do code vẽ; ảnh chỉ có nét mực lơ lửng và chùm hạt nhỏ sát tay.
    wr = d["hand"][3:]
    atk = (f"a ranged calligraphy attack: the character writes in the air with an invisible calligraphy brush held in the fist. "
           f"The WRITING hand is {wr}: it is the one that reaches out and draws; ONLY the fist writes. The other, open hand rests flat on the sash at the waist in EVERY frame and never leaves it, never reaches out, never touches the ink. "
           f"Frame 1 ready stance, the fist raised in front of the chest; frames 2-3 the fist makes quick flowing brush strokes in the air {d['toward']} of the character, "
           f"leaving {STROKE} floating in the air; frame 4 the fist thrusts {d['toward']}, the floating strokes burst into a small cloud of tiny white and black energy particles "
           f"right beside the hand; frame 5 the strokes fading; frame 6 return to ready stance. {STROKE_RULE}")
    # Thi pháp Đạo Gia: khung 1-2 viết liên tục trên không (tụ chiêu, game giữ tư thế này), khung 3-6 phất tay ném chữ vào địch.
    # Chữ bay đi do code vẽ; ảnh chỉ có nét mực sát tay.
    cast = (f"casting a spell by writing in the air with an invisible calligraphy brush held in the fist ({wr}). "
            f"Frames 1-2 CHARGING: the fist writes continuously in the air in front of the chest, a glowing swirl of black ink strokes outlined with bright white light "
            f"growing between the fist and the chest, ONLY the fist writes, the other, open hand rests flat on the sash at the waist in EVERY frame; frame 3 the SAME fist ({wr}) pulls back beside its own shoulder holding the glowing ink swirl; "
            f"frame 4 the SAME fist whips {d['throw']} in a strong flinging motion, throwing the written ink swirl at an enemy, the swirl flying {d['throw']} "
            f"(never backward) with a short motion trail; frame 5 the SAME arm fully extended {d['throw']} after the throw, a few ink droplets near the fist; "
            f"frame 6 back to ready stance. The open hand never throws and never rises. {STROKE_RULE}")
    fly = ("flying on an INVISIBLE mount: NO brush and NO mount drawn anywhere, BOTH hands empty. Frame 1 crouching, frame 2 springing up, "
           "frames 3-5 steady riding pose standing upright with both feet together on an invisible flat platform, one hand forming a sword-finger seal in front of the chest, "
           f"the other arm relaxed at the side, wide sleeves, robe and hair ribbons streaming backward (the character flies {d['toward']}), frame 6 landing in a slight crouch. "
           "Feet on the same baseline in frames 3-5")
    atk2 = (f"second combo of the ranged calligraphy attack with an invisible brush held in the fist. The WRITING hand is {wr}; ONLY the fist writes, the other, open hand rests flat on the sash at the waist in EVERY frame and never reaches out. Frame 1 guard stance, frame 2 the fist sweeps low, "
            f"frame 3 a fast rising brush stroke from low to high leaving {STROKE} floating in the air, frame 4 the fist flicks {d['toward']} and the strokes burst into "
            f"a small cloud of tiny white and black energy particles beside the hand, frames 5-6 returning to guard. {STROKE_RULE}")
    atk3 = (f"powerful finishing ranged calligraphy attack with an invisible brush held in the fist. Frame 1 the fist raised high, frames 2-3 the fist draws one large circle "
            f"in the air {d['toward']} of the character, leaving a big round {STROKE[2:]} floating in the air, frame 4 both arms push {d['toward']} and the circle bursts into "
            f"a larger cloud of white and black energy particles in front of the character, frame 5 the particles fading, frame 6 back to guard. {STROKE_RULE}")
    return [("idle", "idle breathing loop, hair ribbons and wide sleeves swaying gently, the brush held at the side, bristle tip pointing down", 1),
            ("run", f"{d['run']}, {RUN.format(A=d['legA'], B=d['legB'])}; both arms swing naturally with the run, the fist hand stays a closed fist in every frame, hair ribbons and wide sleeves streaming back", 1),
            ("attack", atk, 2), ("cast", cast, 3), ("hurt", hurt, 3),
            ("dead", f"death animation. Frame 1 hit and staggering, frame 2 knees buckling, frames 3-4 {d['dead']}, the fist opens as the character falls", 3),
            ("fly", fly, 4), ("atk2", atk2, 5), ("atk3", atk3, 5)]


def prompt(d, name, body):
    if name == "idle" and d is D["se"]:         # SE đổi sang tay xa: vẽ lại hàng đứng theo cách B (tay nắm, code vẽ bút)
        return (f"{d['cam']} {KEEP_B} {rule_b(d)} Draw ONE horizontal row of 6 frames: idle breathing loop, hair ribbons and wide sleeves swaying gently, "
                f"the fist hanging relaxed at the side. {CANVAS}{LAYOUT} No weapon anywhere, {TAIL}")
    if name == "idle":                          # hàng đứng đã xong theo cách A (vẽ cả bút), giữ lại để tra cứu
        return f"{d['cam']} {KEEP} {rule(d)} Draw ONE horizontal row of 6 frames: {body}. {CANVAS}{LAYOUT} Only one brush, {TAIL}"
    if name == "fly":
        return f"{d['cam']} {KEEP_B} Draw ONE horizontal row of 6 frames: {body}. {CANVAS}{LAYOUT} No brush anywhere, {TAIL}"
    return f"{d['cam']} {KEEP_B} {rule_b(d)} Draw ONE horizontal row of 6 frames: {body}. {CANVAS}{LAYOUT} No weapon anywhere, {TAIL}"


STEP1 = ("The attached image is ONLY a style reference: match its pixel-art style, chibi proportions, head-to-body ratio, outline thickness, character size and three-quarter front camera angle exactly. "
         "Do NOT copy its face, hair, hairpin, ribbon, outfit or sword. Design a NEW character: a young male Taoist priest with the gentle air of a scholar. "
         "Long black hair, the upper half tied into a neat topknot covered by a small black lacquered Taoist crown pinned with a straight wooden hairpin, two thin long black ribbons hanging from the crown down the back, a few soft bangs. "
         "Gentle scholarly face, calm narrow dark-brown eyes, faint smile. "
         "Outfit: long ivory-white Taoist robe with very wide flowing scholar sleeves, black collar and black sleeve cuffs edged with a thin gold line; over it a long sleeveless vest in ink-wash gray that darkens toward the hem like ink on paper; "
         "a black sash belt with a small round gold taiji (yin-yang) buckle; dark trousers and black cloth shoes. "
         "Weapon: ONE SHORT calligraphy brush, about one third of the character's height, like a short sword: a straight dark bamboo shaft with a thin gold ring and a small jade end cap, and a long pointed black bristle tip. "
         "Draw ONE single full-body standing figure, three-quarter front view facing diagonally down-right toward the viewer, both eyes visible, calm relaxed stance, feet together. "
         f"BRUSH RULE: the brush is held in the hand on the RIGHT side of the picture, {GRIP}, hanging at the side with the bristle tip pointing down; "
         f"the other hand is empty and relaxed and never holds anything {NOHOLD}. "
         "No patterns of written characters on the clothes. Simple clean chibi hands with correct anatomy. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no shadow.")

STEP1B = ("I attach TWO images. IMAGE 1 (my other character) is ONLY for the camera angle, pose, size and pixel-art style: three-quarter front view, the body and face turned diagonally down-right toward the viewer, both eyes visible, the weapon hanging in the hand on the RIGHT side of the picture. "
          "IMAGE 2 is ONLY for the character design: copy EXACTLY its face, hair, tall black Taoist crown, wooden hairpin, black hair ribbons, ivory robe with wide sleeves and black gold-edged cuffs, ink-gray gradient vest, black sash with gold taiji buckle, black shoes and colors. "
          "Draw the character of IMAGE 2 standing in EXACTLY the camera angle and pose of IMAGE 1, NOT a front view: the body is clearly rotated toward the lower right like IMAGE 1. "
          "Weapon: ONE calligraphy brush with the same design as IMAGE 2 (dark bamboo shaft, thin gold ring, small jade end cap, pointed black bristle tip) but much SHORTER: exactly as long as the sword in IMAGE 1, about one third of the character's height. "
          f"BRUSH RULE: the brush is held in the hand on the RIGHT side of the picture, {GRIP}, hanging at the side with the bristle tip pointing down, exactly like the sword in IMAGE 1; "
          f"the other hand is empty and relaxed and never holds anything {NOHOLD}. "
          "Draw ONE single full-body standing figure, same size as the character in IMAGE 1, feet together. Simple clean chibi hands with correct anatomy. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no written characters, no shadow.")

L = []
w = L.append
w("# Câu lệnh vẽ Đạo Gia (`dao_ai`)\n")
w("Đạo Gia là đạo sĩ Đạo gia pha nét thư sinh. **Vũ khí:** bút lông lớn. **Vật cưỡi khi ngự kiếm:** chính cây bút đó, phóng to.\n")
w("Nhân vật này theo nguyên tắc **bộ động tác chung** (mục 1 của `QUY_TRINH_NHAN_VAT.md`). Động tác, số khung và thứ tự khung giống hệt Kiếm Tu (`CAU_LENH_KIEM_TU.md`); chỉ đổi ngoại hình và vũ khí. "
  "Mọi câu lệnh bên dưới sinh từ cùng một mẫu, nên câu tả ngoại hình và câu quy tắc cầm bút giống nhau từng chữ giữa các hướng.\n")
w("Cách làm:\n")
w("- Lưu ảnh vào thư mục `dao/`, đúng tên file.")
w("- Mỗi mục là **một cuộc trò chuyện Gemini mới**, chỉ gắn **đúng một ảnh** ghi ở đầu mục.")
w("- Tải ảnh bằng nút tải về, không chụp màn hình.")
w("- Gửi ảnh cho Claude kiểm tra trước khi làm mục tiếp theo.\n")
w("## Quy tắc cầm bút (giống quy tắc cầm kiếm)\n")
w("- Bút luôn ở **tay trái thật** của nhân vật.")
w("- Nắm cả bàn tay quanh phần dưới cán, **như cầm đoản kiếm**; đầu lông hướng ra ngoài.")
w("- Bút **thẳng, cứng, dài bằng nhau ở mọi khung**, để code tách bút thành lớp vũ khí và thay được bút khác.")
w("- Tay kia **không cầm gì**: không quyển trục, không sách, không bùa, không nghiên mực, không hồ lô.\n")
w("| Hướng | Ảnh mẫu | Bút nằm ở |\n|---|---|---|")
for k, d in D.items():
    w(f"| {d['name']} ({k}) | `{d['ref']}` | {SIDE[k]} |")
w("\n## Thứ tự làm\n")
w("1. **Bước 1–2 (xong 13/11/2026):** ảnh mẫu 5 hướng, cắt từ bảng xoay `dao/dao_turnaround.png`.")
w("3. **Bước 3:** ảnh cây bút riêng `dao_brush.png`, dùng cho lớp vũ khí và vật cưỡi.")
w("4. **Bước 4:** các hàng động tác, theo ưu tiên:")
w("   1. `idle`, `run` mọi hướng;")
w("   2. `attack`;")
w("   3. `cast`, `hurt`, `dead`;")
w("   4. `fly`;")
w("   5. `atk2`, `atk3`.\n")
TURN = ("Character turnaround sheet of the attached character. Keep EXACTLY this character design: face, long black hair, tall black Taoist crown, wooden hairpin, black hair ribbons, ivory robe with very wide sleeves and black gold-edged cuffs, ink-gray gradient vest, black sash with gold taiji buckle, black shoes, colors, chibi proportions and pixel-art style. "
        "Draw the SAME character 5 times in ONE horizontal row, evenly spaced, not overlapping, all the same size, feet on the same baseline, each in the same calm standing pose: 1) front view, facing the viewer; 2) three-quarter front view, body and face clearly rotated toward the lower RIGHT, both eyes visible; "
        "3) pure side view facing RIGHT, only one eye visible; 4) three-quarter back view, rotated away toward the upper RIGHT, the face not visible; 5) pure back view, the face not visible. "
        "WEAPON: ONE SHORT calligraphy brush, much shorter than in the attached image: only about one third of the character's height, as long as a short sword. In every view the brush is in the character's LEFT hand: on the RIGHT side of the picture in views 1 and 2, in the arm closest to the viewer in view 3, on the LEFT side of the picture in views 4 and 5. "
        "The hand grips the very end of the shaft just below the jade end cap, exactly like a sword hilt; the brush hangs down along the side, angled slightly outward, the bristle tip pointing toward the ground. "
        "The other hand is empty and relaxed and never holds anything (no scroll, no book, no talisman paper, no gourd, no second brush). Simple clean chibi hands with correct anatomy. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no numbers, no labels, no grid lines, no shadow.")
w("---\n\n## Bước 1–2: ảnh mẫu 5 hướng bằng bảng xoay (xong)\n")
w("Tạo hình lấy từ `dao/dao_design.png` và `dao/dao_design_v2.png` (đạt về tạo hình). Hai cách đã thử mà không ra góc chéo trước:\n")
w("- tả bằng chữ, gắn ảnh mẫu Kiếm Tu;")
w("- gắn hai ảnh (một ảnh lấy góc máy, một ảnh lấy tạo hình): Gemini chép nguyên tư thế nhìn thẳng của ảnh tạo hình.\n")
w("**Cách đạt:** vẽ **bảng xoay**, tức một hàng 5 tư thế đứng (thẳng, chéo trước, ngang, chéo sau, sau lưng). Gắn `dao/dao_design_v2.png`. Kết quả `dao/dao_turnaround.png` được cắt thành `dao/dao_{s,se,e,ne,n}_ref.png`. **Mẹo này dùng cho mọi nhân vật mới.**\n")
w("Bút vẫn dài khoảng 1/2 chiều cao người, dù câu lệnh xin 1/3: Gemini không chịu vẽ ngắn hơn. Chấp nhận mức này, vì bút là lớp tách rời và code chỉnh được độ dài khi đóng gói. Các câu lệnh động tác chỉ yêu cầu bút dài đúng như trong ảnh mẫu.\n")
w("```\n" + TURN + "\n```\n")
w("## Bước 3: cây bút riêng `dao/dao_brush.png` (gắn `dao/dao_se_ref.png`)\n")
w("Một ảnh dùng cho cả hai việc:\n")
w("- thu nhỏ làm **bút cầm tay** (lớp vũ khí);")
w("- phóng to làm **vật cưỡi** khi ngự kiếm. Code xoay bút theo hướng bay, như kiếm của Kiếm Tu.\n")
w("```\nThe attached image shows my character holding a large calligraphy brush. Draw ONLY that brush, alone, with exactly the same design and colors (dark bamboo shaft, thin gold ring, small jade end cap, long pointed black bristle tip), "
  "lying perfectly horizontal and straight, seen from the side, the jade end cap on the LEFT and the pointed bristle tip pointing to the RIGHT, large and detailed, filling most of the image width. "
  "No hand, no character, no ink splash. Clean pixel art, crisp 1px dark outline, plain pure white background, no text, no shadow.\n```\n")
w("---\n\n## Bước 4: các hàng động tác\n")
w("Các hàng động tác gắn **ảnh mẫu khổ rộng** `dao/dao_<hướng>_ref_wide.png`: khổ 3:1, nhân vật đứng ở 1/6 bên trái. "
  "Gắn ảnh mẫu dọc thì Gemini ra ảnh 16:9 và chỉ vẽ được 4 khung to. Ảnh khổ rộng gợi ý cả khổ ảnh lẫn cỡ một khung. Ảnh khổ rộng do code làm từ ảnh mẫu dọc.\n")
w("**Cách B: Gemini không vẽ bút** (áp dụng từ hàng chạy, 13/11/2026). Hàng chạy đã thử 3 lần theo cách A (vẽ cả bút): Gemini cho bút đổi tay theo nhịp vung tay, hoặc bỏ mất bút. "
  "Kể cả khi khoá tay cầm bút, bút vẫn chỉ còn ở 2/6 khung. Vì vậy từ hàng chạy trở đi:\n")
w("- Gemini vẽ người **không cầm gì**; tay cầm bút luôn **nắm chặt như cầm chuôi đoản kiếm vô hình**, tay kia mở.")
w("- Code vẽ bút vào nắm tay (lớp vũ khí, như Kiếm Tu). Claude đánh dấu nắm tay và hướng bút từng khung.")
w("- Gắn **ảnh mẫu không bút** `dao/dao_<hướng>_ref_nb_wide.png`. Gắn ảnh có bút thì Gemini chép bút theo.")
w("- Hàng đứng `idle` đã xong theo cách A (có bút); khi đóng gói, code xoá bút vẽ sẵn rồi vẽ lại bằng lớp vũ khí.\n")
w("Ảnh mẫu không bút: sửa bảng xoay bằng Gemini (gắn `dao/dao_turnaround.png`), lưu `dao/dao_turnaround_nb.png`, Claude cắt thành `dao_<hướng>_ref_nb.png` và bản khổ rộng.\n")
w("```\n" + NB + "\n```\n")
w("Hàng `fly` có 6 khung:\n")
w("- khung 1: ngồi thấp;")
w("- khung 2: bật lên (cất cánh);")
w("- khung 3–5: tư thế bay, lặp lại;")
w("- khung 6: hạ cánh.\n")
w("Người bay **tay không, không vẽ bút**: code ghép cây bút lớn dưới chân.\n")
for k, d in D.items():
    w(f"### {d['name']}: gắn `{d['ref'].replace('_ref.png', '_ref_nb_wide.png')}`\n")
    for name, body, pri in acts(k, d):
        done = " — **xong** (cách A, ảnh mẫu `" + d['ref'].replace('_ref.png', '_ref_wide.png') + "`)" if name == "idle" and k != "se" else ""
        if (k, name) in (("se", "idle"), ("se", "run"), ("ne", "run"), ("ne", "cast")):
            done = " — **vẽ lại** (đổi bút sang tay xa)"
        w(f"#### `dao/dao_{k}_{name}.png` (ưu tiên {pri}){done}\n")
        w("```\n" + prompt(d, name, body) + "\n```\n")
open(OUT, "w", encoding="utf8").write("\n".join(L))
