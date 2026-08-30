import { readFile } from "node:fs/promises";
import path from "node:path";

import { readJson, writeJsonAtomic } from "./json.mjs";

export function normalizeSpokenText(value) {
  return String(value ?? "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\_+/g, " ")
    .replace(/[`*_~#]+/g, (marks) => marks.includes("_") ? " " : "")
    .replace(/_+/g, " ")
    .replace(/\\([`*~#])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCaptionCues(narration, timing) {
  if (!Array.isArray(narration) || narration.length === 0) throw new Error("narration must contain at least one row");
  if (!Array.isArray(timing) || timing.length !== narration.length) throw new Error("timing rows must match narration rows");
  const timingById = new Map(timing.map((row) => [row.id, row]));
  let previousEnd = 0;
  return narration.map((row, index) => {
    if (!row?.id || typeof row.text !== "string") throw new Error(`invalid narration row at index ${index}`);
    const measured = timingById.get(row.id);
    if (!measured) throw new Error(`missing timing for narration cue ${row.id}`);
    const start = Number(measured.start);
    const duration = Number(measured.duration);
    if (!Number.isFinite(start) || !Number.isFinite(duration) || start < 0 || duration <= 0) {
      throw new Error(`invalid timing for narration cue ${row.id}`);
    }
    if (start < previousEnd - .02) throw new Error(`timing overlaps before narration cue ${row.id}`);
    previousEnd = start + duration;
    const canonical = normalizeSpokenText(row.text);
    if (!canonical) throw new Error(`narration cue ${row.id} is empty after normalization`);
    if (canonical.includes("_")) throw new Error(`narration cue ${row.id} still contains underscore`);
    return {
      id: row.id,
      sceneId: row.sceneId || `S${String(index + 1).padStart(2, "0")}`,
      start,
      duration,
      caption: canonical,
      tts: canonical,
      focus: row.focus || "",
      visualEvent: row.visualEvent || "",
    };
  });
}

export async function importNarrationTiming(projectRoot, timingSource) {
  const root = path.resolve(projectRoot);
  const narrationDocument = await readJson(path.join(root, "script", "narration.json"));
  const timing = typeof timingSource === "string"
    ? JSON.parse(await readFile(path.resolve(timingSource), "utf8"))
    : timingSource;
  const rows = narrationDocument.canonicalText;
  const cues = buildCaptionCues(rows, timing);
  const duration = Math.max(...cues.map((cue) => cue.start + cue.duration));
  const timingDocument = {
    schemaVersion: 1,
    source: "measured",
    duration,
    cues: cues.map(({ id, start, duration: cueDuration }) => ({ id, start, duration: cueDuration })),
  };
  const cuesDocument = {
    schemaVersion: 1,
    timingSource: "measured",
    duration,
    complete: true,
    cues,
  };
  await writeJsonAtomic(path.join(root, ".publish", "narration-timing.json"), timingDocument);
  await writeJsonAtomic(path.join(root, "script", "cues.json"), cuesDocument);
  return { timing: timingDocument, cues: cuesDocument };
}
