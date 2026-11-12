// Dữ liệu game: cảnh giới, yêu thú, hằng số cân bằng, lưu game.
window.TT = window.TT || {};

TT.DATA = {
  stages: ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ'],

  // need: tu vi cần cho từng tiểu cảnh giới (sơ/trung/hậu kỳ)
  // strikes: số đạo thiên lôi khi độ kiếp lên cảnh giới kế tiếp (0 = cảnh giới cuối của demo)
  // gain: hệ số tốc độ hấp thu linh khí
  realms: [
    { name: 'Luyện Khí', need: [40, 70, 110],       hp: 60,  mp: 30,  atk: 6,  strikes: 3,  gain: 1,   color: '#9fe3ff' },
    { name: 'Trúc Cơ',   need: [160, 230, 320],     hp: 110, mp: 45,  atk: 11, strikes: 5,  gain: 2.6, color: '#7fffb0' },
    { name: 'Kim Đan',   need: [450, 620, 820],     hp: 180, mp: 65,  atk: 18, strikes: 7,  gain: 6.5, color: '#ffe08a' },
    { name: 'Nguyên Anh', need: [1100, 1450, 1900], hp: 280, mp: 90,  atk: 28, strikes: 9,  gain: 15,  color: '#ffb36b' },
    { name: 'Hóa Thần',  need: [2500, 3200, 4000],  hp: 420, mp: 120, atk: 42, strikes: 12, gain: 32,  color: '#ff9ad5' },
    { name: 'Luyện Hư',  need: [5200, 6600, 8200],  hp: 620, mp: 160, atk: 62, strikes: 0,  gain: 65,  color: '#c9a7ff' }
  ],

  enemies: [
    { id: 'slime_g', name: 'Thanh Linh Yêu', minRealm: 0, hp: 18,  dmg: 6,  speed: 38, orbs: [2, 3], orbVal: 5,  tint: [0x6fd17a, 0xc4f5b0] },
    { id: 'slime_p', name: 'Tử Độc Yêu',     minRealm: 1, hp: 55,  dmg: 13, speed: 46, orbs: [3, 4], orbVal: 14, tint: [0x9a62d6, 0xe0c4ff] },
    { id: 'slime_r', name: 'Huyết Ma Yêu',   minRealm: 2, hp: 150, dmg: 26, speed: 54, orbs: [3, 5], orbVal: 38, tint: [0xd6455a, 0xffb0b0] }
  ],

  passiveRate: 0.6,   // tu vi/giây khi đi lại
  meditateRate: 3,    // tu vi/giây khi thiền
  springMul: 2.5,     // nhân thêm khi thiền cạnh linh tuyền
  springRadius: 84,   // bán kính hưởng linh khí linh tuyền
  safeRadius: 76,     // trận pháp hộ sơn: yêu thú không vào được
  slashCost: 0,
  thunderCost: 12,

  casterScale: 0.5,  // camera zoom x2 nên 0.5 = hiển thị đúng 1:1 pixel gốc của beanfx

  // ---------- Hệ tu luyện (chọn ở màn hình đầu) ----------
  // skills: 5 chiêu theo thứ tự ô K L U I O, ô thứ i mở khóa ở đại cảnh giới thứ i
  classes: {
    kiem: {
      name: 'Kiếm Tu', title: 'Nghịch Tiên Kiếm', color: '#9fe3ff',
      caster: 'assets/casters/kiem_bach_y_topdown', aura: [0x4fb8ff, 0x9fdcff, 0xe8f6ff],
      desc: 'Lấy kiếm nhập đạo. Thân pháp nhanh, cận chiến áp đảo, khí huyết dồi dào.',
      hpMul: 1.25, mpMul: 0.8, atkMul: 1.15, basic: { name: 'Kiếm Trảm', glyph: '斬' },
      skills: ['kiem_khi', 'luu_van', 'van_kiem', 'thanh_nhien', 'dai_canh']
    },
    phap: {
      name: 'Pháp Tu', title: 'Nghịch Tiên Trượng', color: '#c9a7ff',
      caster: 'assets/casters/nghich_tien_truong_topdown',
      desc: 'Dẫn thiên địa linh khí hóa thuật. Linh lực thâm hậu, sát thương diện rộng từ xa.',
      hpMul: 0.85, mpMul: 1.5, atkMul: 1.0, basic: { name: 'Trượng Kích', glyph: '杖' },
      skills: ['loi_phap', 'bang_vu', 'loi_than', 'tinh_long', 'hoa_lien']
    },
    quy: {
      name: 'Quỷ Tu', title: 'Vạn Hồn Phiên', color: '#ff5a72',
      caster: 'assets/casters/quy_tu_topdown',
      desc: 'Luyện hồn nhập phiên, lấy âm khí làm đạo. Hấp hồn hồi khí huyết, triệu quỷ tác chiến.',
      passive: 'Hấp Hồn: mỗi yêu thú bị diệt hồi 6% khí huyết.',
      hpMul: 1.0, mpMul: 1.2, atkMul: 1.1, basic: { name: 'Phiên Kích', glyph: '魂' }, lifesteal: 0.06,
      skills: ['cau_hon', 'huyet_anh', 'am_hoa', 'bach_quy', 'van_hon']
    },
    vo: {
      name: 'Võ Tu', title: 'Đế Vương Quyền', color: '#ffa94d',
      caster: 'assets/casters/vo_tu_chibi', aura: [0xffb347, 0xffe08a, 0xfff3c8],
      desc: 'Lấy thân làm khí, quyền ý hóa rồng. Tay không tấc sắt. (4 ô chiêu sau tạm mượn của Kiếm Tu.)',
      hpMul: 1.3, mpMul: 1.0, atkMul: 1.2, basic: { name: 'Quyền Kích', glyph: '拳' },
      skills: ['cuu_long', 'luu_van', 'van_kiem', 'kim_chung', 'giang_long']
    },
    nho: {
      name: 'Nho Đạo', title: 'Đại Bút Thư Sinh', color: '#e6e9f2',
      caster: 'assets/casters/nho_dao_topdown', aura: [0xffffff, 0xc8ccd8, 0x8890a0],
      desc: 'Đạo pháp tự nhiên, áo trắng mực đen. Một tay đại bút, một tay thẻ tre, lấy chữ hóa pháp. (5 ô chiêu tạm mượn của Pháp Tu.)',
      hpMul: 1.0, mpMul: 1.35, atkMul: 1.05, basic: { name: 'Bút Pháp', glyph: '筆' },
      skills: ['loi_phap', 'bang_vu', 'loi_than', 'tinh_long', 'hoa_lien']
    }
  },

  // cost: linh lực, cd: hồi chiêu (giây), dmg: hệ số x công lực
  skills: {
    kiem_khi:   { name: 'Kiếm Khí Trảm',     glyph: '劍', color: '#7fe3ff', cost: 8,  cd: 1.2, dmg: 1.6,
                  desc: 'Phóng một đạo kiếm khí bay thẳng, xuyên qua mọi yêu thú trên đường.' },
    luu_van:    { name: 'Lưu Vân Bộ',        glyph: '影', color: '#bff1ff', cost: 12, cd: 4,   dmg: 1.2,
                  desc: 'Khinh công lướt nhanh về phía trước, bất khả xâm phạm khi lướt; dừng lại thì cuồng phong bùng nổ quanh thân.',
                  fx: 'wind_burst' },
    van_kiem:   { name: 'Vạn Kiếm Quy Tông', glyph: '萬', color: '#ffe08a', cost: 30, cd: 12,  dmg: 3.2,
                  desc: '48 phi kiếm bay lên xé mây thành xoáy, một cự kiếm từ mắt bão cắm xuống phía trước rồi vạn kiếm quay về.',
                  fx: 'van_kiem_quy_tong_v5' },
    kiem_vuc:   { name: 'Kiếm Vực',          glyph: '域', color: '#8fd3ff', cost: 30, cd: 12,  dmg: 0.9,
                  desc: 'Ba thanh phi kiếm xoay quanh thân trong 5 giây, liên tục chém yêu thú áp sát.' },
    nhan_kiem:  { name: 'Nhân Kiếm Hợp Nhất', glyph: '一', color: '#ffd34d', cost: 50, cd: 20,  dmg: 5,
                  desc: 'Tuyệt kỹ: hóa thân thành kiếm, tám đạo kiếm quang quét sạch mọi thứ xung quanh.' },
    thanh_nhien: { name: 'Thanh Nhiên Kiếm Quyết', glyph: '青', color: '#5dffa0', cost: 35, cd: 14, dmg: 0.6,
                  desc: 'Định trụ thời gian của một yêu thú: đồng hồ hiện trên đầu, mục tiêu bất động; chớp di quanh nó chém liên tục tám nhát, mỗi nhát để lại tàn ảnh xanh lục, nhát cuối kiếm quang lớn rồi đồng hồ quay ngược.' },
    dai_canh:   { name: 'Đại Canh Kiếm Trận', glyph: '庚', color: '#5dffa0', cost: 55, cd: 20,  dmg: 1.5,
                  desc: 'Tuyệt kỹ: tụ lực 4 giây, pháp trận xanh lục hiện dưới chân, mười hai phi kiếm quấn lôi điện bay lên xếp thành vòng sau lưng rồi xoắn thành lốc xoáy lao tới mục tiêu, kích nổ lôi trận.' },
    phi_long:   { name: 'Phi Long Tại Thiên', glyph: '龍', color: '#ffd34d', cost: 50, cd: 18,  dmg: 5.5,
                  desc: 'Tuyệt kỹ: hóa thân kim quang, phóng kim long bay vút lên trời rồi lao thẳng xuống mục tiêu, để lại hố chưởng ấn.',
                  fx: 'phi_long_tai_thien' },

    loi_phap:   { name: 'Lôi Pháp',          glyph: '雷', color: '#c9b8ff', cost: 12, cd: 0.7, dmg: 2.4,
                  desc: 'Dẫn một đạo lôi đánh xuống yêu thú gần nhất.' },
    hoa_cau:    { name: 'Hỏa Cầu Thuật',     glyph: '火', color: '#ffb36b', cost: 14, cd: 1.5, dmg: 2.2,
                  desc: 'Bắn hỏa cầu về phía trước, nổ tung khi chạm địch, gây sát thương lan.' },
    bang_phong: { name: 'Băng Phong Trận',   glyph: '冰', color: '#9fe8ff', cost: 22, cd: 8,   dmg: 1.6,
                  desc: 'Hàn khí bùng nổ quanh thân, gây sát thương và làm chậm yêu thú 3 giây.' },
    thien_loi:  { name: 'Thiên Lôi Dẫn',     glyph: '霆', color: '#b59bff', cost: 30, cd: 10,  dmg: 2.2,
                  desc: 'Liên tiếp giáng năm đạo thiên lôi xuống các yêu thú xung quanh.' },
    cuu_thien:  { name: 'Cửu Thiên Lôi Ấn',  glyph: '印', color: '#e0c4ff', cost: 50, cd: 18,  dmg: 4,
                  desc: 'Tuyệt kỹ: kết ấn triệu hồi lôi trận cửu thiên, đánh một đòn hủy diệt kèm dư chấn.' },
    bang_vu:    { name: 'Băng Vũ Trận',      glyph: '冰', color: '#9fe8ff', cost: 18, cd: 7,   dmg: 0.6,
                  desc: 'Gọi mây hàn trút mưa băng xuống một vùng trong 4 giây: liên tục gây sát thương và làm chậm yêu thú.',
                  fx: 'mua_bang_v2' },
    loi_than:   { name: 'Lôi Thần Hộ Thể',   glyph: '雷', color: '#ffd76b', cost: 28, cd: 12,  dmg: 1.4,
                  desc: 'Lôi điện quấn quanh thân 6 giây, tự giật sét vào yêu thú lại gần.',
                  fx: 'aura_thunder_v3' },
    tinh_long:  { name: 'Tinh Long Kích',    glyph: '星', color: '#8fb8ff', cost: 36, cd: 12,  dmg: 3.5,
                  desc: 'Hóa thân kim quang, ngưng tụ đầu rồng tinh tú rồi phóng thẳng về phía trước, xuyên qua mọi thứ và nổ tung ở cuối đường.',
                  fx: 'star_dragon_strike' },
    hoa_lien:   { name: 'Phật Nộ Hỏa Liên',  glyph: '蓮', color: '#ff9a5c', cost: 55, cd: 22,  dmg: 6,
                  desc: 'Tuyệt kỹ: 21 loại dị hỏa hợp thành hỏa liên, ném xuống trước mặt nở thành đóa sen lửa khổng lồ rồi nổ tung.',
                  fx: 'phat_no_hoa_lien' },

    // ----- Võ Tu -----
    cuu_long:   { name: 'Cửu Long Đế Vương Công', glyph: '龍', color: '#ffd34d', cost: 20, cd: 8, dmg: 3,
                  desc: 'Vận công, chín kim long tụ thành vầng quạt sau lưng rồi lần lượt bay vút tới, ngoạm nát mục tiêu phía trước (khoảng 6 ô).',
                  fx: 'cuu_long_de_vuong' },

    giang_long: { name: 'Giáng Long Thập Bát Chưởng', glyph: '掌', color: '#c58cff', cost: 55, cd: 22, dmg: 6,
                  desc: 'Tuyệt kỹ: đứng tại chỗ vận lực gọi mây giông, chưởng phong xé lên mắt bão; mười tám tử long quấn sét lao từ mây xuống mục tiêu (khoảng 6 ô), kết bằng thiên lôi và đầu rồng khổng lồ nổ tung.',
                  fx: 'giang_long_chuong' },
    kim_chung:  { name: 'Kim Chung Tráo', glyph: '鐘', color: '#ffd04a', cost: 26, cd: 15, dur: 6, dr: 0.5, atk: 1.3,
                  desc: 'Bóng kim chung úp xuống bao bọc thân thể rồi tan biến, để lại hào quang vàng 6 giây: giảm 50% sát thương nhận vào, tăng 30% công lực.',
                  fx: 'kim_chung_trao' },

    // ----- Quỷ Tu -----
    cau_hon:    { name: 'Câu Hồn Trảo',      glyph: '鬼', color: '#7dffb8', cost: 10, cd: 1.2, dmg: 1.1,
                  desc: 'Phóng ba đạo âm hồn tự truy đuổi ba yêu thú gần nhất.' },
    huyet_anh:  { name: 'Huyết Ảnh Độn',     glyph: '血', color: '#ff5a72', cost: 12, cd: 4,   dmg: 1.4,
                  desc: 'Hóa thành huyết ảnh dịch chuyển tức thời, huyết vụ nổ ở cả hai đầu; hút 30% sát thương thành khí huyết.' },
    am_hoa:     { name: 'Âm Hỏa Trận',       glyph: '燐', color: '#5dffa0', cost: 24, cd: 10,  dmg: 0.55,
                  desc: 'Tám đốm ma trơi xoay quanh thân 5 giây, thiêu đốt yêu thú áp sát và hút 20% sát thương.' },
    bach_quy:   { name: 'Bách Quỷ Dạ Hành',  glyph: '百', color: '#b8ffd8', cost: 32, cd: 14,  dmg: 0.9,
                  desc: 'Triệu bốn quỷ hồn bay đi săn yêu thú trong 8 giây.' },
    van_hon:    { name: 'Vạn Hồn Phiên',     glyph: '幡', color: '#ff5a72', cost: 55, cd: 22,  dmg: 5,
                  desc: 'Tuyệt kỹ: dựng Vạn Hồn Phiên, vạn âm hồn tràn ngập bầu trời rồi hợp thành dòng lũ nuốt chửng mục tiêu; hồi 15% khí huyết.',
                  fx: 'van_hon_phien' }
  },
  skillKeys: ['K', 'L', 'U', 'I', 'O']
};

// hệ dùng chung nhân vật với hệ khác (casterAs) thì lấy texture của hệ đó

TT.Save = {
  key: 'thanh-van-tu-tien-v1',
  disabled: false,
  load() {
    try { const v = localStorage.getItem(this.key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  },
  save(s) {
    if (this.disabled) return;
    try {
      localStorage.setItem(this.key, JSON.stringify({
        cls: s.cls, gender: s.gender, realm: s.realm, stage: s.stage, cult: s.cult, hp: s.hp, mp: s.mp, kills: s.kills
      }));
    } catch (e) { /* bỏ qua */ }
  },
  clear() {
    try { localStorage.removeItem(this.key); } catch (e) { /* bỏ qua */ }
  }
};
