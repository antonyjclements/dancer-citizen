# Workflow Config

`docs/workflow/config.yml` customizes how Agentic Workflow runs in this repo. Most repos should leave skill overrides blank; blank values use the bundled defaults.

Task-size routing belongs in `AGENTS.md`. Use `config.yml` for execution details such as replacement skills, implementation test policy, PR templates, commit conventions, CI monitoring, and human reviewers.

For a step-by-step guide on which skills to run and when — by task type and team size — see [field-guide.md](field-guide.md).

## Minimal Example

```yaml
workflow:
  implementation:
    test_policy: acceptance-first
  steps:
    work:
      skill: ""
    check_workflow_compliance:
      skill: ""
  auxiliary:
    research_slack:
      skill: ""
pull_request:
  template:
    title: ""
    body: ""
git:
  commit:
    format: conventional
    scope_required: false
    template: "<type>(<scope>): <description>"
    allowed_types: [feat, fix, docs, chore, refactor, test, ci, build, perf, style]
    examples:
      - "docs(readme): update usage guide"
post_pr:
  ci_monitor:
    provider: manual
human_review:
  spec:
    reviewers: []
  plan:
    reviewers: []
```

## Schema

| Path | Type | Default | Description |
| --- | --- | --- | --- |
| `workflow.implementation.test_policy` | string | `acceptance-first` | How implementation work maps acceptance criteria to tests or checks. |
| `workflow.steps.<step>.skill` | string | `""` | Optional replacement skill for a workflow lifecycle step. Blank uses the bundled default. |
| `workflow.auxiliary.<key>.skill` | string | `""` | Optional replacement skill for a helper capability. Blank uses the bundled default. |
| `pull_request.template.title` | string | `""` | Optional path or URL for a PR title template. |
| `pull_request.template.body` | string | `""` | Optional path or URL for a PR body template. |
| `git.commit.format` | string | `conventional` | Commit message convention used by bundled commit skills. |
| `git.commit.scope_required` | boolean | `false` | Whether commit messages must include a non-empty scope. |
| `git.commit.template` | string | `"<type>(<scope>): <description>"` | Commit subject template. |
| `git.commit.allowed_types` | string list | conventional types | Allowed commit types. |
| `git.commit.examples` | string list | docs example | Example commit messages for style guidance. |
| `post_pr.ci_monitor.provider` | string | `manual` | Post-PR monitor provider. `manual` disables automated monitoring. |
| `human_review.spec.reviewers` | string list | `[]` | GitHub usernames requested on spec review PRs. |
| `human_review.plan.reviewers` | string list | `[]` | GitHub usernames requested on plan review PRs. |
| `gates.enabled` | boolean | `false` | Master switch for freshness enforcement. When false, `aw-gate.js check` is a no-op. |
| `gates.state_file` | string | `.aw-gate-state.json` | Git-ignored per-checkout file holding the last-run timestamp and commit for each gate. |
| `gates.checks.<name>.mode` | string | `age` | `age` (wall-clock window), `commit` (relevant paths changed since the recorded commit), or `commit-and-age` (both must pass). |
| `gates.checks.<name>.max_age_hours` | number | — | Maximum age, in hours, a recorded gate stays fresh. Required for `age` and `commit-and-age` modes. |
| `gates.checks.<name>.paths` | string list | whole tree | Git pathspecs scoping which changes invalidate a `commit`-mode gate, e.g. `["src", ":(exclude)docs"]`. Omitted means any commit invalidates it. |
| `telemetry.enabled` | boolean | `false` | When true, `aw-gate.js record` appends a no-PII event to the telemetry log. |
| `telemetry.path` | string | `docs/metrics/events.jsonl` | Base path of the git-tracked JSONL event log. With monthly rotation the month is inserted (`events-YYYY-MM.jsonl`). |
| `telemetry.rotation` | string | `monthly` | `monthly` shards the log per month (bounds growth and cuts merge contention); `none` writes a single file. |
| `telemetry.retention_months` | number | `12` | `prune-telemetry` deletes month shards older than this many months (git history is the archive). `0` keeps all. |
| `org_knowledge.source` | string | `""` | Git URL of the org-shared learnings/standards repo. Blank disables org sync. |
| `org_knowledge.ref` | string | `main` | Branch or tag of the org knowledge repo to sync. |
| `org_knowledge.cache_dir` | string | `.aw-org-cache` | Git-ignored local cache the org repo is cloned into. |
| `org_knowledge.paths.learnings` | string | `learnings` | Learnings subdirectory within the org knowledge repo. |
| `org_knowledge.paths.standards` | string | `standards` | Standards subdirectory within the org knowledge repo. |

## Enforcement Gates, Telemetry, and Org Knowledge

