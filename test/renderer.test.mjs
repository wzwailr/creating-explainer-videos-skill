import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { writeJsonAtomic } from "../skill/creating-explainer-videos/runtime/json.mjs";
import {
  buildCaptionCues,
  importNarrationTiming,
  normalizeSpokenText,
} from "../skill/creating-explainer-videos/runtime/narration.mjs";
import {
  buildCover,
  buildRenderer,
} from "../skill/creating-explainer-videos/runtime/renderer.mjs";
import { createProject } from "../skill/creating-explainer-videos/runtime/project.mjs";

test("canonical spoken text removes escaped underscores and markdown code syntax", () => {
  assert.equal(normalizeSpokenText("把 `tool\\_call` 交给 **执行器**"), "把 tool call 交给 执行器");
  assert.equal(normalizeSpokenText("state_machine 进入下一步"), "state machine 进入下一步");
});

test("captions and TTS share one canonical string", () => {
  const narration = [{ id: "C01", text: "把 tool\\_call 交给执行器" }];
  const timing = [{ id: "C01", start: 0, duration: 2.5 }];
  const cues = buildCaptionCues(narration, timing);

  assert.equal(cues[0].caption, cues[0].tts);
  assert.equal(cues[0].tts.includes("_"), false);
  assert.equal(cues[0].start, 0);
  assert.equal(cues[0].duration, 2.5);
});

test("real timing builds a deterministic template renderer and dedicated cover", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-renderer-"));
  const root = path.join(tempRoot, "payment-clearing");
  await createProject({
    destination: root,
    title: "信用卡清算",
    topic: "一笔支付为什么要经过授权、清分和结算",
    template: "spatial-chamber",
  });
  await writeJsonAtomic(path.join(root, "script", "narration.json"), {
    schemaVersion: 1,
    canonicalText: [
      { id: "C01", sceneId: "S01", text: "刷卡成功只代表授权通过。" },
      { id: "C02", sceneId: "S01", text: "资金还要经过清分与结算。" },
    ],
    complete: true,
  });
  await writeJsonAtomic(path.join(root, "scene-spec.json"), {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{ id: "S01", title: "一次支付，三次状态变化", purpose: "展示授权到结算的数据流", cueIds: ["C01", "C02"] }],
  });
  await importNarrationTiming(root, [
    { id: "C01", start: 0, duration: 2.4 },
    { id: "C02", start: 2.4, duration: 2.8 },
  ]);

  const first = await buildRenderer(root);
  const second = await buildRenderer(root);
  const cover = await buildCover(root);
  const html = await readFile(first.path, "utf8");
  const coverHtml = await readFile(cover.path, "utf8");

  assert.equal(first.html, second.html);
  assert.match(html, /spatial-chamber/);
  assert.match(html, /window\.__timelines/);
  assert.match(html, /window\.__explainer/);
  assert.match(html, /刷卡成功只代表授权通过。/);
  assert.doesNotMatch(html, /scan-line|cue-sweep|full-canvas-sweep/);
  assert.match(coverHtml, /信用卡清算/);
  assert.match(coverHtml, /series-cluster/);
});

