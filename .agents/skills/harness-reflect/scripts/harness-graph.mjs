#!/usr/bin/env node
// Harness Factory project knowledge graph helper (Graphify), Node edition.
// Canonical copy lives at the repository root; scripts/sync-harness.mjs copies it
// into each skills/harness-*/scripts/ directory. Edit the root copy only.
//
// Use this version on Windows or any host without a POSIX shell. It mirrors
// harness-graph.sh.
//
// Run from anywhere inside the target project. The project root is
// HARNESS_PROJECT, else CLAUDE_PROJECT_DIR, else the nearest ancestor with
// .git, .harness, or graphify-out, else the current directory.
//
//   harness-graph.mjs check                 report CLI, graph, and memory status (exit 0 ready, 1 CLI missing, 2 no graph)
//   harness-graph.mjs install               install the Graphify CLI (graphifyy) if it is missing
//   harness-graph.mjs ensure                install if missing, then build or refresh the graph
//   harness-graph.mjs update [--force]      refresh the graph from code and .harness notes (no LLM)
//   harness-graph.mjs query "<question>" [budget]
//   harness-graph.mjs section "<heading>"   print a Markdown section from an indexed note
//   harness-graph.mjs remember <useful|dead_end|corrected> "<question>" "<answer>" [node ...]
//   harness-graph.mjs lessons               aggregate remembered outcomes into .harness/LESSONS.md
//   harness-graph.mjs view [--print]        print and open graphify-out/graph.html

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const IS_WIN = process.platform === 'win32';
const REQUIRED_COMMANDS = ['update', 'query', 'section', 'save-result', 'reflect'];
const ROOT = resolveRoot();
const GRAPH = path.join(ROOT, 'graphify-out', 'graph.json');
const HTML = path.join(ROOT, 'graphify-out', 'graph.html');
const MEMORY_DIR = path.join(ROOT, '.harness', 'graph-memory');
const LESSONS = path.join(ROOT, '.harness', 'LESSONS.md');

const USAGE = `Harness Factory project knowledge graph helper (Graphify).

  harness-graph.mjs check                 report CLI, graph, and memory status
  harness-graph.mjs install               install the Graphify CLI (graphifyy)
  harness-graph.mjs ensure                install if missing, then update the graph
  harness-graph.mjs update [--force]      refresh the graph from code and .harness notes
  harness-graph.mjs query "<question>" [budget]
  harness-graph.mjs section "<heading>"   print a Markdown section from an indexed note
  harness-graph.mjs remember <useful|dead_end|corrected> "<question>" "<answer>" [node ...]
  harness-graph.mjs lessons               aggregate outcomes into .harness/LESSONS.md
  harness-graph.mjs view [--print]        print and open graphify-out/graph.html`;

function say(message = '') {
  console.log(message);
}

