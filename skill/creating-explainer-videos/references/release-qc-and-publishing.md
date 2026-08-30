# Release QC and publishing

## 1. Release states

Use `not_assessed`, `failed`, `release_candidate_pending_human_listen`, or `passed`. A render, a green test, a provider success, or a file named `final.mp4` is not approval. Automation can only create `release_candidate_pending_human_listen`; `passed` requires a named human reviewer and the hash of the fully reviewed candidate.

## 2. Automated gates

Prove:

- expected scene/cue/focus coverage;
- canonical `caption == tts` identity;
- no escaped underscore/symbol speech hazards;
- opening/closing contract for the chosen preset;
- title, label, narration, caption, focus, and action alignment;
- real timing for every cue;
- local deterministic renderer and dedicated cover;
- no scan-line/sweep substitute motion;
- no overflow, clipping, offscreen focus, overlap, excessive occlusion, or contrast blocker;
- full MP4 decode and required video/audio specifications;
- black/freeze/silence diagnostics with human-readable timestamps;
- artifact hashes, representative frames, warning frames, phone preview, and contact sheet.

Run:

```powershell
explainer-video-skill audit <project-dir> --json
explainer-video-skill package <project-dir> --json
```

Default landscape delivery is 1920×1080, 30 fps, H.264, yuv420p, AAC 48 kHz stereo unless the brief specifies another platform contract. Portrait uses a recomposed 1080×1920 project, not a crop.

Detection thresholds triage suspicious ranges; they do not decide artistic acceptability. Review before/during/after evidence for every black/freeze/silence range.

## 3. Visual evidence

Inspect first/final frames, one stable frame per scene, every cue boundary that changes composition, every warning range, longest title/caption/identifier/formula, full cover, phone cover, and contact sheet. Inspect the encoded MP4 because browser screenshots cannot prove fallback fonts, final compositing, compression, or transition debris.

## 4. Human three-pass review

### Muted visual

Check focus, meaningful motion, composition variety, repeated containers, scanning edges, text overflow, clipping, overlap, low contrast, font fallback, dirty transitions, media quality, cover, and mobile readability.

### Audio-only

Check whether the mechanism is understandable without visuals; pronunciation, abbreviations, formulas, numbers, pace, pauses, silence, noise, clipping, music masking, beginning/tail, and accidental words such as “下划线”.

### Normal watch

For each cue answer: what is heard, where should the viewer look, what changes, and what hands off to the next cue? A title or card that describes another part of the mechanism is a blocker even if the animation is attractive.

Record reviewer, complete-listen flag, exact artifact SHA-256, timestamps, severity, decision, and notes. Any incomplete pass prevents `passed`.

## 5. Publishing package

Minimum outputs:

```text
publish/video.mp4
publish/cover.png
publish/cover-mobile-preview.png
publish/contact-sheet.png
publish/publishing.json
qc/media-audit.json
production-state.json
```

Publishing metadata includes a precise `主题：具体问题或核心结论` title, concise description, relevant tags/topics, pinned comment, absolute upload paths for the operator, and optional next-item teaser. Do not add claims, numbers, or scope broader than the reviewed narration.
