# TypeSpec Planning 2026 - 2027

## Overview

This document outlines the TypeSpec ecosystem's strategic direction for 2026-2027. It extends and expands upon the existing team planning, organized into nine workstreams that collectively drive TypeSpec toward becoming the definitive API specification platform for Azure and beyond.

### Priorities Key

| Priority | Meaning |
|----------|---------|
| **Pri 0** | Must ship this period — blocking other teams or critical path |
| **Pri 1** | High value, planned for this period |
| **Pri 2** | Stretch goals / future period |

---

## 1. AutoRest Retirement / TypeSpec Native CI Tools

**Goal:** Complete the transformation from OpenAPI-centric tooling to TypeSpec-native CI pipelines, eliminating dependencies on AutoRest and OpenAPI 2.0 workflows.

### TypeSpec Linting Tool (Replaces LintDiff)

- **Pri 0** — Normalize TypeSpec suppression mechanisms and replace LintDiff with a TypeSpec-native linting tool
- Provide equivalent or better lint coverage compared to existing OpenAPI-based LintDiff
- Support suppression comments, baseline files, and incremental linting for PR workflows

**User Stories:**
- *As a service team*, I can run TypeSpec linting locally and get the same results as CI, so I fix issues before pushing.
- *As a spec reviewer*, I see clear, actionable lint errors in PR checks with suggested fixes, reducing back-and-forth with authors.
- *As a service team*, I can suppress specific lint warnings with inline comments and a justification, without disabling entire rule categories.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to resolve lint errors per PR | TBD | 50% reduction |
| Number of PR round-trips caused by lint failures | TBD | 60% reduction |
| CI lint check execution time | TBD | No regression vs. LintDiff |
| False positive rate | TBD | < 5% |
| Service team satisfaction (quarterly survey) | TBD | > 4/5 rating |

### TypeSpec Breaking Change Detection

- **Pri 0** — Replace the OpenAPI Breaking Change Tool with a TypeSpec-native equivalent
- Detect breaking changes directly from TypeSpec source (not from generated OpenAPI)
- Support versioning-aware diff that understands `@added`/`@removed` decorators
- Integrate into CI pipelines as a required check

**User Stories:**
- *As a service team*, I get immediate feedback when my change introduces a breaking API contract change, with an explanation of what broke and why.
- *As a spec reviewer*, I can see a clear diff of API surface changes (not just source changes) to assess compatibility impact.
- *As a service team*, I can mark intentional breaking changes with version bumps and have the tool recognize them as expected.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time spent resolving breaking change errors | TBD | 50% reduction |
| False positive rate for breaking change detection | TBD | < 3% |
| Missed breaking changes (false negatives) | TBD | 0 |
| Time from push to breaking change notification | TBD | < 2 minutes |
| Service team satisfaction (quarterly survey) | TBD | > 4/5 rating |

### TypeSpec Examples Tooling

- **Pri 0** — TypeSpec-native tools for generating, validating, and managing JSON examples
- Generate valid JSON examples for operations directly from a TypeSpec spec
- Validate existing JSON examples against a TypeSpec spec (replacing OpenAPI-based validation)
- Reduce required examples for new API versions to only changed operations/models
- New processes to identify which examples need updating when spec changes occur

**User Stories:**
- *As a service team*, I can auto-generate valid JSON examples for my operations from TypeSpec, rather than hand-crafting them against OpenAPI output.
- *As a service team*, I only need to provide new/updated examples for operations that actually changed in my API version, not re-validate the entire set.
- *As a spec reviewer*, I can validate that all submitted examples conform to the TypeSpec-defined contract with a single command.
- *As a CI pipeline*, I can identify exactly which examples are stale after a spec change and report only those.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time spent authoring examples per PR | TBD | 70% reduction |
| Time spent resolving example errors | TBD | 50% reduction |
| Number of examples required per new API version | TBD | Reduce to changed-only (est. 60% reduction) |
| Example validation accuracy (vs. spec) | TBD | 100% |
| Example generation correctness (valid on first attempt) | TBD | > 95% |
| Service team satisfaction (quarterly survey) | TBD | > 4/5 rating |

### SDK Language Team Migration

- Drive CLI, PowerShell, and Terraform teams to consume TypeSpec or OpenAPI 3.0 instead of OpenAPI 2.0
- Provide guidance for the transition
- Establish timelines for OpenAPI 2.0 deprecation in downstream pipelines
- Provide guidance and tooling to help move checks for downstream teams into the CI pipeline

**User Stories:**
- *As a service team*, I know that all important artifacts for my service come from the same source of truth, and I can detect and fix any issues with downstream artifacts, like CLI, PowerShell, and Terraform commands at the time of check-in.
- *As a CLI/PowerShell/Terraform SDK team*, I can consume TypeSpec or OpenAPI 3.0 output directly, without depending on OpenAPI 2.0 conversion.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| SDK team time spent on format-conversion workarounds | TBD | Eliminate entirely by Winter 2026-27 |
| Late failures discovered in SDK, CLI, and documentation artifacts | TBD | 80% reduction |
| SDK generation errors caused by format conversion | TBD | Eliminate entirely |

### CI Log Normalization and Simplification

