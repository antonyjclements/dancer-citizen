import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { getDeploymentConfig } from "../lib/deployment-config";
import { DancerCitizenWebStack } from "../lib/dancer-citizen-web-stack";

const domainEnv = {
  STAGING_DOMAIN_NAME: "staging.dancercitizen.org",
  STAGING_CERTIFICATE_ARN: "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000",
  STAGING_HOSTED_ZONE_ID: "ZEXAMPLE",
  STAGING_HOSTED_ZONE_NAME: "dancercitizen.org",
};

describe("deployment configuration", () => {
// @spec:STAGE-001
  it("defaults to the existing production identity", () => {
    assert.deepEqual(getDeploymentConfig(undefined, {}), {
      environment: "production", stackId: "DancerCitizenWebStack", siteUrl: "https://dancercitizen.org",
    });
    assert.equal(getDeploymentConfig("production", { SITE_URL: "https://production.example" }).siteUrl, "https://production.example");
  });

// @spec:STAGE-001
  it("ignores production URL and secrets when selecting staging", () => {
    const config = getDeploymentConfig("staging", { SITE_URL: "https://production.example", SUBMISSIONS_ADMIN_SESSION_SECRET: "production-secret" });
    assert.equal(config.stackId, "DancerCitizenStagingStack");
    assert.equal(config.siteUrl, "https://staging.dancercitizen.org");
    assert.equal(config.domain, undefined);
  });

// @spec:STAGE-001
  it("rejects unknown environments rather than defaulting to production", () => {
    for (const environment of ["stage", "", true, 1]) {
      assert.throws(() => getDeploymentConfig(environment, {}), /environment must be/);
    }
  });

// @spec:STAGE-001, STAGE-004
  it("validates complete domain, certificate region, origin, and DNS pairs", () => {
    for (const env of [
      { STAGING_DOMAIN_NAME: "staging.dancercitizen.org" },
      { STAGING_CERTIFICATE_ARN: domainEnv.STAGING_CERTIFICATE_ARN },
      { ...domainEnv, STAGING_CERTIFICATE_ARN: domainEnv.STAGING_CERTIFICATE_ARN.replace("us-east-1", "us-west-2") },
      { ...domainEnv, STAGING_DOMAIN_NAME: "www.dancercitizen.org" },
      { ...domainEnv, STAGING_DOMAIN_NAME: "dancercitizen.org" },
      { ...domainEnv, STAGING_HOSTED_ZONE_NAME: "other.example" },
      { ...domainEnv, STAGING_HOSTED_ZONE_ID: "" },
      { ...domainEnv, STAGING_SITE_URL: "https://other.example" },
      { STAGING_SITE_URL: "https://dancercitizen.org" },
      { STAGING_SITE_URL: "http://staging.dancercitizen.org" },
      { STAGING_SITE_URL: "https://staging.dancercitizen.org/path" },
    ]) {
      assert.throws(() => getDeploymentConfig("staging", env));
    }
    assert.equal(getDeploymentConfig("staging", domainEnv).domain?.hostedZoneId, "ZEXAMPLE");
  });
});

