---
name: do-linter-development-task-one-by-one
description: Run multiple prepared lintdiff worker commands sequentially, using one fresh top-level subagent per rule to sync the fixed target branch, develop the rule through a draft PR, and complete the Copilot review-and-fix loop. Use when the user supplies one or more /develop-lintdiff-rule --worker commands and wants them completed unattended, one at a time.
argument-hint: "<one /develop-lintdiff-rule --worker command per line>"
user-invocable: true
---

# Develop lintdiff rules one by one

Run a queue of prepared lintdiff worker commands sequentially. Each command is
an independent task and gets a fresh top-level subagent. Never have more than
one top-level worker running at a time.

The review-and-fix skill creates its own two persistent nested subagents. Those
nested subagents are allowed and do not violate the one-top-level-worker limit.

## Required input

Accept one command per non-empty input line. Every command must:

- start with `/develop-lintdiff-rule --worker`
- name exactly one rule
- include exactly one `--typespec-worktree <absolute-path>`
- include exactly one `--specs-worktree <absolute-path>`
- include exactly one `--target-branch feature/lintdiff-migration-new`
- contain no other flags or positional arguments

Treat quoted arguments as one value. Ignore Markdown code-fence lines and blank
lines, but otherwise preserve each command verbatim for the worker. Reject
duplicate options even when one occurrence has the required value.

Validate the complete queue before launching the first subagent. Record malformed
lines as failed tasks and continue with every valid command. Compare rule IDs
case-insensitively after normalizing them to a stable key while preserving their
original casing for display. Compare Windows worktree paths case-insensitively
after resolving them to normalized absolute paths. The first occurrence of a
rule ID, TypeSpec worktree, or specs worktree may remain valid; mark every later
queue entry that reuses any of them as failed. Do not ask the user to repair
malformed input during the run.

## Queue state

Keep an ordered ledger with one entry per input command:

- 1-based task number
- rule ID
- original command
- TypeSpec worktree
- absolute log path
- status: `pending`, `running`, `succeeded`, `partially-succeeded`, or `failed`
- draft PR URL, when one was created
- development result
- review-loop result
- process-improvement suggestions, each with the proposed change, observed
  evidence, impact, and source task
- attempt count and any retry reason
- blocker or failure, when applicable

Update the ledger after every worker result so a later failure does not erase
earlier outcomes.

## Sequential orchestration

For each valid pending command, in input order:

1. Launch exactly one fresh top-level general-purpose subagent. Do not reuse a
   prior worker with a follow-up message.
2. Give it the complete worker prompt below, including the original command and
   parsed TypeSpec worktree.
3. Wait for that subagent to finish before launching another top-level subagent.
   Do not start, prepare, or speculatively inspect a later task while it runs.
4. Record its structured result in the ledger.
5. If it failed or only partially succeeded, continue with the next task rather
   than stopping the queue.

Use background mode for a worker when the runtime requires multiple turns for a
long-running development and review workflow. After its completion notification,
read its result once, update the ledger, and only then launch the next worker.
Use sync mode only when the complete workflow can realistically finish within
that invocation.

At worker launch, report the active task, TypeSpec worktree, and `log.txt` path.
If the user requests status while the worker is running, read the latest
heartbeat and report its timestamp, phase, active command, elapsed time, and
last completed milestone. Do not launch another worker or duplicate the active
command merely to obtain status.

## Bounded orchestration retry

Allow at most one retry for a task, and use a fresh top-level subagent for it.
Retry only when the first attempt proves an unambiguous defect in this outer
skill's command parsing, worker prompt, worktree selection, log initialization,
or skill-invocation mechanics before `/develop-lintdiff-rule` begins repository
or dependency work.

Before retrying, verify all of the following:

- the TypeSpec and specs worktrees have no task changes
- no task commit was created or pushed
- no pull request was created
- the proposed orchestration-skill correction is narrow and directly addresses
  the recorded failure

