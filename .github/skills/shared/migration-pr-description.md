# Migration PR description

Use this contract for Swagger lint migration PRs: legacy development, promotion,
native-first implementation or guidance, and follow-up repair. It does not apply
to skill-update PRs or unrelated PRs.

For native-first rule implementation and promotion PRs, use the title pattern
`[Swagger Linter Migration] <ValidatorRuleId> -> <OfficialTypeSpecRuleName>`.
Use the original validator ID and the final unqualified `createRule({ name })`
value. For example:
`[Swagger Linter Migration] PathContainsResourceGroup -> resource-group-path-parameter`.
For an explicit many-to-one group, join the original IDs with `+` in frozen
membership order before the arrow. Keep legacy development and source-repair
titles under their phase-specific contracts; do not invent a native rule name
for a guidance-only outcome. Preserve existing PR titles unless correction is
requested.

The PR body starts with these two required sections, in this order. Add the
conditional companion section below only when a verified companion exists.

```markdown
## Original Swagger linter

- linter code: [<ValidatorRuleId>](<original Swagger rule implementation URL>)
- linter doc: [<documentation filename>.md](<original Swagger rule documentation URL>)

## Migration report

[migration.md](<published branch-based migration.md URL>)
```

Use direct, verified GitHub links to the original validator documentation and
the code implementing that rule. Resolve them from the rule's intake evidence,
fixture `rule.md`, or upstream repository; do not guess URLs or substitute a
generic repository homepage. For a group, repeat the code/documentation link
pair for each original Swagger rule inside the first section, with code before
documentation. Keep the exact heading and lowercase `linter code:` /
`linter doc:` labels. Use the actual documentation basename as its link text.

The second section links directly to the task's pushed, readable `migration.md`,
using the actual report branch rather than a commit SHA:
`https://github.com/<owner>/<repo>/blob/<actual-report-branch>/<report-path>/migration.md`.
Resolve the repository, branch and path from the verified publication binding;
do not guess a branch, use `HEAD`, or substitute `main` for the evidence branch.
For native-first evidence, use the actual pushed evidence branch. Do not use a
local path, folder, archive, or unpublished branch. A group links its group note
here; the group note links all member notes.

For the queue's [companion suppression workflow](../do-linter-development-task-one-by-one/companion-suppressions.md),
add a third peer section after Migration report, with the verified companion URL:

```markdown
## Companion suppression PR

[Azure/azure-rest-api-specs#<number>](<verified companion PR URL>)
```

Use the same heading level as Original Swagger linter and Migration report,
not an inline label inside Migration report. Preserve both required headings
and all original source/report links. This limited
addition is part of default initial delivery when attributable CI findings
justify a companion; do not add a placeholder or imply its CI passed.

Keep the branch and report path stable so later evidence commits appear through
the same PR link. Do not replace the URL with a new commit permalink after each
report update. Retain the published commit SHA and immutable report/receipt
permalinks in audit records, not in place of the branch-based PR report link.
Verify that the branch resolves to the recorded pushed commit and the report
exists there before publication. Read back the complete PR body after creation
or a description update, and recheck the unchanged link after report updates.

Do not add an introduction, summary, checklist, implementation explanation,
validation section, provenance block, local worktree paths, footer, or other
body content beyond the companion section authorized above. Do not copy a
repository PR template into the body.
This contract replaces generic PR-description requirements for these migration
PRs. Put other required links, including unrelated spec-fix and source-repair
PRs, in the migration report or its appendix; the companion suppression link
is the explicit exception.

Keep all required analysis and evidence in `migration.md` or its linked appendix:
validator/native mapping, original and native logic, examples, source provenance,
destination rationale, fixture-to-test mapping, counts, validation outcomes and
limitations, and repair/sync policy. Follow the shared
[four-section migration report plus NOTES contract](../analyze-swagger-typespec-lint-gap/SKILL.md#migration-note);
the short PR body does not waive any checks or disclosures.
