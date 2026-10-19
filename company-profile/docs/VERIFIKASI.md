# Perintah verifikasi mandiri

Gunakan Node24.x dan Bash dari root repository. Laporan disimpan di luar Git/webroot. Jangan kirim secret, cookie, Authorization, body isian, email pelanggan atau seluruh .env melalui chat. Perintah produksi hanya bermakna setelah domain benar-benar menjalankan build ini.

```bash
export UBG_AUDIT_DIR="$(mktemp -d /tmp/ubg-audit.XXXXXX)"
node --version
npm --version
git status --short
cd company-profile
npm ci --no-audit --no-fund
npm test
npm run build
npm run typecheck
npm audit --json > "$UBG_AUDIT_DIR/npm-website.json"
cd ../sanity-studio
npm ci --no-audit --no-fund
npm run typecheck
npm audit --json > "$UBG_AUDIT_DIR/npm-studio.json"
cd ..
```

Audit exit1 dapat berarti temuan, bukan kegagalan tool. Periksa metadata report; kegagalan jaringan bukan nol kerentanan. Jangan memakai shell set-e untuk menganggap audit temuan sebagai akhir semua pemeriksaan. Jangan menghapus lockfile atau audit fix --force.

## Gitleaks

Instal versi resmi dari https://github.com/gitleaks/gitleaks dan verifikasi checksum jika memakai binary release. Jangan memakai paket npm bernama mirip yang tidak diverifikasi. Periksa versi/help mendukung mode git/dir.

```bash
gitleaks version
git rev-parse --is-shallow-repository
# Jika shallow: git fetch --unshallow origin
git fetch --all --tags
gitleaks git --redact=100 --log-opts="--all" --report-format=json --report-path="$UBG_AUDIT_DIR/gitleaks-history.json" .
gitleaks dir --redact=100 --config=company-profile/scripts/gitleaks-worktree.toml --report-format=json --report-path="$UBG_AUDIT_DIR/gitleaks-worktree.json" .
```

History hanya mencakup refs/history yang berhasil di-fetch; worktree menangkap file belum di-commit. Jangan allowlist secret nyata. Bila ditemukan, cabut/rotasi terlebih dahulu lalu bersihkan source/history melalui prosedur tim. Menghapus teks tidak mencabut credential. Kirim hanya jumlah kandidat, RuleID, File dan StartLine setelah verifikasi redaksi; jangan Secret/Match/konten baris/email author.

## Header dan API produksi

```bash
node company-profile/scripts/check-headers.mjs https://ubg.id
curl --silent --show-error --dump-header - --output /dev/null https://ubg.id/id | rg -i '^(HTTP/|content-security-policy:|strict-transport-security:|x-content-type-options:|x-frame-options:|referrer-policy:|permissions-policy:|cache-control:|x-powered-by:)'
```

Script Node melakukan assertions; curl/filter hanya tampilan ringkas. Jangan memakai HEAD saja untuk membuktikan nonce pada HTML. Uji admin/preview dan semua alias tanpa sesi browser: tidak boleh menerima draf/foto atau source Studio tanpa Access. Uji login/pencabutan pengguna, webhook dan provider nyata memerlukan akun.

## Lighthouse CLI

Gunakan Chrome/Chromium terpasang dengan profil tanpa sesi admin. Versi Lighthouse13.5.0 memerlukan Node>=22.19; Node24.x sesuai. Tidak perlu menjadi dependency website.

```bash
npm --cache /tmp/ubg-npm exec --yes --package=lighthouse@13.5.0 -- lighthouse https://ubg.id/id --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path="$UBG_AUDIT_DIR/lighthouse-id"
npm --cache /tmp/ubg-npm exec --yes --package=lighthouse@13.5.0 -- lighthouse https://ubg.id/en --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path="$UBG_AUDIT_DIR/lighthouse-en"
npm --cache /tmp/ubg-npm exec --yes --package=lighthouse@13.5.0 -- lighthouse https://ubg.id/id/kontak --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path="$UBG_AUDIT_DIR/lighthouse-contact"
```

Tambahkan satu URL artikel yang benar-benar terbit. Bila Chrome tidak ditemukan, isi CHROME_PATH. Jangan mematikan sandbox Chrome pada workstation untuk meloloskan alat. Kirim skor, LCP/CLS/TBT dan audit gagal saja. Hasil lab bukan pengukuran lapangan atau bukti aman100%.
