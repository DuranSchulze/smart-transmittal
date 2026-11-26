---
name: harness-workflow
description: Plan implementation and verification for an approved Harness Factory spec when the user calls harness-workflow.
disable-model-invocation: true
---

# harness-workflow

Read [HARNESS.md](references/HARNESS.md) relative to this skill before proceeding. Apply its stage boundary, work-item conventions, and approval rules. Run this stage only when the user explicitly requests it.

Prepare and recall from the project knowledge graph as HARNESS.md describes, using [harness-graph.sh](scripts/harness-graph.sh) or [harness-graph.mjs](scripts/harness-graph.mjs) on Windows. Prefer the host's Graphify MCP tools for recall when they are available. Verify the selected spec approval. Read the actual integration points, existing conventions, and available checks. Build an ordered workflow with requirement IDs, affected components, proposed changes, dependencies, and verification actions. Address compatibility, rollout, and recovery where the change warrants it. Include user-facing acceptance checks for QA and concrete expected observations. Write `workflow.md` using the [workflow template](references/workflow-template.md).

Check that every requirement has a step and a verification action, each step traces to scope, and the planned checks can exercise the normal entry points. Return ambiguities or scope changes to spec. Before handing back, link the new notes into the knowledge graph and refresh it. When the work item links a GitHub issue, post a one-line status comment with [harness-issue.sh](scripts/harness-issue.sh). Present the workflow revision for approval and stop before implementing.
