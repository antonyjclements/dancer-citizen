import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export class DancerCitizenWebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const root = path.resolve(dirname, "../..");
    const reactDist = path.join(root, "apps/react-site/dist");
    const indexHtmlPath = path.join(reactDist, "index.html");
    const indexHtml = fs.existsSync(indexHtmlPath)
      ? fs.readFileSync(indexHtmlPath, "utf8")
      : "<!doctype html><html lang=\"en\"><head><title>The Dancer-Citizen</title></head><body><div id=\"root\"></div></body></html>";

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const submissionFilesBucket = new s3.Bucket(this, "SubmissionFilesBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const submissionsTable = new dynamodb.Table(this, "SubmissionsTable", {
      partitionKey: { name: "submissionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const apiFunction = new nodejs.NodejsFunction(this, "CmsApiFunction", {
      entry: path.join(root, "apps/cms-api/src/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: Duration.seconds(15),
      memorySize: 512,
      bundling: {
        format: nodejs.OutputFormat.ESM,
        target: "node22",
        mainFields: ["module", "main"],
        banner: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
      },
      environment: {
        PRISMIC_REPOSITORY_NAME: "dancercitizen",
        SUBMISSION_EMAIL_FROM: process.env.SUBMISSION_EMAIL_FROM || "info@dancercitizen.org",
        SUBMISSION_EMAIL_TO: process.env.SUBMISSION_EMAIL_TO || "info@dancercitizen.org,editors@dancercitizen.org",
        SUBMISSION_FILES_BUCKET: submissionFilesBucket.bucketName,
        SUBMISSION_RECAPTCHA_ACTION: process.env.SUBMISSION_RECAPTCHA_ACTION || "submission",
        SUBMISSION_RECAPTCHA_MIN_SCORE: process.env.SUBMISSION_RECAPTCHA_MIN_SCORE || "0.5",
        SUBMISSION_RECAPTCHA_SECRET: process.env.SUBMISSION_RECAPTCHA_SECRET || "",
        SUBMISSIONS_TABLE_NAME: submissionsTable.tableName,
        SUBMISSIONS_ADMIN_COOKIE_SECURE: process.env.SUBMISSIONS_ADMIN_COOKIE_SECURE || "true",
        SUBMISSIONS_ADMIN_PASSWORD_HASH: process.env.SUBMISSIONS_ADMIN_PASSWORD_HASH || "",
        SUBMISSIONS_ADMIN_SESSION_SECRET: process.env.SUBMISSIONS_ADMIN_SESSION_SECRET || "",
        SUBMISSIONS_ADMIN_USERNAME: process.env.SUBMISSIONS_ADMIN_USERNAME || "",
      },
    });
    submissionFilesBucket.grantPut(apiFunction);
    submissionFilesBucket.grantDelete(apiFunction);
    submissionFilesBucket.grantRead(apiFunction);
    submissionsTable.grantReadWriteData(apiFunction);
    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: ["*"],
    }));

    const htmlFunction = new nodejs.NodejsFunction(this, "HtmlShellFunction", {
      entry: path.join(root, "apps/cms-api/src/html-shell.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: Duration.seconds(15),
      memorySize: 512,
      bundling: {
        format: nodejs.OutputFormat.ESM,
        target: "node22",
        mainFields: ["module", "main"],
        banner: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
      },
      environment: {
        INDEX_HTML: indexHtml,
        PRISMIC_REPOSITORY_NAME: "dancercitizen",
        SITE_URL: process.env.SITE_URL || "https://dancercitizen.org",
      },
    });

    const httpApi = new apigwv2.HttpApi(this, "CmsHttpApi", {
      corsPreflight: {
        allowCredentials: true,
        allowHeaders: ["content-type"],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
        allowOrigins: [process.env.SITE_URL || "https://dancercitizen.org"],
      },
    });

    const apiIntegration = new integrations.HttpLambdaIntegration("CmsApiIntegration", apiFunction);
    const htmlIntegration = new integrations.HttpLambdaIntegration("HtmlShellIntegration", htmlFunction);

    httpApi.addRoutes({
      path: "/cms/{proxy+}",
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: apiIntegration,
    });
    const defaultApiStage = httpApi.defaultStage?.node.defaultChild as apigwv2.CfnStage | undefined;
    if (defaultApiStage) {
      defaultApiStage.defaultRouteSettings = {
        throttlingBurstLimit: 10,
        throttlingRateLimit: 2,
      };
    }

    httpApi.addRoutes({
      path: "/articles/{proxy+}",
      methods: [apigwv2.HttpMethod.GET],
      integration: htmlIntegration,
    });
    httpApi.addRoutes({
      path: "/issues/{proxy+}",
      methods: [apigwv2.HttpMethod.GET],
      integration: htmlIntegration,
    });
    for (const route of ["/about", "/admin", "/contributors", "/editors-staff", "/in-the-moment", "/submissions", "/submissions/thank-you", "/support-us"]) {
      httpApi.addRoutes({
        path: route,
        methods: [apigwv2.HttpMethod.GET],
        integration: htmlIntegration,
      });
    }
    httpApi.addRoutes({
      path: "/admin/{proxy+}",
      methods: [apigwv2.HttpMethod.GET],
      integration: htmlIntegration,
    });

    const apiDomainName = cdk.Fn.select(2, cdk.Fn.split("/", httpApi.apiEndpoint));
    const apiOrigin = new origins.HttpOrigin(apiDomainName, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });
    const siteOrigin = origins.S3BucketOrigin.withOriginAccessControl(siteBucket);
    const htmlBehavior: cloudfront.BehaviorOptions = {
      origin: apiOrigin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: new cloudfront.CachePolicy(this, "HtmlCachePolicy", {
        defaultTtl: Duration.minutes(1),
        minTtl: Duration.seconds(0),
        maxTtl: Duration.minutes(5),
        cookieBehavior: cloudfront.CacheCookieBehavior.allowList("dc_prismic_ref"),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      }),
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    };

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: siteOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        "cms/*": {
          origin: apiOrigin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        "articles/*": htmlBehavior,
        "issues/*": htmlBehavior,
        about: htmlBehavior,
        admin: htmlBehavior,
        "admin/*": htmlBehavior,
        contributors: htmlBehavior,
        "editors-staff": htmlBehavior,
        "in-the-moment": htmlBehavior,
        submissions: htmlBehavior,
        "submissions/thank-you": htmlBehavior,
        "support-us": htmlBehavior,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(1),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(1),
        },
      ],
    });

    if (fs.existsSync(reactDist)) {
      new s3deploy.BucketDeployment(this, "DeployReactSite", {
        sources: [s3deploy.Source.asset(reactDist)],
        destinationBucket: siteBucket,
        distribution,
        distributionPaths: ["/*"],
      });
    }

    new cdk.CfnOutput(this, "CloudFrontUrl", { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, "CmsApiUrl", { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, "SubmissionFilesBucketName", { value: submissionFilesBucket.bucketName });
    new cdk.CfnOutput(this, "SubmissionsTableName", { value: submissionsTable.tableName });
  }
}
