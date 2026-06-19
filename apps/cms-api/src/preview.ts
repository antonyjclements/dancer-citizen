import type { APIGatewayProxyEventV2 } from "aws-lambda";

export const previewCookieName = "dc_prismic_ref";

export function getPreviewRefFromCookies(event: APIGatewayProxyEventV2): string | undefined {
  const cookie = event.cookies?.find((entry) => entry.startsWith(`${previewCookieName}=`));
  return cookie ? decodeURIComponent(cookie.slice(previewCookieName.length + 1)) : undefined;
}

export function createPreviewCookie(ref: string): string {
  return `${previewCookieName}=${encodeURIComponent(ref)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800`;
}

export function clearPreviewCookie(): string {
  return `${previewCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
