import { createHash } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort((left, right) => left.localeCompare(right, "en"))
        .map((key) => [key, sortValue(value[key])]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(path.resolve(filePath), "utf8"));
}

export async function writeJsonAtomic(filePath, value) {
  const target = path.resolve(filePath);
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, stableStringify(value), "utf8");
  try {
    await rename(temporary, target);
  } catch (error) {
    if (!new Set(["EEXIST", "EPERM"]).has(error.code)) throw error;
    await rm(target, { force: true });
    await rename(temporary, target);
  }
}

export async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(path.resolve(filePath))).digest("hex");
}

