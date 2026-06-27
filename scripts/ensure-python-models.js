/* eslint-disable @typescript-eslint/no-require-imports */
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const requirementsPath = path.join(rootDir, "Models", "requirements.txt");
const pythonBin =
  process.env.PYTHON_BIN ||
  process.env.PYTHON ||
  (process.platform === "win32" ? "python" : "python3");

const probe = [
  "import joblib, pandas, sklearn",
  "assert sklearn.__version__ == '1.7.2', sklearn.__version__",
  "print('Python model dependencies are ready.')",
].join("; ");

function runPython(args, stdio = "inherit") {
  return execFileSync(pythonBin, args, {
    cwd: rootDir,
    stdio,
    env: process.env,
    windowsHide: true,
  });
}

try {
  runPython(["-c", probe]);
} catch {
  console.log("Installing Goalix Python model dependencies...");
  try {
    runPython(["-m", "pip", "install", "-r", requirementsPath]);
    runPython(["-c", probe]);
  } catch (error) {
    console.error(
      `Unable to prepare the Goalix Python models with "${pythonBin}". ` +
        `Set PYTHON_BIN to a valid Python executable, then run: ` +
        `"${pythonBin}" -m pip install -r "${requirementsPath}"`,
    );
    process.exit(error.status || 1);
  }
}
