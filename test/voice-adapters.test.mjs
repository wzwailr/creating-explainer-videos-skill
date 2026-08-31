import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readJson, sha256File, writeJsonAtomic } from "../skill/creating-explainer-videos/runtime/json.mjs";
import { createProject } from "../skill/creating-explainer-videos/runtime/project.mjs";
import {
  assertAdapterAuthorization,
  buildEdgeTtsInvocation,
  doctorVoiceAdapter,
  listVoiceAdapters,
  loadHostAdapterConfig,
  recoverNarration,
  runHostAdapterCue,
  synthesizeNarration,
} from "../skill/creating-explainer-videos/runtime/voice-adapters.mjs";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const hostFixture = path.join(testRoot, "fixtures", "host-tts-adapter.mjs");

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

test("voice registry exposes reviewed adapters and Edge invocation contains no credentials", () => {
  const adapters = listVoiceAdapters();
  assert.deepEqual(adapters.map((adapter) => adapter.id), ["edge-tts", "fixture-tts", "host-command"]);
  assert.equal(adapters.find((adapter) => adapter.id === "fixture-tts").testOnly, true);
  const invocation = buildEdgeTtsInvocation({
    cue: { id: "C01", text: "查询与键计算注意力分数。", voice: "zh-CN-YunxiNeural", rate: "+0%", pitch: "+0Hz" },
    output: { audioPath: "C:/temp/cue-01.mp3" },
  });

  assert.equal(invocation.command, "python");
  assert.deepEqual(invocation.args.slice(0, 2), ["-m", "edge_tts"]);
  assert.equal(invocation.args.includes("查询与键计算注意力分数。"), true);
  assert.equal(invocation.args.includes("zh-CN-YunxiNeural"), true);
  assert.equal(invocation.args.some((argument) => /token|secret|password|api[-_]?key/i.test(argument)), false);
});

test("adapter authorization is required only for uncached provider calls", () => {
  const networkFree = { id: "edge-tts", network: true, cost: "free" };
  const paid = { id: "paid-provider", network: true, cost: "paid" };

  assert.throws(() => assertAdapterAuthorization(networkFree, {}, 1), /--allow-network/);
  assert.doesNotThrow(() => assertAdapterAuthorization(networkFree, { allowNetwork: true }, 1));
  assert.throws(() => assertAdapterAuthorization(paid, { allowNetwork: true }, 1), /--authorize-provider-cost/);
  assert.doesNotThrow(() => assertAdapterAuthorization(paid, { allowNetwork: true, authorizeProviderCost: true }, 1));
  assert.doesNotThrow(() => assertAdapterAuthorization(paid, {}, 0));
});

test("voice doctor checks adapter capability without invoking synthesis", async () => {
  const available = await doctorVoiceAdapter(process.cwd(), {
    adapter: "edge-tts",
    runner: () => ({ status: 0, stdout: "edge-tts 7.2.7\n", stderr: "" }),
  });
  const missing = await doctorVoiceAdapter(process.cwd(), {
    adapter: "edge-tts",
    runner: () => ({ status: 1, stdout: "", stderr: "No module named edge_tts" }),
  });

  assert.equal(available.status, "available");
  assert.equal(available.invoked, false);
  assert.equal(available.networkRequired, true);
  assert.equal(missing.status, "missing");
  assert.equal(missing.invoked, false);
});

async function createHostProject(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "explainer-host-tts-"));
  const publishRoot = path.join(root, ".publish");
  await mkdir(path.join(publishRoot, "narration"), { recursive: true });
  const configPath = path.join(publishRoot, "tts-adapter.json");
  await writeJsonAtomic(configPath, {
    schemaVersion: 1,
    protocolVersion: 1,
    id: "fixture-host",
    executable: hostFixture,
    executableSha256: options.hash || await sha256File(hostFixture),
    args: options.args || [],
    network: options.network ?? false,
    cost: options.cost || "none",
  });
  return { root, configPath };
}

function hostRequest(root, audioPath = path.join(root, ".publish", "narration", "C01.wav")) {
  return {
    protocolVersion: 1,
    requestId: "request-c01",
    cue: { id: "C01", text: "这是一句真实协议测试。", language: "zh-CN", voice: "fixture", rate: "+0%", pitch: "+0Hz" },
    output: { audioPath, format: "wav", sampleRate: 48000, channels: 2 },
  };
}

