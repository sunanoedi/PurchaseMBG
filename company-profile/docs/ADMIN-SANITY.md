# Admin Sanity

## Persiapan oleh Administrator

1. Buat proyek Sanity dan dataset production **private**. Hanya Administrator dan Editor untuk staf manusia. Token mesin terpisah dengan hak minimum; website tidak memegang token tulis.
2. Terapkan MFA/SSO pada Sanity/IdP sesuai dukungan paket. Isi nama provider autentikasi native yang benar pada SANITY_STUDIO_SSO_PROVIDER. Filter provider di UI bukan enforcement organisasi/API; uji kebijakan nyata. Jangan menganggap paket gratis menyediakan semua fitur.
3. CORS hanya https://ubg.id (credentials off) dan https://admin.ubg.id (credentials on). Hapus wildcard, localhost dan origin Studio bawaan yang tidak digunakan. CORS bukan kontrol akses untuk API non-browser.
4. Studio berdiri sendiri pada admin.ubg.id, bukan route website. Build dari root repository karena skema membaca sibling company-profile/content dan validasi bersama:

```bash
cd sanity-studio
npm ci --no-audit --no-fund
npm run typecheck
npm run build
```

5. Lindungi seluruh host admin dan preview melalui Cloudflare Access, termasuk file JS/CSS, preview deployment dan alias hosting/origin. Tanpa login Access, semuanya harus ditolak atau diarahkan ke host terlindungi. Uji alias produksi dan preview; perlindungan hanya pada domain kustom belum menutup bypass origin.
6. Riwayat revisi native tidak dimatikan. Verifikasi retensi sesuai paket, dan buat backup terpisah. Jangan menyimpan data pelanggan, scan akta, NPWP, NPP BPJS, rekening, atau dokumen sensitif dalam CMS. Aset CDN dapat publik meskipun dataset private.

## Login dan pekerjaan harian

- **Login:** buka admin.ubg.id, lewati Access dengan identitas staf/MFA, lalu login resmi Sanity. Tidak ada sistem login buatan sendiri.
- **Tambah paket:** pilih Paket Menu, isi nama/deskripsi/isi paket Indonesia dan Inggris, kategori, foto opsional, urutan dan status tampil. Periksa isi, lalu centang disetujui untuk publikasi dan Publish. Tidak ada field harga.
- **Unggah foto:** gunakan image input native. Pilih JPG/PNG/WebP <=5MiB, <=8192px per sisi, <=25MP. Isi alt Indonesia dan Inggris, <=280karakter masing-masing. Hindari nama file/data pribadi; pastikan izin foto.
- **Galeri:** unggah foto, pilih Dapur/Tim/Hidangan/Acara dan urutan, isi persetujuan publikasi, lalu Publish.
- **Sertifikat:** isi nama, penerbit, nomor, foto dan tanggal kedaluwarsa. Hanya dokumen terverifikasi yang boleh dipublikasikan. Sertifikat hilang setelah akhir tanggal berlaku di Asia/Jakarta; jangan unggah dokumen sensitif.
- **Artikel:** isi judul, slug unik per bahasa, ringkasan, isi Portable Text, foto, tanggal terbit, meta SEO kedua bahasa. Pilih status published, setujui dan Publish. Dokumen status draft atau tanggal masa depan tidak tampil publik. Gunakan slug huruf kecil, angka dan tanda hubung; periksa keunikan dalam dataset.
- **Sembunyikan:** set visible false pada paket/klien/sertifikat/artikel lalu Publish, atau gunakan native Unpublish. Hasil CMS kosong yang sah tidak digantikan konten cadangan.
- **Revisi:** gunakan native History untuk meninjau/memulihkan revisi; jangan menganggapnya backup seluruh dataset/aset.

**Batas upload yang belum terpenuhi:** validasi skema mencegah publikasi data tidak sesuai dan gateway menolak format/ukuran/dimensi yang tidak sah. Ini belum membuktikan penolakan semua upload langsung ke API aset **sebelum tersimpan**. TODO pemilik: pastikan policy provider benar-benar mendukungnya sebelum membuka Editor. Jika tidak tersedia, perlukan keputusan arsitektur eksplisit; jangan menyatakan syarat ini sudah lolos atau membuat uploader sendiri diam-diam.

## Webhook publikasi

Sanity Manage → API → Webhooks, POST JSON ke https://ubg.id/api/cms/revalidate. Aktifkan create/update/delete published, nonaktifkan draft events. Gunakan secret yang sama dengan SANITY_WEBHOOK_SECRET. Filter mencakup before/after agar delete dan perubahan slug tercakup:

```groq
coalesce(after()._type, before()._type) in ["menuPackage","galleryItem","article","client","certificate","siteSettings"] && !(coalesce(after()._id, before()._id) in path("drafts.**"))
```

Projection:

```groq
{
  "projectId": sanity::projectId(),
  "dataset": sanity::dataset(),
  "_id": coalesce(after()._id, before()._id),
  "_type": coalesce(after()._type, before()._type)
}
```

Endpoint memverifikasi signature resmi raw body, timestamp5menit, project/dataset dan tipe allowlist. Satu tag data CMS dan layout/sitemap dibatalkan; tidak menerima path dari payload. Invalidasi luas dipilih agar perubahan slug lama/baru dan unpublish tidak meninggalkan konten lama. Uji webhook delivery nyata, bukan hanya tombol Publish. Replay dalam jendela lima menit masih idempotent dan belum memiliki dedup store.

## Preview draf

Gunakan proyek Vercel editor terpisah pada preview.ubg.id dengan token read-only draf dan audience/issuer/allowlist Access. Public project tidak memiliki token ini. Native preview link artikel membuka /api/preview/enable?locale=id&slug=SLUG lalu /id/preview/articles/SLUG.

Cookie Draft Mode saja tidak cukup: signature JWT RS256, issuer, audience, exp/iat dan email staf diperiksa saat enable, setiap pembacaan draf dan foto privat. Halaman/foto draf private/no-store dan noindex. Route publik selalu memakai published, meskipun browser membawa cookie/JWT. JWT adalah bearer credential; jangan membagikannya.

## Nonaktifkan pengguna

Administrator menghapus keanggotaan Sanity, mencabut akses/sesi IdP dan Cloudflare Access, menghapus email dari CF_ACCESS_EDITOR_EMAILS lalu redeploy preview. Verifikasi sesi lama dan semua alias menolak draf/foto. Validasi JWT offline tidak otomatis menerima perubahan role Sanity atau mencabut token yang sudah diterbitkan sebelum exp; lakukan seluruh langkah pencabutan.
