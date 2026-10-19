export class BodyError extends Error {
  status: number;
  constructor(status: number) {
    super("Invalid request body");
    this.status = status;
  }
}
export async function readBody(
  request: Request,
  limit: number,
  deadline = 5000,
) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new BodyError(413);
  const reader = request.body?.getReader();
  if (!reader) return "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        let size = 0;
        const parts: Uint8Array[] = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) throw new BodyError(413);
          parts.push(value);
        }
        const data = new Uint8Array(size);
        let offset = 0;
        for (const part of parts) {
          data.set(part, offset);
          offset += part.byteLength;
        }
        try {
          return new TextDecoder("utf-8", { fatal: true }).decode(data);
        } catch {
          throw new BodyError(400);
        }
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new BodyError(408)), deadline);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
  }
}
