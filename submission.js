document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tea-submission-form');

    // === Supabase Configuration ===
    const SUPABASE_URL = 'https://wysklyckxqwqaulrsmrt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5c2tseWNreHF3cWF1bHJzbXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTIyNDYsImV4cCI6MjA3Nzk2ODI0Nn0.-z08RHshTeiVSy6sVRwoYaARtpdhqFHJ_yFG1FMU8NM';
    const POSTS_TABLE = 'teas'; // Menggunakan nama tabel Anda

    // Inisialisasi Supabase client
    let supabase;
    try {
        // Asumsi: Supabase script sudah dimuat di index.html
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error("Supabase client failed to initialize:", e);
        return; 
    }


    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault(); // Menghentikan reload halaman

            // 1. Kumpulkan data dari formulir
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Gunakan timestamp sebagai ID sementara. 
            // ASUMSI: Kolom 'id' (BIGINT) telah ditambahkan dan menjadi Primary Key.
            const submissionId = Date.now(); 
            
            // Objek submission untuk Supabase
            // Kolom menggunakan nama yang sesuai dengan skema tabel Anda
            const submission = {
                id: submissionId, // ID unik (ASUMSI kolom ini ada dan merupakan PK)
                Person: data.person_name, 
                Class: data.person_class, 
                Tea: data.the_tea, 
                Date: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
                Wow: 0, 
                Lame: 0, 
                status: 'pending', // ASUMSI kolom 'status' (TEXT) telah ditambahkan
            };

            // 2. Kirim data ke Supabase Insert (menggantikan Local Storage & Web3Forms)
            try {
                const { error } = await supabase
                    .from(POSTS_TABLE)
                    .insert([submission]);

                if (error) {
                    console.error('Supabase Insert Error:', error);
                    // Ganti alert dengan pesan yang lebih informatif
                    window.alert(`Gagal mengirim Tea ke database. Pastikan tabel Anda sudah diubah (id, status).\nError: ${error.message}`);
                } else {
                    window.alert("Tea berhasil dikirim dan menunggu persetujuan!");
                    form.reset(); // Reset formulir HANYA setelah sukses
                }

            } catch (error) {
                console.error('Network or Supabase Error:', error);
                window.alert("Terjadi kesalahan jaringan atau koneksi Supabase. Coba lagi.");
            }
        });
    }
});