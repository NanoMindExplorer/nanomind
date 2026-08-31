#!/usr/bin/env python3
"""Restore db.json from known-good commit and insert the MMPD dispatch."""
import json
import urllib.request

ORIG = "https://raw.githubusercontent.com/NanoMindExplorer/nanomind/4cf818a28551739156945f5dcbaa75d58904b8ef/db.json"

IMGS = {
    "menu": "https://pbs.twimg.com/media/HQ9LKzMaMAADXum.png",
    "install": "https://pbs.twimg.com/media/HQ9LZwtbwAA99ru.png",
    "yt": "https://pbs.twimg.com/media/HQ9RWwcbgAA-5x6.png",
    "tr": "https://pbs.twimg.com/media/HQ9R0zebIAAQQXd.png",
    "sum": "https://pbs.twimg.com/media/HQ9SObeagAAfxZM.png",
    "ret": "https://pbs.twimg.com/media/HQ9So45bcAAuoyt.png",
    "batch": "https://pbs.twimg.com/media/HQ9S93vaIAAOWsZ.png",
    "kara": "https://pbs.twimg.com/media/HQ9TPSCboAABRBx.png",
    "org": "https://pbs.twimg.com/media/HQ9UQXubYAA6WGh.png",
    "sp": "https://pbs.twimg.com/media/HQ9UdtMaEAAa9yj.png",
    "sc": "https://pbs.twimg.com/media/HQ9U0DBbQAE4CTU.png",
    "bonus": "https://pbs.twimg.com/media/HQ9VJGJaQAAVkNJ.png",
}

def P(t): return {"type": "paragraph", "text": t}
def H(t): return {"type": "heading", "text": t}
def I(k, cap, cred): return {"type": "image", "url": IMGS[k], "caption": cap, "credit": cred}
def Q(t, a): return {"type": "quote", "text": t, "attribution": a}
def L(ref, text, url, icon): return {"type": "link", "linkRef": ref, "text": text, "url": url, "icon": icon}

