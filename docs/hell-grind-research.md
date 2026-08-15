# Hell Grind 深度研究：院线级 AI 长片的工业语法，及 AIMAMAX 落地映射

> 研究对象：Higgsfield 工作室开源项目《Hell Grind》
> 项目地址：https://higgsfield.ai/@higgsfield.studio/projects/hell-grind （免注册可看）
> 研究目的：把一套已被戛纳验证的「全 AI 长片生产方法论」拆解、吸收，并系统性落地到 AIMAMAX Studio 导演台。
> 研究日期：2026-08-16

---

## 0. 一句话结论

AI 视频模型**没有记忆**。一致性不能靠"告诉模型要一致"来实现，而必须靠**外挂系统**：把角色/场景的确定性信息（descriptor 逐字、参考图、状态变体、空间锚点）在**每一个镜头提示词里原样重贴**，并用约束把模型的自由度压到最低。Hell Grind 的本质不是"会写提示词"，而是一套**反脆弱的工程纪律**——给模型更少自由，反而得到更稳定、更电影的结果。

AIMAMAX 已把这套语法拆成 5 个可操作缺口（A–E）全部补完，并以「离线 Demo 装配器 + 零依赖后端」双轨落地，未配密钥也能完整跑通。

---

## 1. 项目概况（为什么值得抄）

| 维度 | 数据 |
|---|---|
| 成片形态 | 95 分钟全 AI 长片 |
| 预算 | ≈ $500K（约 40 万算力 + 10 万人力） |
| 团队 | 15 人 / 14 天 |
| 里程碑 | 戛纳电影市场（Cannes Marché du Film）放映 |
| 生成记录 | 115,446 条 / 108 个文件夹 |
| 含提示词记录 | 41,132 条（其中中文 4,561 条） |
| 提示词体量 | median 16,501 字符 ≈ 3000 词（**极长**，非短句堆砌） |
| 抽卡比 | **64:1**（平均 64 次生成选 1 条入片） |
| 模型栈 | Seedance 2.0 / Soul Cinema / Nano Banana Pro / Seedream 4.5 / GPT Image 2 |

**关键启示**：这不是"一次生成成功"的案例，而是"用海量抽卡 + 严格筛选 + 强约束"堆出来的工业流程。它的可复制性不在某个神奇咒语，而在**流程与纪律**。

---

## 2. 核心诊断：视频模型失忆 → 一致性必须外挂

视频/图像模型对"已生成内容"没有跨镜头记忆。它每次都从零开始，且会：
- 偷偷改变角色脸、服饰、身材比例；
- 偷偷缩小巨物/巨人（无尺度锚点时）；
- 在空场景里随机填人（没写人数时）；
- 丢失上一镜的环境状态。

Hell Grind 的解法是**三支柱 + 两层资产**：

1. **Descriptor（文本描述符）逐字粘贴**——角色/场景的确定性外观写成一段固定文字，每个镜头原样附上，绝不让模型"自行回忆"。
2. **参考图锚定**——把关键帧/三视图作为 init_image 喂回，用视觉而非文字锁一致性。
3. **标签贯穿**——角色名、场景名作为 token 全程不变，避免"同一个角色被模型认成两个人"。
4. **状态拆资产**（@角色_wet / _blood / _injured）——同一角色按"状态"拆成多条 descriptor，雨天湿身、受伤带血分别独立成资产，避免在一镜里既要湿又要血导致模型崩坏。
5. **角色表故意无头全身图**——角色参考图用"无头全身"版本，防止模型被脸部锚定后丢失全身比例与姿态一致性（脸可以单独锚，但身体必须先稳）。

> **对 AIMAMAX 的直接价值**：角色库不能只存"一张美图"，而必须存 **descriptor + 状态变体 + GEO 锚点 + 无头全身图** 四件套。这正是缺口 C 的落点。

---

## 3. 技术底座 12 行（content-agnostic，逐字粘贴）

这是 Hell Grind 最高频出现（单行 8,015 次）的"世界观宪法"。它**与具体剧情无关**，所有镜头逐字粘贴。AIMAMAX 已镜像为 `CINEMATIC_FOUNDATION`（后端 `lib/agents.js` + 前端 `src/lib/agents.ts`），可在 Agent 中心「电影级提示词装配师」一键注入：

