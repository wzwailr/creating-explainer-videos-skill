# Visual template collection

This collection contains three production grammars. They are reusable systems, not fixed scene layouts. Choose one dominant grammar from the knowledge structure, then redesign the scene DOM, SVG, labels, and cue actions for the topic.

## 1. Routing matrix

| Knowledge shape | Primary template | Why | Avoid when |
| --- | --- | --- | --- |
| Objects keep identity while being sorted, stamped, folded, compared, accepted, or rejected | `paper-theatre` | Physical operations make state changes tangible | The core idea is an abstract route through many components |
| Signals, money, messages, or states travel through stages, layers, queues, or networks | `spatial-chamber` | Position, path, depth, and camera reveal system structure | The explanation is mostly a derivation or formula |
| A relationship is derived, annotated, compared, corrected, or calculated step by step | `ink-explainer` | Drawing order can match reasoning order | The topic depends on physical object identity and material transformation |

If two rows apply, use the template that best expresses the irreversible state change. Borrow at most one secondary primitive family; do not blend all palettes and motion grammars.

## 2. Shared production rules

### Semantic motion

Every cue must perform at least one knowledge action: introduce, connect, route, split, merge, transform, compare, reject, verify, or conclude. Ambient motion may support depth, but it cannot be the cue's only action. A full-frame scan line, repeated shine sweep, or narration-length moving edge is forbidden.

Define each cue as:

```json
{
  "id": "c07",
  "sceneId": "s03",
  "text": "canonical narration and caption",
  "focus": "node-clearing-bank",
  "from": "authorization-approved",
  "action": "route settlement instruction through the network",
  "to": "clearing obligation recorded",
  "handoff": "net positions are ready"
}
```

The title, focused label, narration, caption, and visual action must answer the same local question. If any one describes another step, redesign the scene rather than hiding the mismatch with a transition.

### Typography

- Display Chinese: DingTalk JinBuTi or DingTalk Sans when installed and licensed on the host.
- Latin and numbers: DingTalk Sans or an explicit geometric sans fallback.
- Captions and dense labels: Noto Sans SC, Microsoft YaHei, or another measured CJK fallback.
- Never redistribute font files without license evidence.
- Measure the actual rendered font in the browser. A successful `font-family` declaration does not prove the intended font loaded.
- Default landscape minimums: 34 px perspective labels, 30 px body copy, 28 px annotations, 42 px captions. Increase for portrait/mobile or low contrast.
- Keep titles to two visual lines and captions to the safe-zone width. Reduce wording before reducing type size.

### Layout and safe areas

- Reserve a stable caption band that mechanism objects do not cross.
- Keep critical text and the active object inside platform-safe margins.
- Recompose 9:16 projects; never crop a 16:9 composition.
- Validate the longest title, longest caption, English identifier, number, and formula at the exact final resolution.
- Detect `scrollWidth > clientWidth`, `scrollHeight > clientHeight`, offscreen bounds, overlap, occlusion, and low contrast programmatically, then inspect the encoded frames.

### Timing

- Build a paused deterministic timeline.
- Anchor actions to measured cue starts, not scene percentages guessed before audio.
- Reveal the object before narrating its transformation; complete the visible state change before the cue handoff.
- Keep subtitles stable while the mechanism moves.
- Use a short settle after important conclusions, but never stretch narration or insert empty pauses to reach a duration target.

### Cover

Render a dedicated `cover.html`. It should contain the exact topic, one concrete question or conclusion, and one template-native hero mechanism. Test both full resolution and an approximately 20% phone preview. Series/season/episode metadata belongs to the selected preset and stays grouped with the identity label; the core template does not invent series branding.

## 3. Paper Theatre / 纸艺编辑剧场

### Best use

Paper Theatre is for evidence, identity, decisions, sorting, compression, comparison, rules, and processes where an object remains recognizable while its status changes. Think of a physical editorial desk: a record arrives, is marked, cut, folded, matched, rejected, stacked, or handed forward.

### Visual system

- Background: warm cream `#f1e4c5` with restrained paper grain.
- Foreground ink: `#1d1b18`.
- Primary actions: red `#dc3f36`; structural relations: blue `#264ac7`; highlights: yellow `#f0c331`.
- Primitives: `paper-card`, `evidence-strip`, `torn-edge`, `stamp`, `fold`, `layer-stack`.
- DOM fingerprint: stage layer, physical paper objects, cutout silhouettes, and explicit z-order.
- Shadows indicate height; they must not make text fuzzy. Rotation stays within about 8 degrees unless the cue is an intentional rejection.

### Scene construction

1. Give each mechanism role a distinct silhouette, size, or material.
2. Preserve a visual identity marker across transformations.
3. Use position to encode workflow order and stacks to encode accumulation.
4. Use stamps only for decisions already explained; a stamp cannot replace the decision mechanism.
5. Make rejection or failure physically different from completion: tear, red mark, side tray, or reversed handoff.

### Motion implementation

