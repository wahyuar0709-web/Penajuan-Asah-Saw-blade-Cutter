# Pengajuan Asah — Saw Blade & Cutter

Form pengajuan **asah alat potong** (saw blade & cutter) untuk operator produksi **PT Rayard Deli Indonesia · Gudang Tools**.
Operator isi form di HP → data + foto langsung tercatat ke Google Spreadsheet gudang, foto disimpan ke Google Drive, dan email notifikasi terkirim ke tim gudang.

Repo ini **tidak punya build step**. Cukup 4 file statis + 1 file Google Apps Script.

```
HP Operator                    Google Apps Script                 Google Workspace
─────────────                  ────────────────────                 ────────────────
index.html  ──POST JSON──▶  PengajuanAsah_Backend.gs  ──▶  Sheet "Pengajuan Asah"
(PWA + offline queue)   ◀──JSON {ticket,row,foto}──    ├──▶  Folder Drive "Foto Pengajuan Asah"
                                                        └──▶  Email notifikasi (MailApp)
```

---

## QR Akses Operator

<p align="center">
  <img src="qr-pengajuan-asah.png" alt="QR akses aplikasi Pengajuan Asah" width="260">
</p>

**URL yang dipakai QR:**

```
https://wahyuar0709-web.github.io/Penajuan-Asah-Saw-blade-Cutter/
```

Operator tinggal scan QR ini dengan kamera HP → form langsung terbuka → **langsung jalan**, tidak perlu install aplikasi, tidak perlu login, tidak perlu setting apa pun. `DEFAULT_API_URL` dan `SHARED_TOKEN` sudah berisi backend yang aktif, jadi begitu halaman terbuka, form sudah siap kirim.

### Kenapa QR ini tidak perlu diganti

QR itu berisi **URL**, bukan isi aplikasi. App ini disajikan lewat **GitHub Pages** di URL tersebut, dan setiap kali ada commit baru, file `index.html` / `sw.js` / `manifest.webmanifest` otomatis tergantikan di URL yang sama.

Artinya: **update kode, update backend, tambah mesin, ubah tampilan — QR yang sudah dicetak dan ditempel di mesin tetap sama dan tetap berlaku.** Tidak perlu cetak ulang, tidak perlu ganti poster.

Kalau ada Service Worker yang sudah terpasang di HP operator, halamannya pun otomatis dapat versi baru.

### Kapan QR perlu diganti

Hanya kalau **URL-nya berubah**:

| Kejadian | Perlu QR baru? |
|---|---|
| Update kode / backend / master alat | ❌ tidak |
| Tambah fitur, ubah tampilan, bug fix | ❌ tidak |
| Ganti domain hosting (mis. pakai domain perusahaan) | ✅ ya |
| Rename repo atau owner di GitHub | ✅ ya |
| Pindah ke hosting lain | ✅ ya |

Kalau salah satu terjadi: edit `URL` di `tools/make-qr.py`, jalankan ulang, commit ulang `qr-pengajuan-asah.png` + `qr-pengajuan-asah.svg`.

```bash
pip install segno
python tools/make-qr.py
```

### Cara cetak & menempel (supaya mudah discan)

- Gunakan file **`qr-pengajuan-asah.svg`** untuk dicetak (vektor, tidak pecah saat diperbesar). PNG 848×848 px juga cukup untuk A5.
- **Ukuran minimum** QR di kertas: **4 cm × 4 cm**. Untuk ditempel di area kerja / pos operator, A5 (15 × 21 cm) paling pas.
- Cetak **hitam di atas putih** dengan kontras penuh. Jangan dibalik (putih di atas hitam).
- QR sudah punya *error correction* level M, jadi masih terbaca walau ada coretan, noda, atau sedikit kusam di bagian tertentu.
- Tambahkan teks singkat di bawah QR, misalnya:

  ```
  ⚠ ALAT POTONG TUMPUL — AJUKAN DI SINI
  1. Scan QR di atas
  2. Pilih mesin → pilih alat → foto alat
  3. Tekan "Ajukan Asah"
  ```

### Kalau HP operator tidak mau kebuka

Halaman ini butuh **HTTPS** (GitHub Pages sudah otomatis) — itu syarat wajib agar Service Worker dan kamera bisa jalan.
Kalau HP diblokir jaringan kantor, operator tetap bisa isi form (antrean offline), tapi **tidak bisa** membuka halaman untuk pertama kali. Pastikan URL GitHub Pages tidak diblokir firewall.

---