- **Pri 0** — Normalize and simplify log output for azure-rest-api-specs CI tools
- Ensure CI logs clearly indicate what failed, why it failed, and what steps are needed to fix
- Provide structured, scannable output rather than verbose unformatted logs
- Consistent formatting across all CI check types (lint, breaking changes, examples, SDK generation)

**User Stories:**
- *As a service team*, I can quickly determine the steps needed to fix any reported CI issues without wading through verbose or cryptic log output.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to identify fix steps from CI failure logs | TBD | 70% reduction |
| Service team requests for help interpreting CI output | TBD | 80% reduction |
| Service team satisfaction with CI output clarity (survey) | TBD | > 4/5 rating |

### CI Check Coverage and Suppression Management

- **Pri 0** — Ensure all CI checks, including SDK checks, are either passing or suppressed with active management
- Establish process for active management and periodic review of CI suppressions
- Ensure no check is silently broken or permanently suppressed without accountability
- Provide dashboards or reports showing suppression health across the spec repo

**User Stories:**
- *As a service team*, I have confidence that all CI checks are actively maintained — nothing is silently broken or permanently suppressed without accountability.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Post-check-in issue discovery rate (issues found after merge) | TBD | 80% reduction |
| Time to resolve issues discovered post-check-in | TBD | 70% reduction |
| Stale/unreviewed CI suppressions | TBD | 0 (within 30-day review SLA) |

### Lint Suppression Review Tooling

- **Pri 0** — Add a tool to require review for suppressing TypeSpec linting rules in azure-rest-api-specs CI
- Suppressing lint rules should trigger a review requirement from appropriate reviewers
- Ensure service teams address important SDK-facing issues before check-in rather than suppressing them

**User Stories:**
- *As a service team*, I am guided to fix important SDK-facing issues before check-in rather than inadvertently suppressing them.
- *As an SDK team*, I avoid costly spec corrections to enable SDK generation post-check-in because lint suppressions that affect SDK output are reviewed before merge.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| SDK-facing issues discovered post-check-in | TBD | 90% reduction |
| Time spent on post-merge spec corrections for SDK generation | TBD | 80% reduction |
| Inappropriate lint suppressions merged without review | TBD | 0 |

---

## 2. TypeSpec Service Spec Tools

**Goal:** Build AI-powered tools that simplify common API specification workflows for service teams.

### AI Skills for Spec Authoring

- Intelligent code completion and generation for TypeSpec specs
- Context-aware suggestions based on Azure patterns and best practices
- Inline validation and quick-fix suggestions

**User Stories:**
- *As a service team*, I can describe my API intent in natural language and get a correct TypeSpec scaffolding with appropriate decorators and patterns.
- *As a service team*, I get real-time suggestions that match Azure conventions (e.g., correct LRO patterns, proper error models) as I type.
- *As a new TypeSpec author*, I can ask the AI what decorator or template to use for my scenario and get a working example inline.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to author a new resource type spec | TBD | 50% reduction |
| Manual editing time avoided by accepting AI suggestions | TBD | 30% reduction in total authoring time |
| Spec correctness on first CI run (AI-assisted) | TBD | > 80% |
| Time to first successful PR for new TypeSpec authors | TBD | 50% reduction |
| Service team satisfaction (quarterly survey) | TBD | > 4/5 rating |

### API Version Extraction Workflow

- **Pri 1** — Automated extraction of new API versions from existing specs to support spec migration from private to public repos, and extraction of public APIs from a spec which may include public and non-public APIs
- Support complex versioning patterns (additive, breaking, preview/GA transitions)
- Generate version diff reports for review

**User Stories:**
- *As a service team*, I can create a new API version by specifying what changed, and the tool generates the correct versioning decorators and structure.
- *As a spec reviewer*, I get a clear report showing exactly what was added, removed, or changed between API versions.
- *As a service team*, I can promote a preview API version to GA with a single command that handles all the version bookkeeping.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to create a new API version | TBD | 60% reduction |
| Time to migrate a spec from private to public repo | TBD | 70% reduction |
| Versioning errors caught in review | TBD | 80% reduction (caught by tool instead) |
| Manual version decorator edits required | TBD | < 5 per version extraction |
| Service team satisfaction (quarterly survey) | TBD | > 4/5 rating |

### Spec Validation and Simplification

- AI-driven tools to validate specs against Azure guidelines
- Automated simplification of specs based on new patterns and templates
- Detect and suggest refactoring opportunities (e.g., migrate to newer ARM templates)

**User Stories:**
- *As a service team*, I can run a single command to check if my spec follows all current Azure best practices, with actionable suggestions for improvements.
- *As a service team maintaining legacy specs*, I get automated suggestions to simplify my spec using newer patterns, with confidence that the API contract is preserved.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Review cycles reduced by catching guideline issues pre-submission | TBD | 50% fewer review round-trips |
| Manual simplification effort saved per spec | TBD | > 2 hours per spec |
| API contract preservation rate (after simplification) | TBD | 100% |

### Best Practice Documentation and Samples

- **Pri 0** — Add TypeSpec equivalents to API documentation in the RPaaS wiki and ARM RPC
- Ensure all API guidance references TypeSpec as the primary authoring format
- Improve and fill gaps in documentation and samples for common `typespec-azure-core` scenarios
- Write templates and samples for common data plane API patterns that are Microsoft REST API Guideline compliant
- Improve documentation for common `typespec-azure-resource-manager` patterns and scenarios
- Ensure that operation templates provide adequate documentation about the details of the HTTP operations they create
- Ensure documentation quality is sufficient to improve AI tool performance when using docs as context

