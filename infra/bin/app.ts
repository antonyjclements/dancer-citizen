import * as cdk from "aws-cdk-lib";
import { DancerCitizenWebStack } from "../lib/dancer-citizen-web-stack";
import { getDeploymentConfig } from "../lib/deployment-config";

const app = new cdk.App();

const environment = app.node.tryGetContext("environment") ?? "production";
const settings = environment === "staging"
  ? { ...app.node.tryGetContext("staging"), ...process.env }
  : process.env;
const deployment = getDeploymentConfig(environment, settings);

new DancerCitizenWebStack(app, deployment.stackId, {
  deployment,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
});
