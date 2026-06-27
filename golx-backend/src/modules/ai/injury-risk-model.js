const { spawn } = require("child_process");
const path = require("path");

const MODEL_VERSION = "football_academy_injury_risk_model_v3";
const DEFAULT_TIMEOUT_MS = Number(process.env.INJURY_RISK_MODEL_TIMEOUT_MS || 60000);

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
    process.env.PYTHON_BIN ||
    process.env.PYTHON ||
    projectPython;

function runInjuryRiskPredictions(records, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(pythonBin, [scriptPath, "--json-stdin"], {
            cwd: modelDir,
            windowsHide: true,
        });

        const stdout = [];
        const stderr = [];
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, timeoutMs);

        child.stdout.on("data", (chunk) => stdout.push(chunk));
        child.stderr.on("data", (chunk) => stderr.push(chunk));
        child.on("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            const errorOutput = Buffer.concat(stderr).toString("utf8").trim();
            const output = Buffer.concat(stdout).toString("utf8").trim();

            if (timedOut) {
                reject(new Error("Injury risk model timed out"));
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