article = {
    "id": "art-mmpd",
    "title": "MMPD: CLI Musik Offline, Lirik Bilingual, dari HP Android",
    "dek": "Satu perintah di Termux, lima mode, dan lirik Jepang-Mandarin-Thai yang langsung jadi Romaji plus terjemahan Indonesia — catatan membangun music-mix-playlist-downloader.",
    "category": "build-log",
    "coverImage": IMGS["menu"],
    "author": "Iman Firmansyah",
    "date": "2026-08-30",
    "readTime": 8,
    "featured": True,
    "tags": ["cli", "python", "android", "termux", "music", "lyrics", "youtube", "spotify"],
    "body": [
        P("Thread aslinya naik 30 Agustus 2026 dari {{link:mqyzxfv8f1mdi9vt11b}}: CLI yang bisa mengunduh musik plus lirik bilingual langsung dari HP Android. Namanya mmpd — music-mix-playlist-downloader — dan semuanya hidup di terminal."),
        P("Ketik `mmpd`, menu interaktif muncul. YouTube, Retrofit, Organizer, Spotify, SoundCloud. Pilih pakai panah, Enter, selesai. Di Android keyboard Termux sudah punya tombol panah di bar, jadi TUI-nya tidak canggung."),
        I("menu", "Menu utama MMPD — lima mode dalam satu CLI interaktif.", "@Deadmouse_jpeg / thread 1/12"),
        Q("Saya bikin CLI yang bisa download musik + lirik bilingual cuma dari HP Android.", "Thread MMPD, 1/12 — 30 Agustus 2026"),
        H("Sumber terbuka, satu baris install"),
        P("Kodenya ada di GitHub: [NanoMindExplorer/music-mix-playlist-downloader](https://github.com/NanoMindExplorer/music-mix-playlist-downloader). Lisensi MIT. Python 3.9–3.14. Dependensi inti: yt-dlp, ffmpeg, rich, syncedlyrics, spotipy, plus mesin romanisasi (pykakasi, pypinyin, korean_romanizer) dan fuzzy matcher rapidfuzz."),
        P("Install di Termux satu baris: `termux-setup-storage`, Python, ffmpeg, git, clone repo, `pip install -U -e .`. Linux dan Windows punya varian yang sama. Setelah itu: `mmpd`. Pakai `mmpd self-update` untuk pembaruan, jangan ulang one-liner clone."),
        I("install", "Satu perintah untuk Termux, Linux, dan Windows PowerShell.", "Thread MMPD, 2/12"),
        H("Mode 1 — YouTube, Mix, atau ketik judul"),
        P("Tempel URL video, playlist, atau YouTube Mix — atau ketik judul. Format: MP3 320kbps, FLAC, WAV, atau audio original. Ada deteksi duplikat. Unduhan paralel. Nama file disanitasi lintas platform. Default: `Downloads/YT_Downloader/[NamaPlaylist]/`."),
        I("yt", "Mode YouTube: tempel URL atau ketik judul, pilih format, unduh.", "Thread MMPD, 3/12"),
        H("Fitur yang paling saya pakai: transliterasi"),
        P("Jepang jadi Romaji. Mandarin jadi Pinyin. Kanton jadi Jyutping. Korea pakai Revised Romanization. Deteksi otomatis untuk playlist campur bahasa. Terjemahan Indonesia baris demi baris dengan timestamp karaoke."),
        I("tr", "Transliterasi: Jepang → Romaji, Mandarin → Pinyin, plus terjemahan Indonesia.", "Thread MMPD, 4/12"),
        P("Mesin lirik berlapis: LRCLIB, syncedlyrics/Musixmatch, subtitle YouTube. Hasil ditanam ke tag USLT/SYLT dan file `.lrc`. Muncul di Poweramp, Musicolet, MusicBee, foobar2000."),
        I("sum", "Ringkasan sebelum eksekusi: target, format, lirik, folder simpan.", "Thread MMPD, 5/12"),
        Q("Bagian translate Mandarin, Jepang, sama bikin tulisan bahasa mereka jadi Latin. Lyric asli yang dinyanyikan penyanyinya bisa barengan sama terjemahannya.", "Catatan lanjutan di thread, 30 Agustus 2026"),
        H("Mode 2 — Retrofit koleksi lama"),
        P("Tunjuk folder MP3 lama. MMPD mencari lirik, menyuntik transliterasi plus terjemahan, menanam cover. Backup `.bak` otomatis. File audio tidak diunduh ulang."),
        I("ret", "Mode Retrofit: scan folder, suntik lirik dan cover ke file yang sudah ada.", "Thread MMPD, 6/12"),
        P("Demo thread: YOASOBI (Jepang), JJ Lin (Mandarin), Flukie (Thai) dalam satu putaran. Cuplikan Yoru ni Kakeru: `shizumuyounitoketeyukuyouni / Seolah tenggelam dan meleleh`."),
        I("batch", "Tiga lagu, tiga bahasa, satu putaran Retrofit.", "Thread MMPD, 7/12"),
        I("kara", "Lirik bilingual bertimestamp untuk Yoru ni Kakeru — siap karaoke.", "Thread MMPD, 8/12"),
        H("Mode 3 — Organizer"),
        P("Fuzzy-match `.lrc` ke MP3/FLAC, rename, pindahkan musik ke `Music/` dan lirik ke `Music/Musiclrc/`. Konfirmasi: `y`."),
        I("org", "Organizer: fuzzy-match, rename, pindah folder.", "Thread MMPD, 9/12"),
        H("Mode 4 dan 5 — Spotify dan SoundCloud"),
        P("URL Spotify track/album/playlist dicari padanannya di YouTube. API key gratis mengaktifkan ISRC matching ~99%. SoundCloud memakai pipeline format dan lirik yang sama. Lima sumber, satu alat."),
        I("sp", "Mode Spotify: URL → cari di YouTube → unduh.", "Thread MMPD, 10/12"),
        I("sc", "Mode SoundCloud memakai pipeline yang sama.", "Thread MMPD, 11/12"),
        H("Tanpa menu"),
        P("`mmpd doctor`, `mmpd cache`, `mmpd self-update`, plus mode non-interaktif v4.1: download, retrofit, lyrics, organize --dry-run. Cache SQLite 30 hari. Tulisan file atomik."),
        I("bonus", "Perintah bonus: doctor, cache, self-update. MIT, Python 3.9–3.14.", "Thread MMPD, 12/12"),
        P("Demo Retrofit ~5 menit ada di post susulan thread."),
        L("mqyzxfv8f1mdi9vt11b", "Demo Retrofit di X", "https://x.com/Deadmouse_jpeg/status/2094191049417924660", "fab fa-x"),
        H("Catatan pemakaian"),
        P("MMPD adalah alat teknis. Mengunduh materi yang dilindungi hak cipta tanpa izin, atau menyalahi syarat layanan YouTube / Spotify / SoundCloud, tetap tanggung jawab pemakai. Pakai untuk arsip yang memang boleh disimpan, rekaman sendiri, atau konten berlisensi."),
        H("Pasang, lalu ketik mmpd"),
        L("link1", "GitHub: music-mix-playlist-downloader", "https://github.com/NanoMindExplorer/music-mix-playlist-downloader", "fab fa-github"),
        L("mqyzxfv8f1mdi9vt11b", "Thread lengkap 1/12", "https://x.com/Deadmouse_jpeg/status/2093986773298987289", "fab fa-x"),
        P("Kalau masih butuh lagu offline di 2026, silakan dicoba."),
    ],
}

project = {
    "id": "art-mmpd-project",
    "title": "MMPD — Music Mix Playlist Downloader",
    "description": "CLI interaktif untuk unduh musik dari YouTube, Spotify, dan SoundCloud plus lirik bilingual, transliterasi, dan retrofit koleksi lama. Jalan di Termux, Linux, dan Windows.",
    "image": IMGS["menu"],
    "url": "https://github.com/NanoMindExplorer/music-mix-playlist-downloader",
    "tags": ["CLI", "Python", "Android", "Music"],
    "size": "bento-item",
    "articleId": "art-mmpd",
}

def main():
    with urllib.request.urlopen(ORIG) as r:
        db = json.loads(r.read().decode("utf-8"))
    db["articles"] = [a for a in db.get("articles", []) if a.get("id") != "art-mmpd"]
    db["articles"].insert(0, article)
    for a in db["articles"]:
        a["featured"] = a.get("id") == "art-mmpd"
    db["projects"] = [p for p in db.get("projects", []) if p.get("id") != "art-mmpd-project"]
    db["projects"].insert(0, project)
    with open("db.json", "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("merged art-mmpd into db.json", len(db["articles"]), "articles")

if __name__ == "__main__":
    main()