```
Style: 8K IMAX. Photorealistic — no 3D render, no game engine, no game-cutscene aesthetic.
Cinematography: Emmanuel Lubezki × Roger Deakins.
Camera: Physical cine lens. 180° shutter motion blur.
Lighting: Natural light only — contre-jour backlight, camera on shadow side, atmospheric haze throughout. Key light from sky and windows only.
Color: 60:30:10 — dominant / secondary / accent.
Skin: Pore-level realism — vellus hair, asymmetric moles, capillary flush, pore-shadow matching on-set light.
Physics: Gravity and inertia respected — mass has real weight, correct contact shadows. No floating props.
Acting: Hollywood — micro-pauses before reactions, precise eye-line, wet living eyes with catch-lights, visible breath and chest rise.
Composition: Rule of thirds + golden ratio. Every person moving from frame one.
Continuity: Characters, props, environment identical across every cut. No identity drift.
Technical: 24fps smooth motion. 8K detail. No jitter.
Audio: Environmental SFX only. No music. No subtitles.
```

**用法纪律**：这 12 行**不要改、不要省**，每条镜头提示词末尾原样追加。它们是"降低模型自由度的宪法"。

---

## 4. 单镜头 7 段骨架（出现率 34%–48%）

每个镜头提示词按固定 7 段结构装配（AIMAMAX 镜像为 `SHOT_SKELETON`，出现率指 Hell Grind 记录中该段的出现频率）：

| # | 段落 | 出现率 | 作用 | AIMAMAX 装配要点 |
|---|---|---|---|---|
| ① | 角色当前状态 | 最高频 | 伤势/衣物破损/表情——模型无记忆，逐镜重述 | 直接消费角色库 descriptor + 选中状态变体 |
| ② | 场景：承接上一镜 | 34% | 本镜从上一镜什么状态接上 | 接 GEO 空间锚点 |
| ③ | 本镜主旨 | 16% | 给模型一个导演意图锚点 | 用户填一句话意图 |
| ④ | GEOMETRY 站位 | 37% | 谁在何处、距离、方向 | 落 GEO 锚点字段 |
| ⑤ | 台词与音效 | 36% | 即便默片也要写风声与脚步 | 写对白/环境音 |
| ⑥ | ACTION + 6 拍 | 48% | 15 秒拆 6 拍，每拍一句 | 动作拆拍器 |
| ⑦ | KEY RULES 硬规则 | 33% | 必须有什么、绝不可出现什么 | 接约束模板 D |

**写作纪律（贯穿 7 段）**：
- 现在时态 / 短句 / 肯定句；
- 写行为不写感受（"她握紧刀"而非"她很害怕"）；
- 微生命法则（呼吸、眨眼、衣角飘动让画面活）；
- 首镜必为全景空镜（建立空间）；
- GEO 空间模块逐镜原样粘贴。

---

## 5. 「给模型更少自由」8 项约束（CINE_CONSTRAINTS）

这是 Hell Grind 方法论的精髓——**约束不是限制创作，而是约束模型的随机性**。AIMAMAX 已实现为可勾选开关（`CINE_CONSTRAINTS`，Agent 中心 cine-prompt 面板）：

| key | 约束 | 为什么 |
|---|---|---|
| corner | 用角落不用整屋 | 「祭坛旁角落」比「整个大厅」更易一致 |
| anchor | 锚点绑走位 | 用柱子/沙发/祭坛锁定人物位置，防漂移 |
| one-action | 一镜一动作 | 复杂动作拆镜，不在镜头中途炸开 |
| crowd-count | 人群标人数 | 必须写「20+ 人」，否则模型随机填人 |
| axis-180 | 180° 轴线 | 摄像机永不越轴，避免跳轴 |
| scale-anchor | 尺度锚点 | 巨人/巨物每镜写尺度参照，防偷偷缩小 |
| furniture-ban | 家具禁令 | 列出本镜绝不可出现的家具/道具 |
| geo-anchor | GEO 空间模块 | 场景空间布局逐镜原样粘贴 |

---

## 6. 外部记忆系统（一致性工程的总架构）

