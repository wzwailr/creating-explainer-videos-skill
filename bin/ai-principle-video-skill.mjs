#!/usr/bin/env node

import { runCli } from "../lib/cli.mjs";

console.error("DEPRECATED ai-principle-video-skill is now explainer-video-skill; forwarding to the v2 CLI.");

runCli(process.argv.slice(2)).then(({ exitCode }) => {
  process.exitCode = exitCode;
}).catch((error) => {
  console.error(`ERROR ${error.message}`);
  process.exitCode = 1;
});
