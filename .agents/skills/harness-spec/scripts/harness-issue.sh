#!/bin/sh
# Harness Factory GitHub issue helper.
# Canonical copy lives at the repository root; scripts/sync-harness.mjs copies it
# into each skills/harness-*/scripts/ directory. Edit the root copy only.
#
# Requires the GitHub CLI (gh) with an authenticated account. Run from anywhere
# inside the target project. The project root is $HARNESS_PROJECT, else the
# enclosing git root, else the current directory.
#
#   harness-issue.sh check                    report gh, auth, repo, and issues (exit 0 ready, 1 gh/auth missing, 2 no GitHub repo)
#   harness-issue.sh repo                     print owner/name for the target project
#   harness-issue.sh ensure-labels            create or refresh the harness:bug, harness:qa, harness:spec labels
#   harness-issue.sh find "<marker>"          print the number of the issue whose body carries the marker
#   harness-issue.sh create --title T (--body B | --body-file F) [--label L]... [--marker M] [--no-dedupe] [--payload-file P]
#                                             create one issue, or update the issue a marker already identifies
#   harness-issue.sh update <number|url> [--title T] (--body B | --body-file F) [--add-label L]...
#   harness-issue.sh comment <number|url> (--body B | --body-file F)
#   harness-issue.sh view <number|url> [--json]
#                                             print an issue for spec intake
#
# Pass "-" as the --body-file value to read the body from standard input. When
# gh is missing, unauthenticated, or the project has no GitHub remote, create
# writes the same title, body, and labels to --payload-file when given, or prints
# them, instead of filing anything, and exits 3. Exit codes: 0 ok, 1 gh missing
# or unauthenticated, 2 no GitHub repository or issues disabled, 3 payload only,
# 64 usage.

set -u

ROOT=${HARNESS_PROJECT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}
BODY_TMP=""
TMP_FILE=""

say() { printf '%s\n' "$*"; }
err() { printf '%s\n' "$*" >&2; }

cleanup() {
  [ -n "$BODY_TMP" ] && rm -f "$BODY_TMP"
  [ -n "$TMP_FILE" ] && rm -f "$TMP_FILE"
}
trap cleanup EXIT INT TERM HUP

new_tmp() {
  TMP_FILE=$(mktemp "${TMPDIR:-/tmp}/harness-issue.XXXXXX") || {
    err "cannot create a temporary file"
    exit 1
  }
  printf '%s' "$TMP_FILE"
}

find_cli() {
  command -v gh >/dev/null 2>&1 || return 1
  command -v gh
}

repo_slug() {
  (cd "$ROOT" && gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)
}

require_auth() {
  find_cli >/dev/null 2>&1 || {
    err "gh: missing. Install the GitHub CLI (https://cli.github.com) and run: gh auth login"
    return 1
  }
  gh auth status >/dev/null 2>&1 || {
    err "gh: not authenticated. Run: gh auth login"
    return 1
  }
  return 0
}

require_repo() {
  require_auth || return $?
  SLUG=$(repo_slug)
  if [ -z "$SLUG" ]; then
    err "github repo: none detected. Run inside a clone with a GitHub remote, or set HARNESS_PROJECT."
    return 2
  fi
  return 0
}

issues_enabled() {
  enabled=$(cd "$ROOT" && gh repo view --json hasIssuesEnabled --jq .hasIssuesEnabled 2>/dev/null)
  [ "$enabled" != "false" ]
}

can_use_github() {
  find_cli >/dev/null 2>&1 || return 1
  gh auth status >/dev/null 2>&1 || return 1
  [ -n "$(repo_slug)" ] || return 1
  issues_enabled || return 1
  return 0
}

ensure_labels_quiet() {
  gh label create "harness:bug" --color d73a4a --description "Bug filed by Harness Factory" --force >/dev/null 2>&1
  gh label create "harness:qa" --color fbca04 --description "QA finding filed by Harness Factory" --force >/dev/null 2>&1
  gh label create "harness:spec" --color 0e8a16 --description "Work item with a Harness Factory spec" --force >/dev/null 2>&1
  return 0
}

# read_body <inline> <file> fills BODY_TMP. "-" reads standard input.
read_body() {
  inline=$1
  file=$2
  new_tmp >/dev/null
  BODY_TMP=$TMP_FILE
  if [ -n "$file" ]; then
    if [ "$file" = "-" ]; then
      cat > "$BODY_TMP"
    elif ! cp "$file" "$BODY_TMP" 2>/dev/null; then
      err "cannot read $file"
      return 64
    fi
  elif [ -n "$inline" ]; then
    printf '%s\n' "$inline" > "$BODY_TMP"
  else
    : > "$BODY_TMP"
  fi
  return 0
}

