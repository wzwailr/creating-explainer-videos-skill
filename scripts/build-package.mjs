import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { createSkillManifest } from "../lib/manifest.mjs";

const packageRoot = path.resolve(import.meta.dirname, "..");
const canonicalSkill = path.join(packageRoot, "skill", "creating-ai-principle-videos");
const manifestPath = path.join(packageRoot, "skill-manifest.json");
const distRoot = path.join(packageRoot, "dist");
const forbiddenExtensions = new Set([".ttf", ".otf", ".woff", ".woff2", ".mp3", ".wav", ".mp4", ".mov"]);

async function main() {
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  const manifest = await createSkillManifest({ skillRoot: canonicalSkill, packageVersion: packageJson.version });
  const forbidden = manifest.files.filter((item) => forbiddenExtensions.has(path.extname(item.path).toLowerCase()));
  if (forbidden.length) {
    throw new Error(`third-party media/font binaries are not allowed: ${forbidden.map((item) => item.path).join(", ")}`);
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Built package payload: ${manifest.files.length} files, version ${packageJson.version}`);

  if (process.argv.includes("--pack")) {
    await mkdir(distRoot, { recursive: true });
    const npmExecPath = process.env.npm_execpath;
    if (!npmExecPath) {
      throw new Error("npm_execpath is unavailable; run this build through `npm run pack:local`");
    }
    const result = spawnSync(process.execPath, [npmExecPath, "pack", "--json", "--pack-destination", distRoot], {
      cwd: packageRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || `npm pack failed with status ${result.status}`);
    }
    console.log(result.stdout.trim());
  }
}

main().catch((error) => {
  console.error(`ERROR ${error.message}`);
  process.exitCode = 1;
});
