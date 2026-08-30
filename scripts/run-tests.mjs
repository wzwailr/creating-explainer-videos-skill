import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testRoot = path.join(packageRoot, "test");
const testFiles = readdirSync(testRoot)
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => path.join(testRoot, name));

if (testFiles.length === 0) {
  console.error("ERROR no test files found");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  cwd: packageRoot,
  stdio: "inherit",
  windowsHide: true,
});

if (result.error) {
  console.error(`ERROR unable to start Node test runner: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
