---
name: tcgc-newsletter
description: "Compose a TCGC monthly newsletter for @azure-tools/typespec-client-generator-core. Use when: writing newsletter, creating release notes, summarizing TCGC changes, drafting monthly update."
argument-hint: "Provide the target version range (e.g., since 0.67.1) and any emphasis areas"
---

# TCGC Monthly Newsletter

Generate a monthly newsletter summarizing changes in `@azure-tools/typespec-client-generator-core` across one or more releases.

## Reference

Previous newsletters live in `packages/typespec-client-generator-core/newsletter/`. Read the latest one to match tone, structure, and markdown style. New newsletters should be created in the same directory as `<version>.md`.

## Inputs

Confirm with the user:

1. **Version range**: Starting version (exclusive) through current, e.g., "since 0.67.1".
2. **Emphasis areas**: Topics to highlight as ⭐ features (e.g., client changes, performance).

## Procedure

### 1. Gather Changes

1. Read the latest newsletter in `packages/typespec-client-generator-core/newsletter/` for style reference.
2. Read `packages/typespec-client-generator-core/CHANGELOG.md` for all entries in the version range.
3. Read `packages/typespec-client-generator-core/package.json` for current version.

### 2. Research Key PRs

For major features, breaking changes, and performance improvements, fetch the PR from `https://github.com/Azure/typespec-azure/pull/<number>` to get motivation, migration guidance, and benchmark results.

### 3. Validate Code Examples

For every TypeSpec code example, search for corresponding tests under `packages/typespec-client-generator-core/test/` and verify syntax matches real usage. Tests are the source of truth.

### 4. Write the Newsletter

Follow the structure and style of the previous newsletter. Key rules:

- **Audience**: Spec authors and emitter authors. No internal implementation details.
- **Markdown**: `#`/`##`/`###` headings, `-` bullets (not `•`), ` ```typespec ` code blocks, `[#NNNN](url)` PR links, backtick-wrapped APIs in headings.
- **Performance**: Show benchmark results as tables when available.
- **Bottom line**: 2-3 short paragraphs, concise, aligned with detailed sections above.

### 5. Review Checklist

- [ ] Code examples validated against test files
- [ ] No implementation details — only user-facing info
- [ ] PR numbers are clickable markdown links
- [ ] Proper heading hierarchy, `-` bullets, fenced code blocks
- [ ] Breaking changes in both ⚠️ summary and detailed sections
- [ ] Bottom line matches detailed content
- [ ] Version numbers verified against package.json