**User Stories:**
- *As a new service team*, I can find TypeSpec-first guidance in all official documentation, so I don't start with deprecated OpenAPI patterns.
- *As a service team writing a data plane API*, I can find complete, working samples for common patterns (LRO, paging, error handling, auth) that are REST API Guideline compliant, so I don't reinvent them.
- *As a service team writing an ARM resource*, I can find clear documentation for every common ARM pattern (CRUD, async operations, child resources, scoped resources) with copy-paste-ready templates.
- *As an AI tool assisting spec authoring*, I can reference high-quality documentation and samples as context, producing more accurate suggestions with fewer hallucinations.
- *As a new TypeSpec author*, I can learn by example from a comprehensive sample gallery organized by scenario rather than by API surface.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time for service teams to find TypeSpec guidance for their scenario | TBD | < 5 minutes |
| Time for authors to find azure-core guidance for a common scenario | TBD | < 5 minutes |
| Time for authors to find ARM guidance for a common scenario | TBD | < 5 minutes |
| AI tool accuracy when using docs as context | TBD | 30% improvement |
| Service team satisfaction with documentation (survey) | TBD | > 4/5 rating |

### TypeSpec-to-TypeSpec Source Emitter

- A source-level emitter that can transform TypeSpec code in an API-neutral way
- Rule-based transformations (e.g., apply new decorator patterns, migrate deprecated constructs)
- Preserve authoring intent while modernizing spec structure
- Enable bulk migrations across the spec repo

**User Stories:**
- *As a platform team*, I can roll out a new pattern (e.g., new error model template) across hundreds of specs automatically with a transformation rule.
- *As a service team*, I can run a migration tool that updates my spec to use the latest patterns while preserving my API contract and authoring style.
- *As a library author*, I can deprecate an old pattern and provide an automated codemod that migrates consumers.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Engineer-hours saved per bulk pattern rollout | 0 | > 200 hours per rollout |
| Manual fixups required post-transformation | N/A | < 5% of transformed specs |
| API contract preservation rate | N/A | 100% |
| Time to roll out a pattern change across spec repo | Weeks (manual) | < 1 day |

---

## 3. TypeSpec Contribution Tools

**Goal:** Accelerate development of TypeSpec extensions (libraries, emitters, linting rules, documentation, and tools) using AI-assisted workflows.

### AI Skills for Extension Authoring

- **Pri 0** — Basic TypeSpec Skill Library covering:
  - Formatting and code style
  - Testing and examples
  - Code coverage analysis
  - Documentation generation
- Scaffolding tools for new libraries, emitters, and linter rules
- AI-assisted bug fix and feature development workflows

**User Stories:**
- *As a TypeSpec contributor*, I can describe a new linting rule in natural language and get a complete implementation with tests and documentation.
- *As a TypeSpec contributor*, I can scaffold a new emitter package with a single command and get a working starting point with proper project structure.
- *As a TypeSpec contributor*, I can ask the AI to fix a failing test and get a correct implementation that passes.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to implement a new linting rule (end-to-end) | TBD | 60% reduction |
| Time to scaffold a new library/emitter | TBD | 80% reduction |
| Manual rework time per AI-assisted contribution | TBD | < 30 minutes per PR |
| Total effort (human + AI) per contribution vs. fully manual | TBD | 60% reduction |
| Human interaction rounds per AI-assisted PR | TBD | ≤ 3 rounds |

### Website-Integrated Documentation

- **Pri 0** — Website-integrated documentation chatbots
- Interactive docs that can answer questions about TypeSpec APIs, decorators, and patterns
- Context-aware help integrated into the authoring experience

**User Stories:**
- *As a new TypeSpec user*, I can ask the docs chatbot "how do I model a long-running operation?" and get a working example with explanation.
- *As a library consumer*, I can ask the chatbot about a specific decorator's behavior and get accurate, up-to-date information from the source.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Documentation questions resolved without human help | TBD | > 80% |
| User satisfaction with chatbot answers | N/A | > 4/5 rating |
| Time to find information (chatbot vs. manual search) | TBD | 70% reduction |

### Data Collection for AI PRs

- **Pri 0** — Systematic data collection from AI-generated PRs
- Track quality, acceptance rate, and iteration patterns
- Use data to improve AI skill accuracy over time

**User Stories:**
- *As a platform team*, I can see dashboards showing AI PR quality trends, acceptance rates, and common failure patterns.
- *As an AI skill developer*, I can use collected data to identify where skills fail most often and prioritize improvements.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time from AI PR creation to mergeable state | TBD | < 1 hour |
| Manual intervention time per AI-generated PR | TBD | < 15 minutes |
| Time until users see fewer repeated AI failure modes | N/A | < 2 weeks |

### Azure SDK Emitter Consolidation

- **Pri 0** — Move all Azure SDK language emitters into the typespec-azure repo
- Integrate emitters with the TypeSpec playground and shared tooling
- Enable unified CI that catches cross-emitter regressions from TypeSpec changes
- Provide a single development environment for TypeSpec core + Azure emitter work

