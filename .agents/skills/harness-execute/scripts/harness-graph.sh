#!/bin/sh
# Harness Factory project knowledge graph helper (Graphify).
# Canonical copy lives at the repository root; scripts/sync-harness.mjs copies it
# into each skills/harness-*/scripts/ directory. Edit the root copy only.
#
# Run from anywhere inside the target project. The project root is
# $HARNESS_PROJECT, else the enclosing git root, else the current directory.
#
#   harness-graph.sh check                 report CLI, graph, and memory status (exit 0 ready, 1 CLI missing, 2 no graph)
#   harness-graph.sh install               install the Graphify CLI (graphifyy) if it is missing
#   harness-graph.sh ensure                install if missing, then build or refresh the graph
#   harness-graph.sh update [--force]      refresh the graph from code and .harness notes (no LLM)
#   harness-graph.sh query "<question>" [budget]
#   harness-graph.sh section "<heading>"   print a Markdown section from an indexed note
#   harness-graph.sh remember <useful|dead_end|corrected> "<question>" "<answer>" [node ...]
#   harness-graph.sh lessons               aggregate remembered outcomes into .harness/LESSONS.md

set -u

ROOT=${HARNESS_PROJECT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}
GRAPH="$ROOT/graphify-out/graph.json"
MEMORY_DIR="$ROOT/.harness/graph-memory"
LESSONS="$ROOT/.harness/LESSONS.md"
REQUIRED_COMMANDS="update query section save-result reflect"

say() { printf '%s\n' "$*"; }

find_cli() {
  if command -v graphify >/dev/null 2>&1; then
    command -v graphify
    return 0
  fi
  for candidate in "$HOME/.local/bin/graphify" "$HOME/.cargo/bin/graphify"; do
    if [ -x "$candidate" ]; then
      say "$candidate"
      return 0
    fi
  done
  return 1
}

missing_commands() {
  help=$("$1" --help 2>&1)
  missing=""
  for cmd in $REQUIRED_COMMANDS; do
    printf '%s\n' "$help" | grep -Eq "^  $cmd( |$)" || missing="$missing $cmd"
  done
  printf '%s' "$missing"
}

find_mcp() {
  if command -v graphify-mcp >/dev/null 2>&1; then
    command -v graphify-mcp
    return 0
  fi
  for candidate in "$HOME/.local/bin/graphify-mcp" "$HOME/.cargo/bin/graphify-mcp"; do
    if [ -x "$candidate" ]; then
      say "$candidate"
      return 0
    fi
  done
  return 1
}

