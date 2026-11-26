---
name: harness-spec
description: Investigate and draft a feature spec for Harness Factory when the user calls harness-spec.
disable-model-invocation: true
---

# harness-spec

Read [HARNESS.md](references/HARNESS.md) relative to this skill before proceeding. Apply its stage boundary, work-item conventions, and approval rules. Run this stage only when the user explicitly requests it.

Prepare and recall from the project knowledge graph as HARNESS.md describes, using [harness-graph.sh](scripts/harness-graph.sh) or [harness-graph.mjs](scripts/harness-graph.mjs) on Windows, and preferring the host's Graphify MCP tools for recall when they are available. When the user names a GitHub issue by number or URL, or asks to start from one, read it with [harness-issue.sh](scripts/harness-issue.sh) and treat its title, body, and discussion as intake evidence. Cite the issue in `context-spec.md`, add the `harness:spec` label, and comment the draft path and fingerprint before presenting the draft. Without an issue, continue from the prompt. Inspect the relevant project instructions, existing behavior, entry points, tests, and supplied references. Trace the main journey and relevant alternate, failure, and recovery paths. Identify actors, current behavior, expected behavior, boundaries, data and compatibility constraints, and observable acceptance criteria. Separate evidence from assumptions. Surface conflicts and important unknowns with impact ratings. Use the [spec template](references/spec-template.md) to write `context-spec.md`.

Before handoff, check requirement coverage, testability, contradictory statements, missing user states, and scope fit. Before handing back, link the new notes into the knowledge graph and refresh it. Resolve or flag blockers, then present the draft and request approval under the constitution. Stop here. Source code changes belong to execute.
