# Topic visual program DSL

Read this reference after narration timing is measured and before `build`. The visual program is the executable bridge between a mechanism explanation and the topic objects shown on screen.

## Authoring outcome

`visual-program.json` must answer, for every scene and cue:

- Which topic object is visible?
- Which relationship or state is changing?
- What does the viewer need to focus on during this exact sentence?
- What stable knowledge state remains after the action?

Use the bounded schema instead of editing generated renderer HTML. `build` and `render` regenerate renderer files; project knowledge belongs in the visual program.

## Workflow

1. Read `mechanism-map.json`, measured `script/cues.json`, `storyboard.json`, and `scene-spec.json` together.
2. Give every scene-spec scene exactly one visual-program scene with the same ID and cue ownership.
3. Choose a layout from the knowledge structure: `flow`, `network`, `compare`, `stack`, `timeline`, or explicit `free` geometry.
4. Define real topic objects, relationships, boundaries, and annotations. Labels such as `INPUT`, `CHANGE`, `OUTPUT`, `步骤一`, or repeated unlabeled cards are not topic visuals.
5. Bind actions to the cue that explains the visible change.
6. Validate, compile, and preview before rendering.

```powershell
explainer-video-skill visual validate <project-dir> --json
explainer-video-skill visual compile <project-dir> --json
explainer-video-skill visual preview <project-dir> --output <preview.html> --json
explainer-video-skill build <project-dir> --json
```

An invalid completed program blocks `build`. A v2.0 project without the file keeps the legacy generic scaffold; do not call that fallback topic-complete.

## Minimal complete program

```json
{
  "schemaVersion": 1,
  "template": "spatial-chamber",
  "complete": true,
  "scenes": [
    {
      "id": "S01",
      "cueIds": ["C01", "C02"],
      "layout": "network",
      "elements": [
        {
          "id": "query-token",
          "type": "node",
          "label": "查询 token",
          "role": "token",
          "frame": { "x": 0.08, "y": 0.32, "width": 0.2, "height": 0.18 }
        },
        {
          "id": "key-token",
          "type": "node",
          "label": "键 token",
          "role": "token",
          "frame": { "x": 0.68, "y": 0.32, "width": 0.2, "height": 0.18 }
        },
        {
          "id": "attention-score",
          "type": "connector",
          "from": "query-token",
          "to": "key-token",
          "route": "curve",
          "role": "attention"
        },
        {
          "id": "score-label",
          "type": "annotation",
          "text": "权重 0.72",
          "target": "attention-score",
          "role": "metric",
          "frame": { "x": 0.4, "y": 0.52, "width": 0.2, "height": 0.08 }
        }
      ],
      "actions": [
        { "cueId": "C01", "target": "query-token", "kind": "appear", "at": 0, "duration": 0.25 },
        { "cueId": "C02", "target": "attention-score", "kind": "draw", "at": 0, "duration": 0.5 },
        { "cueId": "C02", "target": "key-token", "kind": "focus", "at": 0.5, "duration": 0.5 }
      ]
    }
  ]
}
```

## Elements

All non-connector frames use normalized `x`, `y`, `width`, and `height` values. Each value stays within zero to one, width/height are positive, and the complete frame stays inside the canvas.

| Type | Required fields | Use |
| --- | --- | --- |
| `group` | `id`, `frame`; optional `label`, `role` | Chamber, lane, ledger, boundary, or shared region |
| `text` | `id`, `text`, `role`, `frame` | Title, formula, code spelling, metric, or label |
| `node` | `id`, `label`, `role`, `frame` | Entity, token, state, process, warning, input, or result |
| `shape` | `id`, `shape`, `role`, `frame` | `rectangle`, `circle`, `diamond`, or `line` anchor |
| `connector` | `id`, `from`, `to`, `route`, `role` | Directed relation; route is `line`, `curve`, or `orthogonal` |
| `asset` | `id`, `src`, `alt`, `frame` | Licensed local SVG, PNG, JPEG, or WebP inside project `assets/` |
| `annotation` | `id`, `text`, `target`, `role`, `frame` | Claim, boundary, correction, or callout tied to an element |

IDs start with a letter and contain letters, digits, or hyphens. Connector and annotation references remain inside their scene. Text is escaped by the compiler.

Assets use a path relative to `assets/`, for example `diagrams/router.svg`. URLs, data URIs, absolute paths, traversal, inline scripts, and remote render dependencies are rejected.

## Actions

`at` and `duration` are fractions of the measured cue. They must fit completely inside that cue. The compiler converts them to local scene seconds.

| Kind | Stable result |
| --- | --- |
| `appear` | Target enters and remains visible |
| `exit` | Target leaves and remains hidden |
| `move` | Target reaches the declared normalized `x`/`y` offset |
| `focus` | Target remains emphasized |
| `draw` | Connector/path remains revealed |
| `pulse` | Target returns to its stable state after one deterministic pulse |
| `replace` | `target` leaves while `with` becomes visible |

Motion is driven only by renderer `seek(seconds)`. Do not add CSS autoplay animation, wall-clock timers, runtime randomness, narration-length sweeps, or a moving line that spans an entire cue without semantic meaning.

## Template mapping

The visual program defines knowledge; templates define presentation.

- `paper-theatre`: give roles to evidence cards, physical objects, sorting regions, editorial notes, and before/after results.
- `spatial-chamber`: give roles to lanes, chambers, queues, signals, state stores, and branches.
- `ink-explainer`: give roles to formulas, barriers, proof steps, corrections, curves, and boundary annotations.

The same element types can render under every template, but identical coordinates and identical action sequences across every scene usually indicate decorative templating rather than visual reasoning.

## Stop conditions

Stop before build when a scene is missing, an action references the wrong cue, narration mentions an object not shown, a title describes another claim, geometry leaves the normalized frame, an asset license/path is unresolved, or a scene remains only a generic input/process/output diagram.