cmd_check() {
  say "project: $ROOT"
  if ! cli=$(find_cli); then
    say "graphify: missing (run: harness-graph.sh install)"
    return 1
  fi
  version=$("$cli" --version 2>/dev/null | head -n 1)
  say "graphify: $cli ${version:-}"
  missing=$(missing_commands "$cli")
  if [ -n "$missing" ]; then
    say "graphify: outdated, lacks:$missing (run: uv tool upgrade graphifyy)"
    return 1
  fi
  if mcp=$(find_mcp); then
    say "graphify mcp: $mcp"
  else
    say "graphify mcp: not on PATH (run: harness-graph.sh install for GUI hosts)"
  fi
  if git -C "$ROOT" check-ignore -q .harness/memory.md 2>/dev/null; then
    say "warning: .harness/ is gitignored, so Graphify will not index Harness notes"
  fi
  notes=$(find "$ROOT/.harness" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
  say "harness notes: $notes"
  if [ -f "$GRAPH" ]; then
    say "graph: $GRAPH"
    return 0
  fi
  say "graph: missing (run: harness-graph.sh update)"
  return 2
}

cmd_install() {
  if cli=$(find_cli) && [ -z "$(missing_commands "$cli")" ]; then
    if find_mcp >/dev/null 2>&1; then
      say "graphify already installed: $cli"
      return 0
    fi
    say "graphify is installed; adding the MCP server extra"
  fi
  if command -v uv >/dev/null 2>&1; then
    say "installing graphifyy[mcp] with uv"
    uv tool install --upgrade "graphifyy[mcp]" || return 1
  elif command -v pipx >/dev/null 2>&1; then
    say "installing graphifyy[mcp] with pipx"
    pipx install "graphifyy[mcp]" || pipx upgrade graphifyy || return 1
  elif command -v python3 >/dev/null 2>&1; then
    say "installing graphifyy[mcp] with pip --user"
    python3 -m pip install --user --upgrade "graphifyy[mcp]" || return 1
  else
    say "cannot install: need uv, pipx, or python3. See https://github.com/Graphify-Labs/graphify#install"
    return 1
  fi
  if ! cli=$(find_cli); then
    say "installed, but graphify is not on PATH. Add the tool bin directory (often ~/.local/bin) to PATH."
    return 1
  fi
  say "graphify ready: $cli"
}

cmd_update() {
  cli=$(find_cli) || { say "graphify: missing (run: harness-graph.sh install)"; return 1; }
  mkdir -p "$ROOT/.harness"
  (cd "$ROOT" && "$cli" update . "$@") || {
    say "graph refresh failed. If code was deliberately deleted, rerun: harness-graph.sh update --force"
    return 1
  }
  say "graph: $GRAPH"
}

cmd_ensure() {
  cmd_install || return 1
  cmd_update
}

require_graph() {
  cli=$(find_cli) || { say "graphify: missing (run: harness-graph.sh install)"; return 1; }
  [ -f "$GRAPH" ] || { say "graph: missing (run: harness-graph.sh update)"; return 2; }
}

cmd_query() {
  [ $# -ge 1 ] || { say "usage: harness-graph.sh query \"<question>\" [budget]"; return 64; }
  require_graph || return $?
  (cd "$ROOT" && "$cli" query "$1" --graph "$GRAPH" --budget "${2:-1000}" --depth 2)
}

cmd_section() {
  [ $# -ge 1 ] || { say "usage: harness-graph.sh section \"<heading>\""; return 64; }
  require_graph || return $?
  (cd "$ROOT" && "$cli" section "$1" --graph "$GRAPH")
}

cmd_remember() {
  [ $# -ge 3 ] || { say "usage: harness-graph.sh remember <useful|dead_end|corrected> \"<question>\" \"<answer>\" [node ...]"; return 64; }
  outcome=$1 question=$2 answer=$3
  shift 3
  case $outcome in useful|dead_end|corrected) ;; *) say "outcome must be useful, dead_end, or corrected"; return 64 ;; esac
  cli=$(find_cli) || { say "graphify: missing (run: harness-graph.sh install)"; return 1; }
  mkdir -p "$MEMORY_DIR"
  if [ $# -gt 0 ]; then
    "$cli" save-result --question "$question" --answer "$answer" --outcome "$outcome" --memory-dir "$MEMORY_DIR" --nodes "$@"
  else
    "$cli" save-result --question "$question" --answer "$answer" --outcome "$outcome" --memory-dir "$MEMORY_DIR"
  fi
}

cmd_lessons() {
  cli=$(find_cli) || { say "graphify: missing (run: harness-graph.sh install)"; return 1; }
  [ -d "$MEMORY_DIR" ] || { say "no remembered outcomes in $MEMORY_DIR"; return 0; }
  if [ -f "$GRAPH" ]; then
    "$cli" reflect --memory-dir "$MEMORY_DIR" --out "$LESSONS" --graph "$GRAPH"
  else
    "$cli" reflect --memory-dir "$MEMORY_DIR" --out "$LESSONS"
  fi
}

command=${1:-check}
[ $# -gt 0 ] && shift
case $command in
  check) cmd_check ;;
  install) cmd_install ;;
  ensure) cmd_ensure ;;
  update) cmd_update "$@" ;;
  query) cmd_query "$@" ;;
  section) cmd_section "$@" ;;
  remember) cmd_remember "$@" ;;
  lessons) cmd_lessons ;;
  *) sed -n '2,17p' "$0"; exit 64 ;;
esac
