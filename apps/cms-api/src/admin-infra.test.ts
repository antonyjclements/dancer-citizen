import { beforeAll, describe, it } from "vitest";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { DancerCitizenWebStack } from "../../../infra/lib/dancer-citizen-web-stack";

let template: Template;
beforeAll(() => {
  const app = new App();
  template = Template.fromStack(new DancerCitizenWebStack(app, "AdminTest", { env: { account: "123456789012", region: "us-east-1" } }));
}, 30000);

describe("submissions Cognito infrastructure", () => {
  it("disables public registration and retains the user pool", () => {
    template.hasResource("AWS::Cognito::UserPool", {
      DeletionPolicy: "Retain",
      Properties: Match.objectLike({
        AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
        Policies: { PasswordPolicy: Match.objectLike({ MinimumLength: 12, RequireLowercase: true, RequireUppercase: true, RequireNumbers: true, RequireSymbols: true }) },
      }),
    });
  });
  it("uses one-hour access tokens and password authentication without a client secret", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      GenerateSecret: false,
      EnableTokenRevocation: true,
      PreventUserExistenceErrors: "ENABLED",
      AccessTokenValidity: 60,
      TokenValidityUnits: Match.objectLike({ AccessToken: "minutes" }),
      ExplicitAuthFlows: Match.arrayWith(["ALLOW_USER_PASSWORD_AUTH"]),
    });
  });
  it("provisions one shared editor without emailing credentials", () => {
    template.resourceCountIs("AWS::Cognito::UserPoolUser", 1);
    template.hasResourceProperties("AWS::Cognito::UserPoolUser", { Username: "editor", MessageAction: "SUPPRESS" });
  });
  it("configures the API with Cognito identifiers rather than passwords", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: { Variables: Match.objectLike({
        SUBMISSIONS_ADMIN_USER_POOL_ID: Match.anyValue(),
        SUBMISSIONS_ADMIN_CLIENT_ID: Match.anyValue(),
        SUBMISSIONS_ADMIN_PASSWORD_HASH: Match.absent(),
        SUBMISSIONS_ADMIN_SESSION_SECRET: Match.absent(),
      }) },
    });
  });
  it("keeps S3 storage private", () => {
    template.allResourcesProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true },
    });
  });
});
