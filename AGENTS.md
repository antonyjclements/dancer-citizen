# AGENTS.md
<!-- AGENTIC_WORKFLOW_VERSION=0.6.0 -->

This file guides coding agents working in this repository. Follow it in addition to system, developer, and user instructions. It says when to act and where to look; skills and `docs/workflow/` say how.

## Operating Principles

- Read the codebase before changing it. Prefer existing patterns, helpers, tests, and architecture over new conventions.
- Read `docs/workflow/field-guide.md` when starting a session with an unfamiliar task type or an unclear workflow position. It maps task types and team sizes to the right skill sequence.
- Keep changes scoped to the user request. Do not perform unrelated refactors or cleanup unless required to finish safely.
- Preserve user work. Never revert or overwrite changes you did not make unless explicitly asked.
- Prefer small, verifiable steps: inspect, plan when useful, implement, test, review, summarize.
- Use repo-relative paths in docs, plans, and summaries.
- Ask only when a decision is genuinely blocked and cannot be inferred from local context.

## Task Triage

Match the workflow to the smallest path that safely handles the request. A repo may need every workflow capability over time, but most individual tasks do not need the full ceremony.

### Trivial Change

Use for typos, broken links, comments, formatting, obvious one-line fixes, or tiny docs edits.

- Edit directly.
- Run the narrowest relevant check when one exists.
- Use `aw-commit` or `aw-commit-push-pr` only when the user asks to publish.
- Skip spec updates, plans, workflow compliance, and review gates unless the user explicitly asks for them.

### Small Fix

Use for contained bugs, small config changes, local docs updates, or narrow test fixes.

- Use `aw-debug` when the root cause is unclear; otherwise edit directly.
- Run targeted tests or checks for the touched area.
- Update README, specs, or decisions only when behavior, workflow, setup, or durable intent changes.
- Use `aw-commit-push-pr` when the user asks to publish.

### Feature or Behavior Change

Use when product behavior, workflow behavior, APIs, UX, data contracts, acceptance criteria, or durable user-facing intent changes.

- Ensure the relevant living spec exists and is updated.
- Use `aw-plan` when implementation has multiple steps or meaningful sequencing.
- Implement with `aw-work` or the configured replacement step.
- Map acceptance criteria to tests or explicit verification.
- Run relevant review gates and workflow compliance before PR creation.

### High-Risk or Cross-Cutting Change

Use for auth, payments, security, data loss risk, migrations, CI/CD, architecture, multi-module changes, or work that is hard to reverse.

- Use the full spec, plan, work, review, compliance, commit, PR, and pipeline path.
- Prefer explicit acceptance criteria and durable decision logs.
- Treat missing spec, test, or review evidence as a blocker unless the user explicitly accepts the risk.

## Standards Registry

Many repos include a standards registry at `docs/standards/index.yml`. If it exists, treat it as the entrypoint for repository best practices.

- Read it before planning, implementing, reviewing, or documenting non-trivial work; read only the standards applicable to the files or domain being touched.
- Apply relevant standards as enforceable guidance, ahead of local preference. If a standard conflicts with higher-priority instructions, follow the higher-priority instruction and call out the conflict.
- Cite applicable standards in plans and implementation notes; in reviews, flag violations as findings with file/line references and concrete fixes.
- When standards are missing, stale, or ambiguous, mention the gap rather than inventing a rule.

## Spec-Driven Development

Use the repo as the source of truth for product intent, standards, and decisions.

- `AGENTS.md` is the orientation and routing file. Keep `CLAUDE.md` aligned with it when present.
- Living specs: `docs/features/<feature>/spec.md`, indexed by `docs/features/index.yml`. One spec per feature or coherent capability. Specs describe current behavior and durable intent, not task progress.
- PRDs: `docs/product/prds/` (indexed; authored PRDs use `template.md` when the repo defines one). Statuses: `imported`, `draft`, `ready-for-spec`, `promoted`, `superseded`, `archived`. Imported PRDs are historical input, not living truth; authored PRDs are product input for specs.
- Brainstorms: `docs/brainstorms/`, one self-describing file per brainstorm — no index. Temporary plans: `docs/features/<feature>/plan.md` until removed.
- Standards: `docs/standards/`. Decisions: `docs/decisions/`. Learnings: `docs/learnings/` (repo-specific), then the org-shared tier when `org_knowledge.source` is set (see below), then `~/.agents/learnings/` (global fallback). All indexed by their `index.yml`.
- Session logs: `docs/sessions/`, one self-describing markdown file per session with `status` in its frontmatter — there is no session index. Written by `aw-capture session`, consumed by `aw-synthesize-memory`.
- Project wiki: `docs/context/wiki.md`, regenerated by `aw-synthesize-memory`. If it exists, read it at session start for a compact summary of active features, recent decisions, top learnings, and known dead ends. Check its `generated` date first: more than 30 days old, or several unprocessed session logs behind, means stale — verify anything load-bearing against the underlying specs, decisions, and learnings, and offer to re-run `aw-synthesize-memory`.
- Workflow config: `docs/workflow/config.yml`, documented in `docs/workflow/README.md`.
- The rule: if it describes intent, keep it alive. If it describes a plan, let it expire. If it describes a decision, log it immutably. If it is marked `archived`, remove it from the working tree via `aw-refresh cleanup`; git history is the archive.

