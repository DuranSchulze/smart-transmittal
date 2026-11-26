---
name: harness-qa
description: Verify user-facing behavior and regressions after implementation when the user calls harness-qa.
disable-model-invocation: true
---

# harness-qa

Read [HARNESS.md](references/HARNESS.md) relative to this skill before proceeding. Apply its stage boundary, work-item conventions, and approval rules. Run this stage only when the user explicitly requests it.

Prepare and recall from the project knowledge graph as HARNESS.md describes, using [harness-graph.sh](scripts/harness-graph.sh) or [harness-graph.mjs](scripts/harness-graph.mjs) on Windows. Prefer the host's Graphify MCP tools for recall when they are available. Identify the task and current implementation, load its approved expected behavior and QA plan, and check whether execution evidence still applies. If the task or baseline is missing, identify what you need. Run the planned user-facing journeys through ordinary entry points using suitable test data and available environments. Cover primary, alternate, failure and recovery paths, and nearby regressions in proportion to the change. Use observed outcomes to assess requirements. Static inspection or a skipped scenario cannot substitute for an end-to-end pass.

Write `qa.md` with the target revision or working tree, environment, per-scenario results and evidence by requirement, and any limits. File or update one GitHub issue per failed requirement or scenario with [harness-issue.sh](scripts/harness-issue.sh) as HARNESS.md describes, using the `harness:qa` label, the `qa/<task-slug>/<requirement-or-scenario>` marker, and the expected, observed, and reproduction evidence. Record each issue number and URL in `qa.md` and the handoff. That issue is directly usable as the intake for a later harness-bug or harness-spec run. A failed requirement is a candidate for harness-bug. Missing expected behavior returns to spec. Report whether all required scenarios passed, verification failed, or verification is incomplete. Before handing back, link the new notes into the knowledge graph and refresh it. Stop after reporting and leave product code unchanged.