Apply the narrow correction outside the rule worktrees, record the original
failure and correction in the ledger, then launch one fresh worker with the
corrected prompt. Never reuse the failed worker.

Do not retry dependency, build, validation, corpus, review, network, credential,
push, or GitHub failures automatically. Do not retry after development changed
files, created a commit, pushed a branch, or created a pull request. If the
retry fails, record the task's terminal result and continue the queue.

## Top-level worker prompt

Give each top-level subagent all of these instructions:

> You own exactly one lintdiff rule task. Work autonomously and do not ask the
> user or parent agent any questions. Make reasonable decisions from repository
> evidence. If a concrete blocker cannot be resolved safely, return the blocker
> instead of waiting for input.
>
> Your TypeSpec worktree is `<typespec-worktree>`. Begin by changing your working
> directory to that exact path and verify that it is the repository root. Run
> all TypeSpec repository and GitHub operations from that worktree unless an
> invoked skill explicitly requires the supplied specs worktree.
>
> Maintain an append-only execution log at `<typespec-worktree>\log.txt` for the
> entire task. Before making repository changes, resolve the worktree's exclude
> file with `git rev-parse --git-path info/exclude`, add the root-relative
> `/log.txt` entry if it is not already present, then create or append to the
> log. Verify with `git check-ignore log.txt` that Git ignores the file. This
> resolution is required because `.git` can be a file in a linked worktree.
> Never stage or commit `log.txt`. If the log cannot be created, appended, or
> verified as ignored, report the task as failed.
>
> Write a timestamped entry at task start and after every material action. Log
> shell commands before running them, their meaningful stdout and stderr, exit
> status, delegated-skill milestones, validation outcomes, commits, pushes, PR
> creation, review rounds, applied or rejected findings, blockers, and the final
> task outcome. Append entries as work progresses so the user can inspect the
> file while the task is running; do not wait until the end to write it. Never
> write credentials, tokens, authorization headers, or other secrets to the log.
>
> At every phase transition, append a `HEARTBEAT` entry containing the phase,
> active command, elapsed time, and last completed milestone. During an operation
> expected to exceed 10 minutes, run it in a form that permits monitoring and
> append another heartbeat at least every 10 minutes until it ends.
>
> Do not fetch, pull, merge, rebase, or reset the target or rule branch before
> invoking `/develop-lintdiff-rule`. That delegated skill exclusively owns
> worktree cleanliness checks, target-branch fetching, remote-base verification,
> and any safe fast-forward of an untouched rule branch.
>
> Next invoke this skill command verbatim as a slash-command/skill invocation,
> not as a shell command:
>
> `<original-command>`
>
> Follow `/develop-lintdiff-rule` through draft pull-request creation. Do not
> stop after implementation, validation, commit, or push. Capture the canonical
> draft PR URL from its result. If the skill asks whether to adopt post-run
> process suggestions, do not ask the user: decline automatic adoption, retain
> the suggestions for your result, and continue.
>
> After the draft PR exists, invoke:
>
> `/loop-for-fix-and-review <canonical-pr-url>`
>
> Complete that skill's bounded review-and-fix loop. It may create the two nested
> persistent subagents required by its own contract. If it asks whether to adopt
> post-run process suggestions, do not ask the user: decline automatic adoption
> and retain the suggestions for your result.
>
> Do not modify either delegated skill. Do not start another lintdiff rule.
> Return a structured result containing the rule ID, development outcome, draft
> PR URL if created, review-loop outcome and completed-round count, final PR head
> state when available, the absolute `log.txt` path, and any blocker. Return each
> process-improvement suggestion with four fields: proposed change, concrete
> observed evidence, impact, and source task.

The outer skill's no-question rule overrides the delegated skills' normal
post-run request for process-improvement approval. It does not override safety
stops, validation requirements, review-loop limits, or repository guardrails.

## Result classification

Classify a task as:

- `succeeded` when the draft PR was created and the review-and-fix loop reached
  a successful termination condition
