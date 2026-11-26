---
name: harness-bug
description: Investigate a specific software failure and draft a bug spec when the user calls harness-bug.
disable-model-invocation: true
---

# harness-bug

Read [HARNESS.md](references/HARNESS.md) relative to this skill before proceeding. Apply its stage boundary, work-item conventions, and approval rules. Run this stage only when the user explicitly requests it.

Prepare and recall from the project knowledge graph as HARNESS.md describes, using [harness-graph.sh](scripts/harness-graph.sh) or [harness-graph.mjs](scripts/harness-graph.mjs) on Windows. Prefer the host's Graphify MCP tools for recall when they are available. Capture the report, affected environment or revision, expected and actual behavior, and smallest useful reproduction for ordinary product failures. Inspect relevant paths, tests, and available logs. Use the approved local environment for checks. Record whether the issue was observed, inferred, or blocked, and label root-cause confidence with supporting or contradictory evidence. State user impact and bounded fix requirements with regression criteria in `bug-spec.md` using the [bug template](references/bug-template.md).

File or update the work item's GitHub issue with [harness-issue.sh](scripts/harness-issue.sh) as HARNESS.md describes, using the `harness:bug` label and the `bug/<task-slug>/bug-spec` marker. Record its number and URL in `bug-spec.md` and the handoff. Editing `bug-spec.md` later updates that same issue.

Check that each requirement tests a symptom or obligation supported by the evidence and that the proposed scope is bounded. For a failure caused by undefined expected behavior, identify the missing product decision. Before handing back, link the new notes into the knowledge graph and refresh it. Present the draft and request approval once blockers are resolved. Stop before editing source code.