**User Stories:**
- *As an Azure SDK team member*, I can more quickly find and fix issues with TypeSpec changes because emitters are co-located with the TypeSpec libraries they depend on.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to identify and fix emitter issues caused by TypeSpec changes | TBD | 60% reduction |
| Cross-repo coordination overhead for breaking changes | TBD | Eliminate entirely |
| Time from TypeSpec change to emitter validation | TBD | < 1 hour (same CI run) |

---

## 4. TypeSpec Simplification

**Goal:** Extend TypeSpec core to make common specification patterns easier to write, reducing boilerplate and cognitive load.

### Functions

- **Pri 0** — First-class functions in TypeSpec
- Enable composable logic within specs without requiring JavaScript decorator implementations
- Support function composition for building up libraries from TypeSpec templates
- Enable building functions through composition
- Add a core set of basic composable functions and templates that allow building complex library types
- **Pri 1** — Composable transformation functions/templates
- Allow function composition to provide basic, composable operations for building up libraries
- Make libraries, functions, and templates easier to write and maintain
- Reduce the JavaScript knowledge required for common library patterns

**User Stories:**
- *As a library author*, I can write reusable logic in TypeSpec itself (not JavaScript) that transforms types, validates patterns, or computes values.
- *As a spec author*, I can compose functions to build complex types from simple building blocks without understanding the compiler internals.
- *As a library author*, I can express template constraints and transformations declaratively in TypeSpec.
- *As a library author*, I can compose small, reusable operations (e.g., "add pagination", "add error envelope", "add versioning") rather than writing monolithic templates.
- *As a spec author*, I can mix and match library operations to build exactly the API pattern I need without forking templates.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time for library authors to implement common patterns | TBD | 50% reduction |
| Time to implement a new library template | TBD | 40% reduction |
| Share of common tasks completable without writing custom JavaScript | TBD | > 80% |
| Time to compose a new API pattern from existing building blocks | N/A | < 30 minutes |
| User-facing defects caused by inconsistent template behavior | TBD | 80% reduction |
| Time for a new contributor to make a useful library change without JS expertise | TBD | < 2 hours |

### Meta-Language Improvements

- **Pri 0** — Improvements to the TypeSpec meta-language for library/emitter authors
- **Pri 0** — String interpolation in function and template implementations
- **Pri 1** — TypeKit normalization for consistent type manipulation
- **Pri 1** — Building functions and decorators without code (declarative definitions)

**User Stories:**
- *As a library author*, I can use string interpolation in templates to generate names, descriptions, and paths without awkward concatenation workarounds.
- *As a library author*, I can use a normalized TypeKit API that provides consistent behavior across all type manipulation scenarios.
- *As a library author*, I can use the TypeSpec meta-language to target any type in a TypeSpec spec.
- *As a new contributor*, I can define simple decorators and functions declaratively without writing any JavaScript.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to implement or modify a library feature | TBD | 40% reduction |
| Time for new contributor to implement first decorator | TBD | 60% reduction |
| TypeKit API consistency (breaking edge cases) | TBD | 0 inconsistencies |

### Complex Versioning Patterns

- **Pri 1** — Versioning mechanism for template instantiation parameter changes
- **Pri 1** — Versioning decorators for decorator application (including new syntax)
- **Pri 1** — Version range decorators for expressing compatibility spans
- TypeSpec-native scope for versioning that goes beyond current `@added`/`@removed`

**User Stories:**
- *As a service team*, I can express complex version evolution (e.g., "this parameter was optional in v1, required in v2, and removed in v3") cleanly in TypeSpec.
- *As a library author*, I can version my template instantiations to easily reflect API evolution.
- *As a spec author*, I can express "this feature is available in versions 2023-01-01 through 2024-06-01" with a single decorator.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to model a complex versioning scenario | TBD | 60% reduction |
| Versioning-related spec errors in CI | TBD | 70% reduction |
| Time to author and review a complex versioning change | TBD | 50% reduction |

### Compiler and Infrastructure

- **Pri 1** — Additional test coverage for core compiler
- **Pri 1** — Refactoring to simplify compiler code
- New performance tests and minimum performance standards for linting rules, decorators, and JS APIs

**User Stories:**
- *As a TypeSpec contributor*, I can run a performance benchmark before submitting a PR and know immediately if my change regresses performance.
- *As a TypeSpec contributor*, I can add new language features to the compiler without fear of regressing current behavior.
- *As a library author*, I have confidence that my linting rules meet performance standards and won't slow down CI for service teams.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Regression bugs that reach contributors or service teams | TBD | 0 per release |
| Unexpected performance regressions experienced by users after upgrade | TBD | 0 per release |
| Lint rule execution time (p95) | TBD | < 100ms per rule per spec |

---

## 5. TypeSpec-Azure Simplification

**Goal:** Use new TypeSpec core features (especially functions) to simplify the `typespec-azure-core` and `typespec-azure-resource-manager` libraries.

### Azure.Core Simplification

- **Pri 1** — API normalization for the REST, Azure.Core, and Azure.ResourceManager libraries
- Leverage functions to replace complex decorator-based patterns
- Reduce template nesting and improve readability of Azure specs
- Provide simpler abstractions for common patterns (LRO, paging, error handling)