Hell Grind 把"记忆"从模型内搬到模型外，形成 4 类外部资产：

1. **Descriptor 库**：角色/场景/道具的固定文本描述符，版本化维护。
2. **参考图库**：三视图、无头全身图、关键帧，作 init_image。
3. **角色表（无头全身）**：专门用于身体一致性，脸单独锚。
4. **GEO 空间模块**：场景的平面/立体布局描述，逐镜粘贴，保证走位连续。

> AIMAMAX 的角色库（`src/lib/characters.ts`）已升级为承载这 4 类的载体：`descriptor` / `stateVariants` / `geoAnchor` / `noHeadFigure` 四字段，并已在 char-001（甜辣少女）、char-007（白夜花）补全示范数据。

---

## 7. 数据洞察（从 115,446 条记录反推的方法论）

- **长提示词胜短提示词**：median 16,501 字符（≈3000 词）。AIMAMAX 的 cine-prompt 装配器默认产出长结构化提示词，方向正确。
- **中文语料可作 few-shot**：4,561 条中文提示词是现成的「中文电影提示词范例库」，可喂给提示词工程师 agent 做 in-context learning。
- **抽卡比 64:1 是底线不是上限**：批量生成 + 评分选优不是"可选优化"，而是成片质量的硬门槛。AIMAMAX 的「多抽选优」工作流（缺口 E）把这变成一键操作。

---

## 8. AIMAMAX 落地映射（5 缺口已全补完 ✅）

| 缺口 | 内容 | ROI | 落地位置 | 状态 |
|---|---|---|---|---|
| **A** | 12 行底座做「电影级提示词基座」预设，一键注入 | 最高 | `CINEMATIC_FOUNDATION` + Agent 中心 cine-prompt 面板「电影级基座」可折叠区（12 行可复制 + 约束 chips） | ✅ |
| **B** | 分镜导演 agent 加「自动拼 7 段镜头提示词」模式 | 高 | `SHOT_SKELETON` 7 段结构化表单 + `buildCinePrompt()` 离线装配器（中英双语） | ✅ |
| **C** | 角色库升级：无头全身图 + 状态拆资产 + GEO 空间锚点节点 | 高 | `Character.descriptor/stateVariants/geoAnchor/noHeadFigure`；角色详情面板状态 tabs / GEO 块 / 复制带状态资产 | ✅ |
| **D** | 约束模板（角色计数/家具禁令/180°轴线）开关 | 中 | `CINE_CONSTRAINTS` 8 项可勾选，装配时注入 KEY RULES | ✅ |
| **E** | 抽卡比管理：一镜多抽 + 评分选优 | 高 | `src/canvas/BatchGen.tsx` 多抽选优弹窗：并发抽卡 + 5 星评分 + 选为成片回写画布 generator 节点 | ✅ |

配套后端（零依赖 Node，`server/lib/agents.js` + `characters.js`）：同步导出 `CINEMATIC_FOUNDATION / SHOT_SKELETON / CINE_CONSTRAINTS` 与 `cine-prompt` agent（含 demo 离线装配），已部署至 `~/aimamax-api/lib/` 并重启验证（本地跑通：agents count=16、cine-prompt demo 装配 7 段、characters total=12）。

**双轨保障**：无论是否配置后端 / ToAPIs 密钥，前端 `buildCinePrompt()` 与 `localDemo` 离线装配器都能产出完整电影级提示词，平台"开箱即用、永不白屏"。

---

## 9. 可复制的 SOP（导演台操作手册）

**标准成片镜头生产流程**（在 AIMAMAX Studio 内闭环）：

1. **建角色资产**：在「角色库」录入 `descriptor` + 至少 2 个 `stateVariants`（如 wet/blood）+ `geoAnchor` + 无头全身图；点「复制带状态资产」。
2. **装配基座**：在「Agent 中心 → 电影级提示词装配师」，展开「电影级基座」，确认 12 行已注入；勾选所需约束（角落/锚点/人数/轴线…）。
3. **填 7 段骨架**：逐段写 ①角色当前状态（粘贴 descriptor+选中状态）②承接 ③主旨 ④GEOMETRY ⑤台词音效 ⑥ACTION 6 拍 ⑦硬规则；点「装配成片提示词」。
4. **多抽选优**：在画布点「多抽选优」，选 4–8 次并发抽卡，5 星评分，选最优「选为成片」回写 generator 节点。
5. **连贯成片**：用 3D 导演台 / 分镜故事板条把选中镜头按 GEO 锚点拼接，保证走位连续。

