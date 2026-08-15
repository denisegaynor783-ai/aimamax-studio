// ============================================================
// AIMAMAX Studio — 角色库数据模型与持久化层
// 参考 LibTV 角色库：多角度参考图 / 标签筛选 / 应用至画布
// 持久化：IndexedDB（自定义角色）+ 内置预设（离线可用）
// ============================================================

// ── 角色标签维度 ──
export type CharGender = "女主" | "男主" | "女配" | "男配" | "中性";
export type CharEra = "现代" | "古风" | "未来" | "民国" | "奇幻";
export type CharAge = "少年" | "青年" | "中年" | "老年";
export type CharStyle = "甜美" | "酷飒" | "温婉" | "英气" | "邪魅" | "清纯" | "成熟" | "呆萌";

export interface CharacterTags {
  gender?: CharGender;
  era?: CharEra;
  age?: CharAge;
  style?: CharStyle;
  /** 自由标签（如 "学霸"、"霸总"、"杀手"） */
  custom?: string[];
}

// ── 角色图片组（参考 LibTV 多角度参考图） ──
export interface CharImages {
  /** 全身立绘（正面站姿） */
  fullBody?: string;
  /** 肖像/大头照 */
  portrait?: string;
  /** 多角度面部网格（3×3 或更多，用于一致性参考） */
  multiAngle?: string[];
  /** 侧面/背面全身 */
  sideViews?: string[];
  /** 表情变体（喜怒哀乐等） */
  expressions?: string[];
}

// ── 角色状态变体（Hell Grind「状态拆资产」：@角色_wet / @角色_blood 独立资产） ──
export interface CharStateVariant {
  /** 状态键，如 wet / blood / alternate */
  key: string;
  /** 展示名，如「湿身」「带血迹」「换装」 */
  label: string;
  /** 该状态下的文本描述符（独立资产，逐字粘贴） */
  descriptor: string;
}

// ── 角色 ──
export interface Character {
  id: string;
  name: string;
  tags: CharacterTags;
  images: CharImages;
  /** 角色描述 / 性格 / 背景 */
  description: string;
  /** AI 生图提示词模板（含 {name} 占位） */
  promptTemplate?: string;
  /**
   * 角色文本描述符（descriptor，Hell Grind 外部记忆核心）：
   * 一段「不可缩写、每次逐字粘贴」的 canonical 文字 + 参考图锚点。
   */
  descriptor?: string;
  /**
   * 状态拆资产：把「潮湿/受伤/换装」拆成独立资产，避免模型在镜间随机拼装。
   * 如 @roco_wet / @roco_blood。
   */
  stateVariants?: CharStateVariant[];
  /**
   * GEO 空间锚点（场景型角色/地点资产）：逐镜原样粘贴的空间布局文字。
   * 例：祭坛在中右、仪式中心在中左、逆光从平台后打来、摄像机永不越 180° 轴线。
   */
  geoAnchor?: string;
  /** 无头全身图锚点说明：远景逼模型只从高清特取脸，避免全身小图捞模糊脸 */
  noHeadFigure?: boolean;
  /** 创建时间 */
  createdAt: number;
  /** 最后使用时间（排序用） */
  lastUsedAt?: number;
  /** 是否为用户自建（非预设） */
  custom: boolean;
}

// ── 筛选条件 ──
export interface CharFilter {
  gender?: CharGender;
  era?: CharEra;
  style?: CharStyle;
  query?: string; // 搜索名/描述
}

