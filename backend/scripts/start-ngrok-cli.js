import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const PORT = process.env.NGROK_PORT ? Number(process.env.NGROK_PORT) : 3002;

const require = createRequire(import.meta.url);

function tryGetLocalNgrokBinFromDotBin() {
  // Prefer local project binary to avoid global installs and avoid bunx/npx shims.
  // This runs ngrok as a direct child process from a Node script.
  const bin = process.platform === "win32" ? "ngrok.cmd" : "ngrok";
  const candidate = path.resolve(process.cwd(), "node_modules", ".bin", bin);
  return fs.existsSync(candidate) ? candidate : null;
}

function tryGetLocalNgrokBinFromPackageJson() {
  // Fallback: resolve `ngrok` package and use its declared `bin` entry.
  // This is useful if `.bin/` shims aren't present for some reason.
  try {
    const pkgJsonPath = require.resolve("ngrok/package.json");
    const pkgDir = path.dirname(pkgJsonPath);
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));

    if (!pkg.bin) return null;

    const binRel =
      typeof pkg.bin === "string"
        ? pkg.bin
        : pkg.bin.ngrok || Object.values(pkg.bin)[0];

    if (!binRel) return null;
    const candidate = path.resolve(pkgDir, binRel);
    return fs.existsSync(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function resolveNgrokLaunch() {
  const dotBin = tryGetLocalNgrokBinFromDotBin();
  if (dotBin) return { cmd: dotBin, args: ["http", String(PORT)] };

  const pkgBin = tryGetLocalNgrokBinFromPackageJson();
  if (pkgBin) {
    // If the bin is a JS entrypoint, run it with Node explicitly.
    if (pkgBin.endsWith(".js") || pkgBin.endsWith(".mjs") || pkgBin.endsWith(".cjs")) {
      return { cmd: process.execPath, args: [pkgBin, "http", String(PORT)] };
    }
    return { cmd: pkgBin, args: ["http", String(PORT)] };
  }

  // Last resort: rely on PATH
  return { cmd: "ngrok", args: ["http", String(PORT)] };
}

const launch = resolveNgrokLaunch();
console.log(`[ngrok] launching: ${launch.cmd} ${launch.args.join(" ")}`);

const child = spawn(launch.cmd, launch.args, {
  stdio: "inherit",
  env: process.env,
});

const forwardSignal = (signal) => {
  try {
    child.kill(signal);
  } catch {
    // ignore
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