**User Stories:**
- *As a service team*, I can define a long-running operation in 3-5 lines instead of 15+, using a simplified LRO function.
- *As a service team*, I can read my own spec 6 months later and understand it without cross-referencing template documentation.
- *As a new Azure service team*, I can get started with a correct, minimal spec in under an hour using simplified patterns.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to author a standard resource definition | TBD | 40% reduction |
| Time for authors to understand or modify an existing resource spec | TBD | 50% reduction |
| Time for new team to author first correct spec | TBD | 50% reduction |
| Time for new teams to choose the correct Azure.Core abstraction | TBD | < 10 minutes |
| Service team satisfaction (quarterly survey) | TBD | > 4/5 rating |

### Azure.ResourceManager Simplification

- **Pri 0** — Merge Patch support in Azure libraries
- Simplify ARM resource definitions using composable functions
- Reduce boilerplate for standard CRUD operations
- Make ARM-specific patterns (singleton resources, child resources, scoped resources) more intuitive

**User Stories:**
- *As a service team*, I can define a standard ARM resource with CRUD operations in under 10 lines of TypeSpec.
- *As a service team*, I can use merge-patch update semantics without manually constructing the patch model.
- *As a service team*, I can model singleton and child resources with obvious, discoverable patterns.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to author a standard ARM resource with CRUD | TBD | 50% reduction |
| Merge-patch related errors in review | TBD | 90% reduction |
| Time to model a standard ARM resource | TBD | 50% reduction |
| Service team satisfaction (quarterly survey) | TBD | > 4/5 rating |

---

## 6. Agentic Tools for Repository Maintenance

**Goal:** Deploy AI agents to maintain the azure-rest-api-specs, typespec, and typespec-azure repositories.

### Issue Triage Agent

- **Pri 0** — Automated issue triage for incoming bug reports and feature requests
- Classify, label, assign, and prioritize issues
- Detect duplicates and link related issues

**User Stories:**
- *As a TypeSpec maintainer*, issues are automatically labeled and prioritized so I can focus on the highest-impact work.
- *As a bug reporter*, my issue is quickly linked to related issues and I get faster responses because triage happens instantly.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time from issue filed to triaged (labeled + assigned) | TBD | < 5 minutes (automated) |
| Triage accuracy (correct labels) | N/A | > 90% |
| Duplicate detection rate | TBD | > 80% of true duplicates caught |
| Maintainer time spent on triage | TBD | 80% reduction |

### Release Management Agents

- **Pri 0** — Release notes generation
- **Pri 1** — Updating specs and SDK repos with new version releases
- **Pri 1** — Creating hotfix releases
- **Pri 1** — Versioning and changelog updates
- End-to-end release orchestration with human approval gates

**User Stories:**
- *As a TypeSpec maintainer*, release notes are generated automatically from merged PRs with correct categorization and breaking change highlights.
- *As a TypeSpec maintainer*, I can trigger a release and the agent handles version bumps, changelogs, tagging, and downstream notifications.
- *As a TypeSpec maintainer*, I can create a hotfix release with a single command and the agent handles cherry-picks and version management.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to produce release notes | TBD | 90% reduction |
| Release process errors (missed steps) | TBD | 0 |
| Time from merge to release (for standard releases) | TBD | < 1 hour |
| Human steps required per release | TBD | ≤ 1 (approval only) |

### Continuous Code Quality

- **Pri 0** — Continuous code quality, test coverage, samples, and documentation skills
- Automated detection of bad patterns in specs
- API-neutral simplification suggestions
- Continuous validation and testing across the spec repo

**User Stories:**
- *As a TypeSpec maintainer*, I get proactive notifications when code quality degrades, test coverage drops, or documentation drifts.
- *As a spec author*, I get automated suggestions for simplifying my spec that are verified to preserve API semantics.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Regressions that escape to users after changes merge | TBD | 0 per release |
| Author/reviewer time saved by catching issues early | TBD | > 1 hour per PR |
| User-reported confusion caused by outdated documentation | TBD | 0 incidents per month |
| Review cycles eliminated by proactive quality detection | TBD | 50% fewer review rounds |

### Spec Rollout Tools

- Orchestration and process tooling for rolling out TypeSpec changes into the spec repo at scale (leveraging the TypeSpec-to-TypeSpec source emitter from §2 as the transformation engine)
- Automated PR generation for bulk migrations
- Impact analysis before rolling out breaking changes

**User Stories:**
- *As a platform team*, I can roll out a new TypeSpec version or pattern change across the spec repo with automated PRs and impact analysis.
- *As a platform team*, I can preview the impact of a library change on all consuming specs before releasing it.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Engineer-hours saved per spec repo rollout | 0 | > 100 hours per rollout |
| Rollout-caused regressions | TBD | 0 |
| Time for full spec repo rollout | Weeks | < 2 days |

### Documentation Maintenance

- Keep specs and docs in sync automatically
- Detect stale documentation and generate updates
- Cross-reference validation between specs and published docs

**User Stories:**
- *As a docs consumer*, I can trust that published documentation matches the current spec because sync is automated.
- *As a maintainer*, I get alerts when docs drift from implementation with suggested fixes.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| User-facing doc inaccuracies reported after publication | TBD | < 1 per month |
| Users who find docs accurate on first use (survey) | TBD | > 95% |

---

## 7. Accelerating Service Development

**Goal:** Provide mechanisms that speed up the service team development lifecycle from spec to running service.

### Service Stub Generation

