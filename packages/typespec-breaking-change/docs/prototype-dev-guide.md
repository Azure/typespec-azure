# Prototype Developer Guide

This guide captures operational knowledge for developing, deploying, and testing the
`@azure-tools/typespec-breaking-change` prototype. It is intended for any developer
(human or agent) picking up this work.

## 1. Build and Test

```bash
# From packages/typespec-breaking-change/
npm test                           # Run all tests (vitest, ~364 tests)
npx tsc -p tsconfig.build.json    # Build JS to dist/src/
tsp format <file>.tsp              # Always format .tsp files after editing
```

When changing decorator option models in `.tsp` files, regenerate TypeScript types with `tspd`.

## 2. Repository Layout

| Location | Purpose |
|----------|---------|
| `markcowl/typespec-azure` (fork) | Tool source, branch `prototype/breaking-change-tool` |
| `markcowl/azure-rest-api-specs` (fork) | Demo PRs with deployed JS |
| `rfcs/breaking-changes/` | Design documents (on prototype branch) |
| `packages/typespec-breaking-change/` | Package root |
| `packages/typespec-breaking-change/docs/` | Developer docs, demo plans |
| `packages/typespec-breaking-change/PROTOTYPE-EVALUATION.md` | Performance benchmarks, Q&A |

### Key Branches (markcowl/typespec-azure)

| Branch | Purpose |
|--------|---------|
| `prototype/breaking-change-tool` | Main working branch (source + docs) |
| `fork/rfc/breaking-changes` | Original detailed design docs (now copied to prototype branch) |
| `fork/rfc/breaking-changes-overview` | Original overview doc (now merged into prototype branch) |

### Rollback Tags

| Tag | Location | Purpose |
|-----|----------|---------|
| `source-link-principle-pre` | typespec-azure | Before source link resolution changes |
| `demo-source-link-fix-pre` | azure-rest-api-specs | Before source link fix deployment |

## 3. Deployment to azure-rest-api-specs

The tool's built JS is deployed to the specs fork for demo PRs. **This is a manual process:**

### Step-by-step

```bash
# 1. Build JS in the tool package
cd packages/typespec-breaking-change
npx tsc -p tsconfig.build.json

# 2. Copy built JS to specs fork
# Source: dist/src/*.js
# Destination: eng/tools/typespec-breaking-change/src/ in the specs repo
cp dist/src/*.js /path/to/azure-rest-api-specs/eng/tools/typespec-breaking-change/src/

# 3. Also copy updated .tsp and package.json if changed
cp lib/decorators.tsp /path/to/azure-rest-api-specs/eng/tools/typespec-breaking-change/lib/
cp package.json /path/to/azure-rest-api-specs/eng/tools/typespec-breaking-change/

# 4. Commit to main in the specs fork
cd /path/to/azure-rest-api-specs
git add eng/tools/typespec-breaking-change/
git commit -m "chore: update breaking change tool JS"

# 5. Rebase all PR branches onto main (so JS changes don't appear in PR diffs)
for branch in demo/contoso-breaking-change demo/contoso-breaking-change-fixed versioning-test-unsup demo/contoso-unversioned-suppressed; do
  git checkout $branch
  git rebase main
done

# 6. Force push all branches
git push fork main --force
for branch in ...; do
  git push fork $branch --force
done

# 7. Verify PR diffs on GitHub (local git diff may not match GitHub's merge-base)
gh pr diff 2 --repo markcowl/azure-rest-api-specs --name-only
gh pr diff 3 --repo markcowl/azure-rest-api-specs --name-only
gh pr diff 4 --repo markcowl/azure-rest-api-specs --name-only
gh pr diff 5 --repo markcowl/azure-rest-api-specs --name-only
# Each should show ONLY spec files, no .js files
```

### Common mistakes

- **Pushing to wrong branch names** — e.g., `pr4` instead of `versioning-test-unsup`. Always use the actual PR branch names.
- **Forgetting to rebase** — If you commit JS to main but don't rebase PR branches, the PR diffs will show all the JS changes.
- **Local vs GitHub diff mismatch** — After force-pushing, always verify on GitHub with `gh pr diff`. Local `git diff` uses a different merge-base.

## 4. Demo PRs (markcowl/azure-rest-api-specs)