- `partially-succeeded` when the draft PR was created but the review-and-fix loop
  ended with a blocker or at its cap without a clean verification result
- `failed` when branch synchronization or rule development failed before a draft
  PR was created

Do not describe a task as fully successful merely because it created a PR.

## Final result

After every queue entry is terminal, output the heading
`# LintDiff development results`, followed by this totals line:

`**Completed:** <total> | **Succeeded:** <count> | **Partial:** <count> | **Failed:** <count>`

Then report every task in input order using this layout:

````markdown
## <task-number>. <rule-id> - <status>

**TypeSpec worktree**

```text
<absolute-typespec-worktree>
```

**Pull request:** <canonical-pr-url-or-Not-created>

**Review:** <review-loop-result-or-reason-not-run>

**Execution log**

```text
<absolute-typespec-worktree>\log.txt
```

**Blocker:** <blocker-if-any>
````

Put each TypeSpec worktree in its own standalone `text` code block with no
prompt, label, `code -n`, or other command on the same line. This lets the user
copy the folder path directly. Do the same for the execution-log path. Omit the
`Blocker` line when there is no blocker. For malformed input whose worktree
cannot be parsed, use `Not available` for both paths.

After the task sections, add `## Process suggestions` and consolidate the
workers' suggestions with the outer agent's post-run observations. Never omit
failed input lines or stop the final report at the first failure.

Format every retained suggestion as:

```markdown
### <proposed-change>

**Evidence:** <specific event or result observed during the run>

**Impact:** <why the issue matters>

**Source:** Task <number> - <rule-id>, or Outer orchestration
```

Do not report a suggestion without concrete run evidence. Deduplicate
suggestions only when they describe the same root cause and proposed change;
combine their source tasks and evidence rather than discarding either.

## Post-run process review

After every queue entry is terminal, briefly review the complete run before the
final user response. This review belongs to the outer agent; workers must still
finish without asking the user questions.

Capture concrete suggestions for improving future queue runs, especially:

- command parsing, validation, deduplication, and malformed-input reporting
- worktree preflight, fixed-target synchronization, and branch safety
- worker prompts or delegated-skill handoffs that were missing or ambiguous
- background completion, queue-state persistence, failure continuation, and
  evidence that only one top-level worker ran at a time
- `log.txt` completeness, readability, secret avoidance, and usefulness while
  a worker was still running
- PR URL capture and transitions from development into the review-and-fix loop
- status classifications or summary details that made results hard to interpret
- copyability of TypeSpec worktree and execution-log paths
- repeated setup or validation work that could be avoided safely on later tasks
- skill instructions that should be corrected or clarified based on the run

Combine duplicate suggestions from workers and the outer review. In the final
handoff, print the consolidated list under `## Process suggestions`, then ask
the user whether any specific suggestions should be adopted into this skill.
Do not update the skill automatically; apply only suggestions the user
explicitly approves.

Apply approved improvements only after the queue and all review loops have
ended. Keep those edits separate from every lintdiff rule branch and pull
request, and do not restart completed rule-development or review workflows
merely to review the skill update.

## Guardrails

- Never launch two top-level workers concurrently.
- Never launch the next worker until the previous worker is terminal.
- Never reuse a completed worker for another command.
- Never ask the user a question during queue execution.
- Reject any command whose `--target-branch` is not exactly
  `feature/lintdiff-migration-new`.
- Reject duplicate or unknown arguments and later queue entries that reuse a
  rule ID, TypeSpec worktree, or specs worktree.
- Leave target synchronization and worktree verification exclusively to
  `/develop-lintdiff-rule`; the outer worker must not mutate Git state first.
- Never retry a task more than once or retry after development work begins.
- Never run a slash command as a PowerShell or shell executable.
- Never stage, commit, or push a worker's `log.txt`.
- Never infer success from subagent prose when the PR or pushed head can be
  verified directly.
- Never automatically edit either delegated skill based on post-run suggestions.
- Never automatically edit this skill based on post-run suggestions.
