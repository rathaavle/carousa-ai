# Dokumen Requirements — Carousa-AI

## Pendahuluan

Carousa-AI adalah sistem produksi konten berbasis AI untuk Instagram carousel. Sistem ini dirancang untuk membantu _faceless creator_, kreator niche estetik, dan kreator pertumbuhan IG dalam memproduksi konten carousel berkualitas tinggi secara cepat dan konsisten.

Sistem menggunakan arsitektur Modular Monolith dengan Multi-LLM Layer: Google Gemini untuk pembuatan teks/narasi, dan Stability AI (SDXL) untuk pembuatan gambar. Platform dibangun sebagai Web App SaaS responsif menggunakan Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, dan Supabase.

---

## Glosarium

- **Carousa-AI**: Nama sistem produksi konten AI untuk Instagram carousel.
- **Carousel**: Serangkaian slide gambar berurutan yang diunggah sebagai satu postingan Instagram.
- **Slide**: Satu unit konten dalam carousel, terdiri dari teks, emosi, scene, prompt, dan gambar.
- **Project**: Satu sesi produksi carousel yang berisi konfigurasi tema, daftar slide, dan metadata terkait.
- **Brand_Profile**: Profil visual merek milik pengguna, mencakup palet warna, pencahayaan, tekstur, gaya karakter, dan status style lock.
- **Style_Lock**: Fitur yang mengunci gaya visual brand agar diterapkan secara konsisten ke semua prompt gambar dalam satu project.
- **Theme**: Tema bulanan yang mendefinisikan mood, warna dasar, dan pencahayaan untuk satu siklus produksi konten.
- **Storyline**: Alur narasi emosional yang dihasilkan AI sebagai fondasi konten carousel.
- **Prompt**: Teks instruksi terstruktur yang dikirim ke AI image generator untuk menghasilkan gambar satu slide.
- **Prompt_Builder**: Komponen sistem yang merakit prompt dari komponen global style, brand style, karakter, scene, emosi, komposisi, dan tipografi.
- **AI_Orchestrator**: Komponen inti yang mengoordinasikan semua operasi AI (teks dan gambar).
- **AIProvider**: Antarmuka abstraksi yang mendefinisikan kontrak untuk semua penyedia AI.
- **GeminiProvider**: Implementasi AIProvider menggunakan Google Gemini untuk pembuatan teks.
- **StabilityProvider**: Implementasi AIProvider menggunakan Stability AI (SDXL) untuk pembuatan gambar.
- **Caption**: Teks deskripsi postingan Instagram yang mencakup narasi, CTA, dan hashtag.
- **CTA**: _Call-to-Action_ — ajakan tindakan yang disertakan dalam caption.
- **Editor**: Antarmuka utama pengguna untuk mengedit teks per slide, melihat pratinjau gambar, dan memicu regenerasi.
- **Dashboard**: Halaman utama yang menampilkan daftar project dan akses cepat ke pembuatan project baru.
- **Export**: Proses mengunduh semua gambar slide dan menyalin caption dari satu project.
- **Regenerasi**: Proses menghasilkan ulang konten (teks atau gambar) untuk satu slide tanpa mengubah slide lain.
- **User**: Pengguna terdaftar yang mengakses Carousa-AI melalui antarmuka web.
- **Supabase**: Platform backend yang menyediakan database PostgreSQL, autentikasi, dan penyimpanan file.
- **Generation_Record**: Catatan log setiap operasi AI yang mencakup tipe, provider, dan status.

---

## Requirements

---

### Requirement 1: Autentikasi Pengguna

**User Story:** Sebagai kreator konten, saya ingin mendaftar dan masuk ke Carousa-AI, agar saya dapat mengakses dan mengelola project carousel saya secara aman.

#### Acceptance Criteria

1. THE Carousa-AI SHALL menyediakan halaman login dan registrasi yang dapat diakses tanpa autentikasi.
2. WHEN pengguna mengirimkan formulir registrasi dengan email dan password yang valid, THE Carousa-AI SHALL membuat akun baru melalui Supabase Auth dan mengarahkan pengguna ke Dashboard.
3. WHEN pengguna mengirimkan formulir login dengan kredensial yang valid, THE Carousa-AI SHALL membuat sesi autentikasi dan mengarahkan pengguna ke Dashboard.
4. IF pengguna mengirimkan kredensial yang tidak valid saat login, THEN THE Carousa-AI SHALL menampilkan pesan kesalahan yang menjelaskan bahwa email atau password tidak sesuai.
5. WHEN pengguna yang tidak terautentikasi mencoba mengakses halaman yang dilindungi, THE Carousa-AI SHALL mengarahkan pengguna ke halaman login.
6. WHEN pengguna mengklik tombol logout, THE Carousa-AI SHALL menghapus sesi autentikasi dan mengarahkan pengguna ke halaman login.
7. THE Carousa-AI SHALL memastikan setiap permintaan ke data project, slide, dan brand profile hanya dapat diproses jika permintaan berasal dari User yang terautentikasi dan memiliki kepemilikan atas data tersebut.