These three capabilities are opt-in, disabled by default, and all powered by one
dependency-free helper, `.scripts/aw-gate.js`, installed with
`aw-init --with-gates` (or by re-running the installer with that flag). None of
them require an agent to run in CI — the enforcement path is fully deterministic.

### Freshness gates (`gates`)

The LLM-driven review and compliance skills cannot run as a blocking CI check on
their own. Instead, this workflow converts them into a **freshness contract**:

1. After a successful run, the skill stamps a marker:
   `node .scripts/aw-gate.js record <gate> [--detail "..."]`. This writes the
   last-run timestamp **and the current commit** to the git-ignored `gates.state_file`.
2. A deterministic checker enforces the contract:
   `node .scripts/aw-gate.js check` exits non-zero when any gate under
   `gates.checks` fails its mode, and exits 0 when `gates.enabled` is false.

Wire `check` wherever you want it to block: a Git `pre-commit`/`pre-push` hook, or
a required CI job. The workflow ships the script and the contract; the consumer
chooses the enforcement point. The default gates map to `review`, `capture`, and
`check_workflow_compliance`.

Each gate picks a **mode**:

- **`age`** (default): the gate is fresh while it was recorded within its
  `max_age_hours` window. Simple and git-free; a gate recorded within its window
  passes regardless of intervening commits. Best for time-triggered checks that
  should re-run periodically even when nothing changed (e.g. compliance).
- **`commit`**: the gate is fresh while nothing in its `paths` changed since the
  recorded commit (`git diff` between that commit and `HEAD`). Answers "has the
  *current* code been reviewed?" rather than "did review run recently?", and is
  fully deterministic in CI. Best for change-triggered checks (review, spec drift).
- **`commit-and-age`**: both conditions must hold.

`check` compares `commit`-mode gates against `HEAD` by default; pass
`--against worktree` in a `pre-commit` hook so staged/unstaged edits (not yet in
`HEAD`) are considered. Commit mode requires that the recorded commit still be
reachable — a rebase, squash, or shallow clone that drops it fails the gate and
asks you to re-run. In CI, fetch enough history (e.g. `fetch-depth: 0`) so the
recorded commit is present.

### Telemetry (`telemetry`)

When `telemetry.enabled` is true, the same `record` call also appends a no-PII
event (`ts`, `event`, `detail`, `source`) to the git-tracked JSONL log, so an
engineering-effectiveness team can aggregate it directly from version control.

Because the log is append-only and git-tracked, two safeguards keep it from
becoming a growth or merge-conflict problem:

- **Monthly rotation** (`telemetry.rotation: monthly`, the default) writes to
  `events-YYYY-MM.jsonl` instead of one ever-growing file. Each file stays bounded,
  and concurrent branches usually append to different months. Set `rotation: none`
  to keep the legacy single-file behavior.
- **`union` merge** — `aw-init --with-gates` adds `docs/metrics/events*.jsonl merge=union`
  to `.gitattributes`, so when branches do append to the same shard, git keeps both
  sides' lines instead of raising a conflict. Order does not matter; every line
  carries its own `ts`.
- **Retention** — `node .scripts/aw-gate.js prune-telemetry` deletes shards older
  than `telemetry.retention_months` (default 12; git history is the archive).
  `aw-synthesize-memory` runs it as part of its retention pass.

Schema and aggregation notes live in `docs/metrics/README.md`.

### Org-shared knowledge (`org_knowledge`)

Set `org_knowledge.source` to a git URL to add a second, org-wide tier of
learnings and standards alongside the repo-local `docs/learnings/` and
`docs/standards/`, replacing the per-machine `~/.agents/learnings/` fallback.
`node .scripts/aw-gate.js org-sync` shallow-clones (or updates) that repo into the
git-ignored `org_knowledge.cache_dir`. Skills that read learnings or standards
(`aw-capture`, `aw-synthesize-memory`, `aw-discover-standards`) consult the org
tier when it is configured. Precedence: repo-local first, then org-shared.

Because one edit to the org base steers agents across every subscribing repo, it
is **governed content, not just a synced folder**:

- **One accountable owner** (a senior lead or distinguished engineer, named in the
  org repo's `CODEOWNERS`) owns what earns org-wide status, the review cadence, and
  retiring stale entries. Changes to the org base are PR-reviewed, not pushed.
- **Advisory by default, repo-local always wins.** Agents treat an org entry as
  advisory unless it is marked `authority: required`; a `required` entry that
  conflicts with repo-local guidance is surfaced to a human, not auto-resolved.
- **Entries are self-describing.** Each carries `authority`, `applies_to`,
  `owner`, `reviewed`/`review_by`, and a `source` link; entries past `review_by`
  or missing metadata are treated as lower-confidence.
- **Promotion is human-gated.** A repo-local learning earns org-wide status via a
  PR to the org base; skills never write to the org tier.
- **Consumers pin `org_knowledge.ref`** to a reviewed tag for change control.

The full governance model, templates (`CODEOWNERS`, `GOVERNANCE.md`, entry
frontmatter), and promotion path live in the agentic-workflow project at
`docs/workflow/org-knowledge.md`.

## Workflow Step Keys

```text
prd -> aw-prd
brainstorm -> aw-brainstorm
create_spec -> aw-create-spec
request_human_review -> aw-request-human-review
plan -> aw-plan
review -> aw-review
create_tickets -> aw-create-tickets
work -> aw-work
check_workflow_compliance -> aw-check-workflow-compliance
commit -> aw-commit
commit_push_pr -> aw-commit-push-pr
monitor_pipeline -> (no bundled skill; set workflow.steps.monitor_pipeline.skill)
```

## Auxiliary Skill Keys

```text
refresh -> aw-refresh
debug -> aw-debug
create_worktree -> aw-create-worktree
capture -> aw-capture
discover_standards -> aw-discover-standards
research_slack -> (no bundled skill; set workflow.auxiliary.research_slack.skill for enterprise routing)
resolve_pr_feedback -> aw-resolve-pr-feedback
synthesize_memory -> aw-synthesize-memory
```

## Artifact Handoff Contract

Each workflow step returns the artifact path or ID that becomes input to the next step. Custom replacement skills must preserve this contract.

- `aw-prd` outputs `docs/product/prds/<prd>.md` -> pass to `aw-brainstorm` when ambiguity remains, or `aw-create-spec` when ready for a direct spec draft.
- `aw-brainstorm` usually outputs `docs/features/<feature>/spec.md` -> pass to `aw-plan`; when the user asks for PRD output, route to `aw-prd`.
- `aw-create-spec` outputs `docs/features/<feature>/spec.md` -> pass to `aw-plan`.
- When a PRD becomes a spec, mark the PRD `status: promoted`, set `promoted_to` to the spec path, and leave the PRD body unchanged.
- When a source artifact is no longer needed in the working tree, mark it `status: archived`; `aw-refresh cleanup` removes it from the working tree and index while git preserves history.
- `aw-plan` outputs `docs/features/<feature>/plan.md` -> pass to `aw-create-tickets` or `aw-work`.
- `aw-create-tickets` outputs ticket IDs/URLs -> pass one ticket at a time to `aw-work`.
- `aw-commit-push-pr` outputs the PR URL -> invoke `workflow.steps.monitor_pipeline.skill` with it when configured.

## Test Policies

| Value | Meaning |
| --- | --- |
| `acceptance-first` | Start from acceptance criteria, then choose the lightest automated or manual verification that proves them. |
| `tdd` | Write failing tests before implementation, then make them pass. |
| `bdd` | Express expected behavior in scenario-style tests or checks before implementation where practical. |
| `characterization-first` | Capture current behavior with tests before changing legacy or poorly understood code. |
| `test-after` | Implement first, then add targeted tests/checks before shipping. |
| `manual-verification` | Use explicit manual checks when automation is unavailable or disproportionate. |
| `none` | No test policy is enforced by workflow config. Use only for intentionally unverified work. |

## Legacy Fields

Older installs may contain renamed fields or keys. Run `skills/aw-init/scripts/upgrade.sh --repo /path/to/repo --dry-run` to preview the migration, then `--apply` to migrate safely. Do not maintain old and new shapes side by side.

| Legacy shape | Current shape |
| --- | --- |
| `ticket_creation.skill` | `workflow.steps.create_tickets.skill` |
| `git.commit.skill` | `workflow.steps.commit.skill` |
| `post_pr.ci_monitor.skill` | `workflow.steps.monitor_pipeline.skill` |
| `research.slack.skill` | `workflow.auxiliary.research_slack.skill` |
| Step keys `import_prd`, `create_prd` | Step key `prd` |
| Step keys `review_code`, `review_spec`, `review_plan` | Step key `review` |
| Auxiliary key `simplify_code` | Step key `review` (`aw-review simplify`) |
| Auxiliary keys `index_features`, `refresh_decisions`, `refresh_solutions` | Auxiliary key `refresh` |
| Auxiliary keys `log_decision`, `record_retrospective`, `capture_solution`, `log_session` | Auxiliary key `capture` |
| Auxiliary key `clean_artifacts` | Removed — cleanup is the `aw-refresh cleanup` mode, no config key |
| Helper keys misplaced under `workflow.steps` | The matching `workflow.auxiliary.<key>.skill` |

Non-skill configuration fields are unchanged and remain authoritative, including `git.commit.*`, `pull_request.template`, `post_pr.ci_monitor.provider`, and `human_review.*.reviewers`. The migration preserves unknown fields and stops for manual review when old and new routing fields conflict.
