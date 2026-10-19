# Environment variable

TODO pemilik: buat akun dan masukkan nilai langsung pada panel environment aman. Tidak ada credential nyata dalam repository. Node24.x wajib. Setelah mengubah environment Vercel, redeploy; nilai NEXT_PUBLIC_* dibekukan saat build.

| Nama                           | Website publik                                   | Preview editor terpisah                           | Studio                                         |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------- |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Site key widget, boleh di browser                | Kosong                                            | Tidak                                          |
| TURNSTILE_SECRET_KEY           | Secret server widget                             | Kosong                                            | Tidak                                          |
| RESEND_API_KEY                 | Secret pengiriman terbatas                       | Kosong                                            | Tidak                                          |
| RESEND_FROM_EMAIL              | Email pengirim terverifikasi, tanpa display name | Kosong                                            | Tidak                                          |
| CONTACT_TO_EMAIL               | Kotak penerima UBG yang aktif                    | Kosong                                            | Tidak                                          |
| UPSTASH_REDIS_REST_URL         | HTTPS endpoint REST *.upstash.io                 | Kosong                                            | Tidak                                          |
| UPSTASH_REDIS_REST_TOKEN       | Secret Redis                                     | Kosong                                            | Tidak                                          |
| RATE_LIMIT_SALT                | Acak mentah minimal32karakter                    | Kosong                                            | Tidak                                          |
| SANITY_PROJECT_ID              | Server only                                      | Server only                                       | Gunakan nama Studio                            |
| SANITY_DATASET                 | Dataset private, server only                     | Dataset yang sama                                 | Gunakan nama Studio                            |
| SANITY_READ_TOKEN              | Read-only published, minimum privilege           | Read-only published                               | Tidak                                          |
| SANITY_PREVIEW_READ_TOKEN      | Kosong                                           | Token read-only draf terpisah                     | Tidak                                          |
| SANITY_WEBHOOK_SECRET          | Secret mentah >=32karakter                       | Tidak diperlukan                                  | Tidak                                          |
| SANITY_ASSET_SIGNING_SECRET    | Secret mentah >=32karakter                       | Secret independen                                 | Tidak                                          |
| CF_ACCESS_TEAM_DOMAIN          | Kosong                                           | Tepat TEAM.cloudflareaccess.com, tanpa skema/path | Tidak                                          |
| CF_ACCESS_AUD                  | Kosong                                           | Audience aplikasi preview                         | Tidak                                          |
| CF_ACCESS_EDITOR_EMAILS        | Kosong                                           | Email Admin/Editor dipisahkan koma                | Tidak                                          |
| SANITY_STUDIO_PROJECT_ID       | Tidak                                            | Tidak                                             | ID proyek asli; non-secret                     |
| SANITY_STUDIO_DATASET          | Tidak                                            | Tidak                                             | Dataset asli; non-secret                       |
| SANITY_STUDIO_PREVIEW_ORIGIN   | Tidak                                            | Tidak                                             | https://preview.ubg.id                         |
| SANITY_STUDIO_SSO_PROVIDER     | Tidak                                            | Tidak                                             | Nama provider native/SSO organisasi yang benar |
| VERCEL, VERCEL_URL, VERCEL_ENV | Otomatis platform                                | Otomatis platform                                 | Tidak dibuat sendiri                           |
| NODE_ENV                       | Dikelola build/runtime                           | Dikelola build/runtime                            | Dikelola tooling                               |
| PORT                           | Opsional CLI lokal                               | Opsional CLI lokal                                | Gunakan opsi CLI                               |

Buat masing-masing secret mentah secara independen dengan `openssl rand -hex 32`, lalu simpan langsung ke secret manager. Jangan menyalin nilai ke chat. Proxy credential placeholder tidak cocok sebagai secret HMAC lokal.

Public project tidak memegang token draf atau kredensial Access. Studio hanya memegang empat SANITY_STUDIO_* non-secret; project ID/dataset terlihat di browser Studio sesuai pengecualian yang disetujui, tetapi tidak boleh dikirim website publik. Jangan gunakan NEXT_PUBLIC_SANITY_* atau next.config.env.

Untuk backup native CLI, credential dengan hak minimum ekspor dapat disediakan terpisah sebagai SANITY_AUTH_TOKEN pada job yang dipercaya. Token ini bukan token website, bukan Editor manusia, dan bukan SANITY_STUDIO_*. Lindungi backup dan token pada secret manager; jangan taruh di public/ atau Git.

Tujuan jaringan: registry.npmjs.org dan host distribusi package manager; api.resend.com; challenges.cloudflare.com; PROJECT.api.sanity.io; cdn.sanity.io; hostname REST Upstash milik Anda; TEAM.cloudflareaccess.com. Isi host proyek yang sebenarnya, jangan menebak wildcard atau menggunakan host contoh sebagai konfigurasi produksi.
