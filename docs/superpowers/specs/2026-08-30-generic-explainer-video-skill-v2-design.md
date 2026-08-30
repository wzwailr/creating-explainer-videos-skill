# 通用解释型视频 Skill v2 设计规范

状态：待用户审查  
目标版本：2.0.0  
设计日期：2026-08-30

## 1. 背景与方向纠正

v1 验证了《AI 底层原理图解》系列中的制作方法，但仓库名称、Skill 名称、文案和脚手架都把适用范围错误地限制在 AI 原理视频。v2 要交付的是一套通用的“解释型视频生产系统”：Agent 可以用它制作科学、技术、商业、产品、工程、教育等领域中，需要把机制、流程、状态变化、因果关系或抽象知识讲清楚的短视频。

AI 原理系列保留为经过真实项目验证的示例预设，而不是产品身份。v2 也不能只是若干 Markdown 文档；它必须同时包含 Agent 决策协议、可执行 CLI、通用运行时代码、可组合视觉原语、工具适配器、质量门禁和可复现的端到端示例。

## 2. 目标与非目标

### 2.1 目标

1. 安装后让 Agent 能判断下一步该做什么、调用什么工具、需要哪些输入、怎样证明该阶段完成。
2. 为新项目生成可直接运行和扩展的视频工程，而不是空白 HTML 或文档占位符。
3. 提供通用代码来处理场景模型、时间轴、字幕、旁白时间、视觉原语、封面、渲染、媒体质检与发布打包。
4. 允许扩展视觉方案、声音供应商、研究流程、渲染器、发布平台和质量规则。
5. 保留《AI 底层原理图解》项目中已经验证的制作标准，同时消除系列名称、主题和目录的硬编码。
6. 同时支持 GitHub 安装与 npm Registry 安装，并为 v1 用户提供兼容迁移路径。

### 2.2 非目标

1. 不做“输入一个标题就自动产出顶级创意”的黑盒生成器。语义结构和视觉隐喻仍需要 Agent 判断。
2. 不把所有题材压成相同卡片数量、时长或动画模板。
3. 不内置或再分发受限字体、GSAP 商业插件、音乐、音效、图片或视频素材。
4. 不在未获授权时自动调用付费 TTS、生成式媒体或其他收费服务。
5. 不以自动化检查代替完整人工试听和最终发布决定。

## 3. 产品身份与迁移

| 项目 | v2 名称 | 兼容策略 |
| --- | --- | --- |
| GitHub 仓库 | `creating-explainer-videos-skill` | 仓库就绪后从旧名重命名，GitHub 保留重定向 |
| npm 包 | `creating-explainer-videos-skill` | v2 首次发布；不先发布 AI 专用 v1 |
| Skill 目录/名称 | `creating-explainer-videos` | 旧 Skill 目录只作为迁移入口 |
| 主 CLI | `explainer-video-skill` | 新文档只使用主命令 |
| 兼容 CLI | `ai-principle-video-skill` | 输出迁移提示后转发到同一实现 |
| 通用研究扩展 | `primary-source-research` | 保留 `ai-primary-research` 别名 |
| AI 示例预设 | `ai-principle-series` | 唯一允许保留系列专属默认值的位置 |

v1.1.0 GitHub Release 保留并标注为 Legacy AI-specific，不删除历史资产。v2.0.0 才作为通用版本发布到 GitHub Release 和 npm Registry。

## 4. 总体架构

系统分为两个互相约束的层，而不是把全部责任交给提示词或代码中的任意一方。

### 4.1 Agent 智能层

`SKILL.md` 负责路由、边界和决策循环，详细阶段说明放在按需读取的 references 中。Agent 必须：

1. 读取项目状态和当前阻塞项。
2. 判断题材属于机制、流程、比较、时间演化、状态机、网络关系或混合结构。
3. 选择研究深度、叙事结构、视觉语法、声音方案和质量门禁。
4. 调用 CLI 获取机器可读的下一步动作。
5. 执行获准工具、验证输出、写回证据，然后进入下一状态。
6. 遇到失败时保留证据和重试上下文，不用文字宣称覆盖失败结果。

### 4.2 可执行脚手架层

