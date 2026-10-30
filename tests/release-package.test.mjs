import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const script = fileURLToPath(new URL("../scripts/package-release.mjs", import.meta.url));
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "curricule-release-test-"));
  try {
    mkdirSync(join(root, ".next", "standalone"), { recursive: true });
    writeFileSync(join(root, ".next", "standalone", "server.js"), "// synthetic entrypoint");
    writeFileSync(join(root, "package.json"), JSON.stringify({ version: "0.1.0" }));
    run(root);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith("curricule-release-test-"));
    rmSync(root, { recursive: true });
  }
}
function packageFixture(root, extra = {}) {
  return spawnSync(process.execPath, [script], { cwd: root, env: { ...process.env, GITHUB_SHA: "a".repeat(40), GITHUB_RUN_NUMBER: "42", GITHUB_OUTPUT: join(root, "outputs"), ...extra }, encoding: "utf8" });
}

test("release package binds version, source commit and checksum to the same archive", () => fixture(root => {
  const result = packageFixture(root);
  assert.equal(result.status, 0, result.stderr);
  const bytes = readFileSync(join(root, "dist", "curricule-linux-x64.tgz"));
  const digest = createHash("sha256").update(bytes).digest("hex");
  assert.deepEqual(JSON.parse(readFileSync(join(root, "dist", "release.json"), "utf8")), { version: "v0.1.42", commit: "a".repeat(40), sha256: digest });
  assert.equal(readFileSync(join(root, "dist", "SHA256SUMS"), "utf8"), `${digest}  curricule-linux-x64.tgz\n`);
  const names = execFileSync("tar", ["-tzf", join(root, "dist", "curricule-linux-x64.tgz")], { encoding: "utf8" });
  assert.match(names, /RELEASE_COMMIT/);
  assert.match(names, /RELEASE_VERSION/);
  assert.match(readFileSync(join(root, "outputs"), "utf8"), /version=v0.1.42/);
}));

test("release package refuses missing or malformed source identity", () => {
  for (const extra of [{ GITHUB_SHA: "master" }, { GITHUB_RUN_NUMBER: "0" }, { GITHUB_RUN_NUMBER: "42;id" }]) fixture(root => {
    assert.notEqual(packageFixture(root, extra).status, 0);
    assert.equal(existsSync(join(root, "dist", "curricule-linux-x64.tgz")), false);
  });
});

test("release package refuses developer environment files", () => fixture(root => {
  writeFileSync(join(root, ".next", "standalone", ".env.production"), "SYNTHETIC_SECRET=do-not-package");
  assert.notEqual(packageFixture(root).status, 0);
  assert.equal(existsSync(join(root, "dist", "curricule-linux-x64.tgz")), false);
}));