describe("staging infrastructure and builds", () => {
  const app = new cdk.App({ outdir: mkdtempSync(path.join(tmpdir(), "dc-staging-test-")) });
  const staging = getDeploymentConfig("staging", domainEnv);
  const productionSecrets = {
    SUBMISSIONS_ADMIN_PASSWORD_HASH: "production-secret-sentinel",
    SUBMISSIONS_ADMIN_SESSION_SECRET: "production-secret-sentinel",
    SUBMISSIONS_ADMIN_USERNAME: "production-secret-sentinel",
    SUBMISSION_RECAPTCHA_SECRET: "production-secret-sentinel",
    SUBMISSION_EMAIL_TO: "production-secret-sentinel@example.org",
  };
  const previousEnv = { ...process.env };
  let stack: DancerCitizenWebStack;
  try {
    Object.assign(process.env, productionSecrets);
    stack = new DancerCitizenWebStack(app, staging.stackId, { deployment: staging, env: { account: "123456789012", region: "us-east-1" } });
  } finally {
    for (const key of Object.keys(productionSecrets)) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  }
  const template = Template.fromStack(stack);

// @spec:STAGE-001, STAGE-003
  it("isolates submission resources and never subscribes editorial inboxes", () => {
    template.resourceCountIs("AWS::DynamoDB::Table", 1);
    template.resourceCountIs("AWS::SNS::Topic", 1);
    template.resourceCountIs("AWS::SNS::Subscription", 0);
    template.resourceCountIs("AWS::S3::Bucket", 2);
    template.resourceCountIs("AWS::Cognito::UserPool", 0);
    template.resourceCountIs("AWS::Cognito::UserPoolClient", 0);
    template.resourceCountIs("AWS::Cognito::UserPoolUser", 0);
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: { Variables: Match.objectLike({
        SITE_ENVIRONMENT: "staging",
        PRISMIC_REPOSITORY_NAME: "dancercitizen",
        SUBMISSIONS_ADMIN_PASSWORD_HASH: Match.absent(),
        SUBMISSIONS_ADMIN_SESSION_SECRET: Match.absent(),
        SUBMISSIONS_ADMIN_USERNAME: Match.absent(),
        SUBMISSIONS_ADMIN_USER_POOL_ID: Match.absent(),
        SUBMISSIONS_ADMIN_CLIENT_ID: Match.absent(),
        SUBMISSION_RECAPTCHA_SECRET: "",
      }) },
    });
    assert.equal(JSON.stringify(template.toJSON()).includes("info@dancercitizen.org"), false);
    assert.equal(JSON.stringify(template.toJSON()).includes("production-secret-sentinel"), false);
  });

// @spec:STAGE-004
  it("adds robots headers to every behavior while preserving preview cookie forwarding", () => {
    const robots = template.findResources("AWS::CloudFront::ResponseHeadersPolicy");
    const robotsId = Object.keys(robots)[0];
    assert.equal(Object.keys(robots).length, 1);
    template.hasResourceProperties("AWS::CloudFront::ResponseHeadersPolicy", {
      ResponseHeadersPolicyConfig: Match.objectLike({ CustomHeadersConfig: { Items: [{ Header: "X-Robots-Tag", Value: "noindex, nofollow", Override: true }] } }),
    });
    const distribution = Object.values(template.findResources("AWS::CloudFront::Distribution"))[0].Properties.DistributionConfig;
    assert.equal(distribution.CustomErrorResponses.some((error: { ErrorCode: number }) => error.ErrorCode === 405), false);
    for (const behavior of [distribution.DefaultCacheBehavior, ...distribution.CacheBehaviors]) {
      assert.deepEqual(behavior.ResponseHeadersPolicyId, { Ref: robotsId });
    }
    template.hasResourceProperties("AWS::CloudFront::CachePolicy", {
      CachePolicyConfig: Match.objectLike({ MinTTL: 0, ParametersInCacheKeyAndForwardedToOrigin: Match.objectLike({ CookiesConfig: { CookieBehavior: "whitelist", Cookies: ["dc_prismic_ref"] } }) }),
    });
    const cms = distribution.CacheBehaviors.find((behavior: { PathPattern: string }) => behavior.PathPattern === "cms/*");
    assert.equal(cms.CachePolicyId, "4135ea2d-6df8-44a3-9df3-4b5a84be39ad");
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", { RouteKey: "GET /cms/{proxy+}" });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", { RouteKey: "$default" });
  });