CLI 和运行时代码负责可重复的工程动作：初始化、状态迁移、数据校验、时间轴生成、字幕生成、旁白时间导入、浏览器渲染、音视频合成、封面导出、媒体审计、发布包生成和安装验证。

Markdown 是人类可读的解释和报告；JSON 契约才是生产状态与渲染输入的可执行事实源。

## 5. Agent 决策循环与状态机

标准阶段为：

```text
discovery
  -> brief
  -> evidence
  -> mechanism_map
  -> narration_and_cues
  -> real_audio_timing
  -> scene_spec
  -> runnable_renderer
  -> render
  -> automated_qc
  -> human_listen
  -> publishing_package
  -> human_release_decision
```

`production-state.json` 记录：

- 当前阶段、上一阶段和时间戳；
- 所有阻塞项及其证据；
- 已选预设、视觉语法、声音适配器、渲染适配器和扩展锁；
- 输入文件、输出文件、内容哈希和工具版本；
- 自动检查结论、人工试听状态和最终人工发布决定；
- 外部任务 ID，避免不明确结果时重复提交付费任务。

核心命令设计：

```text
explainer-video-skill new
explainer-video-skill doctor
explainer-video-skill status --json
explainer-video-skill next --json
explainer-video-skill validate <stage>
explainer-video-skill narration prepare
explainer-video-skill narration import-timing
explainer-video-skill build
explainer-video-skill render
explainer-video-skill cover
explainer-video-skill audit
explainer-video-skill package
explainer-video-skill release record-human-decision
```

`next --json` 返回 `action`、`requiredInputs`、`allowedTools`、`commands`、`successGate`、`blockers` 和 `evidenceToRecord`。Agent 不能仅根据教程自由猜测流程；它需要用这一响应驱动下一步并通过 `validate` 推进状态。

## 6. 通用工程代码

### 6.1 目录结构

```text
package/
  bin/
    explainer-video-skill.mjs
    legacy-ai-principle-video-skill.mjs
  src/
    cli/
    state/
    contracts/
    runtime/
      model/
      timeline/
      captions/
      primitives/
      styles/
      cover/
      audio/
      render/
      media-qc/
      publishing/
    adapters/
    presets/
    extensions/
    installer/
  skill/
    SKILL.md
    references/
    scripts/
    templates/
    assets/
  examples/
  test/
```

### 6.2 场景与提示点模型

公共契约至少包含：

- `EpisodeSpec`：主题、受众、承诺、前后集衔接、平台、画幅与时长策略；
- `SceneSpec`：场景目的、机制步骤、视觉语法、入场/强调/退出动作；
- `NarrationCue`：唯一旁白文本、开始与结束时间、关键词和对应视觉事件；
- `VisualEvent`：目标节点、动作、时间锚点、持续时间、缓动和降级策略；
- `CaptionCue`：从旁白源生成的字幕切片，不允许另写一套文案；
- `AssetRef`：来源、许可、哈希、尺寸、归属和生成任务 ID；
- `QcEvidence`：检查类型、工具版本、输入哈希、结果与证据路径。

字幕与 TTS 使用同一规范化文本源。规范化层必须处理 `\_`、Markdown 标记、代码读法、数字和英文缩写，避免语音把转义符读成“下划线”。

### 6.3 确定性 GSAP 时间轴

运行时提供暂停的确定性时间轴工厂，所有动画锚定到真实 `NarrationCue`，并注册为渲染器可控制的时间轴。核心规则：

- 时间由旁白提示点驱动，不用视觉扫描线粗暴填满整段旁白；
- 优先使用 transform 和 opacity，避免布局抖动；
- 允许嵌套 timeline、stagger、morph/flip 等适配器，但必须声明降级行为；
- 同一输入、版本和种子必须生成相同帧；
- 场景转场时间不得遮挡关键字幕或贯穿整段讲解；
- 动画事件要能追溯到具体机制步骤，而不是只做装饰。

核心只依赖合法可安装的 GSAP 能力；任何需要额外许可的插件由用户项目自行提供，包内不含插件二进制。

### 6.4 通用视觉原语

提供可组合而非题材绑定的运行时组件：

