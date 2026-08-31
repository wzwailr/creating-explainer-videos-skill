import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { readJson, sha256File, stableStringify, writeJsonAtomic } from "./json.mjs";
import { importNarrationTiming, normalizeSpokenText } from "./narration.mjs";
import { runChecked, runProcess } from "./process.mjs";

const BUILTIN_ADAPTERS = Object.freeze([
  Object.freeze({
    id: "edge-tts",
    displayName: "Edge TTS",
    protocolVersion: 1,
    network: true,
    cost: "free",
    testOnly: false,
    executable: "python -m edge_tts",
  }),
  Object.freeze({
    id: "fixture-tts",
    displayName: "Deterministic fixture audio",
    protocolVersion: 1,
    network: false,
    cost: "none",
    testOnly: true,
    executable: "ffmpeg",
  }),
  Object.freeze({
    id: "host-command",
    displayName: "Trusted host command",
    protocolVersion: 1,
    network: null,
    cost: "unknown",
    testOnly: false,
    executable: "configured-by-host",
  }),
]);

const COSTS = new Set(["none", "free", "paid", "unknown"]);

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function listVoiceAdapters() {
  return BUILTIN_ADAPTERS.map((adapter) => ({ ...adapter }));
}

export function adapterDescriptor(id, hostConfig = null) {
  if (id === "host-command" && hostConfig) {
    return {
      ...BUILTIN_ADAPTERS.find((adapter) => adapter.id === "host-command"),
      id: hostConfig.id,
      adapterType: "host-command",
      network: hostConfig.network,
      cost: hostConfig.cost,
      executable: hostConfig.executable,
    };
  }
  const adapter = BUILTIN_ADAPTERS.find((item) => item.id === id);
  if (!adapter) throw new Error(`unknown voice adapter: ${id}`);
  return { ...adapter };
}

export function buildEdgeTtsInvocation(request) {
  const cue = request?.cue ?? {};
  const output = request?.output ?? {};
  if (!cue.text || !output.audioPath) throw new Error("Edge TTS request requires cue text and output audio path");
  return {
    command: "python",
    args: [
      "-m",
      "edge_tts",
      "--voice",
      cue.voice || "zh-CN-YunxiNeural",
      `--rate=${cue.rate || "+0%"}`,
      `--pitch=${cue.pitch || "+0Hz"}`,
      "--text",
      cue.text,
      "--write-media",
      output.audioPath,
    ],
  };
}

export function assertAdapterAuthorization(adapter, options = {}, cacheMissCount = 1) {
  if (Number(cacheMissCount) <= 0) return;
  if (adapter.network === true && options.allowNetwork !== true) {
    throw new Error(`${adapter.id} requires --allow-network before uncached synthesis`);
  }
  if (new Set(["paid", "unknown"]).has(adapter.cost) && options.authorizeProviderCost !== true) {
    throw new Error(`${adapter.id} requires --authorize-provider-cost before uncached synthesis`);
  }
}

async function diagnosticRun(command, args, options) {
  if (options.runner) return options.runner(command, args, { encoding: "utf8", windowsHide: true });
  return runProcess(command, args, { timeout: 30_000 });
}

export async function doctorVoiceAdapter(projectRoot, options = {}) {
  const adapterId = options.adapter || "edge-tts";
  if (adapterId === "edge-tts") {
    const result = await diagnosticRun("python", ["-m", "edge_tts", "--version"], options);
    return {
      id: adapterId,
      status: result?.status === 0 ? "available" : "missing",
      version: result?.status === 0 ? String(result.stdout || result.stderr || "").trim().split(/\r?\n/)[0] || null : null,
      networkRequired: true,
      cost: "free",
      testOnly: false,
      invoked: false,
    };
  }
  if (adapterId === "fixture-tts") {
    const result = await diagnosticRun(options.ffmpeg || "ffmpeg", ["-version"], options);
    return {
      id: adapterId,
      status: result?.status === 0 ? "available" : "missing",
      version: result?.status === 0 ? String(result.stdout || result.stderr || "").trim().split(/\r?\n/)[0] || null : null,
      networkRequired: false,
      cost: "none",
      testOnly: true,
      invoked: false,
    };
  }
  if (adapterId === "host-command") {
    try {
      const config = await loadHostAdapterConfig(projectRoot, options.adapterConfig);
      return {
        id: config.id,
        adapterType: "host-command",
        status: "configured",
        executableSha256: config.executableSha256,
        networkRequired: config.network,
        cost: config.cost,
        testOnly: config.testOnly === true,
        invoked: false,
      };
    } catch (error) {
      return { id: adapterId, status: "misconfigured", error: error.message, invoked: false };
    }
  }
  throw new Error(`unknown voice adapter: ${adapterId}`);
}

