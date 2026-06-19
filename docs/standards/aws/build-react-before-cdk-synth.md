# Build React Before CDK Synth or Deploy

Run `npm run build:react` before every `npm run cdk:synth` or `npm run deploy -w @dancer-citizen/infra`. CDK reads `apps/react-site/dist/index.html` during synth and embeds that exact HTML, including current Vite asset paths, into the HTML-shell Lambda.

## Use This When

- Synthesizing or deploying the AWS stack.
- Changing React app code, CSS, or Vite output.
- Changing the HTML-shell Lambda or CloudFront document-route behavior.
- Debugging stale assets or missing scripts on the CloudFront site.

## Do

- Run `npm run build:react` before `npm run cdk:synth`.
- Run `npm run build:react` before `npm run deploy -w @dancer-citizen/infra`.
- Treat `apps/react-site/dist/index.html` as an input to CDK, not an optional artifact.
- Re-synth after React rebuilds so `INDEX_HTML` contains the current hashed asset references.
- Keep generated `apps/*/dist` output ignored by source control.

## Avoid

- Deploying after React changes without rebuilding the React app.
- Assuming CDK will build Vite output automatically.
- Trusting the fallback HTML shell for real deployments; it omits built asset references.
- Debugging CloudFront stale JavaScript/CSS before checking whether synth used an old `dist`.

## Evidence

- `infra/lib/dancer-citizen-web-stack.ts`
- `README.md`
- `package.json`
- `.gitignore`
- `docs/features/aws-react-lambda-delivery/spec.md`
