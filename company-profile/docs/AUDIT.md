# Audit versi pembangunan ulang — 19 Oktober 2026 WIB

Ruang lingkup: company-profile dan sanity-studio yang dibangun ulang, konfigurasi contoh dan panduan. Pemeriksaan manual berbasis OWASP Top10:2025 ditambah CSRF/XSS/SSRF, tes otomatis dan build lokal. Tidak ada production pentest atau konfigurasi akun nyata. Pengujian versi lama tidak dipakai sebagai bukti versi baru. Website tidak dinyatakan aman100%.

## Temuan dan perbaikan

| Risiko/status                                                                | Lokasi                                                 | Penjelasan                                                                                                                                                           | Perbaikan konkret / tindakan                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tinggi, terbuka                                                              | package-lock.json kedua paket                          | Advisory toolchain braces/sprintf-js tetap terdeteksi setelah override terukur. Parent transitif dapat dihitung berulang.                                            | Jangan audit fix --force/downgrade major Sanity. Review advisory, isolasi build ber-secret dan update setelah patch resmi tersedia. Simpan npm audit kedua tree.                                                                                               |
| Tinggi, terbuka                                                              | sanity-studio/schemaTypes/index.ts + akun Sanity       | Accept/validasi Studio tidak memblokir semua upload langsung API sebelum penyimpanan.                                                                                | Verifikasi kebijakan provider/plan yang benar-benar menolak format selain JPG/PNG/WebP serta >5MiB sebelum storage. Jangan membuka Editor bila syarat wajib belum terpenuhi.                                                                                   |
| Tinggi, belum terverifikasi                                                  | Sanity/IdP/Cloudflare/Vercel                           | Role, MFA/SSO, token scope, CORS dan origin bypass memerlukan akun nyata.                                                                                            | Dataset private; staf Admin/Editor saja; token baca; CORS dua origin; Access semua admin/preview/alias. Uji akun dicabut. Filter login UI saja bukan enforcement.                                                                                              |
| Sedang, belum terverifikasi                                                  | Git dan artefak                                        | Scan pola terbatas bukan Gitleaks seluruh history/working tree.                                                                                                      | Jalankan Gitleaks resmi dua mode sesuai VERIFIKASI.md; rotasi secret nyata sebelum membersihkan riwayat.                                                                                                                                                       |
| Sedang, ditangani di kode; uji akun tersisa                                  | src/lib/quote-core.ts, quote.ts                        | Input, origin, spam dan gangguan provider dapat menyebabkan penyalahgunaan/form sukses palsu.                                                                        | Zod strict, batas16KiB/deadline5detik, exact Origin/FetchSite/JSON, honeypot, CAPTCHA hostname/action/freshness, Redis EVAL atomik5/15menit dan semua provider fail closed.                                                                                    |
| Sedang, ditangani di kode                                                    | src/lib/quote.ts                                       | Header IP buatan dapat membypass rate limit pada self-host.                                                                                                          | Hanya x-real-ip saat VERCEL=1 resmi; produksi self-host fails closed, development loopback. Publik DNS only. Jangan memalsukan metadata Vercel.                                                                                                                |
| Sedang, ditangani di kode                                                    | src/proxy.ts, next.config.ts                           | CSP/nonce salah atau matcher melewatkan path HTML membuka konfigurasi lemah.                                                                                         | Nonce baru setiap respons, strict-dynamic, tanpa unsafe-inline/eval produksi, style-src-attr none, HSTS/nosniff/DENY/Permissions/Referrer. Matcher segmen mencakup path bertitik dan prefix mirip API/media.                                                   |
| Sedang, ditangani di kode                                                    | src/lib/webhook.ts, api/cms/revalidate                 | Webhook palsu/replay/path arbitrer dapat membatalkan cache atau menambah biaya.                                                                                      | Raw body32KiB/deadline5detik, official encode/decode signature dan timingSafeEqual, umur5menit, project/dataset/type exact; invalidasi fixed tag/layout/sitemap. Replay dalam jendela masih mungkin dan idempotent, tanpa dedup store.                         |
| Sedang, ditangani di kode; pencabutan operasional terbuka                    | src/lib/access*.ts, api/preview, preview/articles      | Cookie draf atau identitas tidak tepat tidak boleh membuka draf.                                                                                                     | JWT RS256 pinned issuer/audience/expiry/iat/email allowlist pada setiap draft read/foto privat; published routes selalu published. JWT offline belum membatalkan token secara online; cabut sesi/IdP/role/allowlist dan redeploy.                              |
| Sedang, ditangani di kode                                                    | src/lib/media.ts, app/media                            | URL gambar dapat membocorkan project/dataset atau menjadi proxy arbitrer.                                                                                            | Ref regex + HMAC mode/expiry, CDN host/path tetap, no redirects/token forwarding, max5MiB/dimensi dan magic bytes, draft Access+no-store. Published caching <=60/300detik terikat expiry. URL signed bukan rate limiter; CDN sumber bukan penyimpanan rahasia. |
| Sedang, ditangani di kode                                                    | cms-model.ts, components/article-body.tsx, security.ts | Isi CMS/URL/JSON-LD dapat memicu XSS.                                                                                                                                | Runtime Zod dan PortableText whitelist, URL schemes aman, React escaping, JSON-LD escape <>& dan U+2028/2029. Tidak memakai dangerouslySetInnerHTML/eval pada source baru.                                                                                     |
| Sedang, belum terverifikasi                                                  | provider/logging/backup/privacy                        | Retensi email/provider, backup tak lengkap, ketiadaan alert dan persetujuan konten tetap risiko operasional.                                                         | Tinjau PDP/pemroses/retensi; collector+alert tanpa PII; native backup aset lengkap dan restore dataset private terpisah; setujui logo/foto/klaim.                                                                                                              |
| Tinggi jika aplikasi lama dipublikasikan terpisah, di luar perubahan website | /index.html legacy                                     | Root repository berisi aplikasi invoice lama dengan penggunaan innerHTML dan dependensi CDN. Backend/security rules lengkap tidak tersedia untuk audit aplikasi itu. | Root Directory Vercel company-profile; legacy tidak diubah atau dipindah ke public. Refactor/audit legacy terpisah diperlukan bila masih digunakan.                                                                                                            |

