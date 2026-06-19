import { redirectToPreviewURL } from "@prismicio/next";
import { type NextRequest } from "next/server";
import { createClient } from "@/prismicio";

export async function GET(request: NextRequest) {
  const client = createClient();

  return redirectToPreviewURL({ client, request });
}
