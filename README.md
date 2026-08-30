# AI 底层原理图解视频 Skill

[![CI](https://github.com/wzwailr/creating-ai-principle-videos-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/wzwailr/creating-ai-principle-videos-skill/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/wzwailr/creating-ai-principle-videos-skill)](https://github.com/wzwailr/creating-ai-principle-videos-skill/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一套可安装、可扩展、与 Agent 产品无关的视频生产 Skill，用来制作真正讲清楚机制的中文 AI 原理动画视频。

它不是“套模板换文字”，而是把选题调研、知识闭环、统一旁白与字幕、真实音频时轴、语义动画、封面、媒体质检和发布资料组织成一条可验证的生产流水线。

[English](README.en.md) · [最新版本](https://github.com/wzwailr/creating-ai-principle-videos-skill/releases/latest) · [扩展规范](skill/creating-ai-principle-videos/references/extension-api.md)

## 它解决什么问题

- 用 `输入 → 内部变化 → 输出` 讲清 AI 机制，而不是停留在概念卡片。
- 字幕与旁白使用同一个字符串，避免文案、口播、标题和画面各讲各的。
- 动画由真实旁白时轴驱动，每个 cue 都对应一个可见的知识动作。
- 通过自动检查、静音观看、纯听旁白和正常观看四层门槛判断能否发布。
- 视觉、声音、调研、QC、发布平台都可通过声明式扩展替换。

## 一条命令安装

当前推荐直接从 GitHub 安装，不需要 npm Registry。

安装到 Codex：

```powershell
npx --yes --package github:wzwailr/creating-ai-principle-videos-skill `
  ai-principle-video-skill install
```

安装到任意支持目录型 `SKILL.md` 的 Agent、团队仓库或自定义 skills 目录：

```powershell
npx --yes --package github:wzwailr/creating-ai-principle-videos-skill `
  ai-principle-video-skill install --destination "C:\path\to\agent\skills"
```

也可以下载 [Release](https://github.com/wzwailr/creating-ai-principle-videos-skill/releases/latest) 中的 `.tgz`：

```powershell
npx --yes --package ".\creating-ai-principle-videos-skill-1.1.0.tgz" `
  ai-principle-video-skill install --destination "C:\path\to\agent\skills"
```

> `--destination` 指向 skills 父目录；安装器会自动追加 `creating-ai-principle-videos`。Codex 只是一个便捷适配器，不是唯一宿主。

## 生命周期命令

```powershell
ai-principle-video-skill verify --destination "C:\path\to\agent\skills"
ai-principle-video-skill list-extensions --destination "C:\path\to\agent\skills"
ai-principle-video-skill doctor
ai-principle-video-skill update --destination "C:\path\to\agent\skills"
ai-principle-video-skill rollback --destination "C:\path\to\agent\skills"
ai-principle-video-skill uninstall --destination "C:\path\to\agent\skills"
```

升级与卸载前都会保留可恢复备份。`verify` 会检查包内 SHA-256 文件清单，发现篡改、缺失或多余文件时返回失败。

## 内置扩展

| 类型 | 扩展 | 用途 |
| --- | --- | --- |
| visual | `ink-explainer` | C · Ink Explainer 手绘动态图解 |
| visual | `paper-theatre` | A · Paper Theatre 纸艺编辑剧场 |
| voice | `neutral-technical-zh` | 中文中性技术讲师与发音规则 |
| research | `ai-primary-research` | 一手资料、事实表与时效验证 |
| qc | `strict-release-qc` | 媒体、视觉、听感与发布决策门槛 |
| publishing | `douyin-release` | 抖音标题、封面、文案和置顶评论 |

扩展 API v1 是纯声明式的：允许 JSON profile、参考文档和资产，不执行扩展脚本、不保存凭证。每一集都会生成 `extensions.lock.json` 并复制扩展快照，Skill 升级不会悄悄改变旧项目。

## 开始制作一集

安装后可以让 Agent 显式使用 `$creating-ai-principle-videos`，也可以直接运行脚手架：

```powershell
python <skill-dir>\scripts\scaffold_episode.py <output-dir> `
  --season 2 --episode 19 --topic "推荐系统" --slug recommendation-system `
  --previous "AI 评测" --next "扩散模型" `
  --visual ink-explainer --voice neutral-technical-zh `
  --research ai-primary-research --qc strict-release-qc --publishing douyin-release
```

生成的是“生产合同”，不是空壳成片。完成知识、旁白和 cue 后依次验证：

```powershell
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase plan
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase timed
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase candidate
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase release
```

只有人工听看完成且 `release_decision: passed` 时，才能称为可发布。

## 工具与许可证边界

本仓库不分发字体、GSAP 商业插件、音乐、音效、图片或视频素材。宿主需要自行准备合法资产，并在剧集项目中记录来源、许可证、版本和哈希。

计划与合同验证最低需要 Python 3.10。完整渲染通常还需要 Node.js、Chrome/Chromium、FFmpeg/FFprobe、可复现 TTS，以及合法安装的字体和动画库。

## 开发与验证

```powershell
npm test
$env:PYTHONDONTWRITEBYTECODE='1'
python skill\creating-ai-principle-videos\scripts\test_skill.py
python skill\creating-ai-principle-videos\scripts\test_extensions.py
npm run pack:local
npm run pack:zip
npm run smoke:packed -- .\dist\creating-ai-principle-videos-skill-1.1.0.tgz
```

更多内容见 [贡献指南](CONTRIBUTING.md)、[安全说明](SECURITY.md) 和 [更新记录](CHANGELOG.md)。

## License

代码和本仓库原创文档采用 [MIT License](LICENSE)。第三方字体、GSAP、音乐及其他媒体资产不包含在授权范围内。
