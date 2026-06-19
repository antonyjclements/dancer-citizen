import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.PRISMIC_WEBHOOK_SECRET;

  if (expectedSecret) {
    const providedSecret = request.nextUrl.searchParams.get("secret");

    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ message: "Invalid secret." }, { status: 401 });
    }
  }

  revalidateTag("prismic", "max");

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
