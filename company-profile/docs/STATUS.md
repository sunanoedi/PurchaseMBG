# Cek Lolos dan Ringkasan Keputusan versi pembangunan ulang

Pemeriksaan 19 Oktober 2026 WIB. Ini source baru, bukan pemulihan identik file lingkungan lama. Kode disimpan pada branch rebuild/ubg-company-profile; main dan aplikasi invoice lama tidak diubah. Situs belum di-deploy pada akun Vercel/ubg.id.

## Cek Lolos lokal

- [x] Node24.x; lockfile kedua paket dan frozen npm ci melalui scripts/cloud-install.sh berhasil, TLS/integrity tetap aktif.
- [x] 40 tes unit lulus, 0 gagal/skip: validasi/CSRF/CAPTCHA/rate/provider fail closed, body byte/deadline/cancel, JWT, webhook, gambar, expiry Jakarta dan konten bilingual.
- [x] Build produksi dan typecheck website berhasil.
- [x] Typecheck Studio dan build terpisah dengan empat identitas sintetis non-secret berhasil. Bukan login/proyek Sanity nyata; jangan deploy dist uji.
- [x] Smoke22halaman, path404/dotted/prefix, default /id, nonce/security headers, SEO, sitemap22entry, robots/security.txt dan OG PNG berhasil pada pemeriksaan lokal.
- [x] CMS transport sintetis: enam tipe, hide/draft/expiry, slug terjemahan, PortableText aman, gambar signed dan SVG palsu ditolak, preview JWT/cookie/foto privat, webhook tamper, rename/unpublish/sitemap, valid-empty dan outage fallback berhasil. Malformed map settings ditolak dan memakai fallback.
- [x] Browser22halaman, empat lebar360/390/768/1440, axe WCAG2/2.1A/AA, language/mobile/gallery/focus/map-consent/reduced-motion, tanpa runtime error/CSP violation pada skenario yang diuji. Masalah overflow360px, kontras angka dan label galeri diperbaiki.
- [x] npm audit berjalan untuk kedua tree: website11high/4moderate, Studio10high/4moderate, 0critical. Advisory sumber tersisa braces/sprintf-js; parent transitif dapat berulang. Ini temuan terbuka, bukan hasil audit bersih.
- [x] 14manifest runtime Next diperiksa: tidak memuat @sanity/cli, braces atau sprintf-js. Risiko build/toolchain tetap ada.
- [x] index.html lama dipertahankan; root deployment dipisahkan. Secret hanya nama/contoh kosong; kredensial integrasi belum diisi.

- [x] Lighthouse13.5.0 lokal /id setelah perbaikan footer/favikon: performance 97, accessibility 100, best-practices 100, seo 100. LCP 2.4 s, CLS 0.013, TBT 100 ms. Hasil lab, bukan hasil produksi atau bukti keamanan.

## Belum lolos / membutuhkan akun dan manusia

- [ ] Gitleaks resmi history dan working tree; tool belum terpasang di cloud. Scan empat pola terbatas tidak menggantikannya.
- [ ] Penanganan/risk review advisory dependency terbuka, kontrol biaya/bot/WAF, collector dan alert operasional.
- [ ] Hard rejection upload langsung API Sanity sebelum penyimpanan; schema Studio dan gateway saja belum memenuhi persyaratan ini.
- [ ] Proyek private, MFA/SSO, Admin/Editor, token scopes, CORS dua origin, revisions/retensi, Access seluruh admin/preview/alias dan pencabutan editor nyata.
- [ ] Turnstile/Resend/Upstash asli, satu email sintetis diterima dan uji provider gagal/rate limit pada deployment yang tepat.
- [ ] DNS/TLS/redirect, header dan Lighthouse produksi pada dua bahasa/kontak/artikel terbit.
- [ ] Backup/aset terenkripsi dan restore private dataset terpisah, jadwal retensi/PDP/pemroses disetujui.
- [ ] Logo/foto/favikon asli, dokumen sumber, sambutan/visi/misi, bukti klaim, izin klien/sertifikat dan pin peta disetujui.

## Ringkasan Keputusan

1. Website bilingual /id dan /en, seluruh copy dalam content JSON; fonts Anton/Figtree di-host sendiri, tokens merah/ivory/charcoal/turmeric pada Tailwind. Ilustrasi/wordmark/favikon sementara ditandai TODO dan bukan bukti fasilitas/perusahaan.
2. HTML dinamis dengan nonce CSP unik sesuai persetujuan sebelumnya; tidak static export/ISR untuk HTML. Cache data CMS60detik + webhook HMAC fixed tag/layout/sitemap. Invalidasi luas dipilih untuk menangani slug lama/baru dan unpublish dengan aman.
3. Native Sanity Studio terpisah, read-only public, private preview deployment terpisah. Project/dataset tidak dikirim browser publik; pengecualian Studio admin saja. Tidak ada login/dashboard/uploader sendiri.
4. Public memakai minimum published read token, tanpa draft/Access config. Preview memakai token draft read-only, JWT Access dan allowlist terpisah; tidak memiliki credential form/email. Semua draf/foto privat no-store.
5. Form JSON16KiB/deadline5detik, Zod strict, Turnstile, honeypot, Upstash5/15menit dengan HMAC keyTTL900, email plaintext Resend. Tidak menyimpan isian di database/CMS; penyedia email/hosting tetap memiliki pemrosesan/retensi sendiri.
6. Publik DNS only pada arsitektur trusted Vercel x-real-ip; admin/preview Proxied+Access dan semua alias/origin harus diuji. Jangan menebak DNS atau memercayai header IP arbitrer.
7. Source di GitHub menjadi jalur unduhan dan pemulihan yang dapat ditinjau. ZIP internal chat tidak dianggap berhasil diterima pengguna. Root Directory Vercel wajib company-profile; main perlu review/merge atau pemilihan branch yang benar sebelum deploy.
8. Audit lokal tidak menutup persyaratan akun, Gitleaks, provider upload policy, konten ataupun produksi. Tidak ada klaim aman100%. Jalankan checklist DEPLOY.md dan PEMELIHARAAN.md sebelum go-live.
