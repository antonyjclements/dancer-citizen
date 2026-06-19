# AGENTS.md
<!-- AGENTIC_WORKFLOW_VERSION=0.3.0 -->

This file guides coding agents working in this repository. Follow it in addition to system, developer, and user instructions.

## Operating Principles

- Read the codebase before changing it. Prefer existing patterns, helpers, tests, and architecture over new conventions.
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

- Read `docs/standards/index.yml` before planning, implementing, reviewing, or documenting non-trivial work.
- Use the index to find the relevant markdown standards for the files or domain being touched. Read only the applicable standards, not the whole folder by default.
- If the index format is unfamiliar, inspect it and infer the mapping between standards, descriptions, paths, tags, and file globs.
- Apply relevant standards as enforceable project guidance. If a standard conflicts with explicit user instructions or higher-priority system/developer instructions, follow the higher-priority instruction and call out the conflict.
- When planning work, cite applicable standards in the plan or implementation notes.
- When implementing, follow the standards before local preference.
- When reviewing, flag standards violations as findings with file/line references and concrete fixes.
- When standards are missing, stale, or ambiguous, mention the gap rather than inventing a rule.

## Spec-Driven Development

Use the repo as the source of truth for product intent, standards, and decisions.

- `AGENTS.md` is the orientation and routing file for coding agents. If a repo also has `CLAUDE.md`, keep it aligned with this file.
- Living specs live under `docs/features/<feature>/spec.md` and are indexed by `docs/features/index.yml`.
- Imported and authored PRDs live under `docs/product/prds/` and are indexed by `docs/product/prds/index.yml`.
- Authored PRDs should use `docs/product/prds/template.md` when the repo defines one.
- PRD statuses are `imported`, `draft`, `ready-for-spec`, `promoted`, `superseded`, and `archived`. `archived` means the artifact may be removed from the working tree by `aw-clean-artifacts`; git is the historical archive.
- Brainstorm or ideation artifacts live under `docs/brainstorms/` and are indexed by `docs/brainstorms/index.yml`.
- Temporary plans live at `docs/features/<feature>/plan.md` until removed.
- Use one spec per feature or coherent capability. Specs describe current behavior and durable intent, not task progress.
- Standards live under `docs/standards/` and are indexed by `docs/standards/index.yml`.
- Decisions live under `docs/decisions/` and are indexed by `docs/decisions/index.yml`.
- Learnings live under `docs/learnings/` for repo-specific lessons or `~/.agents/learnings/` for global lessons.
- Workflow configuration lives at `docs/workflow/config.yml`.
- If it describes intent, keep it alive. If it describes a plan, let it expire. If it describes a decision, log it immutably. If it is explicitly archived, remove it from the working tree through cleanup.
- If it is an imported PRD, preserve it as historical input; do not treat it as living truth. If it is authored in-repo, treat it as product input for specs.

### Spec and Decision Routing

- Use `aw-import-prd` when the user asks to create/import a PRD from pasted content, a local file, or a document link.
- Use `aw-create-prd` when the user asks to author, draft, create, or update a PRD from an idea, brainstorm, notes, or clarified product direction.
- Use `aw-upgrade` when an existing Agentic Workflow install needs to move to the current version or migrate `docs/workflow/config.yml`.
- Use `aw-clean-artifacts` when the user asks to remove archived workflow artifacts. Only artifacts marked `status: archived` should be deleted.
- Use `aw-brainstorm` as the default PRD or idea intake path because PRDs and raw ideas often contain implicit ambiguity and open questions. It should usually clarify and create/update the living spec in the same run.
- Use `aw-create-spec` when clear requirements, existing behavior, or implementation changes need to become a living feature spec without exploratory discovery.
- Use `aw-index-features` when `docs/features/index.yml` needs to be generated or refreshed from `docs/features/<feature>/spec.md`.
- Use `aw-review-spec` before PRs and after non-trivial implementation changes to catch drift between code and specs.
- Use `aw-log-decision` when ambiguity is resolved, a trade-off is chosen, or product/architecture behavior is decided.
- Use `aw-refresh-decisions` when `docs/decisions/` grows large, the decision index may be stale, or decision discoverability needs summaries/supersession cleanup.
- Use `aw-record-retrospective` when user correction should change future agent behavior; log a decision as well if the correction establishes a durable repo fact.
- Use `aw-create-tickets` after a plan when work should be broken into Linear, Jira, or another configured ticket system for implementation agents.
- Use configured workflow step routing before delegating to another workflow skill.
- Use configured commit-message formatting before committing.
- Use configured PR templates when opening pull requests. If `pull_request.template.title` or `pull_request.template.body` is blank, use the normal generated title/body for that part.
- Use `aw-monitor-pipeline` after PR creation when `docs/workflow/config.yml` configures a post-PR CI monitor/fix skill.
- A normal feature flow is: pasted/file/link PRD -> imported PRD artifact -> brainstorm/discovery creates or updates the living feature spec -> temporary feature plan -> tickets/stories -> implementation agent picks up a ticket -> decisions logged as they happen -> spec review before PR.

