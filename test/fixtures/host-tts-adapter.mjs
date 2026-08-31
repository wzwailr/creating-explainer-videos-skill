#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function wavBuffer(duration = .2, sampleRate = 48000, channels = 2) {
  const samples = Math.max(1, Math.round(duration * sampleRate));
  const bytesPerSample = 2;
  const dataSize = samples * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function main() {
  const requestPath = option("--request");
  const responsePath = option("--response");
  const mode = option("--mode") || "valid";
  if (!requestPath || !responsePath) throw new Error("request and response paths are required");
  if (mode === "malformed") {
    await writeFile(responsePath, "not json", "utf8");
    return;
  }
  const request = JSON.parse(await readFile(requestPath, "utf8"));
  await mkdir(path.dirname(request.output.audioPath), { recursive: true });
  await writeFile(request.output.audioPath, wavBuffer());
  await writeFile(responsePath, `${JSON.stringify({
    protocolVersion: 1,
    status: "completed",
    audioPath: request.output.audioPath,
    providerTaskId: "fixture-host-task",
    diagnostics: [],
  })}\n`, "utf8");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