function resolveRoot() {
  const explicit = process.env.HARNESS_PROJECT;
  if (explicit) return path.resolve(explicit);

  for (const key of ['CLAUDE_PROJECT_DIR', 'INIT_CWD']) {
    const value = process.env[key];
    if (value && existsSync(value)) return path.resolve(value);
  }

  let dir = process.cwd();
  for (;;) {
    if (
      existsSync(path.join(dir, '.git')) ||
      existsSync(path.join(dir, '.harness')) ||
      existsSync(path.join(dir, 'graphify-out'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

function executableExtensions(name) {
  if (!IS_WIN || path.extname(name)) return [''];
  return ['', '.exe', '.cmd', '.bat'];
}

function findOnPath(name) {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of executableExtensions(name)) {
      const candidate = path.join(dir, name + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function quoteWin(value) {
  return /[\s"&|<>^]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function runRaw(command, args, options) {
  if (IS_WIN && /\.(cmd|bat)$/i.test(command)) {
    const line = [command, ...args].map(quoteWin).join(' ');
    return spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', line], options);
  }
  return spawnSync(command, args, options);
}

function run(command, args, options = {}) {
  const result = runRaw(command, args, { stdio: 'inherit', ...options });
  if (result.error) {
    console.error(result.error.message);
    return 1;
  }
  return result.status ?? 1;
}

function capture(command, args) {
  const result = runRaw(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function findCli() {
  const direct = findOnPath('graphify');
  if (direct) return direct;

  const dirs = [
    path.join(homedir(), '.local', 'bin'),
    path.join(homedir(), '.cargo', 'bin'),
  ];
  for (const dir of dirs) {
    for (const ext of executableExtensions('graphify')) {
      const candidate = path.join(dir, 'graphify' + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function findMcpCli() {
  const direct = findOnPath('graphify-mcp');
  if (direct) return direct;

  const dirs = [
    path.join(homedir(), '.local', 'bin'),
    path.join(homedir(), '.cargo', 'bin'),
  ];
  for (const dir of dirs) {
    for (const ext of executableExtensions('graphify-mcp')) {
      const candidate = path.join(dir, 'graphify-mcp' + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function missingCommands(cli) {
  const help = capture(cli, ['--help']).stdout;
  return REQUIRED_COMMANDS.filter(
    (command) => !new RegExp(`^  ${command}( |$)`, 'm').test(help),
  );
}

function countNotes(dir = path.join(ROOT, '.harness')) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) total += countNotes(path.join(dir, entry.name));
    else if (entry.name.endsWith('.md')) total += 1;
  }
  return total;
}

function requireGraph() {
  const cli = findCli();
  if (!cli) {
    say('graphify: missing (run: harness-graph.mjs install)');
    return { code: 1 };
  }
  if (!existsSync(GRAPH)) {
    say('graph: missing (run: harness-graph.mjs update)');
    return { code: 2 };
  }
  return { code: 0, cli };
}

function cmdCheck() {
  say(`project: ${ROOT}`);
  const cli = findCli();
  if (!cli) {
    say('graphify: missing (run: harness-graph.mjs install)');
    return 1;
  }

  const version = capture(cli, ['--version']).stdout.split(/\r?\n/)[0].trim();
  say(`graphify: ${cli}${version ? ` ${version}` : ''}`);

  const missing = missingCommands(cli);
  if (missing.length > 0) {
    say(`graphify: outdated, lacks:${missing.map((command) => ` ${command}`).join('')} (run: uv tool upgrade graphifyy)`);
    return 1;
  }

  const mcp = findMcpCli();
  say(
    mcp
      ? `graphify mcp: ${mcp}`
      : 'graphify mcp: not on PATH (run: harness-graph.mjs install for GUI hosts)',
  );

  const ignored = spawnSync('git', ['-C', ROOT, 'check-ignore', '-q', '.harness/memory.md'], {
    stdio: 'ignore',
  });
  if (ignored.status === 0) {
    say('warning: .harness/ is gitignored, so Graphify will not index Harness notes');
  }

  say(`harness notes: ${countNotes()}`);
  if (existsSync(GRAPH)) {
    say(`graph: ${GRAPH}`);
    return 0;
  }
  say('graph: missing (run: harness-graph.mjs update)');
  return 2;
}

function cmdInstall() {
  const existing = findCli();
  const mcp = findMcpCli();
  if (existing && missingCommands(existing).length === 0 && mcp) {
    say(`graphify already installed: ${existing}`);
    return 0;
  }
  if (existing && missingCommands(existing).length === 0) {
    say('graphify is installed; adding the MCP server extra');
  }

  if (findOnPath('uv')) {
    say('installing graphifyy[mcp] with uv');
    if (run('uv', ['tool', 'install', '--upgrade', 'graphifyy[mcp]'])) return 1;
  } else if (findOnPath('pipx')) {
    say('installing graphifyy[mcp] with pipx');
    if (run('pipx', ['install', 'graphifyy[mcp]']) && run('pipx', ['upgrade', 'graphifyy'])) return 1;
  } else {
    const python = findOnPath(IS_WIN ? 'python' : 'python3') || findOnPath('python');
    if (!python) {
      say('cannot install: need uv, pipx, or python3. See https://github.com/Graphify-Labs/graphify#install');
      return 1;
    }
    say('installing graphifyy[mcp] with pip --user');
    if (run(python, ['-m', 'pip', 'install', '--user', '--upgrade', 'graphifyy[mcp]'])) return 1;
  }

  const cli = findCli();
  if (!cli) {
    say('installed, but graphify is not on PATH. Add the tool bin directory (often ~/.local/bin) to PATH.');
    return 1;
  }
  say(`graphify ready: ${cli}`);
  return 0;
}

function cmdUpdate(args) {
  const cli = findCli();
  if (!cli) {
    say('graphify: missing (run: harness-graph.mjs install)');
    return 1;
  }
  mkdirSync(path.join(ROOT, '.harness'), { recursive: true });
  if (run(cli, ['update', '.', ...args], { cwd: ROOT })) {
    say('graph refresh failed. If code was deliberately deleted, rerun: harness-graph.mjs update --force');
    return 1;
  }
  say(`graph: ${GRAPH}`);
  return 0;
}

function cmdEnsure() {
  return cmdInstall() === 0 ? cmdUpdate([]) : 1;
}

function cmdQuery(args) {
  if (args.length < 1) {
    say('usage: harness-graph.mjs query "<question>" [budget]');
    return 64;
  }
  const graph = requireGraph();
  if (graph.code !== 0) return graph.code;
  return run(
    graph.cli,
    ['query', args[0], '--graph', GRAPH, '--budget', args[1] || '1000', '--depth', '2'],
    { cwd: ROOT },
  );
}

function cmdSection(args) {
  if (args.length < 1) {
    say('usage: harness-graph.mjs section "<heading>"');
    return 64;
  }
  const graph = requireGraph();
  if (graph.code !== 0) return graph.code;
  return run(graph.cli, ['section', args[0], '--graph', GRAPH], { cwd: ROOT });
}

function cmdRemember(args) {
  if (args.length < 3) {
    say('usage: harness-graph.mjs remember <useful|dead_end|corrected> "<question>" "<answer>" [node ...]');
    return 64;
  }
  const [outcome, question, answer, ...nodes] = args;
  if (!['useful', 'dead_end', 'corrected'].includes(outcome)) {
    say('outcome must be useful, dead_end, or corrected');
    return 64;
  }
  const cli = findCli();
  if (!cli) {
    say('graphify: missing (run: harness-graph.mjs install)');
    return 1;
  }
  mkdirSync(MEMORY_DIR, { recursive: true });
  const rememberArgs = [
    'save-result',
    '--question',
    question,
    '--answer',
    answer,
    '--outcome',
    outcome,
    '--memory-dir',
    MEMORY_DIR,
  ];
  if (nodes.length > 0) rememberArgs.push('--nodes', ...nodes);
  return run(cli, rememberArgs, { cwd: ROOT });
}

function cmdLessons() {
  const cli = findCli();
  if (!cli) {
    say('graphify: missing (run: harness-graph.mjs install)');
    return 1;
  }
  if (!existsSync(MEMORY_DIR)) {
    say(`no remembered outcomes in ${MEMORY_DIR}`);
    return 0;
  }
  const args = ['reflect', '--memory-dir', MEMORY_DIR, '--out', LESSONS];
  if (existsSync(GRAPH)) args.push('--graph', GRAPH);
  return run(cli, args, { cwd: ROOT });
}

function cmdView(args) {
  if (!existsSync(HTML)) {
    say(`graph view: missing ${HTML} (run: harness-graph.mjs update)`);
    return 1;
  }
  say(`graph view: ${HTML}`);
  if (args.includes('--print')) return 0;

  const opener = IS_WIN
    ? { command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', `start "" "${HTML}"`] }
    : { command: process.platform === 'darwin' ? 'open' : 'xdg-open', args: [HTML] };
  const result = spawnSync(opener.command, opener.args, { stdio: 'ignore' });
  if (result.error) {
    say('could not open a browser; open the path above.');
  }
  return 0;
}

const [command = 'check', ...args] = process.argv.slice(2);

let code;
switch (command) {
  case 'check':
    code = cmdCheck();
    break;
  case 'install':
    code = cmdInstall();
    break;
  case 'ensure':
    code = cmdEnsure();
    break;
  case 'update':
    code = cmdUpdate(args);
    break;
  case 'query':
    code = cmdQuery(args);
    break;
  case 'section':
    code = cmdSection(args);
    break;
  case 'remember':
    code = cmdRemember(args);
    break;
  case 'lessons':
    code = cmdLessons();
    break;
  case 'view':
    code = cmdView(args);
    break;
  default:
    say(USAGE);
    code = 64;
}

process.exitCode = code ?? 0;