// @spec:STAGE-004
  it("wires only the staging hostname to its certificate and DNS aliases", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({ Aliases: ["staging.dancercitizen.org"], ViewerCertificate: Match.objectLike({ AcmCertificateArn: domainEnv.STAGING_CERTIFICATE_ARN }) }),
    });
    for (const type of ["A", "AAAA"]) {
      template.hasResourceProperties("AWS::Route53::RecordSet", { Name: "staging.dancercitizen.org.", Type: type, HostedZoneId: "ZEXAMPLE" });
    }
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", { CorsConfiguration: Match.objectLike({ AllowOrigins: ["https://staging.dancercitizen.org"] }) });
  });

// @spec:STAGE-002
  it("uses the staging HTML shell, with distinct assets and robots meta", () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const stagedHtml = readFileSync(path.join(root, "apps/react-site/dist-staging/index.html"), "utf8");
    const productionHtml = readFileSync(path.join(root, "apps/react-site/dist/index.html"), "utf8");
    assert.match(stagedHtml, /name="robots" content="noindex, nofollow"/);
    assert.doesNotMatch(productionHtml, /name="robots"/);
    template.hasResourceProperties("AWS::Lambda::Function", { Environment: { Variables: Match.objectLike({ INDEX_HTML: stagedHtml, SITE_URL: "https://staging.dancercitizen.org" }) } });
    assert.notEqual(stagedHtml.match(/src="([^"]+\.js)"/)?.[1], productionHtml.match(/src="([^"]+\.js)"/)?.[1]);
    const scriptPath = (html: string) => html.match(/src="\/([^"]+\.js)"/)![1];
    const stagingScript = readFileSync(path.join(root, "apps/react-site/dist-staging", scriptPath(stagedHtml)), "utf8");
    const productionScript = readFileSync(path.join(root, "apps/react-site/dist", scriptPath(productionHtml)), "utf8");
    assert.match(stagingScript, /Staging site/);
    assert.match(stagingScript, /Exit preview/);
    assert.match(stagingScript, /Submissions are disabled/);
    assert.doesNotMatch(productionScript, /Staging site/);
    assert.doesNotMatch(productionScript, /Exit preview/);
  });

// @spec:STAGE-005
  it("creates a staging-only cloud assembly for deployment", () => {
    assert.deepEqual(app.synth().stacks.map((artifact) => artifact.stackName), ["DancerCitizenStagingStack"]);
  });
});

describe("production compatibility", () => {
// @spec:STAGE-001, STAGE-004
  it("keeps production identity, email subscriptions, and indexing behavior", () => {
    const app = new cdk.App({ outdir: mkdtempSync(path.join(tmpdir(), "dc-production-test-")) });
    const production = getDeploymentConfig("production", {});
    const stack = new DancerCitizenWebStack(app, production.stackId, { deployment: production });
    const template = Template.fromStack(stack);
    assert.equal(stack.stackName, "DancerCitizenWebStack");
    template.resourceCountIs("AWS::CloudFront::ResponseHeadersPolicy", 0);
    template.resourceCountIs("AWS::Route53::RecordSet", 0);
    template.resourceCountIs("AWS::SNS::Subscription", 2);
    template.resourceCountIs("AWS::Cognito::UserPool", 1);
    template.resourceCountIs("AWS::Cognito::UserPoolClient", 1);
    template.resourceCountIs("AWS::Cognito::UserPoolUser", 1);
    template.hasResourceProperties("AWS::SNS::Subscription", { Protocol: "email", Endpoint: "info@dancercitizen.org" });
    const distribution = Object.values(template.findResources("AWS::CloudFront::Distribution"))[0].Properties.DistributionConfig;
    assert.equal(distribution.Aliases, undefined);
    for (const behavior of [distribution.DefaultCacheBehavior, ...distribution.CacheBehaviors]) {
      assert.equal(behavior.ResponseHeadersPolicyId, undefined);
    }
    const apiFunctions = Object.values(template.findResources("AWS::Lambda::Function"));
    assert.equal(apiFunctions.some((fn) => fn.Properties.Environment?.Variables?.SITE_ENVIRONMENT === "staging"), false);
  });
});
