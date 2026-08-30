#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  installSkill,
  installedSkillPath,
  rollbackSkill,
  uninstallSkill,
  verifyInstalledSkill,
} from "../lib/installer.mjs";
import { discoverExtensions } from "../lib/extensions.mjs";

const packageRoot = path.resolve(import.meta.dirname, "..");
const defaultSource = path.join(packageRoot, "skill", "creating-ai-principle-videos");
const defaultManifest = path.join(packageRoot, "skill-manifest.json");

function parseArgs(argv) {
  const args = [...argv];
  const command = args[0] && !args[0].startsWith("-") ? args.shift() : "install";
  const options = { command, json: false };
  while (args.length) {
    const flag = args.shift();
    if (flag === "--json") options.json = true;
    else if (flag === "--source") options.source = args.shift();
    else if (flag === "--codex-home") options.codexHome = args.shift();
    else if (flag === "--destination") options.destination = args.shift();
    else if (flag === "--target") options.target = args.shift();
    else if (flag === "--backup") options.backupPath = args.shift();
    else throw new Error(`unknown option: ${flag}`);
  }
  if (options.destination && options.codexHome) {
    throw new Error("use either --destination or --codex-home, not both");
  }
  return options;
}

function print(value, asJson) {
  if (asJson) console.log(JSON.stringify(value, null, 2));
  else if (typeof value === "string") console.log(value);
  else console.log(JSON.stringify(value, null, 2));
}

function commandExists(command, args = ["--version"]) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true });
  return { available: result.status === 0, version: result.status === 0 ? result.stdout.trim() || result.stderr.trim() : null };
}

async function packageVersion() {
  return JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8")).version;
}

function helpText() {
  return `AI Principle Video Skill installer

Usage:
  ai-principle-video-skill [install|update] [--target codex | --destination SKILLS_DIR] [--source PATH]
  ai-principle-video-skill verify [--target codex | --destination SKILLS_DIR]
  ai-principle-video-skill rollback [--target codex | --destination SKILLS_DIR] [--backup PATH]
  ai-principle-video-skill uninstall [--target codex | --destination SKILLS_DIR]
  ai-principle-video-skill list-extensions [--target codex | --destination SKILLS_DIR] [--source PATH]
  ai-principle-video-skill doctor [--json]
  ai-principle-video-skill --version

No command defaults to install. --destination makes the package product-neutral.
Existing installations are backed up before update.`;
}

async function main() {
  const raw = process.argv.slice(2);
  if (raw.includes("--help") || raw.includes("-h")) {
    console.log(helpText());
    return;
  }
  if (raw.includes("--version") || raw.includes("-v")) {
    console.log(await packageVersion());
    return;
  }
  const options = parseArgs(raw);
  switch (options.command) {
    case "install":
    case "update": {
      const result = await installSkill({
        source: options.source ? path.resolve(options.source) : defaultSource,
        codexHome: options.codexHome,
        destination: options.destination,
        target: options.target,
        manifestPath: options.source ? undefined : defaultManifest,
      });
      print(result, options.json);
      return;
    }
    case "verify": {
      const result = await verifyInstalledSkill({
        codexHome: options.codexHome,
        destination: options.destination,
        target: options.target,
      });
      print(result, options.json);
      if (!result.valid) process.exitCode = 1;
      return;
    }
    case "uninstall": {
      print(await uninstallSkill({
        codexHome: options.codexHome,
        destination: options.destination,
        target: options.target,
      }), options.json);
      return;
    }
    case "rollback": {
      print(await rollbackSkill({
        codexHome: options.codexHome,
        destination: options.destination,
        target: options.target,
        backupPath: options.backupPath,
      }), options.json);
      return;
    }
    case "list-extensions": {
      const root = options.source ? path.resolve(options.source) : installedSkillPath({
        codexHome: options.codexHome,
        destination: options.destination,
        target: options.target,
      });
      const extensions = await discoverExtensions(root);
      print(extensions.map(({ id, type, version, displayName, valid, errors }) => ({ id, type, version, displayName, valid, errors })), options.json);
      if (extensions.some((item) => !item.valid)) process.exitCode = 1;
      return;
    }
    case "doctor": {
      const result = {
        node: { available: true, version: process.version },
        npm: commandExists("npm"),
        python: commandExists("python"),
        ffmpeg: commandExists("ffmpeg", ["-version"]),
        ffprobe: commandExists("ffprobe", ["-version"]),
      };
      print(result, options.json);
      return;
    }
    default:
      throw new Error(`unknown command: ${options.command}\n\n${helpText()}`);
  }
}

main().catch((error) => {
  console.error(`ERROR ${error.message}`);
  process.exitCode = 1;
});