- Tools to generate service implementation stubs from TypeSpec specs
- Support for multiple target languages and frameworks
- Include boilerplate for auth, middleware, and observability

**User Stories:**
- *As a service team*, I can generate a working service skeleton from my TypeSpec spec with all routes, models, and middleware scaffolded.
- *As a service team*, the generated stub includes correct auth, logging, and health-check boilerplate so I can focus on business logic.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time from spec to running skeleton service | TBD | < 30 minutes |
| % of API surface correctly scaffolded | N/A | > 95% |
| Manual boilerplate code required post-generation | N/A | < 50 lines |

### Test Generation

- Automated test case generation from spec definitions
- Contract tests that validate service implementations against their specs
- Load test scaffolding based on API shape and expected usage patterns

**User Stories:**
- *As a service team*, I get a suite of contract tests generated from my spec that I can run against my implementation to verify conformance.
- *As a service team*, I can generate load test scaffolding that exercises all my endpoints with realistic payloads.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time to get a usable contract test suite for a new service | TBD | < 1 hour |
| Time to create contract test suite | TBD | 90% reduction |
| Spec conformance issues caught by generated tests | N/A | > 90% of deviations |

### Live Service Validation

- Tools to validate running services against their TypeSpec specs
- Runtime conformance checking (request/response validation)
- Integration with CI/CD for continuous conformance

**User Stories:**
- *As a service team*, I can point a validator at my running service and get a report of where my implementation deviates from the spec.
- *As a CI pipeline*, I can block deployments that don't conform to the published spec.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Spec conformance rate (validated services) | TBD | > 99% |
| Time from deployment to conformance report | N/A | < 5 minutes |
| API contract violations caught before production | TBD | > 95% |

### ARM to RPaaS TypeSpec Transformation

- **Pri 1** — Automated transformation of ARM specs to RPaaS TypeSpec
- Handle complex resource hierarchies and cross-resource references
- Validate transformed specs against RPaaS requirements
- Generate stubs and tests for RPaaS UserRP extension APIs that implement services using the RPaaS front end

**User Stories:**
- *As a service team migrating to RPaaS*, I can use TypeSpec tooling to develop stubs and tests for RPaaS UserRP extension APIs that implement my service using the RPaaS front end.
- *As a service team migrating to RPaaS*, I can automatically transform my existing ARM spec to RPaaS-compatible TypeSpec without manual rewriting.
- *As a platform team*, I can batch-transform ARM specs to RPaaS TypeSpec and validate correctness automatically.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time saved per team migrating from ARM to RPaaS TypeSpec | TBD | > 1 week per migration |
| Manual fixups required post-transformation | N/A | < 10% of specs |
| Time to transform (automated vs. manual) | Weeks (manual) | < 1 hour |

---

## 8. API Audits, Cleanup, and Completeness Assessments

**Goal:** Drive `typespec-azure-core`, `typespec-azure-resource-manager`, and TCGC to 1.0 quality through systematic audits.

### API Surface Audit

- Comprehensive review of all public APIs in core packages
- Identify inconsistencies, naming issues, and gaps
- Document intended vs. actual behavior for all decorators and templates

**User Stories:**
- *As a library consumer*, every public API I use has documented behavior, consistent naming, and no surprising edge cases.
- *As a TypeSpec maintainer*, I have a complete inventory of public APIs with their intended semantics, making it easy to assess breaking changes.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time for consumers to find correct API behavior without maintainer help | TBD | < 10 minutes |
| User confusion or misuse caused by inconsistent naming | TBD | 0 reported incidents |
| User-reported surprises caused by undocumented behavior | TBD | 0 per quarter |

### Cleanup and Deprecation

- Remove or deprecate APIs that have been superseded
- Consolidate overlapping functionality
- Establish clear migration paths for deprecated APIs

**User Stories:**
- *As a library consumer*, deprecated APIs have clear migration guidance and I'm never stuck using something that will be removed without a path forward.
- *As a maintainer*, the API surface is lean—no duplicate or overlapping functionality confuses users.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Time for consumers to migrate off a deprecated API without help | TBD | < 1 hour |
| Users choosing the wrong API due to confusing overlap | TBD | 0 reported incidents |
| Migration effort required per consumer | N/A | < 2 hours |

### Completeness Assessment

- Gap analysis: what patterns exist in Azure services that aren't well-supported?
- Prioritize missing patterns by service team demand
- Define 1.0 criteria for each package:
  - `@azure-tools/typespec-azure-core`
  - `@azure-tools/typespec-azure-resource-manager`
  - `@azure-tools/typespec-client-generator-core` (TCGC)
  - Potentially the REST library

**User Stories:**
- *As a service team*, every Azure API pattern I need is supported natively—I never need custom workarounds for standard patterns.
- *As a TypeSpec maintainer*, I have clear 1.0 criteria and can track progress toward release readiness.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Service teams blocked by missing pattern support | TBD | 0 teams blocked |
| Service team requests for missing patterns | TBD | < 5 open requests per package |
| User-reported blockers to confident 1.0 adoption | 0 | 0 remaining |

### Stability Guarantees

- Define semantic versioning policies for 1.0+
- Establish breaking change policies and review processes
- Create compatibility test suites

