import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
  await writeJsonAtomic(path.join(root, "visual-program.json"), {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{
      id: "S01",
      cueIds: ["C01", "C02"],
      layout: "flow",
      elements: [
        { id: "authorization", type: "node", label: "授权通过", role: "state", frame: { x: .08, y: .3, width: .24, height: .18 } },
        { id: "settlement", type: "node", label: "清分与结算", role: "state", frame: { x: .68, y: .3, width: .24, height: .18 } },
        { id: "clearing-route", type: "connector", from: "authorization", to: "settlement", route: "curve", role: "payment" },
      ],
      actions: [
        { cueId: "C01", target: "authorization", kind: "appear", at: 0, duration: .4 },
        { cueId: "C02", target: "clearing-route", kind: "draw", at: 0, duration: .5 },
        { cueId: "C02", target: "settlement", kind: "appear", at: .5, duration: .5 },
      ],
    }],
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
  assert.match(html, /window\.__timelines\["main"\]=timeline/);
  assert.match(html, /window\.__explainer/);
  assert.match(html, /data-composition-id="main"/);
  assert.match(html, /data-width="1920"/);
  assert.match(html, /data-height="1080"/);
  assert.match(html, /data-fps="30"/);
  assert.match(html, /@font-face[^}]+src:local\("Noto Sans SC"\)/);
  assert.match(html, /id="caption-C01"/);
  assert.match(html, /刷卡成功只代表授权通过。/);
  assert.match(html, /data-template-fingerprint="perspective-chamber-tunnel-and-depth-lanes"/);
  assert.match(html, /data-motion="depth"/);
  assert.match(html, /data-signal-path/);
  assert.match(html, /target\.style\.opacity=progress>0\?'1':'0'/);
  assert.match(html, /progress>=\.98\?pathElement\.dataset\.markerEnd:'none'/);
  assert.match(html, /if\(localTime<action\.start&&action\.kind!=='appear'&&action\.kind!=='draw'&&action\.kind!=='replace'\)continue/);
  assert.doesNotMatch(html, /scan-line|cue-sweep|full-canvas-sweep/);
  assert.match(coverHtml, /信用卡清算/);
  assert.match(coverHtml, /series-cluster/);
  assert.match(coverHtml, /授权通过/);
  assert.match(coverHtml, /清分与结算/);
  assert.doesNotMatch(coverHtml, />输入<|>内部变化<|>输出</);
});

test("renderer consumes topic visual elements and cue-relative actions deterministically", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-topic-renderer-"));
  const root = path.join(tempRoot, "self-attention");
  await createProject({
    destination: root,
    title: "三个 Token 的自注意力",
    topic: "三个 token 如何按注意力权重互相路由信息",
    template: "spatial-chamber",
  });
  await writeJsonAtomic(path.join(root, "script", "narration.json"), {
    schemaVersion: 1,
    canonicalText: [
      { id: "C01", sceneId: "S01", text: "先让三个 token 各自生成查询和键。" },
      { id: "C02", sceneId: "S01", text: "查询与每个键打分后，权重决定信息汇入多少。" },
    ],
    complete: true,
  });
  await writeJsonAtomic(path.join(root, "scene-spec.json"), {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{ id: "S01", title: "三路注意力", purpose: "展示三 token 的路由", cueIds: ["C01", "C02"] }],
  });
  await writeJsonAtomic(path.join(root, "visual-program.json"), {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{
      id: "S01",
      cueIds: ["C01", "C02"],
      layout: "network",
      elements: [
        { id: "token-a", type: "node", label: "Token A", role: "token", frame: { x: .08, y: .28, width: .2, height: .18 } },
        { id: "token-b", type: "node", label: "Token B", role: "token", frame: { x: .4, y: .28, width: .2, height: .18 } },
        { id: "route-ab", type: "connector", from: "token-a", to: "token-b", route: "curve", role: "attention" },
        { id: "score", type: "annotation", text: "权重 0.72", target: "route-ab", role: "metric", frame: { x: .31, y: .5, width: .2, height: .1 } },
      ],
      actions: [
        { cueId: "C01", target: "token-a", kind: "appear", at: 0, duration: .25 },
        { cueId: "C02", target: "route-ab", kind: "draw", at: 0, duration: .5 },
        { cueId: "C02", target: "token-b", kind: "focus", at: .5, duration: .5 },
      ],
    }],
  });
  await importNarrationTiming(root, [
    { id: "C01", start: 0, duration: 2 },
    { id: "C02", start: 2, duration: 3 },
  ]);

  const first = await buildRenderer(root);
  const second = await buildRenderer(root);
  const html = await readFile(first.path, "utf8");

  assert.equal(first.html, second.html);
  assert.equal(first.visualProgram, true);
  assert.match(html, /data-visual-element-id="token-a"/);
  assert.match(html, /data-visual-element-id="route-ab"/);
  assert.match(html, /权重 0.72/);
  assert.match(html, /const visualActions=/);
  assert.match(html, /applyVisualActions/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, />INPUT<|>CHANGE<|>OUTPUT</);
});

test("renderer keeps the v2.0 generic scaffold when no visual program exists", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-legacy-renderer-"));
  const root = path.join(tempRoot, "legacy");
  await createProject({ destination: root, title: "旧项目", topic: "旧项目仍可构建", template: "ink-explainer" });
  const project = JSON.parse(await readFile(path.join(root, "project.json"), "utf8"));
  project.schemaVersion = 1;
  await writeJsonAtomic(path.join(root, "project.json"), project);
  await rm(path.join(root, "visual-program.json"));

  const result = await buildRenderer(root);

  assert.equal(result.visualProgram, false);
  assert.match(result.html, /derivation-board/);
});

test("renderer refuses an incomplete visual program in a schema v2 project", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-v2-renderer-"));
  const root = path.join(tempRoot, "incomplete");
  await createProject({ destination: root, title: "新项目", topic: "必须先完成主题视觉", template: "paper-theatre" });

  await assert.rejects(
    () => buildRenderer(root),
    /schema v2 project requires a complete visual-program\.json/,
  );
});