### Workflow Step Routing

Read `docs/workflow/config.yml` before invoking a configurable workflow step. Use `workflow.steps.<step>.skill` when it is set; blank or missing means use the bundled default. The same applies to `workflow.auxiliary.<key>.skill` for helper capabilities. The full step and auxiliary key maps live in `docs/workflow/README.md`; keys not documented there are likely legacy — do not route on them, run the upgrade script instead (mapping under Legacy Fields there).

- Custom replacement skills must preserve the default step contract: accept the same handoff artifact or identifier, read relevant workflow config, return the expected artifact path/ID/result, and report unsupported behavior clearly. The step-by-step handoff contract is documented in `docs/workflow/README.md`.
- Commit messages, PR templates, ticket creation, and compliance checks are specified by the owning skills (`aw-commit`, `aw-commit-push-pr`, `aw-create-tickets`, `aw-check-workflow-compliance`); follow their configured behavior over local preference.
- There is no bundled pipeline monitor. After PR creation, invoke `workflow.steps.monitor_pipeline.skill` with the PR URL when configured; otherwise skip post-PR monitoring cleanly. Fix only failures caused by the current branch.
- Commit workflow exhaust separately from feature work: never stage `docs/sessions/` into a feature or fix commit. Session logs get `chore(session): log <slug>` commits; synthesis output gets one batched `chore(memory): synthesize N sessions` commit.
- For Slack context, use available tools directly; route through `workflow.auxiliary.research_slack.skill` when configured. Preserve source channels, dates, and workspace identifiers.
- To move an older install to the current version, run `skills/aw-init/scripts/upgrade.sh --repo <path> --dry-run`, then `--apply` after the user approves. The script backs up and migrates the config, preserves unknown fields, and stops for manual review on routing conflicts.

### Implementation Test Policy

Read `workflow.implementation.test_policy` before implementation; blank or missing defaults to `acceptance-first`. Valid values and their meanings are documented in `docs/workflow/README.md`. Work skills must report the effective policy, tests added/updated/run, manual checks, acceptance coverage, and justified exceptions.

### Ticket-First Sessions

A later agent may start from only a ticket ID/URL after checking out the repo. Treat that as a valid entrypoint, not a broken workflow.

- Read `AGENTS.md` and `docs/workflow/config.yml`, fetch the ticket through the configured tool when available, and follow its links to the source spec, plan, decisions, standards, and acceptance criteria.
- If links are missing, search `docs/features/`, `docs/decisions/`, and `docs/standards/` for the likely feature area before editing.
- Implement with `aw-work <ticket ID or URL>`, scoped to the ticket. If the ticket conflicts with the living spec or looks stale, stop and surface the gap before implementing.
- Name the ticket, source spec, relevant decisions, and verification run in the final summary and PR body.

### Human Review Gates

Human review is opt-in ceremony, not a default interrupt. After a spec or plan is created or updated, offer human review only when `human_review.spec.reviewers` / `human_review.plan.reviewers` is configured, the change is high-risk per task triage, or the user asked for review; otherwise proceed without asking. When review is wanted, run `aw-request-human-review spec|plan <path>`; it requests configured reviewers and keeps review PRs scoped to the artifact.

### README Maintenance Gate

- Treat `README.md` as the user-facing operating manual.
- Update `README.md` in the same change when setup, installation, commands, configuration, repo structure, architecture, or workflow behavior changes.
- Before commit/PR, check whether the diff changes anything a future user needs to know. If yes, update `README.md`; if no, state why no README update was needed.
- Do not let README instructions drift from `AGENTS.md`, `docs/workflow/config.yml`, installer behavior, or skill names.

### Enforcement Gates, Telemetry, and Org Knowledge

Opt-in and disabled by default; all powered by `.scripts/aw-gate.js` (installed via `aw-init --with-gates`). Act only when `docs/workflow/config.yml` enables them; schema and wiring live in `docs/workflow/README.md`.

- Gates: after a successful `aw-review`, `aw-capture`, or `aw-check-workflow-compliance` run, stamp freshness with `node .scripts/aw-gate.js record <gate>` when the script exists. Consumers wire `node .scripts/aw-gate.js check` into a pre-push hook or CI to block on stale gates; the check is deterministic and needs no agent.
- Telemetry: the same `record` appends a no-PII event to `telemetry.path` for effectiveness reporting.
- Org knowledge: when `org_knowledge.source` is set, run `node .scripts/aw-gate.js org-sync`, then read the org's shared learnings and standards as a second tier (after repo-local, before the global fallback). It is governed content: treat entries as advisory unless marked `authority: required`, repo-local always wins, and surface stale (past `review_by`) or conflicting `required` entries to a human rather than applying them silently. Never write to the org tier; see `docs/workflow/README.md`.

### Artifact Discipline