// ── 内置预设角色库（离线可用，参考截图风格） ──
export function builtinCharacters(): Character[] {
  const now = Date.now();
  return [
    {
      id: "char-001",
      name: "甜辣/清新少女",
      tags: { gender: "女主", era: "现代", age: "青年", style: "甜美", custom: ["校园", "初恋感"] },
      images: {},
      description: "甜辣/清新少女，详见角色全身图、面部特写。表情九宫格与人物呈现。",
      promptTemplate: "{name}，{style}风格，{era}背景，{age}，高清人像摄影，柔和自然光，浅景深，8K画质",
      descriptor: "@sweet_girl：18 岁亚洲少女，齐肩栗色微卷发，杏眼带卧蚕，左颊一颗对称小痣，身高 162cm 匀称；校园初恋感，蜜桃色唇釉；服装：百褶校服裙+宽松针织开衫；参考图：脸部特写（取脸唯一来源）+ 无头正面全身 + 背面全身。",
      stateVariants: [
        { key: "wet", label: "淋雨湿身", descriptor: "@sweet_girl_wet：开衫与发梢滴水，布料贴肤透出轮廓，睫毛挂水珠，仍保持杏眼与左颊小痣一致；仅继承 @sweet_girl 的脸与身材，不继承干发状态。" },
        { key: "blood", label: "擦伤带血", descriptor: "@sweet_girl_blood：右膝破皮渗血、手背一道抓痕，校服裙下摆沾泥；面部与 @sweet_girl 完全一致，伤在四肢不在脸。" },
      ],
      noHeadFigure: true,
      createdAt: now - 86400000 * 7,
      custom: false,
    },
    {
      id: "char-002",
      name: "高冷/锋利大模",
      tags: { gender: "女主", era: "现代", age: "青年", style: "酷飒", custom: ["超模", "T台"] },
      images: {},
      description: "高冷超模气质，棱角分明，眼神锐利，时尚大片风格。",
      promptTemplate: "{name}，超模脸，高级时装，冷艳眼神，{style}，专业棚拍，戏剧性布光，时尚杂志封面级",
      createdAt: now - 86400000 * 6,
      custom: false,
    },
    {
      id: "char-003",
      name: "温润型男/暖萌男主",
      tags: { gender: "男主", era: "现代", age: "青年", style: "温婉", custom: ["暖男", "邻家"] },
      images: {},
      description: "温润如玉的青年男性，阳光治愈系，适合青春爱情题材。",
      promptTemplate: "{name}，{gender}，温暖笑容，阳光少年感，日系清新，自然光，生活化场景，胶片质感",
      createdAt: now - 86400000 * 5,
      custom: false,
    },
    {
      id: "char-004",
      name: "清冷干练/职场精英女主",
      tags: { gender: "女主", era: "现代", age: "青年", style: "英气", custom: ["职场", "高管"] },
      images: {},
      description: "都市职场精英女性，干练利落，气场强大，适合商战/职场剧。",
      promptTemplate: "{name}，职业装，精英气质，都市写字楼背景，冷色调，电影构图，精致妆容，自信眼神",
      createdAt: now - 86400000 * 4,
      custom: false,
    },
    {
      id: "char-005",
      name: "古风世子",
      tags: { gender: "男主", era: "古风", age: "青年", style: "英气", custom: ["权谋", "武侠"] },
      images: {},
      description: "古代世家公子/世子，剑眉星目，气宇轩昂，适合古装权谋/武侠。",
      promptTemplate: "{name}，古装男子，汉服/飞鱼服，{era}宫廷或江湖背景，剑眉星目，工笔画风格，古典美学",
      createdAt: now - 86400000 * 3,
      custom: false,
    },
    {
      id: "char-006",
      name: "古风女主",
      tags: { gender: "女主", era: "古风", age: "青年", style: "温婉", custom: ["闺秀", "才女"] },
      images: {},
      description: "古代大家闺秀/才女，端庄典雅，琴棋书画样样精通。",
      promptTemplate: "{name}，古装女子，汉服/襦裙，{era}庭院背景，温婉气质，工笔仕女图风格，柔美光线",
      createdAt: now - 86400000 * 2,
      custom: false,
    },
    {
      id: "char-007",
      name: "黑帮父配/白夜花",
      tags: { gender: "女配", era: "现代", age: "青年", style: "邪魅", custom: ["黑帮", "危险"] },
      images: {},
      description: "危险迷人的反派女配，带刺的玫瑰，亦正亦邪。",
      promptTemplate: "{name}，危险美人，暗黑风格，红唇，烟熏妆，霓虹灯夜景，赛博朋克或黑色电影氛围",
      descriptor: "@white_night：26 岁亚洲女性，冷白皮，丹凤眼上挑，烈焰红唇，右锁骨一枚荆棘纹身，黑西装敞怀露内搭吊带；参考图：脸部特写 + 无头正面全身 + 背面（露纹身）。",
      stateVariants: [
        { key: "wet", label: "雨夜湿身", descriptor: "@white_night_wet：西装湿透贴背、发丝滴水、眼线晕开仍锐利；仅继承 @white_night 的脸与纹身位置，不继承干爽状态。" },
        { key: "blood", label: "负伤染血", descriptor: "@white_night_blood：左腹一道刀伤渗血染红内搭，右手持枪稳定，面部与 @white_night 完全一致。" },
      ],
      geoAnchor: "GEO@white_night 主场：地下酒吧卡座区——吧台在左后、霓虹招牌在右、她常立于中右卡座阴影处；摄像机永不过 180° 轴线，逆光从招牌后打来。",
      noHeadFigure: true,
      createdAt: now - 86400000 * 1,
      custom: false,
    },
    {
      id: "char-008",
      name: "非遗长辈/掌心",
      tags: { gender: "男配", era: "现代", age: "中年", style: "成熟", custom: ["长辈", "权威"] },
      images: {},
      description: "威严又不失慈祥的中年男性长辈，家族/企业掌舵者。",
      promptTemplate: "{name}，中年亚洲男性，威严气质，西装或中山装，书房/办公室背景，暖调侧光，电影肖像",
      createdAt: now - 86400000 * 0.5,
      custom: false,
    },
    {
      id: "char-009",
      name: "江湖长辈/利奶奶",
      tags: { gender: "女配", era: "现代", age: "老年", style: "成熟", custom: ["长辈", "江湖"] },
      images: {},
      description: "历经沧桑的老年女性，江湖地位崇高，外冷内热。",
      promptTemplate: "{name}，老年亚洲女性，银发，皱纹刻画岁月感，传统服饰或旗袍，深邃眼神，伦勃朗光",
      createdAt: now - 3600000 * 12,
      custom: false,
    },
    {
      id: "char-010",
      name: "反叛长辈/刑侦前辈",
      tags: { gender: "男配", era: "现代", age: "中年", style: "酷飒", custom: ["警察", "硬汉"] },
      images: {},
      description: "经验丰富的刑侦老手，不按常理出牌，外表粗犷内心细腻。",
      promptTemplate: "{name}，中年硬汉，胡茬，夹克或警服，审讯室或案发现场，硬光，黑色电影风格， gritty质感",
      createdAt: now - 3600000 * 6,
      custom: false,
    },
    {
      id: "char-011",
      name: "反叛长辈/刑侦前辈·库珀",
      tags: { gender: "男配", era: "未来", age: "中年", style: "酷飒", custom: ["科幻", "探员"] },
      images: {},
      description: "未来世界的资深探员，赛博义眼，追踪犯罪AI的猎人。",
      promptTemplate: "{name}，赛博朋克侦探，机械义眼，风衣，雨夜霓虹城市， Blade Runner 风格，蓝橙对比色",
      createdAt: now - 3600000 * 3,
      custom: false,
    },
    {
      id: "char-012",
      name: "呆萌",
      tags: { gender: "女主", era: "现代", age: "少年", style: "呆萌", custom: ["元气", "校园"] },
      images: {},
      description: "元气满满的少女，天然呆属性，意外地敏锐。",
      promptTemplate: "{name}，元气少女，大眼睛，丸子头或双马尾，校服，教室或天台背景，动漫写实风格，明亮色彩",
      createdAt: now - 3600000,
      custom: false,
    },
  ];
}

