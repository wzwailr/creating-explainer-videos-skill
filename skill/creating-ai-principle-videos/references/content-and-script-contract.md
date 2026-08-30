# Content and script contract

## 1. Episode promise

Write before scripting:

- one exact question;
- one answer the viewer can repeat;
- what the previous episode hands in;
- what this episode hands to the next;
- what the viewer already knows;
- what must not be stated incorrectly;
- the continuing case, if the series has one.

The public topic must cover exactly what the episode teaches. Avoid a broad label such as “multimodal model” when the mechanism is only “multimodal input”.

## 2. Deep-principle gate

A normal episode must include:

1. the input object and its representation;
2. the internal mechanism as visible steps;
3. the output and why it follows;
4. one worked numerical, matrix, token, sample, or system-state example;
5. one failure chain, cost, boundary, or control method;
6. a final reconstruction of the mechanism.

Baseline scale:

| Measure | Normal target |
| --- | --- |
| Scenes | 10–11 |
| Cues | 30–45; recent dense episodes commonly use about 40 |
| Chinese narration characters | 1700–2200 CJK ideographs counted from canonical caption strings; punctuation, Latin text, and digits are excluded |
| Real duration | 300–420 seconds |

These are depth alarms, not padding targets. A shorter episode needs a written reason proving the mechanism remains complete.

## 3. Beat, scene, and cue

- **Beat**: one change in viewer understanding.
- **Scene**: a page-level programmatic animation container; it can carry several beats and cues.
- **Cue**: the indivisible narration, caption, and visual-focus synchronization unit.

Do not infer completeness from scene count. Map beats to scenes only after the mechanism is known.

## 4. Scene semantic contract

For every scene define:

```text
title
knowledgePoint
input
transformation
output
```

Store this scene contract in `storyboard.md`, one section per scene, using the exact fields `title, knowledgePoint, input, transformation, output, compositionTask`. Store the cue contract in both the canonical `script.md` row and the derived `animation-map.md`; the two files must carry the same cue IDs, focus, action, and handoff.

For every cue define:

```text
narration.text = caption = tts
focus
from
action
to
handoff
```

The visible scene title, card/mechanism label, narration sentence, and active animation must answer the same local question. A beautiful scene with a mismatched title is a release blocker.

## 5. Opening and ending

The first spoken sentence must do both jobs at once:

```text
上一集的输出 + 这一集的 exact topic/question
```

The final spoken sentence must do both jobs at once:

```text
下一集的 exact topic + 下一集将回答的问题或带来的价值
```

The opening title/focus and the ending label/focus must be synonymous with those sentences and fully readable before their narration ends.

## 6. Narration and caption rules

- One cue explains one action or judgment.
- Introduce the effect before the formal term.
- Split an overlong sentence at the narration layer; never summarize only the caption.
- Derive both caption and TTS from one stored string.
- Keep code identifiers on screen if useful, but write natural spoken equivalents. Example: display `search_policy`; speak and caption `search policy` or a Chinese description.
- Record pronunciation for English, abbreviations, numbers, and formulas.
- Generate at a natural rate. Never slow the whole narration to meet duration.

## 7. Continuing case

A recurring case should preserve identity, facts, and relevant values across episodes. Do not repeatedly add generic “scope” caveats when the user has already approved the case. Add a boundary only when it teaches the current mechanism or prevents a factual misunderstanding.

## 8. Authoring order

1. Verify facts and write the one-question/one-answer brief.
2. Build the mechanism and failure chain.
3. Write beats.
4. Map beats to 10–11 varied scene tasks.
5. Write 30–45 single-action cues.
6. Fill the semantic contract for every cue.
7. Check depth and word count.
8. Generate and listen to TTS.
9. Replace estimated time with measured timing.
10. Only then implement final animation anchors.