### Workflow Step Routing

Read `docs/workflow/config.yml` before invoking a configurable workflow step. Use `workflow.steps.<step>.skill` when it is set; blank or missing values mean use the bundled default skill.

Auxiliary skills are helper capabilities that can be invoked by multiple workflow steps. Use `workflow.auxiliary.<key>.skill` when it is set; blank or missing values mean use the bundled default helper skill.

Supported default step keys:

- `import_prd`: `aw-import-prd`
- `create_prd`: `aw-create-prd`
- `brainstorm`: `aw-brainstorm`
- `create_spec`: `aw-create-spec`
- `review_spec`: `aw-review-spec`
- `request_human_review`: `aw-request-human-review`
- `plan`: `aw-plan`
- `review_plan`: `aw-review-doc`
- `create_tickets`: `aw-create-tickets`
- `work`: `aw-work`
- `review_code`: `aw-review-code`
- `check_workflow_compliance`: `aw-check-workflow-compliance`
- `commit`: `aw-commit`
- `commit_push_pr`: `aw-commit-push-pr`
- `monitor_pipeline`: `aw-monitor-pipeline`

Supported auxiliary skill keys:

- `index_features`: `aw-index-features`
- `debug`: `aw-debug`
- `create_worktree`: `aw-create-worktree`
- `simplify_code`: `aw-simplify-code`
- `log_decision`: `aw-log-decision`
- `record_retrospective`: `aw-record-retrospective`
- `capture_solution`: `aw-capture-solution`
- `refresh_solutions`: `aw-refresh-solutions`
- `refresh_decisions`: `aw-refresh-decisions`
- `discover_standards`: `aw-discover-standards`
- `research_slack`: `aw-research-slack`
- `clean_artifacts`: `aw-clean-artifacts`
- `resolve_pr_feedback`: `aw-resolve-pr-feedback`

Old step-specific skill selector fields such as `ticket_creation.skill`, `git.commit.skill`, and `post_pr.ci_monitor.skill` have been replaced by `workflow.steps`. Old helper selector fields such as `research.slack.skill`, and older helper keys misplaced under `workflow.steps`, have been replaced by `workflow.auxiliary`. If they appear in older repos, migrate them to the matching `workflow.steps.<step>.skill` or `workflow.auxiliary.<key>.skill` entry instead of supporting both shapes. Non-skill configuration fields remain authoritative, including `git.commit.format`, `pull_request.template`, `post_pr.ci_monitor.provider`, and `human_review.*.reviewers`.

Custom replacement skills must preserve the default step contract: accept the same handoff artifact or identifier, read relevant workflow config, return the expected artifact path/ID/result, and report unsupported behavior clearly.

### Upgrade Existing Installs

Use `aw-upgrade` for existing installs before asking users to hand-edit workflow config.

- Dry-run first so the user can inspect migrated `docs/workflow/config.yml`.
- Apply only after the user approves, unless they already explicitly requested applying the upgrade.
- The upgrade backs up the old config, writes the migrated config, and updates `.agentic-workflow-version`.
- Use the installer's `--remote` option when refreshing skills or repo-local agent instructions without a local `agentic-workflow` clone.
- Use `--source-url` to pin an upgrade to a branch, tag, release archive, or internal mirror.
- Preserve unknown fields and non-skill configuration.
- Stop for manual review when old and new routing fields conflict.

### Artifact Handoff Contract

Each workflow step should return the artifact path or ID that becomes input to the next step:

