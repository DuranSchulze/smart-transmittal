---
name: harness-execute
description: Implement an approved Harness Factory workflow when the user calls harness-execute.
disable-model-invocation: true
---

# harness-execute

Read [HARNESS.md](references/HARNESS.md) relative to this skill before proceeding. Apply its stage boundary, work-item conventions, and approval rules. Run this stage only when the user explicitly requests it.

Prepare and recall from the project knowledge graph as HARNESS.md describes, using [harness-graph.sh](scripts/harness-graph.sh) or [harness-graph.mjs](scripts/harness-graph.mjs) on Windows. Prefer the host's Graphify MCP tools for recall when they are available. Verify both approvals, confirm the workflow's linked spec fingerprint, and inspect existing changes and project instructions. Implement all approved steps through the normal project entry points using existing patterns. Check each material change against its requirement, preserve unrelated edits, and stop affected work when evidence invalidates an approved decision. Continue independent approved steps where they remain valid.

Run the workflow's implementation checks and record the changes and evidence by requirement in `execution.md`. Report failures, blockers, and anything still unverified. Before handing back, link the new notes into the knowledge graph and refresh it. When the work item links a GitHub issue, post a one-line status comment with [harness-issue.sh](scripts/harness-issue.sh) that names the branch or pull request when one exists. Stop after the implementation handoff. A QA pass is a separate invocation.
