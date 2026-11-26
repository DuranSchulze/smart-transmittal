#!/bin/sh
# Harness Factory brain helper.
# Canonical copy lives at the repository root; scripts/sync-harness.mjs copies it
# into each skills/harness-*/scripts/ directory. Edit the root copy only.
#
# The brain is durable project memory: one Markdown entry per file under
# .harness/brain/. The project root is $HARNESS_PROJECT, else the enclosing git
# root, else the current directory. $HARNESS_BRAIN overrides the brain location.
#
#   harness-brain.sh check                    report the brain, entry validity, and age (exit 0 ready, 1 missing, 2 invalid)
#   harness-brain.sh init                     create the brain and its index
#   harness-brain.sh path                     print the brain path
#   harness-brain.sh add --type T --statement S [--title T] [--scope S] [--confidence c] [--status s] [--tags a,b] [--refs ...] [--source ...] [--evidence E] [--supersedes ID] [--derived-from ID,...] [--body-file F] [--id ID] [--force]
#                                             add one entry (exit 2 when the id already exists)
#   harness-brain.sh update <id> [--status s] [--confidence c] [--scope S] [--tags a,b] [--derived-from ID,...] [--note "text"]
#   harness-brain.sh supersede <old-id> <new-id>
#   harness-brain.sh list [--type T] [--status s] [--scope S]
#   harness-brain.sh search "<query>"         find entries by text
#   harness-brain.sh get <id>                 print one entry
#   harness-brain.sh stale [--days N] [--mark]
#   harness-brain.sh prune [--include-stale] [--dry-run]
#                                             archive superseded and rejected entries, and stale ones with --include-stale
#   harness-brain.sh forget <id> [--reason "text"]
#   harness-brain.sh index                    regenerate .harness/brain/README.md
#   harness-brain.sh stats                    count entries by status
#
# Statuses: active, proposed, stale, superseded, rejected. Types: decision,
# preference, constraint, convention, pitfall, fact, principle, question.
# Prune archives entries; it never deletes them. Exit codes: 0 ok, 1 brain
# missing, 2 invalid entry or duplicate id, 64 usage.

set -u

ROOT=${HARNESS_PROJECT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}
BRAIN=${HARNESS_BRAIN:-"$ROOT/.harness/brain"}
case $BRAIN in
  /*) ;;
  *) BRAIN="$ROOT/$BRAIN" ;;
esac
ARCHIVE="$BRAIN/archive"
INDEX="$BRAIN/README.md"
TODAY=$(date -u +%Y-%m-%d)
TYPES="decision preference constraint convention pitfall fact principle question"
STATUSES="active proposed stale superseded rejected"

say() { printf '%s\n' "$*"; }
err() { printf '%s\n' "$*" >&2; }

field() {
  awk -v k="$2" '
    NR==1 && $0=="---" { inside=1; next }
    inside && $0=="---" { exit }
    inside && index($0, k ":")==1 { sub("^" k ":[ ]*", ""); print; exit }
  ' "$1"
}

set_field() {
  file=$1
  key=$2
  value=$3
  tmp="$file.tmp.$$"
  awk -v k="$key" -v v="$value" '
    NR==1 && $0=="---" { print; inside=1; next }
    inside && $0=="---" {
      if (!done) { print k ": " v; done=1 }
      print; inside=0; next
    }
    inside && index($0, k ":")==1 { print k ": " v; done=1; next }
    { print }
  ' "$file" > "$tmp" && mv "$tmp" "$file"
}

title_of() {
  awk '
    NR==1 && $0=="---" { inside=1; next }
    inside && $0=="---" { inside=0; body=1; next }
    body && /^# / { sub(/^# /, ""); print; exit }
  ' "$1"
}

summary_of() {
  awk '
    NR==1 && $0=="---" { inside=1; next }
    inside && $0=="---" { inside=0; body=1; next }
    body {
      if ($0 ~ /^#/) next
      if ($0 ~ /^[[:space:]]*$/) next
      print; exit
    }
  ' "$1" | cut -c1-160
}

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9][^a-z0-9]*/-/g; s/^-//; s/-$//' \
    | cut -c1-48
}

entry_files() {
  find "$BRAIN" -maxdepth 1 -name '*.md' ! -name 'README.md' 2>/dev/null | sort
}

archived_files() {
  find "$ARCHIVE" -maxdepth 1 -name '*.md' 2>/dev/null | sort
}

