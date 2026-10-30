# Analysis-first lint migration

Use source and semantic analysis to decide how to change a migrated lint rule.
Use coverage to test those decisions against real specs, not as the default
edit-debug loop. This policy preserves every required validation and review gate.

## Default edit loop

1. Read the upstream validator's selectors, predicates, exceptions and diagnostic
   unit. Compare them with the native contract, implementation, compiler/library
   APIs and existing tests. For groups, keep each member's behavior distinct.
2. Read saved diagnostics and relevant spec sources before generating new data.
   Check audience, API version, activation, suppressions and comparison scope.
   Separate semantic defects from population, projection and counting differences.
   Historical findings guide investigation; they do not validate changed code.
3. State the suspected cause and expected behavior before editing. Add a focused
   violating/compliant reproducer or regression test that distinguishes the
   hypothesis. Do not change production logic merely to equalize corpus counts.
4. Make the justified changes and run focused tests and affected checks. Batch
   related corrections until the implementation is stable. Do not launch a full
   corpus run after each edit, failed unit test or review comment.

If analysis and focused fixtures cannot settle a specific real-spec question,
use a supported representative compile or targeted reproduction. Record its
question and limits. Do not invent runner flags or filtered baseline reuse;
a reduced population never substitutes for required full-population evidence.

## Expensive coverage checkpoints

Run coverage when the stable candidate is ready for its required final gate,
or when a concrete unresolved equivalence, population or regression question
requires fresh real-spec execution. Coverage remains available during development;
it needs a reason, not a blanket prohibition or an automatic per-edit trigger.

Full native verification can take tens of minutes or more than an hour. The
current roughly one-hour planning estimate is not a completion guarantee or
proof that the production runner implements the benchmark's optimizations.
Estimate the actual supported path and comparable inputs. Candidate preparation,
gap fixing and reviews take additional time.

Before starting, record the question or required gate, candidate/specs/baseline
identities, supported scope and population, estimated cost, runtime budget, and
which earlier evidence remains reusable or is invalidated. Use the task's
declared budget; do not silently extend it or drop checks to meet it. At a cutoff,
retain partial receipts, failures and unassessed projects, and report an
incomplete gate rather than a pass.

Reuse compatible saved Swagger observations through the flow's supported path.
Native-first tasks consume the
[pinned shared baseline](../analyze-native-lint-coverage/shared-baseline.md);
they do not regenerate Swagger to debug a native edit. Distinguish inexpensive
report reanalysis from fresh native execution and from Swagger data production.
Reuse one frozen specs snapshot through the monthly dependency-upgrade cycle
under the [monthly evaluation policy](../analyze-native-lint-coverage/shared-baseline.md#monthly-evaluation-snapshot).
Keep native development on current canonical main. Check actual compatibility
changes rather than treating each new PR or Git SHA as a refresh trigger;
current verifier limitations remain explicit blockers, not proof of changed
Swagger or permission to bypass validation.

## Final evidence remains mandatory

After a coverage gap, analyze the saved findings and fix the evidenced cause with
focused regressions before another expensive run. Relevant rule/helper changes
invalidate affected native findings. Complete the required fresh full-population
verification on the final candidate; older counts cannot certify it. Reuse
unaffected evidence only when its content, inputs and compatibility still match.

Keep all required controls, representative/full runs, count and semantic
investigations, package/integration checks, independent reviews and separate
GitHub checkpoints. Batch within existing review/recovery bounds; do not reset
them. Analysis guides the fix; neither analysis alone nor equal totals prove
functional equivalence.
