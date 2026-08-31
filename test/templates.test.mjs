import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoverTemplates,
  installTemplate,
  templatePreview,
  validateTemplate,
} from "../skill/creating-explainer-videos/runtime/templates.mjs";
import { createMotionController as createSpatialMotionController } from "../skill/creating-explainer-videos/templates/spatial-chamber/motion.mjs";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "skill", "creating-explainer-videos");

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

test("built-in collection exposes three structurally distinct templates", async () => {
  const templates = await discoverTemplates(skillRoot);

  assert.deepEqual(templates.map((item) => item.id), ["ink-explainer", "paper-theatre", "spatial-chamber"]);
  assert.equal(templates.every((item) => item.valid), true);
  assert.equal(new Set(templates.map((item) => item.manifest.motionGrammar.fingerprint)).size, 3);
  assert.equal(new Set(templates.map((item) => item.manifest.domFingerprint)).size, 3);
});

test("spatial chamber preserves depth/path semantics and licensed-plugin fallbacks", async () => {
  const template = await validateTemplate(path.join(skillRoot, "templates", "spatial-chamber"));

  assert.equal(template.valid, true, template.errors.join("\n"));
  assert.deepEqual(template.manifest.capabilities.required, ["perspective", "path-motion", "depth-layout"]);
  assert.equal(template.manifest.fallbacks.MotionPathPlugin, "svg-path-sampling");
  assert.equal(template.manifest.fallbacks.DrawSVGPlugin, "stroke-dashoffset");
  assert.match(await readFile(path.join(template.root, "scene.css"), "utf8"), /perspective/);
});

test("spatial chamber animates every compiled signal route", () => {
  const dots = [{ style: {} }, { style: {} }];
  const paths = dots.map((dot, index) => ({
    getTotalLength: () => 100,
    getPointAtLength: (distance) => ({ x: distance, y: index * 20 }),
    parentElement: { querySelector: () => dot },
    style: {},
  }));
  const root = {
    querySelector: (selector) => selector === "[data-signal-path]" ? paths[0] : selector === "[data-signal-dot]" ? dots[0] : null,
    querySelectorAll: (selector) => selector === "[data-motion='depth']" ? [] : selector === "[data-signal-path]" ? paths : [],
  };

  const controller = createSpatialMotionController({ root, duration: 1, gsap: null });
  controller.seek(.5);

  assert.equal(dots[0].style.transform, "translate(50px,0px)");
  assert.equal(dots[1].style.transform, "translate(50px,20px)");
  assert.notEqual(paths[1].style.strokeDashoffset, undefined);
});

test("template installs only declared assets and produces a preview", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-template-install-"));
  const installed = await installTemplate("paper-theatre", projectRoot, { skillRoot });
  const preview = await templatePreview("paper-theatre", { title: "清算流程", topic: "授权到结算" }, { skillRoot });

  assert.equal(installed.id, "paper-theatre");
  for (const file of ["template.json", "scene.css", "motion.mjs", "cover.css"]) {
    assert.equal(await exists(path.join(projectRoot, "renderer", "template", file)), true, file);
  }
  assert.match(preview.html, /清算流程/);
  assert.match(preview.html, /paper-theatre/);
});