export async function loadHostAdapterConfig(projectRoot, configPath) {
  const root = path.resolve(projectRoot);
  const target = path.resolve(configPath || path.join(root, ".publish", "tts-adapter.json"));
  const allowedConfigRoots = [path.join(root, ".publish"), path.join(root, "toolchain")];
  if (!allowedConfigRoots.some((allowed) => isInside(allowed, target))) {
    throw new Error("host adapter config must be inside project .publish or toolchain");
  }
  const config = await readJson(target);
  if (config.schemaVersion !== 1 || config.protocolVersion !== 1) throw new Error("host adapter config must use schemaVersion 1 and protocolVersion 1");
  if (typeof config.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(config.id)) throw new Error("host adapter id must be a lowercase slug");
  if (typeof config.executable !== "string" || !path.isAbsolute(config.executable)) throw new Error("host adapter executable must be an absolute path");
  if (!(await exists(config.executable))) throw new Error(`host adapter executable is missing: ${config.executable}`);
  if (!/^[a-f0-9]{64}$/i.test(config.executableSha256 ?? "")) throw new Error("host adapter executableSha256 must be a SHA-256 hash");
  const actualHash = await sha256File(config.executable);
  if (actualHash.toLowerCase() !== config.executableSha256.toLowerCase()) throw new Error("host adapter executable hash mismatch");
  if (config.args !== undefined && (!Array.isArray(config.args) || config.args.some((argument) => typeof argument !== "string"))) throw new Error("host adapter args must be strings");
  if (typeof config.network !== "boolean") throw new Error("host adapter network must be boolean");
  if (!COSTS.has(config.cost)) throw new Error("host adapter cost must be none, free, paid, or unknown");
  return { ...config, args: [...(config.args ?? [])], configPath: target };
}