## Contoh kode perbaikan yang diterapkan

Form tidak membuka akses saat rate service gagal (src/lib/quote-core.ts):

```ts
try {
  if (!(await adapters.limit()))
    return apiJson({ code: "rate" }, 429, { "Retry-After": "900" });
} catch {
  adapters.log("quote.rate");
  return apiJson({ code: "unavailable" }, 503);
}
```

Serialized structured data (src/lib/security.ts) tetap teks, tanpa raw HTML renderer:

```ts
export const jsonLd = (value: unknown) =>
  JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
```

Signature webhook memakai helper resmi dan pembandingan constant-time setelah pemeriksaan timestamp (src/lib/webhook.ts). Tidak ada field path arbitrary pada schema. Kontrol CSRF form berada sebelum provider; tujuan email dari environment server, bukan alamat CMS atau input pelanggan.

## Cakupan OWASP

| Kategori                                   | Tinjauan dan batas                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control                  | Public read-only, draft JWT+cookie, private image, Origin/CSRF, batas IP; role/alias nyata belum diuji.                         |
| A02 Security Misconfiguration              | CSP/header/no-store/env/scopes/CORS/DNS dan pemisahan Studio; setting akun wajib diverifikasi.                                  |
| A03 Software Supply Chain Failures         | Versi exact+lockfile, TLS/integrity dipertahankan; advisory toolchain/Gitleaks terbuka.                                         |
| A04 Cryptographic Failures                 | HMAC salt/signature, timing-safe verification, RS256, no secret browser; secret entropy/rotation/provider nyata belum diuji.    |
| A05 Injection                              | Parameterized GROQ, Zod strict, plaintext email, PortableText/safe links/escaped JSON-LD; tidak ada raw HTML/eval.              |
| A06 Insecure Design                        | Fail closed, batas body/deadline/bytes/dimensi, honeypot/Turnstile/rate; fixed window/botnet/cost tetap perlu hosting controls. |
| A07 Authentication Failures                | Native Sanity/IdP/Access; tidak ada login sendiri. Kebijakan MFA/SSO dan revoke nyata eksternal.                                |
| A08 Software or Data Integrity Failures    | Lockfile/checksum, signed webhook/raw body, runtime CMS model; siapa boleh publish/build tetap perlu governance.                |
| A09 Security Logging and Alerting Failures | Fixed schema kind/event/requestId/at tanpa body/IP/token/email; collector, alert dan retensi eksternal belum dipasang.          |
| A10 Mishandling Exceptional Conditions     | Provider timeout/status/schema error fail closed, CMS fallback, body deadline; outage/recovery dan quota produksi perlu diuji.  |

SSRF: endpoint email/CAPTCHA/CDN fixed; Redis HTTPS host *.upstash.io tanpa credential/query; JWKS exact TEAM.cloudflareaccess.com; redirects ditolak. Env server tetap harus dikelola operator yang dipercaya. Semua secret dibatasi server-only. Lihat STATUS.md untuk hasil pengujian versi ini dan pekerjaan yang belum lolos.