// ── IndexedDB 持久化键 ──
const DB_NAME = "aimamax-studio-db";
const STORE_CHARS = "characters";
const DB_VER = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHARS)) {
        db.createObjectStore(STORE_CHARS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── CRUD 操作 ──

/** 获取全部角色（预设 + 自定义） */
export async function listCharacters(): Promise<Character[]> {
  const builtins = builtinCharacters();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CHARS, "readonly");
    const store = tx.objectStore(STORE_CHARS);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const customs = (req.result as Character[]) || [];
        resolve([...builtins, ...customs]);
      };
      req.onerror = () => resolve(builtins);
    });
  } catch {
    return builtins;
  }
}

/** 保存/更新自定义角色 */
export async function saveCharacter(char: Character): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHARS, "readwrite");
  tx.objectStore(STORE_CHARS).put({ ...char, custom: true });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 删除自定义角色（预设不可删） */
export async function deleteCharacter(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHARS, "readwrite");
  tx.objectStore(STORE_CHARS).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 更新最后使用时间 */
export async function touchCharacter(id: string): Promise<void> {
  const all = await listCharacters();
  const c = all.find((x) => x.id === id);
  if (c) await saveCharacter({ ...c, lastUsedAt: Date.now() });
}

/** 按筛选条件过滤 */
export function filterCharacters(chars: Character[], f: CharFilter): Character[] {
  let result = chars;
  if (f.gender) result = result.filter((c) => c.tags.gender === f.gender);
  if (f.era) result = result.filter((c) => c.tags.era === f.era);
  if (f.style) result = result.filter((c) => c.tags.style === f.style);
  if (f.query?.trim()) {
    const q = f.query.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.custom?.some((t) => t.toLowerCase().includes(q))
    );
  }
  return result;
}
