# Explainer Video Skill

<p align="center">
  <strong>让 Agent 把知识讲成画面，而不是把文字塞进模板。</strong><br>
  从精确问题到旁白同步的 MP4：过程可执行、可追踪、可复核。
</p>

<p align="center">
  <a href="https://github.com/wzwailr/creating-explainer-videos-skill/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/wzwailr/creating-explainer-videos-skill/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://pypi.org/project/creating-explainer-videos-skill/"><img alt="PyPI" src="https://img.shields.io/pypi/v/creating-explainer-videos-skill"></a>
  <a href="https://github.com/wzwailr/creating-explainer-videos-skill/releases"><img alt="Release" src="https://img.shields.io/github/v/release/wzwailr/creating-explainer-videos-skill"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
</p>

![真实生成的解释视频画面：MoE 专家路由中的分派、计算与合并](https://raw.githubusercontent.com/wzwailr/creating-explainer-videos-skill/main/docs/assets/showcase/hero-s02e16-moe-dispatch.webp)

<p align="center"><sub>真实项目生成画面 · S02E16「MoE 专家路由」· Ink Explainer</sub></p>

给 Agent 一个问题，它不只返回脚本或分镜，而是沿着可执行状态机完成证据、机制图、统一旁白与字幕、语义动画、渲染、质检和发布材料。这套通用脚手架适用于机制、流程、系统、科学与技术科普，不绑定某个系列或题材。

| 交付能力 | 默认保障 |
| --- | --- |
| 从主题生成可运行视频工程 | JSON-first 状态机明确下一步、必需证据和停止条件 |
| 让动画真正解释当前旁白 | 主题视觉 DSL、模板原生结构、cue 级语义动作与连接线 |
| 保持字幕、TTS 与动画同步 | 唯一 canonical 文本、真实音频测量、确定性时间轴 |
| 避免“能渲染就算完成” | 黑屏/静帧/静音/布局/模板结构检查与人工听看门禁 |
| 按团队需要继续扩展 | 可插拔视觉、声音、研究、质检和发布 profile |

它不是 Markdown 提示词合集。包内包含 CLI、项目生成器、生产状态机、主题视觉编译器、TTS 适配器与恢复缓存、HTML/SVG/GSAP 渲染器、HyperFrames/FFmpeg 工具链、三套视觉模板、媒体 QC、扩展 API、打包工具和非 AI 端到端示例。

[English](README.en.md) · [快速开始](#60-秒开始) · [真实画面](#真实生成画面) · [视觉模板集](#视觉模板集) · [v2 迁移指南](docs/MIGRATION_V2.md) · [视觉 DSL](skill/creating-explainer-videos/references/visual-program-dsl.md) · [扩展 API](skill/creating-explainer-videos/references/extension-api.md)

## 60 秒开始

推荐使用 `pipx` 安装独立 CLI：

```powershell
pipx install creating-explainer-videos-skill==2.2.1
explainer-video-skill --version
explainer-video-skill install --target codex --json
explainer-video-skill doctor --json
```

也可以安装到当前 Python 环境：

```powershell
python -m pip install creating-explainer-videos-skill==2.2.1
explainer-video-skill --version
```

Python 入口可在没有 Node.js 时完成 Skill 的安装、更新、校验、回滚、卸载和扩展列表。创建视频工程、模板预览、渲染和媒体命令使用包内同一套 JavaScript runtime，需要 Node.js 22+。

需要 npm 形式时，可从 npm Registry 安装：

```powershell
npm install --global creating-explainer-videos-skill@2.2.1
```

也可以使用 GitHub Release 中同一标签构建并校验过的 tarball。用 `npm view creating-explainer-videos-skill version --registry=https://registry.npmjs.org/` 核验 Registry 的实时公开版本。

安装到 Codex：

```powershell
explainer-video-skill install --target codex --json
explainer-video-skill verify --target codex --json
```

安装到任何支持目录型 `SKILL.md` 的 Agent、仓库或团队目录：

```powershell
explainer-video-skill install --destination "C:\path\to\skills" --json
explainer-video-skill verify --destination "C:\path\to\skills" --json
```

`--destination` 指向 skills 父目录，实际安装目录是 `creating-explainer-videos`。升级、回滚和卸载均保留可恢复备份。

## 直接创建视频工程

```powershell
explainer-video-skill doctor --json
explainer-video-skill templates list --json
explainer-video-skill new ".\my-video" `
  --title "信用卡清算" `
  --topic "为什么授权成功后钱还没有到账" `
  --template spatial-chamber `
  --preset general-mechanism `
  --json
explainer-video-skill status --json ".\my-video"
explainer-video-skill next --json ".\my-video"
```

工程会生成 JSON-first 生产合同、状态机、`visual-program.json`、可运行 renderer、独立 cover、模板资产、旁白/cue 文件、媒体/QC/发布目录。Agent 按以下闭环推进：

```text
status -> next -> 执行真实工作 -> 写入证据 -> validate -> 下一阶段
```

核心阶段：

```text
brief -> evidence -> mechanism_map -> narration_and_cues
-> real_audio_timing -> scene_spec -> runnable_renderer
-> render -> automated_qc -> human_listen
-> publishing_package -> human_release_decision
```

自动化只能生成 `release_candidate_pending_human_listen`。只有人工完整听看过同一个 SHA-256 成片并明确记录决定，才能成为 `passed`。

## 真实生成画面

以下画面来自第 16–18 集的实际视频工程，不是概念稿或 AI 视频模型示意图。它们展示的是同一套“知识对象 → 旁白 cue → 语义动作 → 确定性渲染”方法；系列预设只是通用框架的一种用法。

| S02E17 · Softmax 数值演算 | S02E18 · 线上反馈闭环 |
| --- | --- |
| ![Softmax 数值演算的真实生成画面](https://raw.githubusercontent.com/wzwailr/creating-explainer-videos-skill/main/docs/assets/showcase/s02e17-softmax-explanation.webp) | ![线上反馈闭环的真实生成画面](https://raw.githubusercontent.com/wzwailr/creating-explainer-videos-skill/main/docs/assets/showcase/s02e18-online-feedback.webp) |
| 概率计算、候选分布与错误来源在同一场景中对应讲解。 | 离线评测、小流量实验和反馈回流被组织成可见循环。 |

这些图片用于展示真实视觉输出，不代替对应成片的完整人工听看与发布决定。

## 视觉模板集

| 模板 | 最适合的知识结构 | 核心动作 |
| --- | --- | --- |
| `paper-theatre` | 对象身份、证据、分拣、比较、规则、物理处理 | 剪、折、盖章、堆叠、交接 |
| `spatial-chamber` | 路由、层级、管线、队列、网络、状态迁移 | 镜头纵深、路径飞行、分层变换 |
| `ink-explainer` | 推导、公式、因果关系、比较、纠错、密集讲解 | 手绘、连接、圈注、推导、修正 |

三者是结构和运动语法不同的模板，不是 A/B/C 换色版。每套都包含独立 DOM 指纹、场景 CSS、封面 CSS、时间轴控制器、插件降级和可量化 QC 规则。Spatial Chamber 正式收录了原 B 方案的纵深、路径和空间叙事能力。

主题知识通过同一个受约束的视觉程序进入模板，而不是手改生成后的 HTML：

```powershell
explainer-video-skill visual validate ".\my-video" --json
explainer-video-skill visual compile ".\my-video" --json
explainer-video-skill visual preview ".\my-video" --output ".\preview.html" --json
```

DSL 支持 group、text、node、shape、connector、本地 asset、annotation，采用归一化几何和 cue 相对动作。编译器会把通用语义映射为模板原生 DOM 与运动语法；节点角色或显式 `tone` 会驱动成功、警告、失败、输入、控制器等视觉状态；连接线会从节点边界出发并显示方向。远程资源、路径逃逸、任意 HTML/JavaScript、错误引用、字幕安全区侵入、不可读小框、缺少 cue 动作和空间模板中无意义的孤立节点都会在 build 前被拒绝。v2.0 schema-1 老项目缺少该文件时仍可使用通用 fallback，但不能把 fallback 当成主题化成片。

钉钉进步体/DingTalk Sans 可作为本机显示字体，Noto Sans SC 可作为字幕字体；仓库不分发字体文件。GSAP 商业插件同样不随包分发，每个模板都声明了开源/原生降级路径。

## 旁白、动画与渲染

字幕与 TTS 来自同一个 canonical 字符串。规范化会移除 `\_`、snake_case 下划线和可能被读成符号名的 Markdown 标记。可以让内置适配器生成并测量真实旁白，也可以导入外部测量时轴：

```powershell
explainer-video-skill narration prepare ".\my-video" --json
explainer-video-skill narration adapters --json
python -m pip install edge-tts
explainer-video-skill narration doctor ".\my-video" --adapter edge-tts --json
explainer-video-skill narration synthesize ".\my-video" --adapter edge-tts --voice zh-CN-YunxiNeural --allow-network --json
# 中断后只恢复无效 cue：
explainer-video-skill narration recover ".\my-video" --adapter edge-tts --voice zh-CN-YunxiNeural --allow-network --json
# 或者导入外部真实测量结果：
explainer-video-skill narration import-timing ".\my-video" --timing ".\timing.json" --json
explainer-video-skill build ".\my-video" --json
explainer-video-skill render ".\my-video" --json
explainer-video-skill cover ".\my-video" --json
explainer-video-skill mux ".\my-video" --audio ".\narration.wav" --json
explainer-video-skill audit ".\my-video" --json
explainer-video-skill package ".\my-video" --json
```

`edge-tts` 的未缓存请求需要 `--allow-network`；付费或费用未知的 host adapter 还需要 `--authorize-provider-cost`。每个 cue 按输入/音频哈希缓存，FFmpeg 规范化，ffprobe 回读时长，再重建字幕和动画时间轴。`fixture-tts` 只生成测试音频并被生产门禁拒绝。

最终动画只使用真实测量旁白时间，渲染页使用可暂停、可 seek、确定性的时间轴。canonical、字幕和 TTS 文本必须逐 cue 完全一致；平均 cue 时长不得低于 2.2 秒，机制图中的核心对象必须由旁白 `mechanismRefs` 覆盖。禁止用整屏扫描线、长条扫光或无意义粒子代替知识动作。

媒体审计会验证所选模板的原生指纹、运动选择器、连接线动画和主题封面，并为每个旁白 cue 抽取代表帧；短片联系表至少取 6 帧，较长视频取 12 帧。音频合成默认统一到约 -16 LUFS，减少来源响度差异。自动检查通过仍不等于人工试听与发布批准。

## 预设与扩展

`general-mechanism` 是通用默认预设，而且故意不锁定视觉模板。`ai-principle-series` 只是一个经过真实系列验证的示例预设，AI 不是包的产品身份。

扩展 API v1 支持 `visual`、`voice`、`research`、`qc`、`publishing`。扩展是声明式 JSON/文档/可授权资产，包含权限清单和哈希锁，不允许任意 `hooks`、`scripts` 或 `postinstall`。可执行声音适配器属于审核过的 runtime 或显式 SHA-256 信任的 host command，选择 voice profile 不会自动获得进程、网络、凭据或付费权限。

内置扩展：

- 三个同名视觉 profile；
- `neutral-technical-zh` 中文技术讲解声音规则；
- `primary-source-research` 一手资料证据规则；
- `strict-release-qc` 自动与人工发布门禁；
- `douyin-release` 抖音标题、封面与发布资料规则。

## 示例与验证

包内提供两个带完整主题视觉程序的非 AI fixture：

- `credit-card-clearing`：Spatial Chamber；
- `quantum-tunneling`：Ink Explainer。

```powershell
npm test
npm run smoke:render
npm run examples:verify
python -m unittest discover -s python_tests -v
$env:PYTHONUTF8='1'
python skill\creating-explainer-videos\scripts\test_skill.py
python skill\creating-explainer-videos\scripts\test_extensions.py
npm run pack:local
npm run pack:zip
npm run smoke:packed -- .\dist\creating-explainer-videos-skill-2.2.1.tgz
python -m build --sdist --wheel --outdir .\dist\pypi
python -m twine check .\dist\pypi\*
python .\scripts\audit_python_dist.py .\dist\pypi\*
python .\scripts\smoke_pypi_package.py .\dist\pypi\creating_explainer_videos_skill-2.2.1-py3-none-any.whl
```

CI 覆盖 Windows/Linux、Node.js 22/24 和 Python 分发，并在 Linux + Chrome + FFmpeg 上真正执行 HyperFrames 逐帧渲染、封面截图、音频生成、合成、ffprobe 和媒体质检。发布前还会分别从实际 npm `.tgz` 与 Python wheel 隔离安装，验证主/旧命令、项目脚手架、模板集、Skill 安装/校验/升级/回滚/卸载和全局命令。

## 许可证与安全边界

原创代码和文档采用 [MIT License](LICENSE)。字体、GSAP 商业插件、音乐、音效、图片、视频和供应商凭据不在包内。付费或异步生成必须显式授权、保存任务 ID、先查询既有任务再决定是否重试。

详见 [安全策略](SECURITY.md)、[贡献指南](CONTRIBUTING.md)、[更新记录](CHANGELOG.md) 和 [v2.2.1 Release Notes](docs/releases/v2.2.1.md)。
