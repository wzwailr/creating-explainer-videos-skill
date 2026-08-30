# Content and script contract

## 1. Exact promise

Complete `brief.json` before scripting:

- one exact viewer question;
- one answer the viewer can repeat;
- audience and prior knowledge;
- evidence and uncertainty requirements;
- scope and exclusions;
- platform, aspect ratio, language, and depth profile;
- previous/next connection only when the project is part of a series.

The public topic must cover exactly what the video teaches. If the mechanism explains only one stage of a broader concept, name that stage in the title and cover.

## 2. Mechanism completeness

`mechanism-map.json` must include:

1. input objects and representations;
2. internal state changes in causal order;
3. output and why it follows;
4. one worked numerical, symbolic, sample, or system-state example;
5. one relevant failure, boundary, cost, or control;
6. a reconstruction that lets the viewer restate the chain.

Use `1700–2200` Chinese characters, `30–45` cues, `10–11` scenes, and `300–420` seconds as a deep-video baseline when the brief calls for a full lesson. They are depth alarms rather than mandatory padding. A shorter result needs a written completeness rationale; a longer result needs a pacing and platform rationale.

## 3. Evidence table

For every important claim record `claim`, `source`, `sourceType`, `verifiedAt`, `teachingSimplification`, and `visualExpression`. Prefer primary records, original research, standards, official documentation, repositories, or datasets. Mark invented numbers as teaching examples. Recheck anything versioned, priced, regulated, scheduled, benchmarked, or otherwise time-sensitive immediately before the script is frozen.

## 4. Scene and cue contracts

Every scene in `scene-spec.json` needs:

```text
id, title, knowledgePoint, input, transformation, output, compositionTask
```

Every row in `script/narration.json` and `script/cues.json` needs:

```text
id, sceneId, text, focus, from, action, to, handoff
```

`text` is the canonical TTS and caption string. Cue start and duration are added only from measured audio. The visible scene title, active mechanism label, narration, caption, and animation focus must answer the same local question.

## 5. Writing rules

- One cue explains one action or judgment.
- Introduce the effect before its formal term.
- Split long thoughts in canonical narration; never shorten only the caption.
- Keep code/formula spelling in an on-screen field separate from spoken text.
- Normalize escaped underscores, snake_case, Markdown markers, raw URLs, and punctuation that TTS may pronounce literally.
- Record pronunciation decisions for English terms, abbreviations, formulas, numbers, and names.
- Generate speech at a natural rate. Never slow it to meet an arbitrary duration.

For a series, the first sentence joins the previous result to this exact question and the final sentence states the next exact topic plus its value. For standalone work, the first sentence states the exact question and the final sentence reconstructs the reusable answer.

## 6. Authoring order

1. Verify the question and facts.
2. Complete the mechanism and failure chain.
3. Write understanding beats.
4. Choose the dominant visual grammar.
5. Map beats to varied composition tasks.
6. Write single-action canonical cues.
7. Validate semantic alignment and depth.
8. Generate/listen to real narration.
9. Import measured timing.
10. Implement final animation anchors.

Never infer knowledge completeness from scene count and never begin final motion from estimated narration time.
