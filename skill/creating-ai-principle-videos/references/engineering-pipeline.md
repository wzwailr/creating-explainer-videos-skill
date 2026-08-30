# Engineering pipeline

## 1. Portable toolchain

Preferred programmable path:

- HTML/CSS/SVG for composition;
- GSAP with locally pinned compatible core/plugins;
- HyperFrames or an equivalent deterministic browser renderer;
- Edge TTS or another reproducible TTS engine;
- FFmpeg and FFprobe for composition and media checks;
- Chrome/Chromium with a fixed executable path when bundled browser launch is unstable.

The known reference stack uses HyperFrames 0.8.15 and GSAP 3.15.0. Treat these as compatibility pins, not promises that they are the latest versions. Upgrade only after a small render, plugin, seek, font, and full-decode regression passes.

## 2. Canonical data flow

```text
verified facts + episode brief
  -> canonical cue rows
  -> TTS files and narration master
  -> authoritative narration timing
  -> regenerated scene/caption/timeline data
  -> episode-specific DOM/SVG/GSAP renderer
  -> deterministic browser frames
  -> narration/BGM/SFX mix
  -> candidate MP4
  -> automated + human release gates
```

There must be one content source. Never maintain a separate shortened subtitle script.

## 3. Expected episode files

```text
episode.json
extensions.lock.json
extensions/<selected-extension-id>/
production-brief.md
script.md
storyboard.md
animation-map.md
visual-direction.md
cover-spec.md
index.html
cover.html
hyperframes.json
assets/
.hyperframes/publish/narration-timing.json
.hyperframes/publish/narration.wav
renders/candidate.mp4
renders/cover.png
renders/cover-mobile-preview.png
renders/contact-sheet.png
publish-notes.md
release-acceptance.md
```

`storyboard.md` is the authoritative scene semantic contract and contains `title, knowledgePoint, input, transformation, output, compositionTask` for every scene. `script.md` is the authoritative cue text/timing contract. `animation-map.md` is the visual implementation map derived from those cue IDs; it must not become a second narration source.

`extensions.lock.json` records the selected visual, voice, research, QC, and publishing extension IDs, versions, and SHA-256 hashes. The copied episode snapshots are authoritative for that episode; a later npm package update must not silently change them.

The scaffold intentionally does not generate mechanism DOM or SVG: copying a generic card layout would violate the visual standard. Implement those after the cue contract is complete.

## 4. Cue and timing contract

Use this canonical row order in `script.md`:

```text
cue|scene|start|duration|rate|pitch|scene_title|caption|tts|focus|from|action|to|handoff
```

- `caption` and `tts` are identical.
- `start` and `duration` come from real TTS, not estimates.
- Recompute scene start/duration from its cues.
- Make each caption an independently timed clip.
- Cache TTS with at least `text + rate + pitch + voice + sha256`.
- Any change to text, rate, pitch, or voice invalidates the cache.

## 5. Deterministic renderer

- Pin GSAP core and every plugin to compatible local versions.
- Use `gsap.timeline({ paused: true })` and deterministic selectors.
- Register the timeline in the renderer interface expected by the frame tool.
- Anchor actions to absolute cue starts or offsets within the cue.
- Do not use `setTimeout`, real-time RAF state, runtime randomness, or remote assets during rendering.
- Use fixed SVG viewBoxes and deterministic layout.
- Generate twice and compare critical output hashes or source snapshots.

Keep content/facts/timing in the shared layer. Give each visual direction ownership of its own markup, CSS, SVG, selectors, and timeline. Systemic fixes belong in the generator, not hand edits to generated output.

## 6. Audio and composition

Narration is primary. Duck BGM under speech and keep SFX limited to meaningful completion/rejection/transition moments. Follow the real narration duration; do not time-stretch speech to fit an old animation.

Check final audio codec, 48 kHz sample rate, channel count, loudness, peak, beginning, and tail. Listening is mandatory even when waveforms and automated thresholds pass.

## 7. Cover build rule

The normal build must prefer a dedicated `cover.html` or equivalent source. Do not overwrite a designed cover with a frame extracted at a fixed video timestamp. The cover source and cover-render command are part of the generator and regression tests.

## 8. Validation commands

Portable contract validation:

```powershell
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase plan
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase timed
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase candidate
python <skill-dir>\scripts\validate_episode.py <episode-dir> --phase release
```

Phase meaning:

- `plan`: all content, scene, cue, visual direction, and cover-plan placeholders are resolved.
- `timed`: plan passes, every cue has measured start/duration, and narration timing/audio artifacts exist.
- `candidate`: renderer, dedicated cover, publish copy, encoded candidate, phone cover, and contact sheet exist and media probes pass.
- `release`: candidate passes, all acceptance checkboxes are complete, `renders/final.mp4` exists, and `release_decision: passed` is recorded.

Project-specific checks should additionally run its source tests, page lint/validate/inspect, visual frame audit, render, and release tests.