---

### Requirement 2: Manajemen Project

**User Story:** Sebagai kreator konten, saya ingin membuat, melihat, dan mengelola project carousel, agar saya dapat mengorganisasi produksi konten saya berdasarkan tema dan kampanye.

#### Acceptance Criteria

1. THE Dashboard SHALL menampilkan daftar semua project milik User yang sedang login, diurutkan berdasarkan waktu pembaruan terbaru.
2. WHEN User mengklik tombol "Buat Project Baru", THE Carousa-AI SHALL menampilkan formulir pembuatan project yang meminta nama project, tema, dan jumlah slide.
3. WHEN User mengirimkan formulir pembuatan project dengan data yang lengkap dan valid, THE Carousa-AI SHALL menyimpan project baru ke database dan mengarahkan User ke halaman Project.
4. IF User mengirimkan formulir pembuatan project dengan nama project yang kosong, THEN THE Carousa-AI SHALL menampilkan pesan validasi yang meminta User mengisi nama project.
5. WHEN User mengklik project dari daftar di Dashboard, THE Carousa-AI SHALL mengarahkan User ke halaman Project yang sesuai.
6. WHEN User menghapus sebuah project, THE Carousa-AI SHALL menghapus project beserta semua slide dan generation record terkait dari database secara permanen.
7. THE Dashboard SHALL menampilkan informasi ringkas setiap project, mencakup nama project, tema, jumlah slide, dan waktu pembaruan terakhir.

---

### Requirement 3: Konfigurasi Tema Project

**User Story:** Sebagai kreator konten, saya ingin mengatur tema dan mood untuk setiap project, agar AI dapat menghasilkan konten yang selaras dengan identitas visual dan narasi yang saya inginkan.

#### Acceptance Criteria

1. THE Carousa-AI SHALL menyediakan daftar pilihan tema yang mencakup atribut nama, mood, warna dasar, dan pencahayaan.
2. WHEN User memilih tema untuk sebuah project, THE Carousa-AI SHALL menyimpan asosiasi tema tersebut ke project dan menggunakannya sebagai konteks dalam semua operasi AI untuk project tersebut.
3. WHEN User mengubah tema pada project yang sudah memiliki slide, THE Carousa-AI SHALL menampilkan konfirmasi bahwa perubahan tema akan mempengaruhi hasil regenerasi slide berikutnya.
4. THE Carousa-AI SHALL memungkinkan User mengatur jumlah slide dalam satu project dengan nilai minimum 3 dan maksimum 20.
5. IF User memasukkan jumlah slide di luar rentang 3 hingga 20, THEN THE Carousa-AI SHALL menampilkan pesan validasi dan menolak penyimpanan konfigurasi tersebut.

---

### Requirement 4: Pembuatan Storyline oleh AI

**User Story:** Sebagai kreator konten, saya ingin AI menghasilkan alur narasi emosional berdasarkan tema yang saya pilih, agar saya mendapatkan fondasi cerita yang kuat untuk carousel saya tanpa harus menulis dari nol.

#### Acceptance Criteria

1. WHEN User memicu pembuatan storyline pada sebuah project, THE AI_Orchestrator SHALL memanggil GeminiProvider dengan konteks tema, mood, dan jumlah slide yang telah dikonfigurasi.
2. WHEN GeminiProvider berhasil menghasilkan storyline, THE AI_Orchestrator SHALL memecah storyline menjadi segmen-segmen sesuai jumlah slide yang dikonfigurasi dan menyimpan setiap segmen sebagai teks slide.
3. THE AI_Orchestrator SHALL menghasilkan atribut emosi dan deskripsi scene untuk setiap slide sebagai bagian dari proses pembuatan storyline.
4. IF GeminiProvider mengembalikan respons kesalahan saat pembuatan storyline, THEN THE AI_Orchestrator SHALL mencatat kegagalan pada Generation_Record dan menampilkan pesan kesalahan yang dapat dipahami User.
5. WHILE proses pembuatan storyline berlangsung, THE Carousa-AI SHALL menampilkan indikator loading dan menonaktifkan tombol pemicu untuk mencegah permintaan duplikat.
6. WHEN storyline berhasil dibuat, THE Carousa-AI SHALL mengarahkan User ke Editor dan menampilkan semua slide yang telah terisi teks, emosi, dan scene.

