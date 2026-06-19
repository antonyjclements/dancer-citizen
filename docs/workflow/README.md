# Workflow Config

`docs/workflow/config.yml` customizes how Agentic Workflow runs in this repo. Most repos should leave skill overrides blank; blank values use the bundled defaults.

Task-size routing belongs in `AGENTS.md`. Use `config.yml` for execution details such as replacement skills, implementation test policy, PR templates, commit conventions, CI monitoring, and human reviewers.

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

## Workflow Step Keys

```text
import_prd -> aw-import-prd
create_prd -> aw-create-prd
brainstorm -> aw-brainstorm
create_spec -> aw-create-spec
review_spec -> aw-review-spec
request_human_review -> aw-request-human-review
plan -> aw-plan
review_plan -> aw-review-doc
create_tickets -> aw-create-tickets
work -> aw-work
review_code -> aw-review-code
check_workflow_compliance -> aw-check-workflow-compliance
commit -> aw-commit
commit_push_pr -> aw-commit-push-pr
monitor_pipeline -> aw-monitor-pipeline
```

## Auxiliary Skill Keys

```text
index_features -> aw-index-features
debug -> aw-debug
create_worktree -> aw-create-worktree
simplify_code -> aw-simplify-code
log_decision -> aw-log-decision
record_retrospective -> aw-record-retrospective
capture_solution -> aw-capture-solution
refresh_solutions -> aw-refresh-solutions
refresh_decisions -> aw-refresh-decisions
discover_standards -> aw-discover-standards
research_slack -> aw-research-slack
clean_artifacts -> aw-clean-artifacts
resolve_pr_feedback -> aw-resolve-pr-feedback
```

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

Older skill selector fields such as `ticket_creation.skill`, `git.commit.skill`, `post_pr.ci_monitor.skill`, and `research.slack.skill` are replaced by `workflow.steps` or `workflow.auxiliary`. Run `aw-upgrade` to migrate older configs safely.
