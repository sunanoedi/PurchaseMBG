# Checklist pemeliharaan bulanan

- [ ] Jalankan npm audit kedua paket, baca advisory sumber dan update terukur pada branch. Pertahankan lockfile/integrity/TLS; ulang tes/build/typecheck dan uji fitur yang berubah. Jangan audit fix --force.
- [ ] Tinjau Sanity Admin/Editor, IdP/Access, sesi aktif, allowlist preview dan token mesin. Cabut staf yang keluar di semua tempat; redeploy allowlist. Tinjau MFA/SSO, scopes dan CORS dua origin.
- [ ] Cek masa berlaku sertifikat60/30hari sebelum kedaluwarsa, izin publikasi nama/logo/foto serta status klaim. Uji batas akhir tanggal Asia/Jakarta.
- [ ] Tinjau DNS/TLS, dangling aliases, redirect www, HSTS, CSP unik/no-store dan penutupan bypass admin/preview. Perbarui security.txt sebelum 19 April 2027.
- [ ] Uji penawaran sintetis, Turnstile, email, Redis/rate limit dan penanganan gangguan; tinjau alert, quota serta biaya. Jangan memakai data pelanggan sebagai test fixture.
- [ ] Tinjau log aplikasi tetap field kind/event/requestId/at saja; tinjau akses/retensi metadata provider. Tetapkan jadwal penghapusan email dan penanganan hak data sesuai kebijakan perusahaan.
- [ ] Ekspor dataset dan aset dengan CLI native Sanity pada job tepercaya, enkripsi backup, simpan terpisah dari hosting/Git dan batasi akses. Jangan menyimpan backup dalam CMS/public/.
- [ ] Periksa jumlah dokumen/aset, log ekspor dan checksum. Export dapat melewatkan aset401/403/404 meskipun command selesai; exit0 saja tidak membuktikan backup lengkap. Jangan mematikan integrity verification demi kelulusan.
- [ ] Uji restore ke dataset **private terpisah**, validasi referensi/foto/artikel/terjemahan dan ukur waktu pemulihan. Jangan menggunakan --replace pada produksi. Riwayat revisi native bukan pengganti backup.
- [ ] Jalankan Lighthouse dan cek SEO/canonical/hreflang/sitemap untuk dua bahasa, kontak dan artikel. Skor lab bukan data Core Web Vitals lapangan atau bukti keamanan mutlak.

TODO pemilik: tentukan operator, jadwal, batas biaya, retensi dan bukti pelaksanaan. Checklist ini tidak mengaktifkan alert, backup, rotasi atau restore pada akun secara otomatis.