---

### Requirement 5: Editor Slide

**User Story:** Sebagai kreator konten, saya ingin mengedit teks setiap slide secara individual dan melihat pratinjau gambar yang dihasilkan, agar saya dapat menyempurnakan konten sebelum dipublikasikan.

#### Acceptance Criteria

1. THE Editor SHALL menampilkan semua slide dalam project secara berurutan, dengan setiap slide menampilkan teks, emosi, scene, dan gambar (jika sudah dihasilkan).
2. WHEN User mengedit teks pada sebuah slide, THE Editor SHALL menyimpan perubahan teks tersebut ke database secara otomatis setelah User berhenti mengetik selama 1 detik.
3. THE Editor SHALL memungkinkan User mengubah atribut emosi dan scene pada setiap slide secara individual.
4. WHEN User mengubah urutan slide menggunakan mekanisme drag-and-drop, THE Editor SHALL memperbarui atribut index semua slide yang terpengaruh dan menyimpan urutan baru ke database.
5. THE Editor SHALL menampilkan nomor urut slide, total jumlah slide, dan status gambar (belum dibuat, sedang diproses, sudah selesai) untuk setiap slide.
6. WHEN User mengklik pratinjau gambar sebuah slide, THE Editor SHALL menampilkan gambar dalam ukuran penuh pada modal overlay.

---

### Requirement 6: Pembuatan Prompt Gambar

**User Story:** Sebagai kreator konten, saya ingin sistem secara otomatis membangun prompt gambar yang terstruktur untuk setiap slide, agar gambar yang dihasilkan konsisten dengan gaya visual brand saya.

#### Acceptance Criteria

1. THE Prompt_Builder SHALL merakit prompt untuk setiap slide menggunakan struktur: `[GLOBAL STYLE] [BRAND STYLE] [CHARACTER] [SCENE] [EMOTION] [COMPOSITION] [TYPOGRAPHY]`.
2. WHERE Style_Lock pada Brand_Profile User bernilai aktif, THE Prompt_Builder SHALL menyertakan semua atribut Brand_Profile (palet warna, pencahayaan, tekstur, gaya karakter) ke dalam setiap prompt yang dihasilkan.
3. WHERE Style_Lock pada Brand_Profile User bernilai tidak aktif, THE Prompt_Builder SHALL merakit prompt hanya menggunakan atribut tema dan data slide tanpa menyertakan Brand_Profile.
4. WHEN Prompt_Builder selesai merakit prompt untuk sebuah slide, THE AI_Orchestrator SHALL menyimpan prompt tersebut ke atribut prompt pada slide yang bersangkutan sebelum mengirimkannya ke StabilityProvider.
5. THE Prompt_Builder SHALL menghasilkan prompt dalam bahasa Inggris untuk memastikan kompatibilitas optimal dengan StabilityProvider.

---

### Requirement 7: Pembuatan Gambar oleh AI

**User Story:** Sebagai kreator konten, saya ingin AI menghasilkan gambar untuk setiap slide berdasarkan prompt yang telah dibangun, agar saya mendapatkan visual berkualitas tinggi yang sesuai dengan narasi dan gaya brand saya.

#### Acceptance Criteria

1. WHEN User memicu pembuatan gambar untuk sebuah project, THE AI_Orchestrator SHALL mengirimkan prompt setiap slide ke StabilityProvider secara berurutan dan menyimpan URL gambar hasil ke atribut image_url pada slide yang bersangkutan.
2. WHEN StabilityProvider berhasil menghasilkan gambar untuk sebuah slide, THE AI_Orchestrator SHALL mengunggah gambar tersebut ke Supabase Storage dan menyimpan URL publik gambar ke database.
3. IF StabilityProvider mengembalikan respons kesalahan untuk sebuah slide, THEN THE AI_Orchestrator SHALL mencatat kegagalan pada Generation_Record untuk slide tersebut dan melanjutkan proses pembuatan gambar untuk slide berikutnya.
4. WHILE proses pembuatan gambar berlangsung, THE Editor SHALL menampilkan indikator progres yang menunjukkan jumlah slide yang telah selesai dibandingkan total slide.
5. THE AI_Orchestrator SHALL mencatat setiap operasi pembuatan gambar ke Generation_Record dengan atribut tipe, provider, dan status (berhasil atau gagal).
6. WHEN semua gambar dalam satu project berhasil dibuat, THE Editor SHALL memperbarui tampilan semua slide untuk menampilkan gambar yang telah dihasilkan.