test("trusted host adapter executes the JSON protocol and confines output", async () => {
  const { root, configPath } = await createHostProject();
  const config = await loadHostAdapterConfig(root, configPath);
  const request = hostRequest(root);
  const result = await runHostAdapterCue(root, config, request);

  assert.equal(result.status, "completed");
  assert.equal(result.providerTaskId, "fixture-host-task");
  assert.equal(await exists(request.output.audioPath), true);
  assert.equal((await readFile(request.output.audioPath)).length > 44, true);
});

test("host adapter rejects wrong hashes, escaped outputs, and malformed responses", async () => {
  const wrongHash = await createHostProject({ hash: "0".repeat(64) });
  await assert.rejects(() => loadHostAdapterConfig(wrongHash.root, wrongHash.configPath), /hash mismatch/);

  const escaped = await createHostProject();
  const escapedConfig = await loadHostAdapterConfig(escaped.root, escaped.configPath);
  await assert.rejects(
    () => runHostAdapterCue(escaped.root, escapedConfig, hostRequest(escaped.root, path.join(escaped.root, "outside.wav"))),
    /inside \.publish.narration/,
  );

  const malformed = await createHostProject({ args: ["--mode", "malformed"] });
  const malformedConfig = await loadHostAdapterConfig(malformed.root, malformed.configPath);
  await assert.rejects(() => runHostAdapterCue(malformed.root, malformedConfig, hostRequest(malformed.root)), /response is not valid JSON/);
});

async function createNarrationProject() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-synthesis-"));
  const root = path.join(tempRoot, "project");
  await createProject({ destination: root, title: "注意力路由", topic: "两个 token 如何交换信息", template: "spatial-chamber" });
  await writeJsonAtomic(path.join(root, "script", "narration.json"), {
    schemaVersion: 1,
    complete: true,
    canonicalText: [
      { id: "C01", sceneId: "S01", text: "查询 token 先和键计算分数。", focus: "query-key", visualEvent: "draw score" },
      { id: "C02", sceneId: "S01", text: "分数变成权重后再汇入信息。", focus: "weighted-sum", visualEvent: "merge values" },
    ],
  });
  return root;
}

test("fixture synthesis creates measured canonical narration and marks it test-only", async () => {
  const root = await createNarrationProject();
  const result = await synthesizeNarration(root, { adapter: "fixture-tts" });
  const timing = await readJson(path.join(root, ".publish", "narration-timing.json"));
  const cues = await readJson(path.join(root, "script", "cues.json"));

  assert.equal(result.adapter, "fixture-tts");
  assert.equal(result.providerCalls, 2);
  assert.equal(result.reusedCues, 0);
  assert.equal(result.testOnly, true);
  assert.equal(await exists(path.join(root, ".publish", "narration.wav")), true);
  assert.equal((await readFile(path.join(root, ".publish", "narration.wav"))).length > 44, true);
  assert.equal(timing.source, "measured");
  assert.equal(timing.testOnly, true);
  assert.equal(timing.cues.length, 2);
  assert.equal(timing.cues[1].start > timing.cues[0].start, true);
  assert.equal(cues.cues.every((cue) => cue.caption === cue.tts && !cue.tts.includes("_")), true);
});

test("synthesis cache reuses valid cues and recovery regenerates only invalid inputs", async () => {
  const root = await createNarrationProject();
  await synthesizeNarration(root, { adapter: "fixture-tts" });
  const cached = await synthesizeNarration(root, { adapter: "fixture-tts" });

  assert.equal(cached.providerCalls, 0);
  assert.equal(cached.reusedCues, 2);

  await writeFile(path.join(root, ".publish", "narration", "C01.wav"), "corrupt", "utf8");
  const recovered = await recoverNarration(root, { adapter: "fixture-tts" });
  assert.equal(recovered.providerCalls, 1);
  assert.equal(recovered.reusedCues, 1);

  const narrationPath = path.join(root, "script", "narration.json");
  const narration = await readJson(narrationPath);
  narration.canonicalText[1].text = "权重改变后，只重新生成这一句。";
  await writeJsonAtomic(narrationPath, narration);
  const changed = await recoverNarration(root, { adapter: "fixture-tts" });
  assert.equal(changed.providerCalls, 1);
  assert.equal(changed.reusedCues, 1);
});

test("uncached Edge synthesis stops before provider execution without network authorization", async () => {
  const root = await createNarrationProject();
  await assert.rejects(() => synthesizeNarration(root, { adapter: "edge-tts" }), /--allow-network/);
  assert.equal(await exists(path.join(root, ".publish", "narration", "C01-edge.mp3")), false);
});
