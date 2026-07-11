import { describe, expect, it } from "vitest";
import { getLegacyRedirectPath } from "./legacy-redirects";

describe("legacy redirects", () => {
  it("maps nested legacy issue articles to article routes", () => {
    expect(getLegacyRedirectPath("/issue-13/akari-komura/")).toBe("/articles/issue-13--akari-komura");
  });

  it("maps legacy issue landing pages to issue routes", () => {
    expect(getLegacyRedirectPath("/issue-13/")).toBe("/issues/issue-13");
  });

  it("ignores current and unknown route shapes", () => {
    expect(getLegacyRedirectPath("/articles/issue-13--akari-komura")).toBeNull();
    expect(getLegacyRedirectPath("/about")).toBeNull();
    expect(getLegacyRedirectPath("/issue-13/akari-komura/extra")).toBeNull();
  });
});
