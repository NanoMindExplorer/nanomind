https://nanomindexplorer.github.io/nanomind

## 🤯 Mind-Blowing Update (Paket Lengkap)

- **Neural Mesh background** — partikel bergerak saling terhubung seperti jaringan saraf, bereaksi ke kursor. Otomatis nonaktif kalau sistem pengunjung set "reduce motion".
- **Command Palette / Terminal** (klik ikon terminal atau tekan `Ctrl+K`) — ketik perintah seperti `help`, `whoami`, `ls projects`, `open gallery`, `sudo hire me`, `matrix`, atau langsung ketik nama project/caption untuk lompat ke sana. Ada riwayat perintah (↑/↓).
- **GitHub Proof-of-Work** — kartu project otomatis menampilkan bintang GitHub live, dan klik kartu project membuka **Case Study modal** dengan stats live (stars, rilis terbaru, bahasa, terakhir update) langsung dari GitHub API.
- **Progressive Web App (PWA)** — situs bisa di-"Add to Home Screen" di HP/desktop dan tetap bisa dibuka (mode offline shell) berkat service worker.
- **Easter egg** — coba ketik `matrix` di terminal, atau masukkan Konami Code (↑↑↓↓←→←→ B A) di keyboard.

### Catatan teknis
- Semua fitur di atas jalan murni di GitHub Pages (statis), tidak butuh server tambahan.
- Data GitHub stats diambil dari API publik GitHub (tanpa token, rate limit 60 req/jam per IP) — otomatis disembunyikan kalau limit tercapai atau repo tidak publik.
- File baru: `manifest.json`, `sw.js`, folder `icons/` (ikon PWA hasil generate dari logo).

## 🚀 Update Sebelumnya


Website ini sudah di-upgrade dengan fitur-fitur berikut:

- **Galeri lebih kuat** — bisa menampung jauh lebih banyak video short & landscape tanpa jadi berat, karena sekarang tiap video ditampilkan sebagai thumbnail dulu (bukan iframe langsung), dan video baru diputar saat diklik lewat popup (lightbox).
- **Tab filter Gallery**: `All / Landscape / Shorts / Photos` + kolom pencarian caption/tag.
- **Tombol "Load More"** — galeri dimuat bertahap, jadi tetap ringan walau isinya ratusan item.
- **Jenis media baru**: TikTok dan video vertikal (.mp4/.webm) langsung, selain YouTube, YouTube Shorts, Instagram Reels, dan foto.
- Setiap item media sekarang punya field opsional **Thumbnail/Poster URL** dan **Tags** di panel admin (berguna untuk Instagram/TikTok/video karena tidak punya thumbnail otomatis).
- **Navigasi mobile** — sekarang ada menu hamburger untuk pengunjung yang mengakses lewat HP (sebelumnya menu navigasi hanya tampil di desktop).
- **Bug link navigasi diperbaiki** — tombol "Work"/"View My Work" sekarang benar-benar mengarah ke section proyek (sebelumnya ID section tidak cocok dengan link-nya).
- Statistik ringkas (jumlah project/video/foto) di hero section, favicon, meta SEO/Open Graph, loading screen, tombol back-to-top, dan scrollspy (menu aktif otomatis mengikuti scroll).

### Cara pakai field baru di Admin Panel
1. Klik tombol gear (⚙️) di pojok kiri bawah → login pakai GitHub token seperti biasa.
2. Klik **Add Media** → pilih tipe media (termasuk TikTok / Video Portrait baru).
3. Isi **Thumbnail/Poster URL** kalau tipe-nya Instagram/TikTok/Video (supaya preview-nya tidak kosong).
4. Isi **Tags** (pisahkan koma) supaya video lebih mudah ditemukan lewat kolom pencarian.

