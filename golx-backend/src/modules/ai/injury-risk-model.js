const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const MODEL_VERSION = "football_academy_injury_risk_model_v3";
const DEFAULT_TIMEOUT_MS = Number(process.env.INJURY_RISK_MODEL_TIMEOUT_MS || 60000);
const MAX_OUTPUT_BYTES = Math.max(
    64 * 1024,
    Number(process.env.MODEL_MAX_OUTPUT_BYTES || 5 * 1024 * 1024),
);

const modelDir =
    process.env.INJURY_RISK_MODEL_DIR ||
    path.resolve(__dirname, "../../../..", "Models");
const scriptPath =
    process.env.INJURY_RISK_MODEL_SCRIPT ||
    path.join(modelDir, "inference_football_academy_injury_risk_v3.py");
const projectPython =
    process.platform === "win32"
        ? path.resolve(__dirname, "../../../..", ".venv", "Scripts", "python.exe")
        : path.resolve(__dirname, "../../../..", ".venv", "bin", "python");
const pythonBin =
    resolvePythonBin([
        process.env.INJURY_RISK_PYTHON_BIN,
        process.env.PYTHON_BIN,
        process.env.PYTHON,
        projectPython,
        process.platform === "win32" ? "python" : "python3",
        "python",
    ]);

function isFilePath(value) {
    return path.isAbsolute(value) || value.includes("/") || value.includes("\\");
}

function resolvePythonBin(candidates) {
    for (const candidate of candidates.filter(Boolean)) {
        if (!isFilePath(candidate) || fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return process.platform === "win32" ? "python" : "python3";
}

function runInjuryRiskPredictions(records, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(scriptPath)) {
            reject(new Error(`Injury risk model script was not found: ${scriptPath}`));
            return;
        }

        const child = spawn(pythonBin, [scriptPath, "--json-stdin"], {
            cwd: modelDir,
            windowsHide: true,
            env: {
                PATH: process.env.PATH,
                SYSTEMROOT: process.env.SYSTEMROOT,
                PYTHONPATH: process.env.PYTHONPATH,
                PYTHONUNBUFFERED: '1',
            },
        });

        const stdout = [];
        const stderr = [];
        let timedOut = false;
        let outputExceeded = false;
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, timeoutMs);

        let outputBytes = 0;
        const captureOutput = (target) => (chunk) => {
            outputBytes += chunk.length;
            if (outputBytes > MAX_OUTPUT_BYTES) {
                outputExceeded = true;
                child.kill("SIGKILL");
                return;
            }
            target.push(chunk);
        };
        child.stdout.on("data", captureOutput(stdout));
        child.stderr.on("data", captureOutput(stderr));
        child.on("error", (error) => {
            clearTimeout(timer);
            reject(
                new Error(
                    `Could not start the injury risk Python model with "${pythonBin}". ` +
                        `Set INJURY_RISK_PYTHON_BIN or PYTHON_BIN to a valid Python executable. ` +
                        `Original error: ${error.message}`,
                ),
            );
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            const errorOutput = Buffer.concat(stderr).toString("utf8").trim();
            const output = Buffer.concat(stdout).toString("utf8").trim();

            if (timedOut) {
                reject(new Error("Injury risk model timed out"));
                return;
            }
            if (outputExceeded) {
                reject(new Error("Injury risk model output exceeded the configured limit"));
                return;
            }
            if (code !== 0) {
                reject(
                    new Error(
                        errorOutput || `Injury risk model exited with code ${code}`,
                    ),
                );
                return;
            }

            try {
                resolve(JSON.parse(output || "[]"));
            } catch (error) {
                reject(
                    new Error(
                        `Could not parse injury risk model output: ${error.message}`,
                    ),
                );
            }
        });

        child.stdin.end(JSON.stringify(records));
    });
}

module.exports = {
    MODEL_VERSION,
    runInjuryRiskPredictions,
};
