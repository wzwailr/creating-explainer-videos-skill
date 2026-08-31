# Explainer Video Skill

[![CI](https://github.com/wzwailr/creating-explainer-videos-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/wzwailr/creating-explainer-videos-skill/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/pypi/v/creating-explainer-videos-skill)](https://pypi.org/project/creating-explainer-videos-skill/)
[![Release](https://img.shields.io/github/v/release/wzwailr/creating-explainer-videos-skill)](https://github.com/wzwailr/creating-explainer-videos-skill/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一套通用、可安装、可扩展、真正可执行的解释型视频 Agent Skill 与工程脚手架。它适用于机制、流程、系统、科学和技术科普，不绑定某个系列或某类题材。

它不只是几份 Markdown：包内包含生产状态机、项目生成器、旁白规范化、真实音频时轴导入、三套可编程视觉模板、确定性 HTML/SVG/GSAP 渲染器、HyperFrames/FFmpeg 适配、媒体质检、扩展 API、打包工具和非 AI 端到端示例。

[English](README.en.md) · [v2 迁移指南](docs/MIGRATION_V2.md) · [视觉模板集](skill/creating-explainer-videos/references/visual-template-collection.md) · [扩展 API](skill/creating-explainer-videos/references/extension-api.md)

## 一键使用

推荐使用 `pipx` 安装独立 CLI：

```powershell
pipx install creating-explainer-videos-skill==2.0.0
explainer-video-skill --version
```

也可以安装到当前 Python 环境：

```powershell
python -m pip install creating-explainer-videos-skill==2.0.0
explainer-video-skill --version
```

Python 入口可在没有 Node.js 时完成 Skill 的安装、更新、校验、回滚、卸载和扩展列表。创建视频工程、模板预览、渲染和媒体命令使用包内同一套 JavaScript runtime，需要 Node.js 18+。

需要 npm 形式时，可直接安装 GitHub Release 中经过验证的 tarball：

```powershell
npm install --global https://github.com/wzwailr/creating-explainer-videos-skill/releases/download/v2.0.0/creating-explainer-videos-skill-2.0.0.tgz
```

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

工程会生成 JSON-first 生产合同、状态机、可运行 renderer、独立 cover、模板资产、旁白/cue 文件、媒体/QC/发布目录。Agent 按以下闭环推进：

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

## 视觉模板集

| 模板 | 最适合的知识结构 | 核心动作 |
| --- | --- | --- |
| `paper-theatre` | 对象身份、证据、分拣、比较、规则、物理处理 | 剪、折、盖章、堆叠、交接 |
| `spatial-chamber` | 路由、层级、管线、队列、网络、状态迁移 | 镜头纵深、路径飞行、分层变换 |
| `ink-explainer` | 推导、公式、因果关系、比较、纠错、密集讲解 | 手绘、连接、圈注、推导、修正 |

三者是结构和运动语法不同的模板，不是 A/B/C 换色版。每套都包含独立 DOM 指纹、场景 CSS、封面 CSS、时间轴控制器、插件降级和可量化 QC 规则。Spatial Chamber 正式收录了原 B 方案的纵深、路径和空间叙事能力。

钉钉进步体/DingTalk Sans 可作为本机显示字体，Noto Sans SC 可作为字幕字体；仓库不分发字体文件。GSAP 商业插件同样不随包分发，每个模板都声明了开源/原生降级路径。

## 旁白、动画与渲染

字幕与 TTS 来自同一个 canonical 字符串。规范化会移除 `\_`、snake_case 下划线和可能被读成符号名的 Markdown 标记。真实旁白生成后导入测量时轴：

```powershell
explainer-video-skill narration prepare ".\my-video" --json
explainer-video-skill narration import-timing ".\my-video" --timing ".\timing.json" --json
explainer-video-skill build ".\my-video" --json
explainer-video-skill render ".\my-video" --json
explainer-video-skill cover ".\my-video" --json
explainer-video-skill mux ".\my-video" --audio ".\narration.wav" --json
explainer-video-skill audit ".\my-video" --json
explainer-video-skill package ".\my-video" --json
```

最终动画只使用真实测量旁白时间，渲染页使用可暂停、可 seek、确定性的时间轴。禁止用整屏扫描线、长条扫光或无意义粒子代替知识动作。

## 预设与扩展

`general-mechanism` 是通用默认预设，而且故意不锁定视觉模板。`ai-principle-series` 只是一个经过真实系列验证的示例预设，AI 不是包的产品身份。

扩展 API v1 支持 `visual`、`voice`、`research`、`qc`、`publishing`。扩展是声明式 JSON/文档/可授权资产，包含权限清单和哈希锁，不允许任意 `hooks`、`scripts` 或 `postinstall`。

内置扩展：

- 三个同名视觉 profile；
- `neutral-technical-zh` 中文技术讲解声音规则；
- `primary-source-research` 一手资料证据规则；
- `strict-release-qc` 自动与人工发布门禁；
- `douyin-release` 抖音标题、封面与发布资料规则。

## 示例与验证

包内提供两个非 AI fixture：

- `credit-card-clearing`：Spatial Chamber；
- `quantum-tunneling`：Ink Explainer。

```powershell
npm test
npm run examples:verify
python -m unittest discover -s python_tests -v
$env:PYTHONUTF8='1'
python skill\creating-explainer-videos\scripts\test_skill.py
python skill\creating-explainer-videos\scripts\test_extensions.py
npm run pack:local
npm run pack:zip
npm run smoke:packed -- .\dist\creating-explainer-videos-skill-2.0.0.tgz
python -m build --sdist --wheel --outdir .\dist\pypi
python -m twine check .\dist\pypi\*
python .\scripts\audit_python_dist.py .\dist\pypi\*
python .\scripts\smoke_pypi_package.py .\dist\pypi\creating_explainer_videos_skill-2.0.0-py3-none-any.whl
```

CI 覆盖 Windows/Linux、Node.js 18/22 和 Python 分发。发布前会分别从实际 npm `.tgz` 与 Python wheel 隔离安装，验证主/旧命令、项目脚手架、模板集、Skill 安装/校验/升级/回滚/卸载和全局命令。

## 许可证与安全边界

原创代码和文档采用 [MIT License](LICENSE)。字体、GSAP 商业插件、音乐、音效、图片、视频和供应商凭据不在包内。付费或异步生成必须显式授权、保存任务 ID、先查询既有任务再决定是否重试。

详见 [安全策略](SECURITY.md)、[贡献指南](CONTRIBUTING.md)、[更新记录](CHANGELOG.md) 和 [v2.0.0 Release Notes](docs/releases/v2.0.0.md)。
