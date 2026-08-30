#!/usr/bin/env node

import { runCli } from "../lib/cli.mjs";

runCli(process.argv.slice(2)).then(({ exitCode }) => {
  process.exitCode = exitCode;
}).catch((error) => {
  console.error(`ERROR ${error.message}`);
  process.exitCode = 1;
});