> 心法：**简化镜头、不简化文字**。一个镜头只做一件事，但文字必须长到把模型"焊死"在你要的画面里。

---

## 10. 已知 Gap & 后续动作（诚实记录）

- **后端公开路由未打通**：`api.ninedeerselect.com` 当前无 DNS 记录、无 Hostinger 子域 docroot（`~/domains/api.ninedeerselect.com` 不存在），后端 `~/aimamax-api` 已部署代码但未对公网开放。前端默认 `settings.apiBase=""`，故线上实际走"前端离线 Demo + 直连供应商"路径，不受此影响。
  - **需用户操作（hPanel）**：在 Hostinger 建子域 `api.ninedeerselect.com` → 文档根指向 `~/aimamax-api`（Node/Passenger）→ DNS A 记录指向服务器 IP `195.179.237.6`。建好后后端 `cine-prompt` 真实代理 + `/api/v1/characters` 自定义角色持久化即生效。
- **真实 ToAPIs 密钥**：后端 `DEMO_MODE = !TOAPIS_KEY`，配 `TOAPIS_KEY` 环境变量即切真实模型（不耗前端额度，密钥在后端保管，符合用户"不在开发期耗第三方额度"纪律）。
- **中文 few-shot 语料（已落地引擎，2026-08-16）**：**没有官方下载文件**——4,561 条只是第三方分析师对 41,083 条公开提示词的统计数字，全在网页逐条浏览。因此**未伪造**该语料，而是落地了一套可插拔 few-shot 引擎：
  - 后端 `server/lib/prompt-corpus.js`：手工构建 **14 条**遵循 Hell Grind 方法论的高质量中文电影提示词种子范例（覆盖雨夜天台/训练室对峙/博物馆/小巷追逐/医院/巨物/童年闪回/黎明海边/酒吧/战斗/车内/楼梯/祭坛/黎明街头），CJK unigram+bigram 关键词检索 top-5，按 agent 分类只在「提示词工程」类注入（`getFewShot` + `buildFewShotBlock`）。
  - 外部真实语料加载口：环境变量 `PROMPT_CORPUS_FILE` 指向导出 JSON 数组即自动合并进语料库（`CORPUS_SIZE` 实时反映）。若日后你从 Hell Grind 导出真实中文提示词 JSON，指向它即生效，**无需改代码**。
  - 前端镜像：`src/lib/agents.ts` 的 `ZH_FEWSHOT_SEED` 与后端种子一致，即使无后端也展示真范例；`Agents.tsx` 新增「中文范例参考」可折叠面板 + 「范例注入 · N/M」徽标（仅提示词工程类显示）。
  - 诚实标注：种子范例为 AIMAMAX 团队按方法论手工构建，**非 Hell Grind 原片逐字**。
  - 验证：本地跑通 `prompt-master`/`cine-prompt` → `corpusSize=14, used=5`；`screenwriter`（非提示词工程）→ `used=0`（正确不注入）；线上 SPA bundle `index-DB190AC7.js` 含「中文范例参考」「范例注入」字符串，HTTP 200。

---

## 11. 总结：5 条核心可迁移原则

1. **一致性外挂，不靠模型记忆**——descriptor 逐字 + 参考图 + 标签贯穿。
2. **给模型更少自由**——角落代房间、锚点绑走位、一镜一动作、人群标人数、GEO 空间模块。
3. **长提示词 + 结构化骨架**——7 段骨架 + 12 行底座，median 3000 词。
4. **抽卡比 64:1 是质量门槛**——批量生成 + 评分选优是标配，不是奢侈。
5. **状态拆资产**——同一角色按湿/血/伤拆成独立 descriptor，避免一镜多状态崩坏。

AIMAMAX Studio 已把以上 5 条变成产品内的按钮与字段，而非文档里的建议。