| PR | Branch | Scenario | Expected Result |
|----|--------|----------|-----------------|
| #2 | `demo/contoso-breaking-change` | New version adds breaking change (no suppression) | ❌ 1 unsuppressed `ResourcePropertyRemoved` |
| #3 | `demo/contoso-breaking-change-fixed` | Same change with `@approvedBreakingChange` | ⚠️ 1 suppressed finding (Phase B) |
| #4 | `versioning-test-unsup` | Existing version modified (property removed, no `@removed`) | ❌ Phase A unsuppressed, source link to HEAD |
| #5 | `demo/contoso-unversioned-suppressed` | Same as #4 with `@approvedUnversionedChange` | ⚠️ Phase A suppressed (cross-compilation) |

### Testing a PR locally

```bash
# Create a worktree for main as the "base" program
git worktree add ../azure-rest-api-specs-base main

# Run the tool comparing base vs PR branch
cd packages/typespec-breaking-change
node dist/src/cli.js \
  --base /path/to/azure-rest-api-specs-base/specification/contosowidgetmanager/Contoso.Management \
  --head /path/to/azure-rest-api-specs/specification/contosowidgetmanager/Contoso.Management \
  --format console
```

## 5. Pitfalls and Hard-Won Knowledge

### TypeSpec Library Registration

The tool provides suppression decorators (`@approvedBreakingChange`, `@approvedUnversionedChange`).
For these to work when consumed by specs:

1. **`exports` field required in `package.json`:**
   ```json
   "exports": { ".": { "typespec": "./lib/main.tsp", "default": "./src/index.js" } }
   ```
   Without this, `extern dec` declarations are found but JS implementations are **silently** not loaded. The only symptom is "Unknown decorator" at compile time.

2. **Consumer specs need `using Azure.BreakingChange;`** for unqualified decorator names.

### Projected vs Source Model Names

When looking up types in the HEAD program (e.g., for source link resolution):

- ❌ `prop.model?.name` — Returns the **projected** model name (e.g., `EmployeePropertiesCreateOrUpdate`), which doesn't exist in the namespace tree.
- ✅ `prop.node?.parent?.id?.sv` — Returns the **AST source** model name (e.g., `EmployeeProperties`), which can be found in the namespace tree.

This distinction matters for any spread/intersection/template pattern (e.g., `TrackedResource<T>`).

### Pipeline Ordering

The post-processing pipeline order is **critical**:

```
dedup → merge → collapse → suppress → resolveHeadSourceLocations
```

- **Suppress MUST run after merge.** Users write `ResourcePropertyRemoved` in decorators (matching what they see in reports). Before merge, findings still have `RequestPropertyRemoved`/`ResponsePropertyRemoved` kinds. If suppression runs before merge, Resource suppressions never match.
- For backward compatibility, `matchesKind` also accepts `Request*`/`Response*` as aliases for `Resource*` findings.

### Resource Kind Validation

The `validDiffKinds` set in `decorators.ts` must include all `Resource*` kinds (e.g., `ResourcePropertyRemoved`, `ResourcePropertyTypeChanged`). Without these, the decorator validator rejects them and the suppression is silently not stored.

### Cross-Compilation Identity

TypeSpec state maps use **object identity**. Types from different compilations (base vs head) will never match via identity lookup. The suppression system handles this with `scanUnversionedSuppressions`, which builds a map keyed by `(namespace.model.property, diffKind)` as a fallback.

### Phase A Source Link Principle

Link to the type in HEAD **only when it exists in HEAD source** (the unmutated program). The comparison phase is NOT the right signal — `@added(v2)` creates a Phase A removal where the property EXISTS in head source but is projected out of an older version.

## 6. Environment Notes

When working on a shared machine:

- Check if other agents are using `session2\azure-rest-api-specs` or similar directories before making changes.
- Use `C:\Users\markcowl\azure-rest-api-specs` for specs repo changes.
- `C:\Users\markcowl\typespec-azure` is the primary source repo.

## 7. Remaining Work

See `rfcs/breaking-changes/typespec-breaking-change-test-coverage.md` for the detailed test plan.

Key items not yet completed:
- Comprehensive future plan document (see design overview Section 7 for open design decisions)
- Test coverage improvements (currently ~83% branch, target 95%)
- OAD parity validation (Phase 1 of validation strategy)
- Side-by-side CI evaluation
- Stale approval detection and codefixes
- Version scoping implementation (`since:` parameter)
- Wildcard path suppression (deferred to post-v1)