**User Stories:**
- *As a library consumer*, I can upgrade minor versions with confidence that my spec won't break.
- *As a maintainer*, I have automated compatibility tests that catch unintentional breaking changes before release.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Unintentional breaking changes shipped | TBD | 0 |
| Consumer breakages encountered when upgrading minor versions | TBD | 0 per release |
| Time to assess breaking change impact | TBD | < 1 hour (automated) |

---

## 9. TypeSpec and TypeSpec-Azure Additions for New Service Patterns

**Goal:** Extend TypeSpec to support emerging Azure service patterns that aren't well-served by current abstractions.

### New ARM Patterns

- Support for new ARM resource lifecycle patterns
- Enhanced common-types coverage
- Better modeling for complex resource relationships and dependencies

**User Stories:**
- *As a service team*, I can model new ARM resource lifecycle patterns (e.g., async provisioning with dependencies) without custom workarounds.
- *As a service team*, common-types covers my needs so I don't redefine standard models.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| ARM patterns requiring custom workarounds | TBD | < 5% |
| Time saved by reusing standard models instead of redefining them | TBD | > 1 hour per resource |
| Time to author a new ARM spec without custom workarounds | TBD | < 2 hours |

### Streaming Support

- First-class support for streaming APIs (SSE, WebSocket, gRPC streaming)
- TypeSpec modeling for streaming request/response bodies
- Emitter support for generating streaming client code

**User Stories:**
- *As a service team building a streaming API*, I can model my SSE/WebSocket endpoint in TypeSpec and get correct client generation.
- *As a service team*, I can express streaming semantics (chunked responses, event types, connection lifecycle) directly in my spec.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Teams able to model streaming endpoints without custom extensions | 0% | > 90% |
| Client code generation correctness (streaming) | N/A | > 95% |
| Time to model a streaming endpoint (vs. manual) | TBD | Comparable to non-streaming |

### Azure AI and Foundry APIs

- Better support for Azure AI service patterns
- Foundry API modeling (agents, prompt flows, model deployments)
- Support for AI-specific patterns (token streaming, tool calling, structured outputs)
- Templates for common AI service shapes

**User Stories:**
- *As an AI service team*, I can model my Foundry endpoints (agents, tool calling, structured outputs) using purpose-built TypeSpec templates.
- *As an AI service team*, I can express token streaming, function calling schemas, and structured output types natively in TypeSpec.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| AI service teams able to model their APIs without custom workarounds | TBD | > 80% |
| Time for AI service teams to produce a correct first spec | TBD | < 4 hours |
| Time saved per AI service spec by using built-in templates | N/A | > 3 hours |

### Additional Patterns

- Event-driven API patterns (webhooks, event subscriptions)
- Batch and bulk operation patterns
- Multi-tenant and cross-region patterns
- API gateway and aggregation patterns

**User Stories:**
- *As a service team*, I can model webhooks, event subscriptions, and batch operations using standard TypeSpec patterns rather than custom extensions.
- *As a service team*, multi-tenant and cross-region patterns have first-class support so my spec accurately represents my service's behavior.

**Metrics:**
| Metric | Baseline | Target |
|--------|----------|--------|
| Teams able to model event-driven APIs without custom extensions | TBD | > 80% |
| Time to model batch/bulk operations using standard patterns | TBD | < 1 hour |
| Custom-extension effort eliminated by using native patterns | TBD | > 75% reduction |

---

## 10. End-to-End User Experience Vision

When all workstreams deliver, the combined user experience transforms how teams interact with the Azure API ecosystem.

### The Service Team Experience (When Complete)

A service team starting a new API will:

1. **Author** their spec in TypeSpec using AI-assisted tooling that suggests patterns, validates against Azure guidelines in real-time, and auto-completes complex ARM templates — all without leaving their editor.
2. **Evolve** their API by adding versions with AI-assisted extraction, where the tool understands versioning semantics and generates the correct decorators and diff reports automatically.
3. **Validate** through TypeSpec-native CI that runs in seconds (not minutes), gives clear actionable errors for breaking changes and lint violations, and provides one-click fixes for common issues. Examples are auto-generated and only changed examples need review.
4. **Ship** with confidence because live service validation confirms their implementation matches the spec, and generated stubs/tests gave them a head start on implementation.

### The TypeSpec Contributor Experience (When Complete)

A developer extending TypeSpec will:

1. **Scaffold** a new library, emitter, or linting rule using AI skills that generate working boilerplate with tests and documentation from a natural-language description.
2. **Implement** using functions and composable templates that require minimal JavaScript knowledge, with AI assistance that understands TypeSpec internals.
3. **Validate** through continuous quality agents that check code coverage, performance, documentation completeness, and pattern adherence automatically.
4. **Release** through automated agents that handle versioning, changelogs, release notes, and downstream propagation.

### The Platform Maintainer Experience (When Complete)

The TypeSpec platform team will:

1. **Triage** issues automatically, with agents classifying, deduplicating, and routing incoming reports.
2. **Maintain** specs at scale through agentic tools that detect drift, suggest simplifications, and roll out pattern updates across thousands of specs.
3. **Audit** API surfaces systematically, with tooling that identifies gaps, inconsistencies, and 1.0 readiness across all packages.

---

## 11. Quarterly Roadmap and Capabilities

### Summer 2026 (July–September)