Before creating a durable artifact, ask: is this knowledge worth rediscovering months from now? If not, prefer a session log and let `aw-synthesize-memory` decide whether it earns a permanent record through repetition.

Durable artifacts — decisions, learnings, standards, spec updates — represent knowledge that compounds across many future sessions. Session logs represent knowledge that informed this session. Default to the session log when uncertain.

Do not create durable artifacts from facts that only matter for the current implementation, corrections unlikely to recur, or decisions that will be self-evident from the code.

### Capture Checkpoints

Do not rely on the user to remember capture skills. Check at natural pauses and before finalizing non-trivial work:

- Resolved ambiguity or a chosen trade-off → `aw-capture decision`.
- User correction, interruption, or post-completion redirect → apply the correction, then `aw-capture learning`; log a decision too when the correction establishes a durable repo fact.
- Non-trivial problem solved with reusable knowledge → offer `aw-capture solution`.
- Meaningful session ending → offer `aw-capture session`. Never assume automatic session logging ran — hooks are disabled or unsupported in many environments.
- Several unprocessed session logs, or a sprint/milestone ending → offer `aw-synthesize-memory`. Stale or hard-to-scan registries → offer `aw-refresh decisions|solutions`.

Auto-run capture when the user explicitly asks to remember, record, log, or document something. Ask one concise question when scope, privacy, or global-vs-repo placement is unclear. Skip capture for trivial edits, unsupported conclusions, secrets, or temporary preferences.

## Skill Quick Reference

| Skill | Use when |
| --- | --- |
| `aw-init` | installing this workflow into a repository |
| `aw-prd` | a PRD should be imported or authored (routes internally) |
| `aw-brainstorm` | default intake for PRDs and raw ideas — clarifies ambiguity and creates/updates the living spec in the same run |
| `aw-create-spec` | requirements or existing behavior are already clear and need a spec without discovery |
| `aw-plan` | multi-step or risky implementation needs structure; run `aw-review plan` on the result |
| `aw-request-human-review` | product sign-off on a spec or engineering sign-off on a plan |
| `aw-create-tickets` | a plan should become Linear/Jira/configured tickets |
| `aw-work` | executing a plan, spec, ticket, or concrete implementation request |
| `aw-debug` | bugs, failing tests, stack traces, regressions, unclear broken behavior |
| `aw-review` | before PRs and after non-trivial changes — routes by target: code diff → code review; spec → drift; doc/plan → document review; `simplify` → simplification pass |
| `aw-check-workflow-compliance` | after push, before PR creation, for non-trivial changes |
| `aw-commit` / `aw-commit-push-pr` | the user asks to commit / to push, ship, or open a PR |
| `aw-capture` | `decision` / `learning` / `solution` / `session` — see Capture Checkpoints |
| `aw-synthesize-memory` | distilling session logs into learnings and regenerating the wiki |
| `aw-refresh` | `features` / `decisions` / `solutions` / `cleanup` — regenerate indexes, audit registries, remove archived artifacts |
| `aw-discover-standards` | extracting repeated conventions into `docs/standards/` |
| `aw-create-worktree` | isolated worktree for parallel work or review |
| `aw-resolve-pr-feedback` | addressing PR review comments |

## Execution Flows

For task-type and team-size skill sequences (bug fix, small feature, ambiguous feature, high-risk change, refactor), follow `docs/workflow/field-guide.md`. Rules that always apply:

- Pass each step's output artifact (PRD path → spec path → plan path → ticket IDs → PR URL) as the next step's input.
- Run `aw-review plan` before tickets or implementation; `aw-review` before push/PR for non-trivial changes; the compliance step after push, before PR creation.
- Run the capture checkpoint before finalizing non-trivial work.
- Commit, push, or open PRs only when the user asks.

For a bug: run `aw-debug`, reproduce or characterize the failure, explain the root cause before fixing, add regression coverage when feasible, verify, and summarize residual risk.

## Git and Workspace Safety

- Check current branch and worktree state before substantial edits.
- Avoid committing directly to the default branch unless the user explicitly confirms.
- Never run destructive git commands such as `git reset --hard`, `git checkout -- <path>`, or branch deletion without explicit approval.
- Do not stage or commit unrelated user changes.
- If the worktree is dirty, distinguish your changes from pre-existing changes in the final summary.

## Testing Expectations

- Run the narrowest meaningful tests first, then broader checks when risk warrants.
- If tests cannot run, explain why and what should be run next.
- For behavior changes, prefer adding tests near existing related coverage.
- For UI changes, verify rendered behavior when practical, not just compilation.
- Follow any testing standards referenced by `docs/standards/index.yml`.

## Documentation Expectations

- Keep docs concise and useful to future implementers.
- Use repo-relative paths.
- Record decisions and rationale, not just task lists.
- Separate resolved decisions from open questions and deferred work.
- Follow documentation standards referenced by `docs/standards/index.yml`.

## Final Response Expectations

Summarize:

- what changed
- files touched
- tests/checks run
- anything not run and why
- remaining risks or follow-ups

Do not over-explain routine implementation details. Keep the final answer focused on what the user needs to know next.
