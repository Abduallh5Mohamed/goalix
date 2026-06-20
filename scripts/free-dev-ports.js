/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("node:child_process");

const ports = [3000, 3001];

function run(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

function killWindowsPorts() {
  const output = run("netstat -ano -p tcp");
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    if (!/\bLISTENING\b/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const localAddress = parts[1] || "";
    const pid = parts[parts.length - 1];
    if (ports.some((port) => localAddress.endsWith(`:${port}`)) && /^\d+$/.test(pid)) {
      pids.add(pid);
    }
  }

  const projectRoot = process.cwd().toLowerCase();
  const targets = new Set();

  function readProcess(pid) {
    try {
      const json = run(
        `powershell -NoProfile -Command "$p=Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}'; if ($p) { $p | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress }"`,
      ).trim();
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }

  for (const pid of pids) {
    let currentPid = pid;
    for (let depth = 0; depth < 4 && currentPid; depth += 1) {
      const processInfo = readProcess(currentPid);
      if (!processInfo) break;
      const commandLine = String(processInfo.CommandLine || "").toLowerCase();
      if (commandLine.includes(projectRoot)) {
        targets.add(String(processInfo.ProcessId));
        currentPid = String(processInfo.ParentProcessId || "");
        continue;
      }
      break;
    }
    targets.add(pid);
  }

  try {
    const json = run(
      "powershell -NoProfile -Command \"Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Contains('" +
        projectRoot.replace(/'/g, "''") +
        "') -and ($_.CommandLine -match 'concurrently|next dev|nodemon src/server.js|npm.cmd run dev|npm run dev') } | Select-Object ProcessId | ConvertTo-Json -Compress\"",
    ).trim();
    const projectProcesses = json ? JSON.parse(json) : [];
    const rows = Array.isArray(projectProcesses) ? projectProcesses : [projectProcesses];
    for (const row of rows) {
      if (row?.ProcessId) targets.add(String(row.ProcessId));
    }
  } catch {
    // Best effort; port listeners above are still handled.
  }

  for (const pid of targets) {
    if (Number(pid) === process.pid || Number(pid) === process.ppid) continue;
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
      console.log(`Freed dev port process ${pid}`);
    } catch {
      // The process may have already exited.
    }
  }
}

function killUnixPorts() {
  for (const port of ports) {
    try {
      const pids = run(`lsof -ti tcp:${port}`).split(/\r?\n/).filter(Boolean);
      for (const pid of pids) {
        if (Number(pid) === process.pid) continue;
        try {
          process.kill(Number(pid), "SIGTERM");
          console.log(`Freed dev port ${port} process ${pid}`);
        } catch {
          // The process may have already exited.
        }
      }
    } catch {
      // lsof may not exist or the port may be free.
    }
  }
}

if (process.platform === "win32") {
  killWindowsPorts();
} else {
  killUnixPorts();
}
