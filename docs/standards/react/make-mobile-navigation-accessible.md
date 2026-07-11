# Make Mobile Navigation Explicitly Accessible

Mobile navigation must use explicit open/closed state, a real button, and assistive-technology state attributes in the React shell.

## Use This When

- Adding or changing mobile navigation in `apps/react-site/src/App.tsx`.
- Adjusting shell navigation styles or breakpoint behavior.

## Do

- Use a `<button type="button">` for the menu toggle.
- Set `aria-expanded` from the actual menu state.
- Set `aria-controls` to the mobile navigation container id.
- Close the menu after selecting a navigation link.
- Close the menu on Escape when the shell owns keyboard handling.
- Keep desktop and mobile navigation behavior explicit in the shell instead of relying on wrapping links.

## Avoid

- Rendering all top-level links as a wrapping row on mobile.
- Using a non-button element as the menu toggle.
- Updating visual open/closed state without matching accessibility state.
- Letting visual menu state drift from assistive-technology state.

## Evidence

- `apps/react-site/src/App.tsx`
- `apps/react-site/src/styles.css`
- `docs/features/site-shell-and-navigation/spec.md`