- `aw-import-prd` outputs `docs/product/prds/<prd>.md` -> pass to `aw-brainstorm` when ambiguity remains or `aw-create-spec` when ready for a direct spec draft.
- `aw-create-prd` outputs `docs/product/prds/<prd>.md` -> pass to `aw-brainstorm` when ambiguity remains or `aw-create-spec` when ready for a direct spec draft.
- `aw-brainstorm` usually outputs `docs/features/<feature>/spec.md` -> pass to `aw-plan`; when the user asks for PRD output, route to `aw-create-prd`.
- `aw-create-spec` outputs `docs/features/<feature>/spec.md` -> pass to `aw-plan`.
- When a PRD becomes a spec, mark the PRD `status: promoted`, set `promoted_to` to the spec path, and leave the PRD body unchanged.
- When a source artifact is no longer needed in the working tree, mark it `status: archived`; `aw-clean-artifacts` removes it from the working tree and index while git preserves history.
- `aw-plan` outputs `docs/features/<feature>/plan.md` -> pass to `aw-create-tickets` or `aw-work`.
- `aw-create-tickets` outputs ticket IDs/URLs -> pass one ticket at a time to `aw-work`.
- `aw-commit-push-pr` outputs PR URL -> pass to `aw-monitor-pipeline` when configured.

### Human Review Gates

- After `aw-brainstorm` or `aw-create-spec` creates or updates a spec, ask whether the user wants product/human review. If yes, run `aw-request-human-review spec <spec path>`.
- After `aw-plan`, ask whether the user wants engineering/human review. If yes, run `aw-request-human-review plan <plan path>`.
- Read `docs/workflow/config.yml` for `human_review.spec.reviewers` and `human_review.plan.reviewers`.
- If reviewers are configured, request them on the corresponding GitHub PR.
- Keep review PRs scoped to the spec or plan artifact and required supporting docs.

### Ticket Creation Routing

- Read `docs/workflow/config.yml` before creating tickets.
- Use `workflow.steps.create_tickets.skill` when a repo replaces the bundled ticket creation step with a Linear, Jira, or custom ticketing skill.
- If `workflow.steps.create_tickets.skill` is blank or missing, use `aw-create-tickets` as the default step. The default step drafts the ticket split and reports that no external ticketing system is configured.
- If the configured custom ticket creation skill is unavailable, report the missing skill and ask whether to draft tickets in markdown or update the config.
- Tickets should trace back to the source spec, plan, relevant decisions, applicable standards, acceptance criteria, dependencies, and test expectations.

### Ticket Implementation Handoff

- A later agent may start from only a ticket ID/URL after checking out the repo. Treat that as a valid entrypoint, not a broken workflow.
- When starting from a ticket, read `AGENTS.md`, `docs/workflow/config.yml`, and the ticket through the configured ticket tool when available.
- Extract and follow links from the ticket to the source spec, plan, decisions, standards, and acceptance criteria.
- If the ticket lacks links back to the source artifacts, search `docs/features/`, `docs/decisions/`, and `docs/standards/` for the likely feature area before editing.
- Use `aw-work <ticket ID or URL>` as the implementation path for ticket-first sessions.
- If the ticket is ambiguous or appears stale against the living spec, stop and surface the gap before implementing.
- Preserve traceability in the final summary and PR body by naming the ticket, source spec, relevant decisions, and verification run.

### Commit Message Routing

- Read `docs/workflow/config.yml` before committing.
- Use `workflow.steps.commit.skill` or `workflow.steps.commit_push_pr.skill` when a repo replaces the bundled commit or commit/push/PR step.
- Follow `git.commit.template`, `scope_required`, `allowed_types`, and `examples` when present.
- If the `git.commit` block is absent, fall back to repo instructions, recent commit history, then conventional commits.
- A custom commit step must return either the commit hash or the exact commit message to use.

### PR Template Routing

- Read `docs/workflow/config.yml` before creating PRs.
- Use `pull_request.template.title` and `pull_request.template.body` when a repo configures enterprise PR title/body templates.
- Template values may be `https://github.com/...` URLs, raw GitHub URLs, `file://...` URLs, absolute paths, or repo-relative paths to markdown files.
- If a template value is blank, use the default generated title or body for that part.
- A template customizes PR text only. PR creation still uses the normal `aw-commit-push-pr` flow and must return the PR URL so `aw-monitor-pipeline` can run afterward when configured.

### CI/CD Routing

- Read `docs/workflow/config.yml` before post-PR pipeline monitoring.
- Use `workflow.steps.monitor_pipeline.skill` when a repo replaces the bundled provider-neutral pipeline monitor step.
- For CircleCI repos, set `post_pr.ci_monitor.provider: circleci`; `aw-monitor-pipeline` routes to `aw-monitor-circleci`.
- Do not put CircleCI-specific settings in `docs/workflow/config.yml` by default. `aw-monitor-circleci` should infer settings or set up optional `docs/workflow/circleci.yml` when needed.
- Do not put retry limits, polling cadence, or timeouts in `docs/workflow/config.yml`; the linked monitor skill owns those details.
- If `post_pr.ci_monitor.provider` is `manual` or absent, skip post-PR monitoring; `manual` means CI monitoring is disabled for the repo.
- If configured, invoke `aw-monitor-pipeline` after PR creation and let the linked monitor skill loop until success, its own retry limit, or a genuine blocker.
- Fix only failures caused by the current branch. Do not hide external, flaky, credential, quota, or default-branch failures.