append_note() {
  file=$1
  note=$2
  if ! grep -q '^## History$' "$file"; then
    printf '\n## History\n' >> "$file"
  fi
  printf -- '- %s: %s\n' "$TODAY" "$note" >> "$file"
}

valid_type() {
  for t in $TYPES; do [ "$1" = "$t" ] && return 0; done
  return 1
}

valid_status() {
  for s in $STATUSES; do [ "$1" = "$s" ] && return 0; done
  return 1
}

require_brain() {
  [ -d "$BRAIN" ] || {
    err "brain: missing (run: harness-brain.sh init)"
    return 1
  }
}

require_entry() {
  [ -f "$BRAIN/$1.md" ] || {
    err "entry not found: $1"
    return 2
  }
}

cmd_path() {
  say "$BRAIN"
}

cmd_init() {
  mkdir -p "$BRAIN" "$ARCHIVE" || return 1
  if [ ! -f "$INDEX" ]; then
    cmd_index
  fi
  say "brain: $BRAIN"
}

cmd_check() {
  say "project: $ROOT"
  if [ ! -d "$BRAIN" ]; then
    say "brain: missing (run: harness-brain.sh init)"
    return 1
  fi
  say "brain: $BRAIN"
  count=0
  invalid=0
  for f in $(entry_files); do
    count=$((count + 1))
    base=$(basename "$f" .md)
    for key in id type status confidence created updated source; do
      if [ -z "$(field "$f" "$key")" ]; then
        err "invalid: $base: missing $key"
        invalid=1
      fi
    done
    id=$(field "$f" id)
    [ "$id" = "$base" ] || {
      err "invalid: $base: id is '$id'"
      invalid=1
    }
    valid_type "$(field "$f" type)" || {
      err "invalid: $base: unknown type '$(field "$f" type)'"
      invalid=1
    }
    valid_status "$(field "$f" status)" || {
      err "invalid: $base: unknown status '$(field "$f" status)'"
      invalid=1
    }
  done
  archived=$(archived_files | wc -l | tr -d ' ')
  old=$(find "$BRAIN" -maxdepth 1 -name '*.md' ! -name 'README.md' -mtime +90 2>/dev/null | wc -l | tr -d ' ')
  say "entries: $count"
  say "archived: $archived"
  say "older than 90 days: $old"
  [ "$invalid" -eq 1 ] && return 2
  return 0
}

cmd_add() {
  etype=""
  title=""
  statement=""
  scope="project"
  confidence="medium"
  status="active"
  tags=""
  refs=""
  source="conversation/$TODAY"
  evidence=""
  supersedes=""
  derived=""
  body_file=""
  id=""
  force=0
  while [ $# -gt 0 ]; do
    case $1 in
      --type) etype=${2:-}; shift 2 ;;
      --title) title=${2:-}; shift 2 ;;
      --statement) statement=${2:-}; shift 2 ;;
      --scope) scope=${2:-}; shift 2 ;;
      --confidence) confidence=${2:-}; shift 2 ;;
      --status) status=${2:-}; shift 2 ;;
      --tags) tags=${2:-}; shift 2 ;;
      --refs) refs=${2:-}; shift 2 ;;
      --source) source=${2:-}; shift 2 ;;
      --evidence) evidence="$evidence
