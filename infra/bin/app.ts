import * as cdk from "aws-cdk-lib";
import { DancerCitizenWebStack } from "../lib/dancer-citizen-web-stack";

const app = new cdk.App();

new DancerCitizenWebStack(app, "DancerCitizenWebStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
});