### Slack Research Routing

- Read `docs/workflow/config.yml` before Slack research.
- Use `workflow.auxiliary.research_slack.skill` when an enterprise environment configures a custom Slack research helper.
- If `workflow.auxiliary.research_slack.skill` is blank or missing, use `aw-research-slack` with the default Slack discovery path.
- Preserve source channels, dates, and any available workspace identifiers in Slack research summaries.

### Implementation Test Policy

Read `workflow.implementation.test_policy` before implementation. Blank or missing values default to `acceptance-first`.

Supported values:

- `acceptance-first`: map spec or ticket acceptance criteria to automated tests or explicit manual checks before implementation where feasible.
- `tdd`: write the narrowest failing automated test before feature code where feasible, then implement and refactor.
- `bdd`: express behavior scenarios before implementation, using Given/When/Then form when helpful, then map them to tests or manual checks.
- `characterization-first`: capture current behavior with tests before changing legacy or unclear behavior.
- `test-after`: implementation may come first, but tests or a clear no-test rationale are still required.
- `manual-verification`: document manual checks instead of requiring automated tests.
- `none`: no tests are required by repo policy, but final summaries must state that explicit policy.

`aw-work` and replacement work skills must report the effective test policy, tests added/updated/run, manual checks, acceptance coverage, and justified exceptions.

### README Maintenance Gate

- Treat `README.md` as the user-facing operating manual.
- Update `README.md` in the same change when setup, installation, commands, configuration, repo structure, architecture, or workflow behavior changes.
- Before commit/PR, check whether the diff changes anything a future user needs to know. If yes, update `README.md`; if no, state why no README update was needed.
- Do not let README instructions drift from `AGENTS.md`, `docs/workflow/config.yml`, installer behavior, or skill names.

### Capture Checkpoints

Do not rely on the user to remember capture skills. At natural pauses, proactively check whether knowledge should be written back.

- After resolving ambiguity or choosing between viable approaches, ask or run `aw-log-decision`.
- After a user correction, interruption, or post-completion redirect, apply the correction and then ask or run `aw-record-retrospective`.
- After solving a non-trivial bug, integration issue, architecture problem, or repeatable workflow problem, ask whether to run `aw-capture-solution`.
- After solving a problem that creates reusable team knowledge, run or offer `aw-capture-solution`; this is part of the feedback loop, not an optional flourish.
- When the decision log becomes hard to scan or the index may be stale, run or offer `aw-refresh-decisions`.
- Periodically run `aw-refresh-solutions` to keep accumulated solution docs current and remove stale guidance.
- Before finalizing non-trivial work, run a quick capture check: decisions made, corrections learned, reusable solution found, spec drift reviewed.
- Auto-run capture when the user explicitly asks to remember, record, log, document, or make it durable. Ask one concise question when scope, privacy, or global-vs-repo placement is unclear.
- Skip capture for trivial edits, unsupported conclusions, secrets, sensitive incident details, or one-off preferences the user says are temporary.

## Compound Engineering Workflow

Use the Compound Engineering skills as the default workflow router when available.

### Retrospective Learning

- Use `aw-record-retrospective` when the user corrects, interrupts, redirects, or later says completed work should have behaved differently.
- Capture durable lessons as discrete markdown files indexed by `index.yml`.
- Store repo-specific lessons under `docs/learnings/`.
- Store global lessons under `~/.agents/learnings/`.
- Ask before promoting an ambiguous lesson to global scope.
- Apply the correction first when the current task is blocked; capture the retrospective at the next natural pause.

### Idea and Requirements

- Use `aw-init` when installing this workflow into a repository.
- Use `aw-import-prd` when a PRD arrives as pasted content, a local file, markdown, or a document link.
- Use `aw-create-prd` when the user wants to author a PRD from product ideas, brainstorm artifacts, or notes.
- Use `aw-brainstorm` when scope, product behavior, requirements, success criteria, trade-offs, or PRD ambiguity are unclear; for product work, it should normally produce/update the living spec before finishing.
- Use `aw-create-spec` when product intent needs a durable home in `docs/features/<feature>/spec.md` and exploratory discovery is unnecessary.
- Use `aw-index-features` when discovering or refreshing feature specs under `docs/features/`.
- Use `aw-plan` when the user asks for a plan, when a spec is ready, or when a multi-step implementation needs structure.
- After `aw-plan` creates a plan, run `aw-review-doc` before human review, ticket creation, or implementation.
- Use `aw-request-human-review` when the user wants product sign-off on a spec or engineering sign-off on a plan.
- Use `aw-create-tickets` when a plan should become Linear/Jira stories or implementation tickets.
- Use `aw-review-doc` to improve requirements or plan documents before implementation.

