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

The entire PR body must contain exactly these two sections, in this order:

```markdown
## Original Swagger linter

- linter code: [<ValidatorRuleId>](<original Swagger rule implementation URL>)
- linter doc: [<documentation filename>.md](<original Swagger rule documentation URL>)

## Migration report

[migration.md](<published migration.md URL>)
```

Use direct, verified GitHub links to the original validator documentation and
the code implementing that rule. Resolve them from the rule's intake evidence,
fixture `rule.md`, or upstream repository; do not guess URLs or substitute a
generic repository homepage. For a group, repeat the code/documentation link
pair for each original Swagger rule inside the first section, with code before
documentation. Keep the exact heading and lowercase `linter code:` /
`linter doc:` labels. Use the actual documentation basename as its link text.

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
