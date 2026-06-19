# Use Fast Reliable Verification

Frontend verification should be meaningful, but agents must not keep retrying the same failing localhost, browser, viewport, or package-resolution path. After one repeated tooling failure, switch to the fastest reliable evidence for the change and report what was not visually verified.

## Use This When

- Verifying frontend, mobile, layout, or rendered React changes.
- Localhost, in-app browser, viewport control, or Playwright package resolution fails.
- The change can be checked with build/lint, targeted tests, code assertions, or a deployed smoke check.

## Do

- Run the narrowest meaningful build, lint, unit test, or typecheck first.
- Use browser/mobile verification when it is available and adds clear value.
- Stop retrying a local browser path after the same failure repeats.
- Switch to code-level assertions or targeted checks when the bug is a small CSS/layout/routing change.
- State clearly when visual/browser verification was skipped or blocked and why.

## Avoid

- Spending more time on broken tooling than on the actual fix.
- Repeating the same localhost command or browser setup after it has already failed for the same reason.
- Installing or resolving network packages just for verification unless the user agrees it is worth the time.
- Claiming visual QA passed when only build/lint/code inspection ran.

## Evidence

- `docs/learnings/2026-06-19-avoid-repeating-localhost-verification-failures.md`
- `AGENTS.md`
- `README.md`
