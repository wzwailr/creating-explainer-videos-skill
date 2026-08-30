# Visual systems and semantic motion

Use [visual-template-collection.md](visual-template-collection.md) for the full Paper Theatre, Spatial Chamber, and Ink Explainer specifications.

## Cue-to-motion contract

For each cue, specify `focus`, `from`, `action`, `to`, and `handoff`. A motion is valid only when a before/after frame proves a knowledge-state change. Titles, focused labels, narration, captions, and actions must be semantically equivalent at the cue level.

## Deterministic GSAP rules

- Use `gsap.timeline({ paused: true })` or the template controller's equivalent.
- Anchor motion to measured cue start and duration.
- Prefer transforms and opacity; batch DOM reads before writes.
- Use fixed SVG viewBoxes and deterministic selectors.
- Avoid runtime randomness, `setTimeout`, wall-clock RAF state, remote assets, and CSS animations that cannot be sought deterministically.
- Declare and test a local fallback for every optional plugin.

## Composition rules

Every scene needs a distinct composition task, not merely another card arrangement. Establish the object before transforming it, keep captions outside the mechanism path, and preserve a readable final state long enough to verify the conclusion. Ambient texture and particles never count as the cue action.

## Prohibited patterns

- full-canvas scan lines, hard-edged sweeps, or narration-length moving highlights;
- identical panels reused for unrelated mechanism roles;
- motion that competes with the narrated focus;
- perspective applied to small text;
- captions that summarize or differ from narration;
- frame extraction used as the primary cover source;
- color-only reskins presented as new visual templates.

## Visual acceptance

Inspect stable frames, cue boundaries, warnings, longest text, formula/identifier frames, first/final frames, cover, phone preview, and contact sheet. The encoded video is authoritative for fallback fonts, clipping, compositing, and transition debris.
