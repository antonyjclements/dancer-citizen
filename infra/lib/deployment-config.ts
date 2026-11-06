export type DeploymentConfig = {
  environment: "production" | "staging";
  stackId: "DancerCitizenWebStack" | "DancerCitizenStagingStack";
  siteUrl: string;
  domain?: {
    name: string;
    certificateArn: string;
    hostedZoneId?: string;
    hostedZoneName?: string;
  };
};

export function getDeploymentConfig(
  environment: unknown = "production",
  env: NodeJS.ProcessEnv = process.env,
): DeploymentConfig {
  if (environment === "production") {
    return {
      environment,
      stackId: "DancerCitizenWebStack",
      siteUrl: env.SITE_URL || "https://dancercitizen.org",
    };
  }
  if (environment !== "staging") {
    throw new Error('environment must be "production" or "staging"');
  }

  const name = env.STAGING_DOMAIN_NAME?.trim();
  const certificateArn = env.STAGING_CERTIFICATE_ARN?.trim();
  const hostedZoneId = env.STAGING_HOSTED_ZONE_ID?.trim();
  const hostedZoneName = env.STAGING_HOSTED_ZONE_NAME?.trim().replace(/\.$/, "");
  if (Boolean(name) !== Boolean(certificateArn)) {
    throw new Error("STAGING_DOMAIN_NAME and STAGING_CERTIFICATE_ARN must be supplied together");
  }
  if (Boolean(hostedZoneId) !== Boolean(hostedZoneName) || (hostedZoneId && !name)) {
    throw new Error("Staging DNS requires a domain, STAGING_HOSTED_ZONE_ID, and STAGING_HOSTED_ZONE_NAME");
  }
  if (name && (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(name)
    || name === "dancercitizen.org" || name === "www.dancercitizen.org")) {
    throw new Error("STAGING_DOMAIN_NAME must be a lowercase staging hostname, separate from production");
  }
  if (certificateArn && !/^arn:aws:acm:us-east-1:\d{12}:certificate\/[a-f0-9-]+$/.test(certificateArn)) {
    throw new Error("STAGING_CERTIFICATE_ARN must identify an ACM certificate in us-east-1");
  }
  if (name && hostedZoneName && !name.endsWith(`.${hostedZoneName}`)) {
    throw new Error("The staging hostname must be a subdomain of STAGING_HOSTED_ZONE_NAME");
  }

  const siteUrl = env.STAGING_SITE_URL || `https://${name || "staging.dancercitizen.org"}`;
  const origin = new URL(siteUrl);
  if (origin.protocol !== "https:" || origin.origin !== siteUrl || origin.username || origin.password
    || (name && origin.hostname !== name)) {
    throw new Error("STAGING_SITE_URL must be an HTTPS origin matching the staging domain when configured");
  }
  if (["dancercitizen.org", "www.dancercitizen.org"].includes(origin.hostname)) {
    throw new Error("STAGING_SITE_URL must be separate from production");
  }

  return {
    environment,
    stackId: "DancerCitizenStagingStack",
    siteUrl,
    domain: name && certificateArn ? { name, certificateArn, hostedZoneId, hostedZoneName } : undefined,
  };
}
