---
name: creating-ai-principle-videos
description: Use when planning, scripting, animating, rendering, auditing, or packaging a Chinese AI-principle explainer video, especially for the AI 底层原理图解 style with deep mechanism teaching, narration-identical captions, cue-synchronized GSAP or HyperFrames motion, A Paper Theatre or C Ink Explainer visuals, dedicated covers, and short-video publishing assets.
---

# Creating AI Principle Videos

Produce a publishable teaching video, not merely an MP4. Treat content, narration, captions, visual focus, real audio timing, cover, QC evidence, and release state as one traceable system.

## Non-negotiable contract

- Explain the mechanism as `input -> internal change -> output`, with one followable example and at least one cost, boundary, or failure path.
- For a normal deep episode, target 10–11 scenes, 30–45 cues, 1700–2200 Chinese characters, and 300–420 seconds at a natural speaking rate. Add knowledge, never empty pauses or slowed speech, when the episode is too short.
- The first narration sentence must connect the previous episode and state this episode's exact topic. The final sentence must name the next topic and its value or question.
- Use one narration string as the source for both TTS and caption. `caption == tts` character-for-character.
- Never leave `_` or other code punctuation in spoken text when the TTS engine will pronounce the symbol name. Keep code spelling on screen and use natural wording in narration.
- For every cue, bind `scene title + card/mechanism label + narration + visual focus` to the same semantic claim.
- Generate real narration before locking animation. The measured narration timing is the sole animation time base.
- Every narrative animation must explain a transformation, relationship, comparison, risk, or conclusion. Do not use a full-canvas scanning line, hard-edged sweep, or narration-length highlight band to fake motion.
- Generate the cover from a dedicated source. Put the series name at top left and the season/episode label immediately after it; keep the top right clean; show the exact topic.
- A render or passing automation is only a candidate. Say “publishable” only after automated, media, visual, listening, and normal-watch checks are complete and `release_decision: passed` is recorded.

## Workflow

### 1. Discover the workspace

Inspect existing episode generators, shared assets, fonts, GSAP/HyperFrames versions, build commands, tests, and the latest series knowledge map. Reuse stable infrastructure and visual grammar, but never copy an old scene DOM and replace the words.

If no compatible episode structure exists, scaffold one:

```powershell
python <skill-dir>\scripts\scaffold_episode.py <output-dir> `
  --season 2 --episode 19 --topic "推荐系统" --slug recommendation-system `
  --previous "AI 评测" --next "扩散模型" `
  --visual ink-explainer --voice neutral-technical-zh `
  --research ai-primary-research --qc strict-release-qc --publishing douyin-release
```

Read [extension-api.md](references/extension-api.md) before changing a visual, voice, research, QC, or publishing profile. The scaffold copies immutable extension snapshots into the episode and writes `extensions.lock.json`; never silently reinterpret an existing episode with a newer profile.

Do not package or redistribute font binaries, GSAP binaries, music, or third-party assets unless their licenses explicitly allow it.

When moving this workflow to another computer or Agent product, follow [install-and-portability.md](references/install-and-portability.md). The npm package supports both a Codex adapter and a product-neutral `--destination` directory.

### 2. Lock the content contract

Read [content-and-script-contract.md](references/content-and-script-contract.md). Complete `episode.json`, `production-brief.md`, and the cue table before implementing the renderer.

Verify uncertain technical claims against primary sources. Separate verified facts from teaching simplifications and illustrative numbers. Preserve a user-approved recurring series case without adding irrelevant caveats merely to repeat them.

Stop if the topic is broader than the actual explanation, the mechanism chain is incomplete, or the scene count is being used as a substitute for knowledge coverage.

### 3. Author narration and real timing

Write short single-action cues. Generate the natural TTS master, record pronunciation decisions, and export authoritative cue starts and durations. Then regenerate scene boundaries, captions, and animation anchors from that timing.

Run the contract validator during authoring. `plan` requires completed `episode.json`, `production-brief.md`, `script.md`, `storyboard.md`, `animation-map.md`, `visual-direction.md`, and `cover-spec.md`; placeholder text is a failure:

```powershell
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase plan
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase timed
```

### 4. Design and implement semantic motion

Read [visual-systems-and-motion.md](references/visual-systems-and-motion.md). Default to C Ink Explainer for dense mechanism teaching; use A Paper Theatre when object identity and physical processing are the stronger metaphor. Create a new mechanism composition for the episode.

Read [engineering-pipeline.md](references/engineering-pipeline.md) before building. Use deterministic, paused GSAP timelines and local pinned libraries. Anchor actions to real cues. Keep captions stable while the mechanism moves.

For 9:16 requests, recompose the information hierarchy for portrait safe areas. Do not merely crop a 16:9 page. The current series default is 1920×1080 unless the brief says otherwise.

### 5. Build the cover and publishing package

Render `cover.html` or another dedicated cover source independently of the video. Produce both the full-size cover and a phone-size preview. The publishing package must include the video, cover, phone preview, title, description, topics, and pinned comment.

Use the title form `主题：具体问题或核心结论`. Keep the cover topic, production brief, narration scope, and publishing title semantically identical.

### 6. Validate the final media

Read [release-qc-and-publishing.md](references/release-qc-and-publishing.md). Run source tests, layout/runtime checks, a full render, FFprobe/FFmpeg checks, black/freeze/silence detection, representative frames, warning-time frames, and a contact sheet.

Then perform three human passes:

1. Watch muted for composition, animation, text, overflow, cover, and visual repetition.
2. Listen without watching for logic, pronunciation, pauses, mixing, and accidental symbol names.
3. Watch normally cue by cue for title–narration–caption–focus synchronization.

Use `release_candidate_pending_human_listen` when automation passes but human listening/watch remains. Only a named human decision may set `passed`.

### 7. Record reusable learning

After release, add only durable rules in the form `symptom -> root cause -> fix -> verification -> reusable rule`. Keep one-off commands and episode logs out of the shared knowledge asset.

## Required deliverables

- `episode.json`, `production-brief.md`, canonical cue script, animation map, and storyboard
- `extensions.lock.json` plus the selected declarative extension snapshots
- real narration master and authoritative cue timing
- bespoke renderer source and dedicated cover source
- candidate/final MP4, full cover, phone cover preview, and contact sheet
- publish title, copy, topics, and pinned comment
- release acceptance report with evidence paths and an explicit decision

## Stop lines

Do not release when any of these is true: captions differ from narration; the opening or ending chain is missing; a card title and current narration diverge; content is only a concept overview; text clips or becomes unreadable; the renderer contains a repeated full-area scanning edge; fonts or assets lack evidence; the final MP4 is not fully decoded; or required human review is still unassessed.