require_body() {
  if [ ! -s "$BODY_TMP" ]; then
    err "a body is required: pass --body or --body-file"
    return 64
  fi
  return 0
}

emit_payload() {
  ptitle=$1
  plabels=$2
  pfile=$3
  if [ -n "$pfile" ]; then
    plabels=${plabels# }
    {
      say "<!-- harness-issue payload: file this manually, or rerun once GitHub issues are available -->"
      say "Title: $ptitle"
      say "Labels: $plabels"
      say ""
      cat "$BODY_TMP"
    } > "$pfile" || {
      err "github: unavailable, and cannot write $pfile"
      return 1
    }
    err "github: issues unavailable. Wrote the issue payload to $pfile."
  else
    err "github: issues unavailable (gh missing, unauthenticated, no GitHub repository, or issues disabled). Issue payload:"
    cat "$BODY_TMP" >&2
  fi
  err "File it manually with: gh issue create --title \"$ptitle\" --body-file <path>"
  return 3
}

cmd_check() {
  say "project: $ROOT"
  if ! find_cli >/dev/null 2>&1; then
    say "gh: missing (install https://cli.github.com, then run: gh auth login)"
    return 1
  fi
  say "gh: $(gh --version 2>/dev/null | head -n 1)"
  if ! gh auth status >/dev/null 2>&1; then
    say "gh: not authenticated (run: gh auth login)"
    return 1
  fi
  SLUG=$(repo_slug)
  if [ -z "$SLUG" ]; then
    say "github repo: none (add a GitHub remote, or set HARNESS_PROJECT)"
    return 2
  fi
  say "github repo: $SLUG"
  enabled=$(cd "$ROOT" && gh repo view --json hasIssuesEnabled --jq .hasIssuesEnabled 2>/dev/null)
  if [ "$enabled" = "false" ]; then
    say "issues: disabled (enable Issues in the repository settings)"
    return 2
  fi
  say "issues: enabled"
  return 0
}

cmd_repo() {
  require_repo || return $?
  say "$SLUG"
}

cmd_ensure_labels() {
  require_repo || return $?
  ensure_labels_quiet
  say "labels: harness:bug harness:qa harness:spec"
}

cmd_find() {
  [ $# -ge 1 ] || { err 'usage: harness-issue.sh find "<marker>"'; return 64; }
  marker=$1
  case $marker in
    *[!A-Za-z0-9/_.-]*) err "find: marker may use letters, digits, and / _ . -"; return 64 ;;
  esac
  require_repo || return $?
  expr=".[] | select((.body // \"\") | contains(\"$marker\")) | .number"
  found=$(gh issue list --state all --limit 200 --search "Harness-Dedupe in:body" --json number,body \
    --jq "$expr" 2>/dev/null | head -n 1)
  if [ -z "$found" ]; then
    found=$(gh issue list --state all --limit 500 --json number,body \
      --jq "$expr" 2>/dev/null | head -n 1)
  fi
  [ -n "$found" ] && printf '%s\n' "$found"
  return 0
}

update_issue() {
  num=$1
  utitle=$2
  ulabels=$3
  set -- gh issue edit "$num" --body-file "$BODY_TMP"
  if [ -n "$utitle" ]; then
    set -- "$@" --title "$utitle"
  fi
  for label in $ulabels; do
    set -- "$@" --add-label "$label"
  done
  out=$("$@" 2>&1) || {
    err "$out"
    return 1
  }
  say "number: $num"
  say "url: $(cd "$ROOT" && gh issue view "$num" --json url --jq .url 2>/dev/null)"
  return 0
}

cmd_create() {
  title=""
  inline=""
  body_file=""
  marker=""
  labels=""
  dedupe=1
  payload_file=""
  while [ $# -gt 0 ]; do
    case $1 in
      --title) title=${2:-}; shift 2 ;;
      --body) inline=${2:-}; shift 2 ;;
      --body-file) body_file=${2:-}; shift 2 ;;
      --label) labels="$labels ${2:-}"; shift 2 ;;
      --marker) marker=${2:-}; shift 2 ;;
      --no-dedupe) dedupe=0; shift ;;
      --payload-file) payload_file=${2:-}; shift 2 ;;
      *) err "create: unknown argument $1"; return 64 ;;
    esac
  done
  [ -n "$title" ] || { err "create: --title is required"; return 64; }
  read_body "$inline" "$body_file" || return $?
  if [ -n "$marker" ]; then
    case $marker in
      *[!A-Za-z0-9/_.-]*) err "create: marker may use letters, digits, and / _ . -"; return 64 ;;
    esac
    printf '\n\nHarness-Dedupe: `%s`\n' "$marker" >> "$BODY_TMP"
  fi

  if ! can_use_github; then
    emit_payload "$title" "$labels" "$payload_file"
    return 3
  fi

  if [ -n "$marker" ] && [ "$dedupe" -eq 1 ]; then
    existing=$(cmd_find "$marker")
    if [ -n "$existing" ]; then
      update_issue "$existing" "$title" "$labels"
      return $?
    fi
  fi

  if [ -n "$labels" ]; then
    ensure_labels_quiet
  fi
  set -- gh issue create --title "$title" --body-file "$BODY_TMP"
  for label in $labels; do
    set -- "$@" --label "$label"
  done
  out=$("$@" 2>&1) || {
    case $out in
      *label*|*Label*)
        ensure_labels_quiet
        out=$("$@" 2>&1) || { err "$out"; return 1; }
        ;;
      *)
        err "$out"
        return 1
        ;;
    esac
  }
  url=$(printf '%s\n' "$out" | grep -Eo 'https://[^ ]+/issues/[0-9]+' | tail -n 1)
  say "number: ${url##*/}"
  say "url: $url"
  return 0
}

