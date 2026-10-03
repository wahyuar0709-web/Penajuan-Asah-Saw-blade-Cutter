"""
Buat QR akses operator untuk aplikasi Pengajuan Asah.

Kapan perlu dijalankan:
  - HANYA kalau URL tujuan berubah (mis. repo di-rename, atau hosting dipindah
    dari GitHub Pages ke domain sendiri). During update kode biasa (index.html,
    sw.js, backend) TIDAK perlu regenerate QR karena URL-nya tetap sama.

Kebutuhan:
  pip install segno
  (opsional, hanya untuk verifikasi decode)  pip install opencv-python-headless

Pakai:
  python tools/make-qr.py
"""

import os
import sys

import segno

# URL INI yang jadi isi QR. Tetap selama repo tidak di-rename dan hosting
# tidak pindah. Semua update kode terjadi di dalam URL yang sama, jadi QR
# yang sudah dicetak tetap valid selamanya.
URL = "https://wahyuar0709-web.github.io/Penajuan-Asah-Saw-blade-Cutter/"

SCALE = 16    # piksel per modul — besar, tetap tajam saat dicetak A5/A4
BORDER = 4    # quiet zone, wajib minimal 4 modul
DARK = "#000000"
LIGHT = "#FFFFFF"

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    qr = segno.make(URL, error="m", micro=False)
    size = qr.symbol_size()[0]
    total = (size + BORDER * 2) * SCALE
    print("URL   :", URL)
    print("QR    : versi %d, matriks %dx%d, error correction M" % (qr.version, size, size))
    print("Output: %dx%d px" % (total, total))

    png = os.path.join(REPO, "qr-pengajuan-asah.png")
    svg = os.path.join(REPO, "qr-pengajuan-asah.svg")
    qr.save(png, scale=SCALE, border=BORDER, dark=DARK, light=LIGHT)
    qr.save(svg, scale=SCALE, border=BORDER, dark=DARK, light=LIGHT)
    print("Tulis :", png)
    print("Tulis :", svg)
    print("Selesai. Commit kedua file ini kalau URL berubah.")


if __name__ == "__main__":
    sys.exit(main())