- 流程/管线；
- 分层与拆解；
- 前后对比；
- 时间线与阶段演化；
- 状态机与反馈循环；
- 网络、图与消息传递；
- 矩阵、网格与空间映射；
- 输入—变换—输出；
- 故障、风险与恢复；
- 尺度、指标与比例变化；
- 总结、回扣和下一集预告。

每个原语包含数据契约、DOM/SVG 渲染、可访问标签、GSAP 动画函数、静态降级、边界检查和示例。Agent 可以组合或扩展原语，不应被迫使用固定卡片布局。

### 6.5 视觉模板集与字体

对外不再使用“A/C 方案”作为产品结构，而统一称为“视觉模板集”。首批模板来自已经完成同源旁白、同源字幕和同规格成片对比的三种方案：

| 模板 ID | 模板名称 | 视觉与运动语言 | 适合的知识结构 |
| --- | --- | --- | --- |
| `paper-theatre` | Paper Theatre／纸艺编辑剧场 | 剪纸、撕边、实体卡片、折页、印章、层叠和纸张形变 | 类比、比较、分层、证据拆解、大众科普 |
| `spatial-chamber` | Spatial Chamber／空间数据舱 | 深色空间、透视体积、信号隧道、路径运动、镜头纵深和解码舱 | 管线、网络、数据流、系统状态、强首屏科技感 |
| `ink-explainer` | Ink Explainer／手绘动态图解 | 网格纸、手绘线、批注、逐笔建立关系和板书式推演 | 原理推导、步骤拆解、高知识密度和教学内容 |

`spatial-chamber` 必须完整吸收此前 B 样片的开发资产，而不是只复制一套深色配色。它的模板契约包括：

- 三维透视容器、纵深卡片、空间网格、信号隧道、路径和体积型图表；
- MotionPath 表达实体沿流程移动，DrawSVG 表达关系逐步建立，SplitText 只用于短标题入场，CustomEase 控制镜头和物体惯性；
- 每个路径、镜头推进或空间重排必须对应旁白中的数据流、阶段推进或关系变化；
- 透视中的正文和英文要单独做最小字号、遮挡、对比度和移动端缩略检查；
- 当高级 GSAP 插件缺失或许可不满足时，使用 Core transform/path fallback，并在 `doctor` 和质量报告中明确降级，不得静默丢失知识动作。

三个模板都以相同的 `TemplateManifest` 注册，包含 `tokens`、`primitives`、`motionGrammar`、`coverGrammar`、`fontPolicy`、`capabilities`、`fallbacks`、`fixtures` 和 `qcRules`。CLI 提供 `templates list`、`templates inspect`、`templates preview` 和 `new --template <id>`；第三方可以按相同契约增加模板，而不修改核心代码。

配色、间距、字号、字重、运动幅度、阴影、边框和字幕安全区均由模板 tokens 控制。字体只声明优先级和合法本地安装方式，不打包钉钉进步体等第三方字体。缺少首选字体时必须有经过测量的中文回退栈，并重新运行溢出检测。

### 6.6 声音、封面、渲染与媒体质检

- 声音层提供供应商无关适配器接口、文本规范化、真实时间导入和 FFmpeg 混音命令构建器；测试使用本地固定 WAV/时间文件，生产构建要求真实声音证据。
- 封面由独立 `cover.html` 或等价构图渲染，不截取随机视频帧；系列名、季/集/主题位置由平台和预设规则控制。
- 渲染层负责浏览器发现、隔离 profile、确定性采样、HyperFrames 适配和 FFmpeg 合成。
- 质检层负责 ffprobe 元数据、完整解码、黑帧/冻结/静音/时长/编码检查、关键帧审阅、转场采样、移动端预览和 contact sheet。
- 自动检查只能生成 `release_candidate_pending_human_listen`。只有明确记录人工完整试听和发布决定，状态才允许成为 `passed`。

## 7. 预设与扩展系统

默认预设 `general-mechanism` 只提供通用机制解释的起点。`ai-principle-series` 作为示例预设保存系列的已验证规则，例如集数衔接、研究证据类型、视觉模板选择经验和封面布局，但不能向核心模块写入 AI 文案或目录。视觉模板集与内容预设相互独立：任意题材可以选择三个内置模板，AI 预设也不能把模板固定为某一种。