## Fitur

| Fitur | Keterangan |
|---|---|
| Form PWA | Satu file HTML, bisa dipasang ke home screen (`manifest.webmanifest`), jalan saat offline |
| Master mesin & alat (live) | Ditarik otomatis dari backend lewat `GET ?action=master`. Kode mesin / alat / stok baru langsung muncul di HP operator — **tanpa edit `index.html`, tanpa install ulang**. Lihat [Master Data Live](#master-data-live) |
| Alat manual | Kalau alat tidak ada di daftar, operator bisa cari dari semua mesin atau isi kode/brand/spec sendiri + jenis bahan (TCT/PCD) → ditandai `[MANUAL]` di sheet |
| Cek foto otomatis | Ditolak kalau **terlalu gelap**, **terlaku silau**, atau **buram** (persentil-99 nilai Laplacian di bawah `BLUR_MIN`) |
| Watermark GPS | Foto diberi cap koordinat + alamat (reverse geocode Nominatim) + arah kompas, gaya "GPS Map Camera" |
| Tiket otomatis | `PA-<tahun>-<4 angka>`, difinalkan server. Tiket kembar dengan isi berbeda → suffix UUID, jadi tidak dianggap duplikat |
| Idempoten | Klik dua kali / retry dengan tiket & isi sama **tidak** membuat baris ganda |
| Antrean offline | Pengajuan saat offline disimpan ke **IndexedDB** (foto sebagai Blob) dan dikirim otomatis saat online, dengan exponential backoff |
| Batas harian | `MAX_PER_HARI` pengajuan + `MAX_FOTO_PER_HARI` foto per hari (semua operator), tercatat di Script Properties |
| Saklar darurat | `jedaPengajuan()` / `lanjutPengajuan()` — tutup/buka penerimaan **tanpa deploy ulang** |
| Anti formula-injection | Semua sel ditulis dengan format `"@"` (teks), jadi isian `=1+1` tidak dieksekusi sebagai formula |
| Email notifikasi | Setiap pengajuan baru → email ke `NOTIFY_EMAIL` + tautan langsung ke baris sheet; email peringatan 1×/hari saat batas harian kena |
| Notifikasi ke Sheet | Dropdown `Status` + header baris 1 dibekukan (proteksi *warning only*) |

---

## Struktur Repo

| File | Fungsi |
|---|---|
| `index.html` | Frontend tunggal: HTML + CSS + JS inline. Berisi master data mesin/alat, validasi form, cek foto, watermark GPS, antrean offline, dan registrasi Service Worker |
| `PengajuanAsah_Backend.gs` | Backend Google Apps Script (`doPost` simpan, `doGet?action=master`, email, storage, setup, saklar darurat) |
| `sw.js` | Service Worker. Cache shell (`index.html`, `manifest`, `icon`) supaya form tetap terbuka offline. **POST tidak pernah di-cache** |
| `manifest.webmanifest` | Metadata PWA (nama, ikon, warna tema) |
| `icon.svg` | Ikon aplikasi (SVG, dipakai sebagai `maskable`) |
| `qr-pengajuan-asah.png` | QR akses operator (848 × 848 px). Cewek untuk dikirim via WhatsApp / ditempel di HP |
| `qr-pengajuan-asah.svg` | QR versi vektor untuk dicetak (tidak pecah saat diperbesar) |
| `tools/make-qr.py` | Generator QR. **Hanya** perlu dijalankan kalau URL hosting berubah |
| `README.md` | Dokumen ini |

> **Penting:** seluruh file di repo ini disajikan lewat **GitHub Pages** di URL
> `https://wahyuar0709-web.github.io/Penajuan-Asah-Saw-blade-Cutter/`.
> GitHub Pages memakai folder `main` sebagai root, dan folder `tools/` ikut
> served tapi tidak dipakai form — tidak masalah. Kalau nanti `tools/` mengganggu,
> pindahkan ke `docs/tools/`.

> Versi saat ini: **frontend v7** — footer form `Versi 7 · 3 Okt 2026`, cache Service Worker `pa-v7`. Backend `v4`.

---

## Struktur Google Spreadsheet

Spreadsheet induk: **Monitoring Saw blade & cutter** (harus di-bind ke script).

### 1. `Pengajuan Asah` (sheet tujuan — dibuat otomatis oleh `setup()`)

Kolom ditulis **berdasarkan nama header**, bukan posisi. Menyisipkan kolom lain tidak akan membuat data masuk ke kolom yang salah. **Nama header jangan diubah.**

| # | Header | Isi | Format |
|---|---|---|---|
| 1 | Timestamp | Waktu server | `yyyy-mm-dd hh:mm:ss` |
| 2 | Tanggal Pengajuan | Tanggal dari form | teks |
| 3 | Nama Pengaju / Operator Produksi | Nama operator | teks |
| 4 | Mesin | `RDS002 — Fourside edge banding` | teks |
| 5 | Pilih Brand/Merk | Brand alat | teks |
| 6 | Pilih Spesifikasi | `PCD · 150 X 42,9/80 X 45/70_L` | teks |
| 7 | QTY | 1–999 | angka |
| 8 | Kondisi | Tumpul / Gompal / Patah / Aus / Gundul / Lainnya | teks |
| 9 | Aktual Pemakaian (di mesin) | Dikosongkan form, diisi manual gudang | teks |
| 10 | Catatan | Kode unik alat + keterangan kerusakan | teks |
| 11 | No. Tiket | `PA-2026-1234` | teks |
| 12 | Foto | URL file Drive | teks |
| 13 | Status | Dropdown: BARU, DIVERIFIKASI, DIKIRIM VENDOR, SELESAI, DITOLAK | teks |
| 14 | Kode Alat | Kode alat, atau `[MANUAL] <kode>` | teks |
| 15 | Kode Mesin | `RDS002` | teks |

### 2. `Master Tools` (wajib)

Header yang **wajib ada**: kolom yang diawali `kode alat`.
Opsional: `nama alat`, `brand`, `specification`, **`jenis bahan`** (atau `bahan`).

Kolom bahan dipakai untuk badge **TCT / PCD** di form. Kalau kolomnya tidak ada, frontend memakai nilai TCT/PCD yang sudah tertanam di `index.html` sebagai cadangan — jadi kolom ini belum wajib, tapi sangat disarankan diisi supaya alat baru juga punya badge.

### 3. `Mapping Alat Mesin` (wajib)

Header **wajib**: `kode alat` dan `kode mesin`.
Opsional: `nama alat`, `spesifikasi`, `mesin`.

Baris dengan `kode mesin` **tidak** berbentuk `RDSnnn` (mis. `BELUM DISET`) diabaikan. `nama alat`/kolom `mesin` dipakai untuk menentukan **nama tampilan** mesin (nama yang paling sering muncul).

### 4. `Stock Status` (opsional)

Kolom yang dibaca: `kode alat`, `siap pakai`, `menunggu diasah`, `status kondisi`.
Kalau sheet/kolom ini tidak ada, backend tetap jalan dan mengembalikan `warnings` (tidak error).

---

## Deployment

### A. Backend (Apps Script) — wajib diulang setiap kode berubah

1. Buka spreadsheet **Monitoring Saw blade & cutter** → `Extensions` → `Apps Script`.
2. Hapus isi editor, tempel seluruh isi `PengajuanAsah_Backend.gs`.
3. Isi `NOTIFY_EMAIL` (baris 47) dengan email gudang. Boleh beberapa, pisah koma. Kosongkan saja kalau notifikasi email tidak dipakai.
4. Jalankan `setup()` **sekali** → `Run` → pilih akun → izinkan. Yang dibuat:
   - sheet `Pengajuan Asah` + header + dropdown Status,
   - proteksi baris header (warning only),
   - folder Drive `Foto Pengajuan Asah`.
5. Jalankan `selfTest()` sekali untuk memastikan master terbaca. Log harus sesuatu seperti:
   `12 mesin, 40 alat, 8123 bytes` — kalau ada `PERINGATAN`, perbaiki sheetnya.
6. Jalankan `ujiFormula()` sekali. Harus keluar **LULUS**. Baris uji dihapus otomatis.
7. `Deploy` → `New deployment` → tipe **Web app** → `Execute as: Me` → `Who has access: Anyone` → `Deploy`.
8. Salin **URL Web App** (`https://script.google.com/macros/s/AKfy…/exec`). Ini yang dipakai form.

> **Penting:** URL Apps Script **tidak** otomatis memakai kode baru. Setiap kali kode `.gs` diubah → `Deploy` → `Manage deployments` → pensil → `Version: New version`. Kalau lupa, form diam-diam masih memakai kode lama.

### B. Frontend

Semua file statis bisa di-host di mana saja (GitHub Pages, Netlify, shared folder internal, atau Web App lain).

1. Salin `index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg` ke lokasi hosting.
2. Buka `index.html` di editor teks, sesuaikan 2 baris di dalam `<script>`:

   ```js
   var DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfy…/exec'; // URL Web App dari langkah A8
   var SHARED_TOKEN   = '…';  // HARUS SAMA dengan SHARED_TOKEN di PengajuanAsah_Backend.gs
   ```

3. Naikkan versi di **tiga** tempat sekaligus supaya operator tidak memakai halaman lama:
   - `sw.js` baris 2: `var V = 'pa-v6'` → `'pa-v7'`
   - `index.html` baris 415: `Versi 6 · 30 Sep 2026` → `Versi 7 · <tanggal>`
   - `index.html` `var DATA = {…}` (baris 470) **hanya perlu** kalau master berubah DAN kamu mau data bawaan offline ikut diperbarui. Master yang dipakai form tetap datang dari backend — lihat [Master Data Live](#master-data-live).
4. Upload. Halaman otomatis reload sekali saat Service Worker versi baru aktif — **kecuali** operator sedang memegang foto yang belum dikirim (reload ditunda).

### C. Di perangkat operator

Buka URL → pasang ke home screen (Chrome Android: `⋮` → `Add to Home screen`).
Kalau backend-nya ganti URL, buka `⚙` di pojok kanan bawah → tempel URL baru → `Simpan` (disimpan di `localStorage`, cukup sekali per perangkat).

---

## Konfigurasi

### `PengajuanAsah_Backend.gs`

| Konstanta | Default | Fungsi |
|---|---|---|
| `SHARED_TOKEN` | — | Token penyaring, harus sama dengan `index.html` |
| `NOTIFY_EMAIL` | `''` | Email tujuan notifikasi (kosong = matikan email) |
| `MAX_PER_HARI` | `20` | Maks pengajuan per hari, semua operator |
| `MAX_FOTO_PER_HARI` | `10` | Maks foto tersimpan per hari |
| `FOTO_AKSES` | `LINK` | `LINK` = semua orang bertautan bisa lihat; `PRIVATE` = hanya pemilik script |
| `TZ` | `Asia/Jakarta` | Zona waktu untuk batas harian |
| `SHEET_NAME` | `Pengajuan Asah` | Sheet tujuan |
| `MAPPING_SHEET` | `Mapping Alat Mesin` | Master mesin → alat |
| `MASTER_SHEET` | `Master Tools` | Master alat |
| `STOCK_SHEET` | `Stock Status` | Master stok (opsional) |
| `FOTO_FOLDER_NAME` | `Foto Pengajuan Asah` | Folder Drive |

### `index.html`

| Konstanta | Fungsi |
|---|---|
| `DEFAULT_API_URL` | URL Web App Apps Script |
| `SHARED_TOKEN` | Token penyaring |
| `BLUR_MIN` / `GELAP_MAX` / `TERANG_MIN` | Ambang cek foto: tajam ≥ 28, rerata terang 45–235. Turkan `BLUR_MIN` kalau terlalu sering ditolak, naikkan kalau foto buram lolos |
| `maxW = 800` (di `decodeFoto`) | Lebar maksimum foto sebelum di-watermark & dikompres (JPEG 0.65) |

### Fungsi yang bisa dijalankan manual dari editor Apps Script

| Fungsi | Kapan dipakai |
|---|---|
| `setup()` | Sekali setelah kode dipasang / dipindah spreadsheet |
| `selfTest()` | Cek master terbaca + lihat `warnings` |
| `ujiFormula()` | Sekali, memastikan anti formula-injection bekerja |
| `jedaPengajuan()` | **Saklar darurat** — semua pengajuan ditolak dengan kode `PAUSED` |
| `lanjutPengajuan()` | Buka lagi penerimaan |

---

## Kontrak API

`POST` ke URL Web App, `Content-Type` tidak wajib.

```json
{
  "uid": "mf3k2j1a9x",
  "ticket": "PA-2026-1234",
  "tanggalPengajuan": "Sabtu, 3 Okt 2026",
  "namaPengaju": "Budi",
  "mesin": "RDS002 — Fourside edge banding",
  "kodeMesin": "RDS002",
  "kodeAlat": "Leu-CT-01",
  "manual": false,
  "brand": "Leuco",
  "spesifikasi": "PCD · 150 X 42,9/80 X 45/70_L",
  "bahan": "PCD",
  "qty": 2,
  "kondisi": "Tumpul",
  "catatan": "4521-0387, gigi patah 2 buah",
  "foto": "<base64 JPEG, maks 1.5 MB>",
  "token": "…"
}
```

Respons:

```json
{ "ok": true,  "ticket": "PA-2026-1234", "row": 42, "foto": "https://drive.google.com/…", "fotoError": "" }
{ "ok": true,  "duplicate": true, "ticket": "PA-2026-1234", "row": 42 }
{ "ok": false, "code": "LIMIT", "error": "Batas pengajuan harian (20) tercapai. …" }
```

| `code` | Arti | Sikap operator |
|---|---|---|
| `UNAUTHORIZED` | Token tidak cocok | Halaman perlu diperbarui / cek `SHARED_TOKEN` |
| `INVALID` | Validasi gagal (nama/mesin/qty/kondisi/foto) | Perbaiki isian |
| `LIMIT` | Batas harian kena | Menunggu besok / hubungi gudang |
| `PAUSED` | Sedang dijeda (`jedaPengajuan()`) | Hubungi gudang |
| `BUSY` | Lock 20 detik tidak didapat | Otomatis coba lagi |
| `SERVER` | Error lain di server | Lihat `Execution log` Apps Script |

`GET ?action=master&token=…` mengembalikan `{ machines, allTools, warnings, generatedAt }` (di-cache 5 menit) dan **dipakai langsung oleh form** — lihat [Master Data Live](#master-data-live). Field `siap`, `menunggu`, `status` ikut terkirim, tapi belum ditampilkan di picker (disiapkan untuk stockedisplay nanti).

---

## Catatan Keamanan

- **`SHARED_TOKEN` bukan enkripsi.** Sengaja ikut tertanam di `index.html` supaya operator cukup scan QR, bukan mengetik. Proteksi sesungguhnya: validasi server, sanitasi, batas harian, notifikasi email, dan saklar darurat.
- **Sanitasi input.** Semua teks dibersihkan dari karakter kontrol dan dipotong sesuai panjang maksimum; `qty` harus bulat 1–999; `kondisi` harus dari daftar; base64 foto harus cocok pola dan JPEG asli dicek dari magic byte `FF D8`.
- **Anti formula-injection.** Baris ditulis dengan format `@`, jadi `=1+1` tersimpan sebagai teks. Diuji oleh `ujiFormula()`.
- **Kuota akun.** Apps Script punya kuota harian (runtime, jumlah sel yang ditulis, jumlah file Drive). Untuk volume besar, pertimbangkan akun Google Workspace khusus.
- **Izin Drive.** `setup()` meminta izin Drive penuh pada akun pemilik script. Jalankan dari **akun khusus gudang**, bukan akun pribadi.
- **Kalau disalahgunakan:** `jedaPengajuan()` → ganti `SHARED_TOKEN` di `.gs` **dan** `index.html` → deploy versi baru → `lanjutPengajuan()`.

---

## Keterbatasan yang Perlu Diketahui

- `var DATA` di `index.html` sekarang hanya **fallback** untuk kunjungan offline pertama. Master yang tampil di form datang dari backend. Kalau master backend berubah tapi `var DATA` belum diperbarui, operator yang online tetap langsung dapat data baru — operator offline masih melihat data lama sampai satu kali berhasil sinkron.
- Batas harian memakai Script Properties per **script**, jadi semua operator berbagi kuota yang sama.
- `LIMIT`/`PAUSED`/`INVALID`/`UNAUTHORIZED` **tidak** diantre ulang (percuma) — operator langsung diberi tahu.
- Kegagalan jaringan (timeout 25 detik, HTTP error) **ditantre** otomatis dengan backoff 5 detik → 120 detik.
- Email notifikasi memakai `MailApp` (terbatas kuota harian, sekitar 100 email/hari per akun).
- Service Worker memakai strategi *network-first* untuk halaman dan *cache-first* untuk font. Semua cache lama dihapus saat versi naik.

---

## Master Data Live

Kode mesin, kode alat, brand, spesifikasi, dan jenis bahan **tidak perlu ditulis manual** di `index.html` lagi. Form menariknya sendiri dari backend.

```
Spreadsheet "Mapping Alat Mesin" / "Master Tools" / "Stock Status"
        ↓  (backend baca tiap 5 menit, di-cache)
GET ?action=master&token=…
        ↓  (form tarik saat dibuka / online / kembali ke layar / tiap 4 menit)
dropdown Mesin & Alat di HP operator
```

### Alur kerja sehari-hari

1. Gudang menambah kode mesin atau alat baru di sheet.
2. Tunggu maks 5 menit (cache backend) atau paksa dengan `selfTest()` di Apps Script.
3. Di HP operator: buka / kembalikan ke layar → daftar mesin & alat sudah baru.

**Tidak ada yang perlu di-install ulang, tidak ada cache yang perlu dihapus di HP operator.**

### Urutan sumber data

Form selalu memakai sumber terbaru yang tersedia:

| Prioritas | Sumber | Kapan dipakai |
|---|---|---|
| 1 | **Server** (`?action=master`) | Online — ini yang dipakai |
| 2 | **Cache HP** (`localStorage`, key `pa_master`) | Offline, atau server gagal |
| 3 | **Data bawaan** (`var DATA` di `index.html`) | Kunjungan offline pertama, sebelum cache pernah dibuat |

Alasannya ada tiga: form harus **terbuka dan terisi penuh saat offline** (operator di lantai pabrik sering tanpa sinyal), dan|halaman pertama tidak boleh nunggu jaringan dulu.

Kalau semuanya gagal, operator tetap bisa isi form lewat jalur **alat manual** (`+ Lainnya`), dan pengajuan tetap terkirim nanti saat online.

### Kapan sinkron berjalan

| Pemicu | Kapan |
|---|---|
| Halaman dibuka | Sekali saat load |
| `online` | Begitu koneksi kembali |
| `visibilitychange` | Begitu operator kembali ke layar (app dibiarkan terbuka sem.shift) |
| Timer | Tiap 4 menit selama layar menyala |
| `⚙` → `Simpan` | Setelah ganti URL backend, master langsung ditarik ulang |

Bisa diubah lewat `MASTER_REFRESH_MS` di `index.html`.

### Form yang sedang diisi tidak akan kacau

Kalau operator sudah mulai mengisi (sudah pilih mesin, isi nama, atau pegang foto), data baru **tidak langsung diterapkan** — isiannya tidak boleh hilang di tengah jalan. Master baru tetap **disimpan ke cache**, jadi baru berlaku di opening berikutnya.

Kalau form masih kosong, sinkron diterapkan seketika.

### Indikator di layar

Tepat di bawah baris "Tidak ada koneksi" ada pil kecil yang menunjukkan sumber data:

| Pil | Arti |
|---|---|
| `Data mesin & alat: dari server gudang · 14.32` | Normal. Data paling baru |
| `Data mesin & alat: dari cache HP · 09.15` | Offline / server tidak merespons, pakai cache |
| `Data mesin & alat: data bawaan di aplikasi · belum bisa ditarik dari server` | Kunjungan offline pertama |
| `… · Sheet "Stock Status" tidak ada: stok tidak ditampilkan` | `warnings` dari backend, tampil di pil yang sama |

Kalau ada masalah (kode mesin tidak muncul, daftar tidak berubah), **pil itu jawaban pertamanya** — tekankan screenshot pil tersebut ke teknisi.

### Kalau kode mesin baru tetap tidak muncul

1. Cek `Mapping Alat Mesin`: kolom `Kode Mesin` harus berbentuk `RDSnnn` (mis. `RDS050`). `BELUM DISET` dan sejenisnya **diabaikan**.
2. Cek `Master Tools`: kolom `Kode Alat` wajib ada, dan kode harus sama persis dengan yang di mapping.
3. Jalankan `selfTest()` di Apps Script → baca `Execution log`. Kalau muncul `PERINGATAN`, perbaiki sesuai pesan.
4. `selfTest()` sekaligus membersihkan cache master, jadi dijalankan ulang = paksa tarik data terbaru.

---

## Ringkasan Alur

1. Operator buka form → pilih mesin → pilih alat (atau cari manual) → qty → kondisi → foto (lolos cek jelas/tajam) → centang konfirmasi → tulis kode unik alat.
2. Foto dikompres + diberi watermark GPS/alamat/kompas di HP.
3. Online? kirim langsung. Offline? simpan ke antrean.
4. Server validasi → tulis baris baru di sheet setelah tiket terakhir → simpan foto ke Drive → kirim email ke gudang.
5. Gudang verifikasi, ubah `Status` (BARU → DIVERIFIKASI → DIKIRIM VENDOR → SELESAI / DITOLAK).
6. Kalau gagal kirim, antrean akan mencoba lagi otomatis; yang ditolak permanen ditandai di banner merah di form.

---

## Lisensi / Credit

Dibuat untuk kebutuhan internal Gudang Tools PT Rayard Deli Indonesia.