### Implementation

- Use `aw-work` for executing a plan, specification, or concrete implementation request.
- Use `aw-debug` for bugs, failing tests, stack traces, issue reports, regressions, or unclear broken behavior.
- Use `aw-simplify-code` after meaningful changes when the code would benefit from clarity, deduplication, or reduced complexity.

### Review, Test, and Ship

- Use `aw-review-code` before creating a PR or after non-trivial changes.
- Use `aw-review-spec` before creating a PR when behavior, workflow, API contracts, UX, or product intent changed.
- Use `aw-check-workflow-compliance` after pushing and before PR creation for non-trivial changes when workflow routing, implementation test policy, acceptance coverage, README updates, or review gates need verification.
- Use `aw-commit` when the user asks to commit.
- Use `aw-commit-push-pr` when the user asks to push, ship, or open a PR. Apply configured `pull_request.template` title/body templates when present.
- Use `aw-monitor-pipeline` after PR creation when post-PR CI monitoring is configured.
- Use `aw-monitor-circleci` through `aw-monitor-pipeline` for CircleCI PR pipeline monitoring and branch-caused CI fixes.

### Knowledge Capture

- Use `aw-record-retrospective` for correction-driven learnings that should prevent repeated agent mistakes.
- Use `aw-log-decision` for resolved ambiguity, product behavior choices, architecture trade-offs, and workflow policy decisions.
- Use `aw-refresh-decisions` to rebuild `docs/decisions/index.yml`, surface stale metadata, and generate derived decision summaries without rewriting immutable decision records.
- Use `aw-discover-standards` when the user wants to extract repeated project conventions into `docs/standards/` and update `docs/standards/index.yml`.
- Use `aw-capture-solution` after solving a non-trivial problem that should become reusable team knowledge.
- Use `aw-refresh-solutions` when auditing or refreshing `docs/solutions/`.
- Use `aw-research-slack` when organizational context from Slack could clarify decisions, constraints, or prior discussion.
- Use `aw-clean-artifacts` when artifacts marked `status: archived` should be removed from the working tree.
- Do not create learning docs for trivial fixes or unsupported conclusions.

## Default Execution Flow

For a normal feature request:

1. If the PRD came from pasted content, a local file, or a link, first persist it with `aw-import-prd`.
2. If the user wants to author a PRD from an idea or notes, use `aw-create-prd`.
3. If the request is a PRD, vague, or product-shaped, pass the PRD path or user request to `aw-brainstorm` unless the user explicitly asks to skip ambiguity resolution. `aw-brainstorm` should create or update the living spec in the same run when durable product intent is affected.
4. Use `aw-create-spec` directly only when the requirements are already clear, existing behavior needs documentation, or the user explicitly wants a spec draft.
5. If the work is multi-step or risky, run `aw-plan`.
6. Run `aw-review-doc` on the plan before human review, ticket creation, or implementation.
7. If work should be queued, create tickets with the configured `create_tickets` step.
8. Execute with `aw-work`, normally by picking up one ticket at a time.
9. Log decisions with `aw-log-decision` as ambiguity is resolved.
10. Verify with relevant tests, browser checks, simulator checks, or builds.
11. Update `README.md` when user-facing setup, commands, configuration, architecture, or workflow behavior changes.
12. Review with `aw-review-spec` and `aw-review-code` before push/PR for non-trivial changes.
13. Run the capture checkpoint: `aw-log-decision`, `aw-record-retrospective`, or `aw-capture-solution` when appropriate.
14. Commit/push/PR only when the user asks.
15. After push and before PR creation, run the configured `check_workflow_compliance` step for non-trivial changes.
16. After PR creation, run `aw-monitor-pipeline` if configured.

For a bug:

1. Run `aw-debug`.
2. Reproduce or characterize the failure.
3. Explain the root cause before fixing.
4. Add or update regression coverage when feasible.
5. Verify the fix and summarize residual risk.

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
- For implementation work, follow `workflow.implementation.test_policy` and report tests, manual checks, coverage, and exceptions.
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
