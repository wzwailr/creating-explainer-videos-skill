#!/usr/bin/env node

import { runProjectCli } from "../runtime/cli.mjs";

runProjectCli(process.argv.slice(2)).then(({ exitCode }) => {
  process.exitCode = exitCode;
}).catch((error) => {
  console.error(`ERROR ${error.message}`);
  process.exitCode = 1;
});

