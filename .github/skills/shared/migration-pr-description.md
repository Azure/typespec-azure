# Migration PR description

Use this contract for Swagger lint migration PRs: legacy development, promotion,
native-first implementation or guidance, and follow-up repair. It does not apply
to skill-update PRs or unrelated PRs.

The entire PR body must contain exactly these two sections, in this order:

```markdown
## Original Swagger linter

- [Documentation: <ValidatorRuleId>](<original Swagger rule documentation URL>)
- [Logic: <ValidatorRuleId>](<original Swagger rule implementation URL>)

## Migration report

[migration.md](<published migration.md URL>)
```

Use direct, verified GitHub links to the original validator documentation and
the code implementing that rule. Resolve them from the rule's intake evidence,
fixture `rule.md`, or upstream repository; do not guess URLs or substitute a
generic repository homepage. For a group, repeat the documentation/logic link
pair for each original Swagger rule inside the first section.

The second section links directly to the task's pushed, readable `migration.md`,
not a local path, folder, archive, or unpublished branch. For native-first
evidence, use the immutable evidence commit. A group links its group note here;
the group note links all member notes. Verify the links before publication and
read back the complete PR body after creation or a description update.

Do not add an introduction, summary, checklist, implementation explanation,
validation section, provenance block, local worktree paths, footer, or other
body content. Do not copy a repository PR template into the body.
This contract replaces generic PR-description requirements for these migration
PRs. Put any additional required links, including spec-fix and source-repair PRs,
in the migration report or its appendix.

Keep all required analysis and evidence in `migration.md` or its linked appendix:
validator/native mapping, original and native logic, examples, source provenance,
destination rationale, fixture-to-test mapping, counts, validation outcomes and
limitations, and repair/sync policy. Follow the shared five-section migration
report contract; the short PR body does not waive any checks or disclosures.