---

### Requirement 8: Regenerasi Slide Individual

**User Story:** Sebagai kreator konten, saya ingin meregenerasi gambar atau teks untuk satu slide tertentu tanpa mengubah slide lain, agar saya dapat memperbaiki slide yang kurang memuaskan secara efisien.

#### Acceptance Criteria

1. WHEN User mengklik tombol regenerasi pada sebuah slide, THE AI_Orchestrator SHALL mengambil data brand profile, karakter, dan style lock terkini milik User untuk digunakan dalam proses regenerasi.
2. WHEN User memicu regenerasi gambar pada sebuah slide, THE AI_Orchestrator SHALL membangun ulang prompt menggunakan Prompt_Builder dengan data slide dan brand profile terkini, kemudian mengirimkannya ke StabilityProvider.
3. WHEN regenerasi gambar berhasil, THE AI_Orchestrator SHALL mengganti image_url lama pada slide dengan URL gambar baru dan menyimpan perubahan ke database.
4. WHEN User memicu regenerasi teks pada sebuah slide, THE AI_Orchestrator SHALL memanggil GeminiProvider dengan konteks tema project dan posisi slide dalam storyline untuk menghasilkan teks baru.
5. IF proses regenerasi gagal, THEN THE AI_Orchestrator SHALL mempertahankan konten slide yang lama, mencatat kegagalan pada Generation_Record, dan menampilkan pesan kesalahan kepada User.
6. WHILE proses regenerasi berlangsung untuk sebuah slide, THE Editor SHALL menampilkan indikator loading pada slide tersebut dan menonaktifkan tombol regenerasi untuk slide yang sama.

---

### Requirement 9: Sistem Brand Profile

**User Story:** Sebagai kreator konten, saya ingin mengatur dan menyimpan profil visual brand saya, agar semua konten yang dihasilkan AI memiliki identitas visual yang konsisten.

#### Acceptance Criteria

1. THE Carousa-AI SHALL menyediakan halaman pengaturan Brand Profile yang memungkinkan User mengonfigurasi palet warna, pencahayaan, tekstur, dan gaya karakter.
2. WHEN User menyimpan Brand Profile, THE Carousa-AI SHALL menyimpan semua atribut brand ke database dan mengasosiasikannya dengan akun User.
3. THE Carousa-AI SHALL memungkinkan User mengaktifkan atau menonaktifkan Style_Lock melalui toggle pada halaman Brand Profile.
4. WHEN User mengaktifkan Style_Lock, THE Carousa-AI SHALL menampilkan konfirmasi bahwa semua prompt gambar berikutnya akan menyertakan gaya brand secara otomatis.
5. THE Carousa-AI SHALL memungkinkan User memiliki tepat satu Brand Profile aktif per akun.
6. WHEN User memperbarui Brand Profile saat Style_Lock aktif, THE Carousa-AI SHALL menggunakan Brand Profile yang diperbarui untuk semua operasi pembuatan dan regenerasi gambar berikutnya.

---

### Requirement 10: Generator Caption

**User Story:** Sebagai kreator konten, saya ingin AI menghasilkan caption Instagram yang siap pakai berdasarkan konten carousel saya, agar saya dapat memposting konten dengan cepat tanpa harus menulis caption dari nol.

#### Acceptance Criteria

1. WHEN User memicu pembuatan caption pada sebuah project, THE AI_Orchestrator SHALL mengirimkan ringkasan semua teks slide dalam project tersebut ke GeminiProvider sebagai konteks.
2. WHEN GeminiProvider berhasil menghasilkan caption, THE AI_Orchestrator SHALL mengembalikan caption yang mencakup narasi utama, CTA, dan minimal 10 hashtag yang relevan.
3. THE Carousa-AI SHALL menampilkan caption yang dihasilkan dalam area teks yang dapat diedit oleh User sebelum disalin.
4. WHEN User mengklik tombol salin caption, THE Carousa-AI SHALL menyalin seluruh teks caption ke clipboard perangkat User dan menampilkan konfirmasi visual bahwa penyalinan berhasil.
5. IF GeminiProvider gagal menghasilkan caption, THEN THE Carousa-AI SHALL menampilkan pesan kesalahan dan memungkinkan User mencoba kembali tanpa kehilangan data slide.

---

### Requirement 11: Ekspor Konten

**User Story:** Sebagai kreator konten, saya ingin mengunduh semua gambar slide dari sebuah project sekaligus, agar saya dapat mengunggahnya ke Instagram dengan mudah.

