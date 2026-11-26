---
name: harness-meditate
description: Review the project brain against the skills and current source, prune stale memory, and propose skill improvements when the user calls harness-meditate.
disable-model-invocation: true
---

# harness-meditate

Read [HARNESS.md](references/HARNESS.md) relative to this skill before proceeding. Apply its stage boundary, work-item conventions, brain rules, and approval rules. Run this stage only when the user explicitly requests it.

Meditate after reflections have accumulated, or when the user suspects drift, contradictions, or a claim that was never true. It may write brain entries, change their status, archive them, and write a review note. It proposes skill changes and does not edit skills, specs, workflows, approvals, or product code without explicit approval.

1. **Load.** Read the constitution at `references/HARNESS.md`, the sibling skill instructions under `../harness-*/SKILL.md` and their references when they are present, the project's `.harness/memory.md`, the brain index, and every active and proposed entry. Use `list` and `get`. For an entry with `refs`, read the linked source or artifact.
2. **Verify.** Check each entry against current source and observed behavior. A claim contradicted by code, a later entry, or an approved artifact is drift: report it, then mark it `stale` or `supersede` it with the corrected entry. Known drift is never left confident and active. This is the check for a claim that has gone out of date or was never true.
3. **Compare.** Work through these in order:
   - **brain vs brain**: two active entries with the same scope and conflicting guidance. Keep the better evidenced one and `supersede` the other.
   - **brain vs skill**: a skill or constitution rule that contradicts an active entry, or an entry the skill should state and does not. Quote the entry id and the skill path with the relevant lines.
   - **gaps and duplicates**: two entries that describe one idea, or an entry a skill already encodes word for word. Merge or retire the redundant one.
4. **Surface principles.** Cluster entries that repeat one idea across different words, scopes, or tasks. When at least two active entries support it and no skill states it, add a `principle` entry with `--status proposed --derived-from <ids>`, a short statement, and the supporting evidence. Report the entries behind it. Never promote a principle the evidence does not support.
5. **Prune.** Run `stale --days 90` and review the result. Mark obsolete entries `stale`, `supersede` corrected ones, and `forget` entries the user no longer wants. Run `prune --include-stale` to archive superseded, rejected, and reviewed stale entries. Prune archives; it never deletes. Report every archived id and why. Do not archive an entry an approved artifact or open task still relies on without flagging it first.
6. **Propose.** Report skill improvements ordered by impact. Each finding gives the target path, the current text, the proposed text, the brain entries that justify it, and the risk. Keep the smallest change that resolves the finding. Do not edit a skill. Offer harness-review on a proposal and apply it only after the user explicitly approves. An installed copy can be overwritten by an update, so name the source repository for any change worth keeping.
7. **Record.** Write `.harness/brain/reviews/meditation-<date>.md` with the verified, changed, pruned, and proposed items and their evidence. Run `harness-brain.sh index` and `harness-graph.sh update`. Record the outcome of each graph query that shaped the review with `remember`. Report counts, the review path, and the top three proposals.
