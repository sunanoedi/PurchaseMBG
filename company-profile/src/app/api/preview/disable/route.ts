import { draftMode } from "next/headers";
import { editorAllowed } from "@/lib/access";
import { apiJson } from "@/lib/quote-core";
export async function POST(request: Request) {
  if (
    request.headers.get("origin") !== "https://preview.ubg.id" ||
    !(await editorAllowed())
  )
    return apiJson({ ok: false }, 403);
  (await draftMode()).disable();
  return apiJson({ ok: true });
}
