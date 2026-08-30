# Visual systems and semantic motion

## 1. Choose the metaphor before the template

The visual is a second explanation channel. Select a system because its actions match the mechanism, not because its palette looks attractive.

| Dimension | A · Paper Theatre | C · Ink Explainer |
| --- | --- | --- |
| Core metaphor | paper objects are cut, stamped, grouped, and passed | knowledge is drawn, connected, compared, and derived |
| Best for | process, evidence, identity, classification, rules | principles, formulas, encoding, relations, dense derivation |
| Main actions | cut, fold, stamp, move, sort, compress | write, draw, circle, connect, split, align |
| Main risk | every idea becomes the same card | static board with decorative lines |

C is the default for dense AI mechanism lessons. A is an equal alternative when physical object transformation carries the explanation better.

## 2. Shared visual invariants

- Default canvas: 1920×1080 at 30 fps; recompose for 1080×1920 only when the brief requests portrait.
- One primary focus and no more than two secondary focuses at a time.
- Alternate overview, mechanism close-up, worked example, comparison, failure branch, and summary. Consecutive scenes cannot be one container with replaced text.
- Keep titles, captions, large numbers, and important labels within the platform-safe area.
- Use the longest Chinese, English, number, and caption as layout stress tests.
- Use color plus shape/label/motion; never color alone for risk or state.

## 3. C · Ink Explainer

Palette:

```css
--sheet: #f8f3e8;
--ink: #201e1b;
--blue: #264ac7;
--red: #dc3f36;
--yellow: #f0c331;
--green: #24845c;
```

Use horizontal ruled paper, a red page margin, thick black hand-drawn outlines, blue structure lines, red action/error lines, yellow annotation, and green validated conclusions. The paper background does not move.

Font roles:

- 钉钉进步体 Regular (`font-weight: 400`): Chinese display titles, short annotations, conclusions.
- DingTalk Sans: English, numbers, coordinates, and short technical tags.
- Noto Sans SC: captions and long explanations.

Do not fake bold DingTalk Progress. Do not distribute the font file with the skill. Verify the installed font from a rendered frame; if unavailable, use a licensed readable fallback and record it.

Hand-drawn character comes from asymmetric borders, paths, small entrance rotations, and drawing order—not imprecise layout. Use about 8 px rounded SVG strokes so compressed video preserves them. Long text stays horizontal and stable.

## 4. A · Paper Theatre

Palette:

```css
--cream: #efe1c1;
--sheet: #fff8e8;
--ink: #211e19;
--red: #df4637;
--blue: #2766bd;
--yellow: #efbd38;
--green: #2f8d63;
```

Use paper layers, irregular torn edges, tape, stamps, shadows, and mild rotation. Different mechanism objects require different silhouettes: token pieces, patch grids, waveforms, machines, gates, evidence sheets, and summary pages cannot all be the same card.

Keep paper shadows and decoration subordinate to the knowledge action. Limit rotation on long Chinese text and protect important values from stacking overlap.

## 5. Map knowledge actions to motion

| Knowledge action | Preferred visible action |
| --- | --- |
| Input arrives | object enters a work area or a path connects to the new region |
| Split/encode | object divides into meaningful units and transforms representation |
| Filter/reject | item is crossed, stamped, dimmed, disconnected, or removed |
| Rank/group | elements visibly reorder while identity remains stable |
| Align/relate | paths are drawn between the exact related objects |
| Calculate | values update step by step, not as one final number |
| Risk/failure | branch breaks, conflicts, returns, or enters a red isolated state |
| Conclusion | motion settles into a readable green circled or stamped state |

Use GSAP plugins semantically:

- DrawSVG for a relation becoming known.
- MotionPath for an object following the actual process.
- MorphSVG for the same object's state/representation changing.
- Flip for sorting, grouping, or structural reordering.
- SplitText for a chapter title; restore full readability within roughly 0.5 seconds.
- CustomEase for rhythm, not prolonged text distortion.

## 6. Cue timing

For each cue define `focus, from, action, to, handoff`. Establish the active focus immediately after the real cue starts; a 0.00–0.28 second response is a useful target. Leave a readable stable frame after a conclusion, without stretching empty time.

Narrative motion changes knowledge state. Environmental motion is low-contrast and low-area. It must not move captions, body text, or key numbers continuously.

### Prohibited motion

Never bind a hard-edged vertical highlight, sweep mask, scan line, or full-mechanism overlay to every narration cue. It creates a repeated line moving left to right across the explanation and obscures content. If freeze detection finds a long still area, enlarge the actual semantic object's motion, add a meaningful state transition, or coordinate multiple related objects. Do not lower the detector or fake activity.

## 7. Cover contract

The cover is an independent composition, never a random early video frame.

1. Top-left series label: `AI 底层原理图解` or the configured series.
2. Season/episode label immediately follows it: `第 X 季 · 第 XX 集`.
3. Main title states the exact episode topic.
4. One subtitle states one concrete question.
5. One mechanism graphic carries the visual hook.
6. Top right remains clean by default.

Check both the full-size cover and an approximately 20% phone preview. The title, series, season, and episode must remain recognizable.

## 8. Reuse boundary

Reuse palette, font roles, paper material, line grammar, transition family, deterministic timing, and QC methods. Redesign the episode metaphor, scene DOM, core SVG paths, spatial relationships, animation sequence, failure visuals, and cover mechanism graphic.

