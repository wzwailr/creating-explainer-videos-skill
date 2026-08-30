# Release QC and publishing

## 1. Release state model

Use only:

```yaml
release_decision: not_assessed | failed | release_candidate_pending_human_listen | passed
```

- `not_assessed`: required checks are missing.
- `failed`: one or more blockers remain.
- `release_candidate_pending_human_listen`: source, render, and automated media gates passed; human listening/watch is incomplete.
- `passed`: every required automated and human gate passed and a reviewer is named.

The existence of `final.mp4`, provider success, a completed render, or green automated tests does not by itself mean publishable.

## 2. Automated source and page gates

Prove:

- expected scene/cue/focus coverage;
- `caption == tts` for every cue;
- no dangerous spoken code punctuation such as `_`;
- opening and ending chain requirements;
- semantic contract present for every cue;
- real timing covers every cue;
- local deterministic GSAP timeline;
- no debug slug or production label on screen;
- no full-canvas cue sweep/scan edge;
- dedicated cover hierarchy and clean top right;
- no layout, runtime, motion, overflow, offscreen, overlap, or contrast blocker.

Every warning needs a timestamp, before/during/after frames, and a human conclusion.

## 3. Media gates

On Windows:

```powershell
ffprobe -v error -show_format -show_streams -of json renders\candidate.mp4
ffmpeg -v error -i renders\candidate.mp4 -f null NUL
ffmpeg -hide_banner -i renders\candidate.mp4 -vf "blackdetect=d=0.20:pix_th=0.10" -an -f null NUL
ffmpeg -hide_banner -i renders\candidate.mp4 -vf "freezedetect=n=-50dB:d=6.5" -an -f null NUL
ffmpeg -hide_banner -i renders\candidate.mp4 -af "silencedetect=noise=-45dB:d=0.6" -vn -f null NUL
```

Default landscape specification: 1920×1080, 30 fps, H.264, yuv420p, AAC, 48 kHz, stereo. For portrait, use the brief's 1080×1920 specification. A useful audio/video duration tolerance is 0.35 seconds or stricter if the project supports it.

Detection thresholds are triage tools. A designed dark transition, stable conclusion, or sentence pause may be acceptable only after frame/audio review. Do not close a warning with “probably fine”.

## 4. Final-frame evidence

Extract at least:

- first second and final stable frame;
- one stable representative frame per scene;
- every warning's before/during/after frames;
- longest title, caption, English label, and number;
- every scene boundary;
- full cover and phone-size cover preview;
- a contact sheet for repetition and missing-scene review.

The encoded MP4 is authoritative for font fallback, compositing, clipping, dirty transitions, and compression damage.

## 5. Human three-pass review

### Muted visual pass

Check focus, composition variety, meaningful motion, repeated containers, scanning edges, overflow, clipping, overlap, low contrast, dirty frames, fonts, images, cover, and phone readability.

### Audio-only pass

Check whether the mechanism is understandable without visuals; pronunciation; abbreviations; numbers; pauses; silence; noise; clipping; BGM masking; ending tails; and accidental speech such as “下划线”.

### Normal watch

For every cue answer: what is heard, where should the viewer look, what changes, and what is handed to the next cue? Check the opening's immediate topic, the ending's next-episode promise, caption identity, and title/card/focus semantic agreement.

Record timestamps and severity. An unchecked human pass prevents `passed`.

## 6. Publishing package

Minimum:

```text
renders/final.mp4                 # only after passed; candidate.mp4 before that
renders/cover.png
renders/cover-mobile-preview.png
renders/contact-sheet.png
publish-notes.md
release-acceptance.md
```

`publish-notes.md` contains:

- title in `主题：具体问题或核心结论` form;
- concise description;
- 4–6 relevant topics/tags;
- pinned comment;
- absolute upload paths;
- next-episode teaser.

Before delivery, make every local artifact path clickable/absolute in the final response and state the release decision separately from the file list.