扩展采用声明式 manifest：

```json
{
  "name": "primary-source-research",
  "version": "1.0.0",
  "capabilities": ["research"],
  "entrypoints": { "guide": "references/research.md" },
  "requires": [],
  "permissions": ["network:read"]
}
```

扩展安装时校验 schema、哈希、兼容版本和权限，写入 `extensions.lock.json`。第一阶段不运行任意第三方 JavaScript hook；需要执行能力的扩展必须通过明确适配器接口和白名单命令，避免“可扩展”演变成任意代码执行。

可扩展维度包括：

- `visuals`：视觉 tokens、原语和转场；
- `voice`：TTS、配音时间与混音；
- `research`：调研问题、证据等级与引用规则；
- `renderers`：浏览器帧渲染器；
- `qc`：自动和人工质量门禁；
- `publishing`：平台标题、封面、说明和文件约束。

## 8. 新建项目输出

`new` 生成的工程至少包含：

```text
project.json
production-state.json
toolchain.json
extensions.lock.json
brief.json
brief.md
evidence/evidence.json
mechanism-map.json
script/narration.json
script/cues.json
storyboard.json
scene-spec.json
renderer/
assets/
.publish/narration-timing.json
renders/
qc/
publish/
```

生成器必须给出一个可运行的参考 composition，包含真实场景契约、时间轴、字幕层和封面构图。它可以使用示例数据帮助启动，但必须明确标记未完成字段，未满足内容和声音门禁时禁止伪装成可发布成片。

## 9. 工具发现与安全边界

`doctor` 检测 Node.js、npm、浏览器、FFmpeg、ffprobe、渲染器、GSAP、字体、声音适配器和可选生成工具，并输出机器可读兼容报告。工具路径通过 `toolchain.json` 或环境发现，不在代码中硬编码个人目录。

付费或异步工具必须：

1. 要求显式授权和费用提示；
2. 保存请求内容、任务 ID 和返回状态；
3. 状态不明确时先轮询已有任务，不重复扣费提交；
4. 不把密钥写入项目、锁文件、测试快照、日志或发布包。

## 10. npm Registry 发布设计

包名暂定并已通过匿名 registry 查询确认当前未被占用：`creating-explainer-videos-skill`。占用状态仍须在正式发布前重新检查。

发布凭据来自用户指定的本机安全凭据源。发布脚本不得输出 token 内容，也不得把凭据位置或凭据复制到仓库。正式发布流程为：

1. 校验工作树、版本、许可证、README、CHANGELOG 和发布说明；
2. 运行完整单元、集成、媒体与安装测试；
3. `npm pack --dry-run` 审计实际入包文件，扫描密钥和个人绝对路径；
4. 从生成的 `.tgz` 安装到全新临时目录，运行两个 CLI、`doctor`、`new` 和参考工程验证；
5. 使用本机凭据执行 `npm whoami`，只记录成功/失败和账号标识，不记录 token；
6. 再次检查包名与目标版本是否可用；
7. 执行带 2FA/OTP 支持的 `npm publish --access public`；
8. 从公开 Registry 安装精确版本，验证包内容、命令、Skill 安装和完整性清单；
9. 创建 GitHub `v2.0.0` Release，附 npm 包、校验和、安装说明与迁移说明。

任何一步失败都停止发布，不允许通过改 registry、跳过测试或泄露凭据来绕过门禁。

## 11. 测试策略

### 11.1 单元与契约测试

- 状态机只允许合法迁移；
- `next --json` 的动作和门禁稳定可解析；
- schema、扩展权限、哈希锁和适配器配置可验证；
- 字幕逐字来自旁白规范化文本；
- 转义下划线不会进入 TTS；
- 时间轴确定性和 cue 边界可验证；
- 字体回退后仍执行文本溢出和字幕安全区检查；
- 三个内置模板均可独立注册、预览、渲染和降级；
- `spatial-chamber` 的路径、纵深、遮挡和最小字号规则可验证；
- 自动质检不能直接写入人工 `passed`。

### 11.2 端到端题材验证

至少提供三类 fixture：

