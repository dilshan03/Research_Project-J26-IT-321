/**
 * MathQuest Unified Local Runner (start-all.js)
 * Starts all 6 MathQuest services concurrently inside a single terminal.
 *
 * Usage:
 *   npm run dev
 *   or
 *   node start-all.js
 */

const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = __dirname;
const isWin = process.platform === 'win32';

function loadRootEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const parsed = {};
  if (!fs.existsSync(envPath)) return parsed;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const val = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    parsed[key] = val;
  }
  return parsed;
}

const ROOT_ENV = loadRootEnv();

function resolvePython(serviceDir) {
  const candidates = [
    path.join(serviceDir, '.venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python'),
    path.join(serviceDir, 'venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python'),
    path.join(ROOT_DIR, '.venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return `"${candidate}"`;
    }
  }
  return 'python';
}

const SERVICES = [
  {
    name: 'AUTH    :5000',
    color: '\x1b[36m', // Cyan
    port: 5000,
    cwd: path.join(ROOT_DIR, 'services', 'auth-service'),
    command: 'node src/server.js',
  },
  {
    name: 'PROFILE :5001',
    color: '\x1b[35m', // Magenta
    port: 5001,
    cwd: path.join(ROOT_DIR, 'services', 'learner-profile-service'),
    command: `${resolvePython(path.join(ROOT_DIR, 'services', 'learner-profile-service'))} -m uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload`,
  },
  {
    name: 'DECISION:5002',
    color: '\x1b[33m', // Yellow
    port: 5002,
    cwd: path.join(ROOT_DIR, 'services', 'pedagogical-engine', 'decision-api'),
    command: 'node src/server.js',
  },
  {
    name: 'CONTENT :8003',
    color: '\x1b[34m', // Blue
    port: 8003,
    cwd: path.join(ROOT_DIR, 'services', 'content-adaptation-service'),
    command: `${resolvePython(path.join(ROOT_DIR, 'services', 'content-adaptation-service'))} -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload`,
  },
  {
    name: 'BEHAVIOR:8004',
    color: '\x1b[96m', // Bright Cyan
    port: 8004,
    cwd: path.join(ROOT_DIR, 'services', 'behaviour-signal-service'),
    command: `${resolvePython(path.join(ROOT_DIR, 'services', 'behaviour-signal-service'))} -m uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload`,
  },
  {
    name: 'WEB     :5173',
    color: '\x1b[32m', // Green
    port: 5173,
    cwd: path.join(ROOT_DIR, 'apps', 'web'),
    command: 'npm run dev',
  },
];

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

const children = [];

function prefixLines(stream, label, color) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${color}${BOLD}[${label}]${RESET} ${line}`);
      }
    }
  });
}

async function waitForPort(port, maxWaitMs = 4500) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isPortInUse(port)) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  console.log(`\n${BOLD}============================================================${RESET}`);
  console.log(`${BOLD}🚀 Starting MathQuest All-in-One Development Environment...${RESET}`);
  console.log(`${BOLD}============================================================${RESET}\n`);

  for (const svc of SERVICES) {
    if (svc.port === 5173) {
      // Wait briefly for Auth Service (5000) to finish connecting before starting Vite
      await waitForPort(5000, 4500);
    }

    const inUse = await isPortInUse(svc.port);
    if (inUse) {
      console.log(
        `${svc.color}${BOLD}[${svc.name}]${RESET} ✓ Port ${svc.port} is already active (service already running).`
      );
      continue;
    }

    console.log(`${svc.color}${BOLD}[${svc.name}]${RESET} Starting in ${svc.cwd}...`);
    const child = spawn(svc.command, {
      cwd: svc.cwd,
      shell: true,
      env: { ...ROOT_ENV, ...process.env, FORCE_COLOR: '1' },
    });

    children.push(child);
    if (child.stdout) prefixLines(child.stdout, svc.name, svc.color);
    if (child.stderr) prefixLines(child.stderr, svc.name, svc.color);

    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(`${svc.color}${BOLD}[${svc.name}]${RESET} Exited with code ${code}`);
      }
    });

    // Stagger startup slightly so simultaneous MongoDB Atlas DNS SRV lookups do not collide
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\n${BOLD}✅ Press Ctrl+C at any time to stop all services.${RESET}\n`);
}

function shutdown() {
  console.log(`\n${BOLD}🛑 Stopping all MathQuest services...${RESET}`);
  for (const child of children) {
    try {
      if (isWin && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/f', '/t']);
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
  }
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();