cmd_update() {
  [ $# -ge 1 ] || { err "usage: harness-issue.sh update <number|url> [--title T] (--body B | --body-file F) [--add-label L]..."; return 64; }
  num=$1
  shift
  title=""
  inline=""
  body_file=""
  labels=""
  while [ $# -gt 0 ]; do
    case $1 in
      --title) title=${2:-}; shift 2 ;;
      --body) inline=${2:-}; shift 2 ;;
      --body-file) body_file=${2:-}; shift 2 ;;
      --add-label) labels="$labels ${2:-}"; shift 2 ;;
      *) err "update: unknown argument $1"; return 64 ;;
    esac
  done
  if [ -z "$body_file" ] && [ -z "$inline" ]; then
    err "update: pass --body or --body-file"
    return 64
  fi
  read_body "$inline" "$body_file" || return $?
  require_body || return $?
  require_repo || return $?
  update_issue "$num" "$title" "$labels"
}

cmd_comment() {
  [ $# -ge 1 ] || { err "usage: harness-issue.sh comment <number|url> (--body B | --body-file F)"; return 64; }
  num=$1
  shift
  inline=""
  body_file=""
  while [ $# -gt 0 ]; do
    case $1 in
      --body) inline=${2:-}; shift 2 ;;
      --body-file) body_file=${2:-}; shift 2 ;;
      *) err "comment: unknown argument $1"; return 64 ;;
    esac
  done
  read_body "$inline" "$body_file" || return $?
  require_body || return $?
  require_repo || return $?
  gh issue comment "$num" --body-file "$BODY_TMP" >/dev/null || return 1
  say "comment: $num"
  return 0
}

cmd_view() {
  [ $# -ge 1 ] || { err "usage: harness-issue.sh view <number|url> [--json]"; return 64; }
  target=$1
  shift
  as_json=0
  [ "${1:-}" = "--json" ] && as_json=1
  require_repo || return $?
  if [ "$as_json" -eq 1 ]; then
    gh issue view "$target" --json number,title,body,state,url,labels
    return $?
  fi
  gh issue view "$target" --json number,title,body,state,url,labels \
    --jq '"# Issue #\(.number): \(.title)\n\nURL: \(.url)\nState: \(.state)\nLabels: \(.labels | map(.name) | join(", "))\n\n\(.body // "")\n"'
}

command=${1:-check}
[ $# -gt 0 ] && shift
case $command in
  check) cmd_check ;;
  repo) cmd_repo ;;
  ensure-labels) cmd_ensure_labels ;;
  find) cmd_find "$@" ;;
  create) cmd_create "$@" ;;
  update) cmd_update "$@" ;;
  comment) cmd_comment "$@" ;;
  view) cmd_view "$@" ;;
  *) sed -n '2,25p' "$0"; exit 64 ;;
esac