#### Acceptance Criteria

1. WHEN User mengklik tombol ekspor pada sebuah project, THE Carousa-AI SHALL mengunduh semua gambar slide yang telah dihasilkan sebagai file ZIP yang berisi gambar-gambar dengan nama file berurutan sesuai nomor slide.
2. THE Carousa-AI SHALL memastikan file ZIP yang diunduh berisi gambar dalam format yang kompatibel dengan Instagram (JPEG atau PNG).
3. IF sebuah project memiliki slide yang belum memiliki gambar saat ekspor dipicu, THEN THE Carousa-AI SHALL menampilkan peringatan yang menyebutkan jumlah slide tanpa gambar dan meminta konfirmasi User sebelum melanjutkan ekspor.
4. WHILE proses pembuatan file ZIP berlangsung, THE Carousa-AI SHALL menampilkan indikator progres dan menonaktifkan tombol ekspor untuk mencegah permintaan duplikat.

---

### Requirement 12: Abstraksi dan Orkestrasi AI

**User Story:** Sebagai pengembang sistem, saya ingin semua operasi AI dikelola melalui lapisan abstraksi terpusat, agar sistem dapat beralih atau menambahkan penyedia AI baru tanpa mengubah logika bisnis inti.

#### Acceptance Criteria

1. THE AI_Orchestrator SHALL mengakses semua penyedia AI hanya melalui antarmuka AIProvider yang mendefinisikan metode `generateText` dan `generateImage`.
2. THE GeminiProvider SHALL mengimplementasikan antarmuka AIProvider dan menangani semua komunikasi dengan Google Gemini API untuk operasi pembuatan teks.
3. THE StabilityProvider SHALL mengimplementasikan antarmuka AIProvider dan menangani semua komunikasi dengan Stability AI API untuk operasi pembuatan gambar.
4. IF GeminiProvider mengembalikan kesalahan yang tidak dapat dipulihkan, THEN THE AI_Orchestrator SHALL mencatat detail kesalahan pada Generation_Record dan mengembalikan respons kesalahan yang terstruktur kepada lapisan yang memanggilnya.
5. THE AI_Orchestrator SHALL menyediakan metode `generateStory()`, `generateSlides()`, `generatePrompt()`, dan `generateImage()` sebagai antarmuka publik untuk semua modul yang membutuhkan layanan AI.
6. THE Carousa-AI SHALL menyimpan API key untuk GeminiProvider dan StabilityProvider sebagai variabel lingkungan dan tidak pernah mengeksposnya ke sisi klien.

---

### Requirement 13: Pencatatan Operasi AI

**User Story:** Sebagai pengembang sistem, saya ingin setiap operasi AI dicatat secara sistematis, agar saya dapat memantau penggunaan, mendiagnosis kegagalan, dan menganalisis performa sistem.

#### Acceptance Criteria

1. THE AI_Orchestrator SHALL membuat Generation_Record baru sebelum memulai setiap operasi AI, dengan status awal "sedang diproses".
2. WHEN sebuah operasi AI berhasil diselesaikan, THE AI_Orchestrator SHALL memperbarui Generation_Record terkait dengan status "berhasil" dan menyimpan metadata respons.
3. WHEN sebuah operasi AI gagal, THE AI_Orchestrator SHALL memperbarui Generation_Record terkait dengan status "gagal" dan menyimpan pesan kesalahan dari penyedia AI.
4. THE Generation_Record SHALL selalu mencakup atribut: id, project_id, tipe operasi, nama provider, dan status.

---

### Requirement 14: Antarmuka Responsif

**User Story:** Sebagai kreator konten, saya ingin mengakses Carousa-AI dari perangkat desktop maupun tablet, agar saya dapat bekerja secara fleksibel dari berbagai perangkat.

#### Acceptance Criteria

1. THE Carousa-AI SHALL menampilkan antarmuka yang dapat digunakan dengan baik pada lebar layar minimal 768 piksel (tablet) hingga 1920 piksel (desktop).
2. THE Editor SHALL menyesuaikan tata letak panel slide dan panel pratinjau secara otomatis berdasarkan lebar layar yang tersedia.
3. THE Dashboard SHALL menampilkan daftar project dalam tata letak grid yang menyesuaikan jumlah kolom berdasarkan lebar layar.
4. THE Carousa-AI SHALL memastikan semua elemen interaktif (tombol, input, toggle) memiliki ukuran target sentuh minimal 44x44 piksel untuk mendukung penggunaan pada perangkat layar sentuh.