- ${2:-}"; shift 2 ;;
      --supersedes) supersedes=${2:-}; shift 2 ;;
      --derived-from) derived=${2:-}; shift 2 ;;
      --body-file) body_file=${2:-}; shift 2 ;;
      --id) id=${2:-}; shift 2 ;;
      --force) force=1; shift ;;
      *) err "add: unknown argument $1"; return 64 ;;
    esac
  done
  [ -n "$etype" ] || { err "add: --type is required ($TYPES)"; return 64; }
  valid_type "$etype" || { err "add: unknown type '$etype' ($TYPES)"; return 64; }
  valid_status "$status" || { err "add: unknown status '$status' ($STATUSES)"; return 64; }
  case $confidence in
    high|medium|low) ;;
    *) err "add: confidence must be high, medium, or low"; return 64 ;;
  esac
  [ -n "$statement" ] || [ -n "$body_file" ] || { err "add: pass --statement or --body-file"; return 64; }
  if [ -n "$body_file" ] && [ ! -r "$body_file" ]; then
    err "add: cannot read $body_file"
    return 64
  fi
  cmd_init >/dev/null || return 1

  if [ -z "$title" ]; then
    title=$(printf '%s' "$statement" | head -n 1 | cut -c1-80)
  fi
  [ -n "$title" ] || title="Untitled $etype"
  if [ -z "$id" ]; then
    slug=$(slugify "$title")
    [ -n "$slug" ] || slug=$(slugify "$statement")
    [ -n "$slug" ] || slug="entry"
    id="$etype-$slug"
  fi
  case $id in
    *[!a-z0-9_.-]*) err "add: id '$id' may use lowercase letters, digits, and _ . -"; return 64 ;;
  esac
  target="$BRAIN/$id.md"
  if [ -f "$target" ] && [ "$force" -eq 0 ]; then
    err "entry exists: $id. Update it, supersede it, or pass --force to replace it."
    return 2
  fi

  tmp="$target.tmp.$$"
  {
    say "---"
    say "id: $id"
    say "type: $etype"
    say "status: $status"
    say "confidence: $confidence"
    say "scope: $scope"
    say "created: $TODAY"
    say "updated: $TODAY"
    say "source: $source"
    [ -n "$tags" ] && say "tags: $tags"
    [ -n "$refs" ] && say "refs: $refs"
    [ -n "$supersedes" ] && say "supersedes: $supersedes"
    [ -n "$derived" ] && say "derived_from: $derived"
    say "---"
    say ""
    say "# $title"
    say ""
    if [ -n "$statement" ]; then
      say "$statement"
      say ""
    fi
    if [ -n "$evidence" ]; then
      say "## Evidence"
      printf '%s\n' "$evidence"
      say ""
    fi
    if [ -n "$refs" ] || [ -n "$derived" ]; then
      say "## Links"
      say ""
      if [ -n "$refs" ]; then
        say "$refs"
        say ""
      fi
      if [ -n "$derived" ]; then
        say "Derived from:"
        say ""
        printf '%s\n' "$derived" | tr ',' '\n' | while IFS= read -r d; do
          d=$(printf '%s' "$d" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
          [ -n "$d" ] && say "- [$d]($d.md)"
        done
        say ""
      fi
    fi
    if [ -n "$body_file" ]; then
      cat "$body_file"
      say ""
    fi
  } > "$tmp" || {
    err "cannot write $target"
    return 1
  }
  mv "$tmp" "$target"
  cmd_index >/dev/null
  say "added: $id"
  say "path: $target"
  return 0
}

cmd_update() {
  [ $# -ge 1 ] || { err "usage: harness-brain.sh update <id> [fields]"; return 64; }
  id=$1
  shift
  require_entry "$id" || return $?
  file="$BRAIN/$id.md"
  changed=0
  note=""
  while [ $# -gt 0 ]; do
    case $1 in
      --status) valid_status "${2:-}" || { err "update: unknown status '${2:-}'"; return 64; }; set_field "$file" status "${2:-}"; changed=1; shift 2 ;;
      --confidence) case ${2:-} in high|medium|low) ;; *) err "update: confidence must be high, medium, or low"; return 64 ;; esac; set_field "$file" confidence "${2:-}"; changed=1; shift 2 ;;
      --scope) set_field "$file" scope "${2:-}"; changed=1; shift 2 ;;
      --tags) set_field "$file" tags "${2:-}"; changed=1; shift 2 ;;
      --derived-from) set_field "$file" derived_from "${2:-}"; changed=1; shift 2 ;;
      --note) note=${2:-}; shift 2 ;;
      *) err "update: unknown argument $1"; return 64 ;;
    esac
  done
  if [ "$changed" -eq 0 ] && [ -z "$note" ]; then
    err "update: pass at least one field or --note"
    return 64
  fi
  set_field "$file" updated "$TODAY"
  [ -n "$note" ] && append_note "$file" "$note"
  cmd_index >/dev/null
  say "updated: $id"
  return 0
}