1. 非 AI 流程题材，例如“信用卡清算为什么不是瞬间完成”；
2. 非 AI 科学题材，例如“量子隧穿的概率含义”；
3. AI 题材，例如“注意力机制如何选择上下文”，仅用于验证 `ai-principle-series` 预设。

前两类必须在不引用 AI 预设的情况下完成工程初始化、fixture 声音时间导入、功能性 HTML/SVG 生成、确定性 MP4 渲染、专用封面、自动质检证据和发布包。测试用固定本地音频避免付费；真实生产状态仍停在人工试听之前。

### 11.3 Agent 前向验证

使用全新 Agent 会话和不同领域提示进行黑盒验证。验收重点不是 Agent 能复述文档，而是它是否：

- 正确读取 Skill 与项目状态；
- 调用 `next`、`validate` 和工具适配器；
- 根据知识结构选择不同视觉语法；
- 生成可运行工程和实际媒体证据；
- 遇到缺失输入时报告真实阻塞项；
- 不越过人工试听和发布边界。

### 11.4 安装与兼容测试

- Windows PowerShell 与 Linux shell CI；
- npm 全局、本地、`npx` 和 GitHub tag 安装；
- 自定义 Skill 目标目录；
- 旧命令别名与 v1 配置迁移；
- 发布包无源码外垃圾、密钥、缓存、个人绝对路径或受限资产。

## 12. 发布顺序

1. 在 `v2-generic-scaffold` 分支完成设计、实现和测试。
2. 运行两个非 AI 端到端样例和 AI 预设回归。
3. 完成独立代码审计、安装审计和前向 Agent 验证。
4. 准备仓库重命名、README、迁移指南、CHANGELOG 和 v2 Release notes。
5. 将 GitHub 仓库重命名为通用名称并验证旧链接重定向。
6. 合并并标记 `v2.0.0`，发布 GitHub Release。
7. 使用本机安全凭据发布 npm 包，并从公开 Registry 回装验证。
8. 将 v1.1.0 Release 明确标为 Legacy AI-specific。

若 npm 与 GitHub 发布顺序因为 2FA 或平台限制需要调整，必须确保最终指向同一 commit、同一版本和同一 tarball 内容哈希。

## 13. 完成标准

只有同时满足以下条件，v2 才算完成：

- 核心包、README、CLI 和 Skill 均使用通用产品身份；
- AI 专属内容只存在于示例预设、示例工程或兼容迁移代码中；
- 安装后能生成并运行真实的解释型视频工程；
- 通用运行时代码覆盖模型、时间轴、字幕、视觉原语、声音、封面、渲染、质检与发布；
- 至少两个非 AI 题材端到端样例通过；
- Agent 前向测试证明它会调用脚手架和工具，而非只输出建议；
- 自动质检与人工发布审批边界没有被绕过；
- GitHub 和 npm 的远端安装均通过；
- npm 页面、GitHub 首页、Release notes 和迁移指南对能力与限制的描述真实一致；
- 发布产物不包含密钥、个人路径或无权再分发的资产。

## 14. 已知风险与控制

1. **通用化导致画面模板化**：以语义原语和可组合视觉语法为核心，端到端样例必须使用不同构图，不以换色通过验收。
2. **Agent 只读文档不执行工具**：用状态机、`next --json`、阶段验证和黑盒前向测试约束行为。
3. **通用代码与项目代码耦合**：核心只接受 JSON 契约，AI 规则全部下沉到预设；测试扫描硬编码名称和绝对路径。
4. **模板集退化成三套换色页面**：每个模板必须拥有独立 DOM/SVG 骨架、运动语法、封面语法、题材适配规则和同源对照样例；视觉差异不能只来自 tokens。
5. **第三方许可风险**：不打包字体、媒体和受限插件二进制，只提供适配接口、检测和安装说明。
6. **自动检查冒充发布通过**：状态机禁止自动步骤写入人工决定，发布包保留明确的人工试听门禁。
7. **npm 凭据泄露或错误发布**：凭据只在本地发布时读取；先 pack、临时回装、密钥扫描和 `whoami`，失败即停。
8. **名称迁移破坏旧用户**：保留旧命令转发、旧 GitHub 链接重定向和迁移文档，v1.1.0 不删除。
