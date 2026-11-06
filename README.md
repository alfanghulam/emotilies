# Emotilens

Struktur folder:

    emotilens/
    ├── index.html              # aplikasi (5 halaman, routing #hash)
    ├── assets/css/style.css
    ├── assets/js/app.js
    ├── api/config.php          # koneksi MySQL (ubah user/password di sini)
    ├── api/detections.php      # REST: GET / POST / DELETE
    ├── backend/app.py          # Flask /detect (DeepFace)
    └── database/emotilens.sql  # import ke phpMyAdmin

## Cara menjalankan
1. Salin folder `emotilens` ke `C:\xampp\htdocs\` lalu nyalakan **Apache** dan **MySQL** di XAMPP.
2. Buka phpMyAdmin → tab **Import** → pilih `database/emotilens.sql` → **Go**.
3. Bila MySQL Anda memakai password, ubah `api/config.php`.
4. Backend deteksi (opsional, tanpa ini aplikasi memakai mode demo):
   `cd backend` → `pip install -r requirements.txt` → `python app.py`
5. Buka http://localhost/emotilens/

Alur: kamera → `index.html` mengirim frame ke Flask `/detect` → hasil disimpan ke MySQL lewat `api/detections.php` → Dashboard, Analitik, dan Riwayat membaca dari database yang sama.