export async function runHostAdapterCue(projectRoot, config, request, options = {}) {
  const root = path.resolve(projectRoot);
  const narrationRoot = path.join(root, ".publish", "narration");
  const requestedOutput = path.resolve(request?.output?.audioPath || "");
  if (!isInside(narrationRoot, requestedOutput)) throw new Error("host adapter output must stay inside .publish/narration");
  if (request?.protocolVersion !== 1 || request?.output?.format !== "wav") throw new Error("host adapter request must use protocolVersion 1 and WAV output");
  await mkdir(narrationRoot, { recursive: true });
  const requestId = String(request.requestId || request.cue?.id || "cue").replace(/[^A-Za-z0-9-]+/g, "-");
  const requestPath = path.join(narrationRoot, `${requestId}.adapter-request.json`);
  const responsePath = path.join(narrationRoot, `${requestId}.adapter-response.json`);
  await rm(responsePath, { force: true });
  await writeJsonAtomic(requestPath, request);
  const isNodeModule = new Set([".mjs", ".cjs", ".js"]).has(path.extname(config.executable).toLowerCase());
  const command = isNodeModule ? process.execPath : config.executable;
  const args = [...(isNodeModule ? [config.executable] : []), ...(config.args ?? []), "--request", requestPath, "--response", responsePath];
  await runChecked(command, args, { cwd: root, runner: options.runner, label: `host voice adapter ${config.id}` });
  let response;
  try {
    response = JSON.parse(await readFile(responsePath, "utf8"));
  } catch {
    throw new Error("host adapter response is not valid JSON");
  }
  if (response.protocolVersion !== 1 || response.status !== "completed") throw new Error("host adapter response must report protocolVersion 1 and completed status");
  if (path.resolve(response.audioPath || "") !== requestedOutput) throw new Error("host adapter response audio path does not match the requested output");
  if (!isInside(narrationRoot, response.audioPath)) throw new Error("host adapter response escaped .publish/narration");
  const audioStat = await stat(response.audioPath).catch(() => null);
  if (!audioStat?.isFile() || audioStat.size <= 44) throw new Error("host adapter did not produce a non-empty WAV file");
  return { ...response, requestPath, responsePath, audioBytes: audioStat.size };
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalCue(row, project, options) {
  const text = normalizeSpokenText(row?.text);
  if (!row?.id || !text) throw new Error(`invalid narration cue ${row?.id || "without-id"}`);
  if (text.includes("_")) throw new Error(`narration cue ${row.id} still contains underscore`);
  return {
    id: row.id,
    sceneId: row.sceneId || "S01",
    text,
    language: project.language || "zh-CN",
    voice: row.voice || options.voice || "zh-CN-YunxiNeural",
    rate: row.rate || options.rate || "+0%",
    pitch: row.pitch || options.pitch || "+0Hz",
    focus: row.focus || "",
    visualEvent: row.visualEvent || "",
  };
}

function inputHash(adapterId, cue) {
  return sha256Text(stableStringify({
    adapter: adapterId,
    format: "wav-pcm-s16le-48000-stereo",
    id: cue.id,
    language: cue.language,
    pitch: cue.pitch,
    rate: cue.rate,
    text: cue.text,
    voice: cue.voice,
  }));
}

async function readCache(cachePath, adapterId) {
  if (!(await exists(cachePath))) return { schemaVersion: 1, adapter: adapterId, entries: [] };
  const cache = await readJson(cachePath);
  if (cache.schemaVersion !== 1 || cache.adapter !== adapterId || !Array.isArray(cache.entries)) {
    return { schemaVersion: 1, adapter: adapterId, entries: [] };
  }
  return cache;
}

async function probeDuration(filePath, options = {}) {
  const result = await runChecked(options.ffprobe || "ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ], { runner: options.runner, label: "ffprobe narration duration" });
  const duration = Number(String(result.stdout).trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`unable to measure narration audio: ${filePath}`);
  return Number(duration.toFixed(6));
}

async function validCacheEntry(entry, expectedHash, audioPath, options) {
  if (!entry || entry.inputSha256 !== expectedHash || path.resolve(entry.audioPath || "") !== path.resolve(audioPath)) return false;
  const audioStat = await stat(audioPath).catch(() => null);
  if (!audioStat?.isFile() || audioStat.size !== entry.bytes || audioStat.size <= 44) return false;
  if (await sha256File(audioPath) !== entry.audioSha256) return false;
  try {
    const duration = await probeDuration(audioPath, options);
    return Math.abs(duration - Number(entry.speechDuration)) <= .01;
  } catch {
    return false;
  }
}

async function synthesizeFixture(rawPath, cue, options) {
  const duration = Math.max(.4, Math.min(2, cue.text.length / 10));
  const frequency = 360 + (Number.parseInt(sha256Text(cue.id).slice(0, 4), 16) % 280);
  await runChecked(options.ffmpeg || "ffmpeg", [
    "-y",
    "-f", "lavfi",
    "-i", `sine=frequency=${frequency}:sample_rate=48000:duration=${duration.toFixed(3)}`,
    "-ac", "2",
    "-c:a", "pcm_s16le",
    rawPath,
  ], { runner: options.runner, label: `fixture TTS ${cue.id}` });
  return { attempts: 1, providerTaskId: null };
}

async function synthesizeEdge(rawPath, cue, options) {
  const invocation = buildEdgeTtsInvocation({ cue, output: { audioPath: rawPath } });
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await rm(rawPath, { force: true });
    try {
      await runChecked(invocation.command, invocation.args, { runner: options.runner, label: `Edge TTS ${cue.id}` });
      const rawStat = await stat(rawPath).catch(() => null);
      if (rawStat?.isFile() && rawStat.size > 0) return { attempts: attempt, providerTaskId: null };
      lastError = new Error(`Edge TTS ${cue.id} produced no audio`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Edge TTS ${cue.id} failed`);
}

async function normalizeAudio(rawPath, audioPath, options) {
  await rm(audioPath, { force: true });
  await runChecked(options.ffmpeg || "ffmpeg", [
    "-y",
    "-i", rawPath,
    "-af", "silenceremove=start_periods=1:start_silence=0.04:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-45dB,areverse",
    "-ar", "48000",
    "-ac", "2",
    "-c:a", "pcm_s16le",
    audioPath,
  ], { runner: options.runner, label: "normalize narration cue" });
}

async function buildNarrationMix(root, rows, options) {
  const narrationRoot = path.join(root, ".publish", "narration");
  const segments = [];
  const timing = [];
  let cursor = 0;
  for (const [index, row] of rows.entries()) {
    const next = rows[index + 1];
    const gapAfter = next ? (next.cue.sceneId === row.cue.sceneId ? .12 : .28) : .9;
    const segmentPath = path.join(narrationRoot, `${row.cue.id}-segment.wav`);
    const segmentDuration = Number((row.speechDuration + gapAfter).toFixed(6));
    await runChecked(options.ffmpeg || "ffmpeg", [
      "-y",
      "-i", row.audioPath,
      "-af", `apad=pad_dur=${gapAfter}`,
      "-t", segmentDuration.toFixed(6),
      "-ar", "48000",
      "-ac", "2",
      "-c:a", "pcm_s16le",
      segmentPath,
    ], { runner: options.runner, label: `pad narration cue ${row.cue.id}` });
    segments.push(segmentPath);
    timing.push({
      id: row.cue.id,
      start: Number(cursor.toFixed(6)),
      duration: segmentDuration,
      speechDuration: row.speechDuration,
      gapAfter,
    });
    cursor += segmentDuration;
  }
  const concatPath = path.join(narrationRoot, "concat.txt");
  await writeFile(concatPath, `${segments.map((segment) => `file '${segment.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`).join("\n")}\n`, "utf8");
  const output = path.join(root, ".publish", "narration.wav");
  await rm(output, { force: true });
  await runChecked(options.ffmpeg || "ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatPath,
    "-ar", "48000",
    "-ac", "2",
    "-c:a", "pcm_s16le",
    output,
  ], { runner: options.runner, label: "concatenate narration" });
  return { output, timing, duration: await probeDuration(output, options) };
}

export async function synthesizeNarration(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const adapterId = options.adapter || "edge-tts";
  const [project, narration] = await Promise.all([
    readJson(path.join(root, "project.json")),
    readJson(path.join(root, "script", "narration.json")),
  ]);
  if (!Array.isArray(narration.canonicalText) || narration.canonicalText.length === 0) throw new Error("script/narration.json must contain canonicalText cues");
  const cues = narration.canonicalText.map((row) => canonicalCue(row, project, options));
  const narrationRoot = path.join(root, ".publish", "narration");
  await mkdir(narrationRoot, { recursive: true });
  const cachePath = path.join(root, ".publish", "narration-cache.json");
  const cache = await readCache(cachePath, adapterId);
  const entries = new Map(cache.entries.map((entry) => [entry.id, entry]));
  let hostConfig = null;
  let adapter;
  if (adapterId === "host-command") {
    hostConfig = await loadHostAdapterConfig(root, options.adapterConfig);
    adapter = adapterDescriptor("host-command", hostConfig);
  } else {
    adapter = adapterDescriptor(adapterId);
  }
  const prepared = [];
  for (const cue of cues) {
    const hash = inputHash(adapterId === "host-command" ? hostConfig.id : adapterId, cue);
    const audioPath = path.join(narrationRoot, `${cue.id}.wav`);
    const valid = await validCacheEntry(entries.get(cue.id), hash, audioPath, options);
    prepared.push({ cue, hash, audioPath, valid, entry: entries.get(cue.id) });
  }
  const misses = prepared.filter((item) => !item.valid).length;
  assertAdapterAuthorization(adapter, options, misses);
  let providerCalls = 0;
  let reusedCues = 0;
  const completed = [];
  for (const item of prepared) {
    if (item.valid) {
      reusedCues += 1;
      completed.push({ cue: item.cue, audioPath: item.audioPath, speechDuration: Number(item.entry.speechDuration) });
      continue;
    }
    providerCalls += 1;
    const rawExtension = adapterId === "edge-tts" ? ".mp3" : ".wav";
    const rawPath = path.join(narrationRoot, `${item.cue.id}-${adapterId === "host-command" ? "host" : adapterId.replace(/-tts$/, "")}-raw${rawExtension}`);
    let providerResult;
    if (adapterId === "fixture-tts") providerResult = await synthesizeFixture(rawPath, item.cue, options);
    else if (adapterId === "edge-tts") providerResult = await synthesizeEdge(rawPath, item.cue, options);
    else {
      const request = {
        protocolVersion: 1,
        requestId: item.hash.slice(0, 24),
        cue: item.cue,
        output: { audioPath: rawPath, format: "wav", sampleRate: 48000, channels: 2 },
      };
      providerResult = await runHostAdapterCue(root, hostConfig, request, options);
    }
    await normalizeAudio(rawPath, item.audioPath, options);
    const speechDuration = await probeDuration(item.audioPath, options);
    const audioStat = await stat(item.audioPath);
    const entry = {
      id: item.cue.id,
      inputSha256: item.hash,
      audioPath: item.audioPath,
      audioSha256: await sha256File(item.audioPath),
      bytes: audioStat.size,
      speechDuration,
      attempts: providerResult.attempts || 1,
      providerTaskId: providerResult.providerTaskId || null,
    };
    entries.set(item.cue.id, entry);
    cache.entries = [...entries.values()].sort((left, right) => left.id.localeCompare(right.id));
    await writeJsonAtomic(cachePath, cache);
    completed.push({ cue: item.cue, audioPath: item.audioPath, speechDuration });
  }
  const mix = await buildNarrationMix(root, completed, options);
  const imported = await importNarrationTiming(root, mix.timing, { testOnly: adapter.testOnly === true, adapter: adapterId === "host-command" ? hostConfig.id : adapterId });
  return {
    adapter: adapterId === "host-command" ? hostConfig.id : adapterId,
    adapterType: adapterId,
    audio: { path: mix.output, sha256: await sha256File(mix.output), duration: mix.duration },
    timing: imported.timing,
    cues: imported.cues,
    cache: cachePath,
    providerCalls,
    reusedCues,
    testOnly: adapter.testOnly === true,
    recovery: options.recovery === true,
  };
}

export async function recoverNarration(projectRoot, options = {}) {
  return synthesizeNarration(projectRoot, { ...options, recovery: true });
}
