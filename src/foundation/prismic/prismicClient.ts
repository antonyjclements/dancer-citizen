import {
  createClient as baseCreateClient,
  type ClientConfig,
} from "@prismicio/client";
import { enableAutoPreviews } from "@prismicio/next";
import sm from "../../../slicemachine.config.json";
import { prismicRoutes } from "./prismicRoutes";

export const repositoryName = sm.repositoryName;

export function createClient(config: ClientConfig = {}) {
  const client = baseCreateClient(repositoryName, {
    routes: prismicRoutes,
    fetchOptions:
      process.env.NODE_ENV === "production"
        ? { next: { tags: ["prismic"] }, cache: "force-cache" }
        : { next: { revalidate: 5 } },
    ...config,
  });

  enableAutoPreviews({ client });

  return client;
}
