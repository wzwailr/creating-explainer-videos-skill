import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  installSkill,
  installedSkillPath,
  rollbackSkill,
  uninstallSkill,
  verifyInstalledSkill,
} from "./installer.mjs";
import { discoverExtensions } from "./extensions.mjs";
import {
  isProjectCommand,
  runProjectCli,
} from "../skill/creating-explainer-videos/runtime/cli.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSource = path.join(packageRoot, "skill", "creating-explainer-videos");
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

function print(value, asJson, output) {
  if (asJson) output(JSON.stringify(value, null, 2));
  else if (typeof value === "string") output(value);
  else output(JSON.stringify(value, null, 2));
}

async function packageVersion() {
  return JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8")).version;
}

export function helpText() {
  return `Explainer Video Skill installer and scaffold

Usage:
  explainer-video-skill [install|update] [--target codex | --destination SKILLS_DIR] [--source PATH]
  explainer-video-skill verify [--target codex | --destination SKILLS_DIR]
  explainer-video-skill rollback [--target codex | --destination SKILLS_DIR] [--backup PATH]
  explainer-video-skill uninstall [--target codex | --destination SKILLS_DIR]
  explainer-video-skill list-extensions [--target codex | --destination SKILLS_DIR] [--source PATH]
  explainer-video-skill doctor [--json]
  explainer-video-skill new PROJECT_DIR --title TITLE --topic TOPIC [--template ID] [--json]
  explainer-video-skill status|next [PROJECT_DIR] [--json]
  explainer-video-skill validate STAGE [PROJECT_DIR] [--json]
  explainer-video-skill templates list|inspect|preview [ID] [--json]
  explainer-video-skill visual validate|compile PROJECT_DIR [--json]
  explainer-video-skill visual preview PROJECT_DIR --output FILE [--json]
  explainer-video-skill narration adapters [--json]
  explainer-video-skill narration doctor PROJECT_DIR --adapter ID [--json]
  explainer-video-skill narration prepare PROJECT_DIR [--json]
  explainer-video-skill narration synthesize|recover PROJECT_DIR --adapter ID [--allow-network] [--authorize-provider-cost] [--json]
  explainer-video-skill narration import-timing PROJECT_DIR --timing FILE [--json]
  explainer-video-skill build|render|cover|mux|audit|package [PROJECT_DIR] [--json]
  explainer-video-skill --version

No command defaults to install. --destination supports any Agent skills directory.
Existing installations are backed up before update.`;
}

export async function runCli(argv, io = {}) {
  const output = io.output || console.log;
  const raw = [...argv];
  if (raw.includes("--help") || raw.includes("-h")) {
    output(helpText());
    return { exitCode: 0 };
  }
  if (raw.includes("--version") || raw.includes("-v")) {
    output(await packageVersion());
    return { exitCode: 0 };
  }

  if (isProjectCommand(raw[0])) {
    return runProjectCli(raw, io);
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
      print(result, options.json, output);
      return { exitCode: 0, result };
    }
    case "verify": {
      const result = await verifyInstalledSkill({
        codexHome: options.codexHome,
        destination: options.destination,
        target: options.target,
      });
      print(result, options.json, output);
      return { exitCode: result.valid ? 0 : 1, result };
    }
    case "uninstall": {
      const result = await uninstallSkill({
        codexHome: options.codexHome,
        destination: options.destination,
        target: options.target,
      });
      print(result, options.json, output);
      return { exitCode: 0, result };
    }
    case "rollback": {
      const result = await rollbackSkill({
        codexHome: options.codexHome,
        destination: options.destination,
        target: options.target,
        backupPath: options.backupPath,
      });
      print(result, options.json, output);
      return { exitCode: 0, result };
    }
    case "list-extensions": {
      const root = options.source ? path.resolve(options.source) : installedSkillPath({
        codexHome: options.codexHome,
        destination: options.destination,
        target: options.target,
      });
      const extensions = await discoverExtensions(root);
      const result = extensions.map(({ id, type, version, displayName, valid, errors }) => ({
        id,
        type,
        version,
        displayName,
        valid,
        errors,
      }));
      print(result, options.json, output);
      return { exitCode: extensions.some((item) => !item.valid) ? 1 : 0, result };
    }
    default:
      throw new Error(`unknown command: ${options.command}\n\n${helpText()}`);
  }
}
