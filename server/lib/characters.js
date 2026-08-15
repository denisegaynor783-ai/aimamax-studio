// ============================================================
// AIMAMAX API — 角色库预设目录
// 零依赖：内置预设角色（与前端 builtinCharacters 对齐）
// GET /api/v1/characters → 返回全部预设 + 用户自定义（从 store.json）
// ============================================================

const PRESET_CHARACTERS = [
  {
    id: "char-001", name: "甜辣/清新少女",
    tags: { gender: "女主", era: "现代", age: "青年", style: "甜美", custom: ["校园", "初恋感"] },
    description: "甜辣/清新少女，详见角色全身图、面部特写。表情九宫格与人物呈现。",
    promptTemplate: "{name}，{style}风格，{era}背景，{age}，高清人像摄影，柔和自然光，浅景深，8K画质",
    descriptor: "@sweet_girl：18 岁亚洲少女，齐肩栗色微卷发，杏眼带卧蚕，左颊一颗对称小痣，身高 162cm 匀称；校园初恋感，蜜桃色唇釉；服装：百褶校服裙+宽松针织开衫；参考图：脸部特写（取脸唯一来源）+ 无头正面全身 + 背面全身。",
    stateVariants: [
      { key: "wet", label: "淋雨湿身", descriptor: "@sweet_girl_wet：开衫与发梢滴水，布料贴肤透出轮廓，睫毛挂水珠，仍保持杏眼与左颊小痣一致；仅继承 @sweet_girl 的脸与身材，不继承干发状态。" },
      { key: "blood", label: "擦伤带血", descriptor: "@sweet_girl_blood：右膝破皮渗血、手背一道抓痕，校服裙下摆沾泥；面部与 @sweet_girl 完全一致，伤在四肢不在脸。" },
    ],
    noHeadFigure: true,
  },
  {
    id: "char-002", name: "高冷/锋利大模",
    tags: { gender: "女主", era: "现代", age: "青年", style: "酷飒", custom: ["超模", "T台"] },
    description: "高冷超模气质，棱角分明，眼神锐利，时尚大片风格。",
    promptTemplate: "{name}，超模脸，高级时装，冷艳眼神，{style}，专业棚拍，戏剧性布光，时尚杂志封面级",
  },
  {
    id: "char-003", name: "温润型男/暖萌男主",
    tags: { gender: "男主", era: "现代", age: "青年", style: "温婉", custom: ["暖男", "邻家"] },
    description: "温润如玉的青年男性，阳光治愈系，适合青春爱情题材。",
    promptTemplate: "{name}，{gender}，温暖笑容，阳光少年感，日系清新，自然光，生活化场景，胶片质感",
  },
  {
    id: "char-004", name: "清冷干练/职场精英女主",
    tags: { gender: "女主", era: "现代", age: "青年", style: "英气", custom: ["职场", "高管"] },
    description: "都市职场精英女性，干练利落，气场强大，适合商战/职场剧。",
    promptTemplate: "{name}，职业装，精英气质，都市写字楼背景，冷色调，电影构图，精致妆容，自信眼神",
  },
  {
    id: "char-005", name: "古风世子",
    tags: { gender: "男主", era: "古风", age: "青年", style: "英气", custom: ["权谋", "武侠"] },
    description: "古代世家公子/世子，剑眉星目，气宇轩昂，适合古装权谋/武侠。",
    promptTemplate: "{name}，古装男子，汉服/飞鱼服，{era}宫廷或江湖背景，剑眉星目，工笔画风格，古典美学",
  },
  {
    id: "char-006", name: "古风女主",
    tags: { gender: "女主", era: "古风", age: "青年", style: "温婉", custom: ["闺秀", "才女"] },
    description: "古代大家闺秀/才女，端庄典雅，琴棋书画样样精通。",
    promptTemplate: "{name}，古装女子，汉服/襦裙，{era}庭院背景，温婉气质，工笔仕女图风格，柔美光线",
  },
  {
    id: "char-007", name: "黑帮父配/白夜花",
    tags: { gender: "女配", era: "现代", age: "青年", style: "邪魅", custom: ["黑帮", "危险"] },
    description: "危险迷人的反派女配，带刺的玫瑰，亦正亦邪。",
    promptTemplate: "{name}，危险美人，暗黑风格，红唇，烟熏妆，霓虹灯夜景，赛博朋克或黑色电影氛围",
    descriptor: "@white_night：26 岁亚洲女性，冷白皮，丹凤眼上挑，烈焰红唇，右锁骨一枚荆棘纹身，黑西装敞怀露内搭吊带；参考图：脸部特写 + 无头正面全身 + 背面（露纹身）。",
    stateVariants: [
      { key: "wet", label: "雨夜湿身", descriptor: "@white_night_wet：西装湿透贴背、发丝滴水、眼线晕开仍锐利；仅继承 @white_night 的脸与纹身位置，不继承干爽状态。" },
      { key: "blood", label: "负伤染血", descriptor: "@white_night_blood：左腹一道刀伤渗血染红内搭，右手持枪稳定，面部与 @white_night 完全一致。" },
    ],
    geoAnchor: "GEO@white_night 主场：地下酒吧卡座区——吧台在左后、霓虹招牌在右、她常立于中右卡座阴影处；摄像机永不过 180° 轴线，逆光从招牌后打来。",
    noHeadFigure: true,
  },
  {
    id: "char-008", name: "非遗长辈/掌心",
    tags: { gender: "男配", era: "现代", age: "中年", style: "成熟", custom: ["长辈", "权威"] },
    description: "威严又不失慈祥的中年男性长辈，家族/企业掌舵者。",
    promptTemplate: "{name}，中年亚洲男性，威严气质，西装或中山装，书房/办公室背景，暖调侧光，电影肖像",
  },
  {
    id: "char-009", name: "江湖长辈/利奶奶",
    tags: { gender: "女配", era: "现代", age: "老年", style: "成熟", custom: ["长辈", "江湖"] },
    description: "历经沧桑的老年女性，江湖地位崇高，外冷内热。",
    promptTemplate: "{name}，老年亚洲女性，银发，皱纹刻画岁月感，传统服饰或旗袍，深邃眼神，伦勃朗光",
  },
  {
    id: "char-010", name: "反叛长辈/刑侦前辈",
    tags: { gender: "男配", era: "现代", age: "中年", style: "酷飒", custom: ["警察", "硬汉"] },
    description: "经验丰富的刑侦老手，不按常理出牌，外表粗犷内心细腻。",
    promptTemplate: "{name}，中年硬汉，胡茬，夹克或警服，审讯室或案发现场，硬光，黑色电影风格，gritty质感",
  },
  {
    id: "char-011", name: "反叛长辈/刑侦前辈·库珀",
    tags: { gender: "男配", era: "未来", age: "中年", style: "酷飒", custom: ["科幻", "探员"] },
    description: "未来世界的资深探员，赛博义眼，追踪犯罪AI的猎人。",
    promptTemplate: "{name}，赛博朋克侦探，机械义眼，风衣，雨夜霓虹城市，Blade Runner 风格，蓝橙对比色",
  },
  {
    id: "char-012", name: "呆萌",
    tags: { gender: "女主", era: "现代", age: "少年", style: "呆萌", custom: ["元气", "校园"] },
    description: "元气满满的少女，天然呆属性，意外地敏锐。",
    promptTemplate: "{name}，元气少女，大眼睛，丸子头或双马尾，校服，教室或天台背景，动漫写实风格，明亮色彩",
  },
];

/** 获取角色目录（预设 + store 中的自定义） */
function listCharacters(store) {
  const customs = (store.get("characters") || []).filter(Boolean);
  return [...PRESET_CHARACTERS, ...customs];
}

module.exports = { PRESET_CHARACTERS, listCharacters };