**End-to-end capabilities delivered:**
- Service teams can run TypeSpec-native linting and breaking change detection in CI (replacing LintDiff and OpenAPI breaking change tools)
- TypeSpec-native example generation and validation replaces OpenAPI-based example tooling
- Contributors can use a basic AI skill library for formatting, testing, examples, and documentation
- Issue triage and release notes are automated
- Functions are available in TypeSpec for library authors

**Key deliverables:**
- TypeSpec CI tools replace LintDiff/Breaking Change (§1)
- TypeSpec example generation, validation, and changed-only filtering (§1)
- Functions ship in TypeSpec core (§4)
- AI skill library v1 (§3)
- Issue triage agent live (§6)
- Merge Patch in Azure libraries (§5)
- Website documentation chatbots (§3)
- Data collection pipeline for AI PRs (§3)

**Metrics checkpoint:**
- Establish baselines for all metrics
- CI tool parity confirmed (no regression in coverage)
- Measure initial AI skill library usage and token costs
- Example authoring time baseline established

### Fall 2026 (October–December)

**End-to-end capabilities delivered:**
- Service teams author specs using simplified Azure patterns (functions-based) with dramatically less boilerplate
- AI-assisted version extraction workflows are operational
- Continuous code quality agents are monitoring repos and flagging issues proactively
- TypeSpec-to-TypeSpec source emitter enables bulk pattern migrations

**Key deliverables:**
- Azure library simplification using functions (§5)
- API version extraction workflow (§2)
- TypeSpec-to-TypeSpec source emitter (§2)
- Composable operations and templates (§4)
- Release management agents (§6)
- 1.0 audit complete for core packages (§8)
- Service stub generation v1 (§7)

**Metrics checkpoint:**
- 30% reduction in specs PR completion time
- 50% reduction in time resolving CI errors (lint, breaking changes, examples)
- 70% reduction in example authoring time
- 2× increase in AI-assisted PRs to TypeSpec repos
- Establish token cost baselines for all AI workflows

### Winter 2026–27 (January–March)

**End-to-end capabilities delivered:**
- Full agentic maintenance suite operational across all repos
- Streaming and AI/Foundry patterns available for service teams
- SDK language teams fully migrated off OpenAPI 2.0
- All core packages at 1.0 readiness with stability guarantees
- Live service validation integrated into service team CI/CD

**Key deliverables:**
- Streaming and AI/Foundry patterns (§9)
- Full agent suite operational (§6)
- SDK team migration complete — CLI, PowerShell, Terraform on TypeSpec/OpenAPI3 (§1)
- Complex versioning patterns (§4)
- Live service validation (§7)
- ARM to RPaaS transformation tool (§7)
- New ARM patterns (§9)

**Metrics checkpoint:**
- All target metrics achieved or on-track
- 40% reduction in time to author new TypeSpec features
- 40% reduction in time to author new specs
- ≤3 human interaction rounds for standard AI-assisted work
- Token costs reduced 25-30% from baseline
- 0 active OpenAPI 2.0 pipeline dependencies

---

## References

- Prior planning: [TypeSpec Team Planning (Loop)](https://loop.cloud.microsoft/p/eyJ3Ijp7InUiOiJodHRwczovL21pY3Jvc29mdC5zaGFyZXBvaW50LmNvbS8_bmF2PWN6MGxNa1ltWkQxaUlXOXhaV2sxUTJSVGFqQlRRbWd4UW00dFVWQk9NbkZMTUZoV2NFOXBZVVpRYUhOblVGUm9SMUpPZEc4ME0yTXpVa3N4VFRsUmNEUlBWbkZtVlhkdlpXa21aajB3TVZWUlYwVlpVRTFHU0U5WFF6Uk1WMVphTlVGSlJWYzNURXRMVGtSUFRrOHlKbU05Sm1ac2RXbGtQVEUlM0QiLCJyIjpmYWxzZX0sInAiOnsidSI6Imh0dHBzOi8vbWljcm9zb2Z0LnNoYXJlcG9pbnQuY29tL3NpdGVzLzRiOGNkNTZiLTZkNDAtNGFiMy1iZWE1LTE3NDRkNGQ3M2NkZj9uYXY9Y3owbE1rWnphWFJsY3lVeVJqUmlPR05rTlRaaUxUWmtOREF0TkdGaU15MWlaV0UxTFRFM05EUmtOR1EzTTJOa1ppWmtQV0loYjNGbGFUVkRaRk5xTUZOQ2FERkNiaTFSVUU0eWNVc3dXRlp3VDJsaFJsQm9jMmRRVkdoSFVrNTBielF6WXpOU1N6Rk5PVkZ3TkU5V2NXWlZkMjlsYVNabVBUQXhWVkZYUlZsUVNqUTNTRGRYUWxoR1ZsbGFRVW8wU1ZvMldWbFVORnBVUlVJbVl6MGxNa1ltWm14MWFXUTlNU1loUFZSbFlXMXpKbkE5SlRRd1pteDFhV1I0SlRKR2JHOXZjQzF3WVdkbExXTnZiblJoYVc1bGNnJTNEJTNEIiwiciI6ZmFsc2V9LCJpIjp7ImkiOiJhZTBhYmU1Zi0yZDNiLTQwYjQtOWIwNS0yY2Q4MTMyNmI4MWMifX0)
- Repository: [Azure/typespec-azure](https://github.com/Azure/typespec-azure)
- TypeSpec core: [microsoft/typespec](https://github.com/microsoft/typespec)