cmd_supersede() {
  [ $# -eq 2 ] || { err "usage: harness-brain.sh supersede <old-id> <new-id>"; return 64; }
  old=$1
  new=$2
  require_entry "$old" || return $?
  require_entry "$new" || return $?
  [ "$old" = "$new" ] && { err "supersede: ids must differ"; return 64; }
  old_file="$BRAIN/$old.md"
  new_file="$BRAIN/$new.md"
  set_field "$old_file" status superseded
  set_field "$old_file" superseded_by "$new"
  set_field "$old_file" updated "$TODAY"
  append_note "$old_file" "Superseded by [$new]($new.md)."
  existing=$(field "$new_file" supersedes)
  if [ -n "$existing" ]; then
    set_field "$new_file" supersedes "$existing, $old"
  else
    set_field "$new_file" supersedes "$old"
  fi
  set_field "$new_file" updated "$TODAY"
  append_note "$new_file" "Supersedes [$old]($old.md)."
  cmd_index >/dev/null
  say "superseded: $old -> $new"
  return 0
}

cmd_list() {
  require_brain || return $?
  type_filter=""
  status_filter=""
  scope_filter=""
  while [ $# -gt 0 ]; do
    case $1 in
      --type) type_filter=${2:-}; shift 2 ;;
      --status) status_filter=${2:-}; shift 2 ;;
      --scope) scope_filter=${2:-}; shift 2 ;;
      *) err "list: unknown argument $1"; return 64 ;;
    esac
  done
  for f in $(entry_files); do
    [ -z "$type_filter" ] || [ "$(field "$f" type)" = "$type_filter" ] || continue
    [ -z "$status_filter" ] || [ "$(field "$f" status)" = "$status_filter" ] || continue
    [ -z "$scope_filter" ] || [ "$(field "$f" scope)" = "$scope_filter" ] || continue
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$(basename "$f" .md)" "$(field "$f" type)" "$(field "$f" status)" \
      "$(field "$f" confidence)" "$(field "$f" scope)" "$(field "$f" updated)" "$(title_of "$f")"
  done
  return 0
}

cmd_search() {
  [ $# -ge 1 ] || { err 'usage: harness-brain.sh search "<query>"'; return 64; }
  require_brain || return $?
  query=$1
  for f in $(entry_files); do
    if grep -qi -- "$query" "$f"; then
      printf '%s\t%s\t%s\n' "$(basename "$f" .md)" "$(title_of "$f")" "$f"
    fi
  done
  return 0
}

cmd_get() {
  [ $# -eq 1 ] || { err "usage: harness-brain.sh get <id>"; return 64; }
  require_entry "$1" || return $?
  cat "$BRAIN/$1.md"
}

cmd_stale() {
  require_brain || return $?
  days=90
  mark=0
  while [ $# -gt 0 ]; do
    case $1 in
      --days) days=${2:-90}; shift 2 ;;
      --mark) mark=1; shift ;;
      *) err "stale: unknown argument $1"; return 64 ;;
    esac
  done
  for f in $(find "$BRAIN" -maxdepth 1 -name '*.md' ! -name 'README.md' -mtime +"$days" 2>/dev/null | sort); do
    status=$(field "$f" status)
    case $status in superseded|rejected|stale) continue ;; esac
    id=$(basename "$f" .md)
    if [ "$mark" -eq 1 ]; then
      set_field "$f" status stale
      say "marked stale: $id"
    else
      say "stale: $id (updated $(field "$f" updated))"
    fi
  done
  [ "$mark" -eq 1 ] && cmd_index >/dev/null
  return 0
}

cmd_prune() {
  require_brain || return $?
  mkdir -p "$ARCHIVE" || return 1
  include_stale=0
  dry=0
  while [ $# -gt 0 ]; do
    case $1 in
      --include-stale) include_stale=1; shift ;;
      --dry-run) dry=1; shift ;;
      *) err "prune: unknown argument $1"; return 64 ;;
    esac
  done
  moved=0
  for f in $(entry_files); do
    status=$(field "$f" status)
    archive=0
    case $status in
      superseded|rejected) archive=1 ;;
      stale) [ "$include_stale" -eq 1 ] && archive=1 ;;
    esac
    [ "$archive" -eq 1 ] || continue
    id=$(basename "$f" .md)
    if [ "$dry" -eq 1 ]; then
      say "would archive: $id ($status)"
    else
      mv "$f" "$ARCHIVE/" && {
        say "archived: $id ($status)"
        moved=$((moved + 1))
      }
    fi
  done
  [ "$moved" -gt 0 ] && cmd_index >/dev/null
  [ "$dry" -eq 1 ] || say "archived $moved entries"
  return 0
}

