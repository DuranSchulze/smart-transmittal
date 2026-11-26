---
name: harness-reflect
description: Extract durable, evidenced memory from the current conversation into the project brain when the user calls harness-reflect.
disable-model-invocation: true
---

# harness-reflect

Read [HARNESS.md](references/HARNESS.md) relative to this skill before proceeding. Apply its stage boundary, work-item conventions, brain rules, and approval rules. Run this stage only when the user explicitly requests it.

Reflect is a memory stage. It may write brain entries and the notes HARNESS.md allows. It must not change product code, specs, workflows, approvals, or skill instructions.

1. **Recall.** Read `.harness/memory.md`, `.harness/brain/README.md`, and the current entries with [harness-brain.sh](scripts/harness-brain.sh) `list`. When the task is known, read its `context.md` and follow the Trail. Before broad searching, use the project knowledge graph as HARNESS.md describes: the host's Graphify MCP tools when available, otherwise [harness-graph.sh](scripts/harness-graph.sh) `query`. Read `.harness/LESSONS.md` when it exists. Confirm every result against the conversation and current source; neither the graph nor the brain is proof.
2. **Collect.** Read the current conversation and the artifacts it produced, focusing on durable content not yet in the brain. Keep only what stays true beyond this task and is stated, confirmed, or directly observed:
   - **decision**: a choice, its reason, and the alternatives rejected.
   - **preference or correction**: how the user wants work done, especially a correction of a wrong claim or behavior.
   - **constraint**: a limit from the project, platform, policy, or environment.
   - **convention**: a pattern the project already follows.
   - **pitfall**: a dead end, trap, or failure mode worth avoiding.
   - **fact**: verified behavior of the current system, with the revision or environment.
   - **principle**: a rule that explains several smaller observations.
   - **question**: an unresolved decision worth carrying forward.

   Leave out raw transcripts, secrets, personal data, transient task state, restatements of current source, and anything merely inferred without evidence.
3. **Deduplicate.** Search the brain for every candidate with `search`. Update a matching entry when it adds detail. Add a new entry and `supersede` the old one when the candidate corrects or replaces it. Add only when nothing covers it. Never leave two active entries with conflicting guidance; when a conflict is real and unresolved, record it as a question and report it.
4. **Write.** Use `add` with `--type`, `--title`, `--statement`, `--scope`, `--confidence`, `--source`, and `--tags`. Add `--refs` for project-relative paths or symbols, `--evidence` for the observation or user words that justify the entry, and `--derived-from` for a principle. Keep one entry to one screen. Write `active` for stated, confirmed, or observed content and `proposed` for a reasonable inference the user has not confirmed. Name symbols in backticks and link artifacts with relative Markdown links so the knowledge graph connects them.
5. **Sync.** For each graph query that shaped the reflection, record the outcome with `harness-graph.sh remember`. Run `harness-brain.sh index` and `harness-graph.sh update` before handing back. When the user explicitly asks to remember something for the whole project, update `.harness/memory.md` under HARNESS.md instead of, or in addition to, the brain.
6. **Report.** Give one line per added, updated, superseded, or skipped candidate with its id and reason, plus the brain path. Name what you chose not to store and why. Offer to correct or forget entries; a user request to forget wins, and `forget` archives the entry.
