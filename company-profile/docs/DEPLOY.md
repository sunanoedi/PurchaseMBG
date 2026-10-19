# Deploy produksi ke Vercel dan Cloudflare

TODO pemilik: buat akun, lengkapi konten, setujui privasi dan batas biaya. Repository source saja belum mengonfigurasi akun, domain atau email. Mulai dari demo Vercel tanpa credential sesuai README root; jangan langsung mengganti DNS produksi.

## Website publik

Impor branch yang berisi source, Root Directory company-profile, Next.js, Node24.x. Build vercel.json menjalankan tes/build/typecheck. Jangan static export atau memublikasikan index.html aplikasi lama. Setelah review, merge melalui alur tim sebelum memilih production branch final. Batasi siapa yang boleh menjalankan build ber-secret; kode build dapat membaca environment.

Isi environment Production sesuai ENVIRONMENT.md. Jangan menyalin secret produksi ke PR/fork tidak dipercaya. Website publik hanya token Sanity read-only published, tanpa token draf atau Access. Project preview editor terpisah hanya credential CMS/Access dan secret foto independen, tanpa provider form/email.

Tambahkan ubg.id dan www.ubg.id di Vercel Domains. Salin target DNS yang ditampilkan pada proyek sendiri; jangan memakai IP/CNAME contoh. Redirect www ke ubg.id melalui Vercel. Canonical dan hreflang sengaja tetap domain produksi.

## DNS dan TLS

1. Pastikan penguasaan registrar ubg.id, inventaris DNS/email, lalu tambah zona Cloudflare. Salin nameserver dari dashboard jika migrasi DNS diperlukan. Pertahankan MX, SPF, DKIM dan record yang masih digunakan.
2. Apex dan www: record sesuai dashboard Vercel, **DNS only** untuk desain trusted x-real-ip saat ini. Jangan menambahkan Cloudflare proxy publik tanpa merancang origin anti-bypass dan verifikasi IP. Jangan langsung percaya CF-Connecting-IP/X-Forwarded-For.
3. Admin dan preview: record sesuai hosting masing-masing, **Proxied + Access** untuk seluruh host/path. Gunakan Full (strict) dan sertifikat origin valid, bukan Flexible.
4. Uji semua alias hosting/origin. Jika hosting statis Studio membuka alias produksi, lindungi atau redirect seluruh HTML/JS/CSS ke admin yang ber-Access. Mengamankan custom domain saja belum cukup. Jangan membuka admin sebelum bukti penutupan bypass tersedia.
5. Jangan cache HTML; nonce CSP harus berbeda setiap respons. Foto published gateway saja browser<=60detik/CDN<=300detik, terikat expiry signature. Draf/API sensitif no-store. Jangan mengabaikan query pada cache key. Purge mungkin diperlukan untuk menarik foto publik segera.
6. HSTS aplikasi satu tahun, tanpa includeSubDomains/preload sampai seluruh subdomain benar-benar siap HTTPS. security.txt perlu diperbarui sebelum 19 April 2027.

## Turnstile, Resend, Redis

- Buat widget Turnstile untuk ubg.id dan www.ubg.id yang dipakai. Isi site key build/browser serta secret server. Action quote, hostname dan umur challenge diverifikasi server. Jangan gunakan test keys untuk produksi.
- Verifikasi domain sending Resend. Gunakan email pengirim terverifikasi pada RESEND_FROM_EMAIL dan kotak penerima aktif pada CONTACT_TO_EMAIL. Pengaturan umum CMS tidak dapat mengganti tujuan email. Jangan menghapus MX inbound perusahaan demi mengaktifkan sending domain.
- Buat Redis REST Upstash dengan region/retensi yang ditinjau. Isi endpoint/token dan salt acak. Batas atomik lima upaya per IP per jendela15menit, key HMAC dengan TTL900detik, tanpa body/raw IP. Fixed window memungkinkan burst di pergantian jendela dan tidak menahan botnet.
- Uji satu pengiriman sintetis yang disetujui. Origin formulir produksi dibatasi ubg.id/www; Vercel demo tanpa hostname produksi tidak dipakai untuk menyimpulkan form produksi bekerja. Jangan memalsukan VERCEL=1 pada mesin lokal.
- Pasang rate/bot/budget pada Vercel Firewall sesuai fitur plan dan traffic, khususnya /api/quote, /api/cms/revalidate dan /media/*. Jangan CAPTCHA interaktif pada webhook. Cloudflare WAF hanya memeriksa request yang melewati proxy.

## Checklist sebelum go-live

- [ ] Source direview, tersimpan di GitHub dan build yang dimaksud benar-benar di-deploy.
- [ ] Gitleaks history/working tree dan review dependency selesai; temuan terbuka dinilai/diperbaiki, bukan disembunyikan dengan audit fix --force.
- [ ] Foto/logo/favikon asli, bukti klaim21klien/8sertifikasi/tim/fasilitas, izin klien/foto, sambutan direktur, visi/misi dan pin peta disetujui. JSON saat ini draf; sumber dokumen belum diberikan.
- [ ] Tidak ada rekening, NPWP, NPP BPJS, akta atau data pelanggan pada CMS/artefak publik.
- [ ] Environment terpisah public/preview/Studio, scopes minimum, tidak ada secret pada browser atau Git.
- [ ] Dataset private, CORS dua origin, Admin/Editor saja, MFA/SSO dan penolakan upload API sebelum penyimpanan terbukti.
- [ ] Access seluruh admin/preview dan alias/origin, pencabutan editor serta draf/foto privat diuji.
- [ ] Form valid menerima email, CAPTCHA salah/asal asing/input salah/rate limit/provider gagal ditolak dengan benar.
- [ ] Publish/unpublish/perubahan slug/webhook palsu/sertifikat expired/fallback outage diuji.
- [ ] DNS/TLS/redirect benar, nonce CSP unik, header produksi dan Lighthouse dua bahasa/kontak/artikel terbit diperiksa.
- [ ] Kebijakan UU PDP, pemroses/transfer lintas negara, jadwal retensi email/log dan prosedur hak data disetujui perusahaan.
- [ ] Collector log/alert5xx/429/provider/biaya dipasang, tanpa body/email/token pada log aplikasi; tinjau juga metadata bawaan hosting.
- [ ] Backup dataset dan aset terenkripsi lengkap serta restore private dataset terpisah berhasil.
- [ ] Rollback deployment dan pemulihan konten CMS disiapkan terpisah. Go-live tidak dianggap otomatis selesai oleh npm build.