- Entry: weighted translation with a small rotation and shadow settle.
- Relation: folds, measured transforms, paper paths, or stack insertion.
- Transition: page turn or paper curtain tied to a knowledge boundary.
- Preferred GSAP capabilities: Flip, MorphSVGPlugin, CustomEase.
- Fallbacks: measured transform-from/to for Flip, crossfade between shapes for morphing, `cubic-bezier(0.2,0.8,0.2,1)` for CustomEase.

### QC traps

Repeated identical cards, decorative tape on every object, excessive shadows, tiny evidence strips, and stamps appearing before the reason are blockers. Review whether the viewer can track the same object before and after every physical operation.

## 4. Spatial Chamber / 空间数据舱

### Best use

Spatial Chamber is for routes, layers, pipelines, network hops, queues, distributed components, spatial reconfiguration, and state transfer. It turns an invisible system into a navigable volume: the viewer sees where an object is, where it must travel, and what each chamber changes.

### Visual system

- Background: near-black `#030611` with deep panels around `#121a29`.
- Primary route: cyan `#3af2ff`; secondary state: violet `#8a6bff`; conclusion: lime `#c6ff3d`; failure: coral `#ff4f72`.
- Primitives: `signal-tunnel`, `depth-card`, `path-node`, `perspective-grid`, `decoder-lane`, `volume-chart`.
- DOM fingerprint: perspective chamber, visible route, depth lanes, and a foreground/mid-ground/background hierarchy.
- Text remains screen-facing even when its parent object has perspective.

### Scene construction

1. Establish the coordinate system before moving a signal.
2. Show the complete meaningful path or reveal its next stage before the object moves.
3. Assign one transformation to each chamber; encode the resulting state on the moving object.
4. Use foreground for the current state, mid-ground for transformation, and background for destination/consequence.
5. Limit occlusion of the focused object to roughly 18%. If a layer hides the knowledge state, change the camera or z-order.
6. Keep decorative particles sparse and uncorrelated with cue timing so they cannot be mistaken for data.

### Motion implementation

- Entry: camera establishes depth before the signal travels.
- Relation: the object follows a visible SVG path through named nodes; the path is causal, not decorative.
- State change: color, icon, payload, or geometry changes inside the relevant chamber.
- Transition: depth push, aperture, or light-plane cut only at a structural boundary.
- Preferred GSAP capabilities: MotionPathPlugin, DrawSVGPlugin, SplitText, CustomEase.
- Fallbacks: sample the SVG path with `getPointAtLength`, animate `stroke-dasharray/stroke-dashoffset`, reveal whole lines, and use `cubic-bezier(0.2,0.75,0.15,1)`.

### QC traps

Camera motion without a state change, unreadable perspective labels, objects passing behind captions, unexplained neon particles, path motion that contradicts narration order, and depth cards covering more than 18% of the focus are blockers. Sample before/during/after frames for every route transition.

## 5. Ink Explainer / 手绘动态图解

### Best use

Ink Explainer is for derivations, formulas, causal graphs, comparisons, encodings, corrections, and dense conceptual relations. It acts like a precise teacher drawing only the next required mark.

### Visual system

- Background: ruled warm paper around `#f5f0e4`.
- Ink: `#202225`; structure: blue `#2457c5`; action/error: red `#d84738`; annotation: yellow `#e0b72f`; verified conclusion: green `#2c835f`.
- Primitives: `rough-line`, `hand-arrow`, `annotation`, `derivation-row`, `circled-term`, `teacher-note`.
- DOM fingerprint: board, rough-but-controlled strokes, derivation rows, and annotations with clear authorship order.
- Roughness is a surface quality; paths and alignment still encode exact structure.

### Scene construction

1. Show the claim or input before drawing the relation.
2. Add lines, operands, labels, and conclusions in reasoning order.
3. Keep no more than five simultaneous annotations; clear, pan, or group before adding more.
4. Use red for an actual action, error, or contradiction, not for generic decoration.
5. Make corrections visible: cross out the wrong branch, state why, then draw the corrected relation.

### Motion implementation

- Entry: the object/claim appears, followed by its explanation stroke.
- Relation: path drawing and label reveal occur in the same order as the spoken reasoning.
- Transition: board shift, page pan, or an explicit erased correction.
- Preferred GSAP capabilities: DrawSVGPlugin, MorphSVGPlugin, SplitText, CustomEase.
- Fallbacks: stroke dash offset, crossfade between shapes, whole-line reveal, and `cubic-bezier(0.22,0.74,0.2,1)`.

### QC traps

Unreadable handwriting simulation, more than five simultaneous notes, arrows drawn before their endpoints exist, conclusions highlighted before derivation, and a moving vertical scan edge are blockers. Confirm draw order against cue order and check the longest annotation at phone size.

## 6. Extending the collection

A new template directory must contain `template.json`, `scene.css`, `cover.css`, and `motion.mjs`. Declare:

- a unique DOM and motion fingerprint;
- required and optional capabilities;
- semantic primitives;
- palette and font policy;
- cover grammar;
- licensed-plugin fallbacks;
- measurable QC rules;
- at least three fixtures that prove the grammar is not a reskin.

Run `templates inspect`, `templates preview`, project creation, deterministic seek, text overflow checks, mobile preview, and full render regression before accepting it. A color-only variation is not a new template.