cmd_forget() {
  [ $# -ge 1 ] || { err "usage: harness-brain.sh forget <id> [--reason \"text\"]"; return 64; }
  id=$1
  shift
  reason="forgotten at user request"
  [ "${1:-}" = "--reason" ] && reason=${2:-$reason}
  require_entry "$id" || return $?
  mkdir -p "$ARCHIVE" || return 1
  file="$BRAIN/$id.md"
  set_field "$file" status rejected
  set_field "$file" updated "$TODAY"
  append_note "$file" "$reason"
  mv "$file" "$ARCHIVE/" || return 1
  cmd_index >/dev/null
  say "forgot: $id (archived at $ARCHIVE/$id.md)"
  return 0
}

cmd_index() {
  mkdir -p "$BRAIN" "$ARCHIVE" || return 1
  tmpd=$(mktemp -d "${TMPDIR:-/tmp}/harness-brain.XXXXXX") || {
    err "cannot create a temporary directory"
    return 1
  }
  : > "$tmpd/active"
  : > "$tmpd/proposed"
  : > "$tmpd/stale"
  : > "$tmpd/retired"
  active_n=0
  proposed_n=0
  stale_n=0
  retired_n=0
  for f in $(entry_files); do
    status=$(field "$f" status)
    case $status in
      proposed) out="$tmpd/proposed"; proposed_n=$((proposed_n + 1)) ;;
      stale) out="$tmpd/stale"; stale_n=$((stale_n + 1)) ;;
      superseded|rejected) out="$tmpd/retired"; retired_n=$((retired_n + 1)) ;;
      *) out="$tmpd/active"; active_n=$((active_n + 1)) ;;
    esac
    printf -- '- [%s](%s.md) - %s, %s, confidence %s. %s\n' \
      "$(title_of "$f")" "$(basename "$f" .md)" "$(field "$f" type)" \
      "$(field "$f" scope)" "$(field "$f" confidence)" "$(summary_of "$f")" >> "$out"
  done

  tmp="$INDEX.tmp.$$"
  {
    say "# Brain"
    say ""
    say "Durable Harness memory for this project. Generated on $TODAY by \`harness-brain.sh index\`."
    say ""
    say "Entries: $active_n active, $proposed_n proposed, $stale_n stale, $retired_n retired."
    say ""
    if [ -s "$tmpd/active" ]; then
      say "## Active"
      say ""
      cat "$tmpd/active"
      say ""
    fi
    if [ -s "$tmpd/proposed" ]; then
      say "## Proposed"
      say ""
      cat "$tmpd/proposed"
      say ""
    fi
    if [ -s "$tmpd/stale" ]; then
      say "## Stale"
      say ""
      cat "$tmpd/stale"
      say ""
    fi
    if [ -s "$tmpd/retired" ]; then
      say "## Superseded and rejected"
      say ""
      cat "$tmpd/retired"
      say ""
    fi
    say "Review older entries with \`harness-brain.sh stale\` and archive them with \`harness-brain.sh prune\`. Archived entries live in \`archive/\`."
  } > "$tmp" && mv "$tmp" "$INDEX" || {
    rm -rf "$tmpd"
    err "cannot write $INDEX"
    return 1
  }
  rm -rf "$tmpd"
  return 0
}

cmd_stats() {
  require_brain || return $?
  active=0
  proposed=0
  stale=0
  retired=0
  for f in $(entry_files); do
    case $(field "$f" status) in
      proposed) proposed=$((proposed + 1)) ;;
      stale) stale=$((stale + 1)) ;;
      superseded|rejected) retired=$((retired + 1)) ;;
      *) active=$((active + 1)) ;;
    esac
  done
  say "active: $active"
  say "proposed: $proposed"
  say "stale: $stale"
  say "retired: $retired"
  say "archived: $(archived_files | wc -l | tr -d ' ')"
  return 0
}

command=${1:-check}
[ $# -gt 0 ] && shift
case $command in
  check) cmd_check ;;
  init) cmd_init ;;
  path) cmd_path ;;
  add) cmd_add "$@" ;;
  update) cmd_update "$@" ;;
  supersede) cmd_supersede "$@" ;;
  list) cmd_list "$@" ;;
  search) cmd_search "$@" ;;
  get) cmd_get "$@" ;;
  stale) cmd_stale "$@" ;;
  prune) cmd_prune "$@" ;;
  forget) cmd_forget "$@" ;;
  index) cmd_index ;;
  stats) cmd_stats ;;
  *) sed -n '2,30p' "$0"; exit 64 ;;
esac
