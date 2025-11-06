document.addEventListener('DOMContentLoaded', () => {
    // === Supabase Configuration ===
    const SUPABASE_URL = 'https://wysklyckxqwqaulrsmrt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5c2tseWNreHF3cWF1bHJzbXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTIyNDYsImV4cCI6MjA3Nzk2ODI0Nn0.-z08RHshTeiVSy6sVRwoYaARtpdhqFHJ_yFG1FMU8NM';
    const POSTS_TABLE = 'teas';

    let supabase;
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error("Supabase client failed to initialize.");
        return; 
    }

    // === Konfigurasi & Elemen DOM ===
    const loginButton = document.getElementById('login-button');
    const loginArea = document.getElementById('admin-login-area');
    const adminPanel = document.getElementById('admin-panel');
    const panelPendingContainer = document.getElementById('admin-panel-container'); // Container for Pending
    const panelApprovedContainer = document.getElementById('admin-approved-container'); // Container for Approved (for Deletion)
    
    // NOTE: Ganti dengan metode otentikasi yang aman di lingkungan produksi
    const SECRET_PASSWORD = "Skytea2025"; 

    // Variabel untuk menyimpan data lokal yang dimuat
    let pendingTeas = [];
    let approvedTeas = [];

    // Ganti window.confirm dengan fungsi non-blocking sederhana
    window.confirm = (message) => {
        // Untuk lingkungan Canvas/iFrame, gunakan prompt sebagai pengganti konfirmasi
        return window.prompt(message + " (Ketik 'YAKIN' untuk konfirmasi)") === 'YAKIN';
    };


    // === Logika Password Admin ===
    if (loginButton && adminPanel) {
        loginButton.addEventListener('click', () => {
            const password = prompt("Masukkan kata sandi Admin:");
            if (password === SECRET_PASSWORD) {
                console.log("Akses Admin Diberikan!"); 
                loginArea.style.display = 'none';
                adminPanel.style.display = 'block';
                // Mulai listener real-time untuk sinkronisasi
                setupRealtimeListeners(); 
            } else if (password !== null) {
                console.warn("Kata sandi salah!"); 
            }
        });
    }

    // === SETUP REALTIME LISTENERS ===
    function setupRealtimeListeners() {
        // Listener untuk semua perubahan pada tabel 'teas'
        // Ini memastikan kiriman baru (INSERT), persetujuan/tolakan (UPDATE), dan penghapusan (DELETE)
        // disinkronkan ke SEMUA perangkat admin secara instan.
        supabase
            .channel('admin_panel_teas')
            .on('postgres_changes', { event: '*', schema: 'public', table: POSTS_TABLE }, payload => {
                console.log('Realtime change received. Reloading lists.', payload.eventType);
                loadPendingTeas(); 
                loadApprovedTeasForManagement();
            })
            .subscribe();

        // Muat data inisial
        loadPendingTeas(); 
        loadApprovedTeasForManagement();
    }
    
    // === Logika Muat Tea yang Tertunda dari Supabase ===
    async function loadPendingTeas() {
        panelPendingContainer.innerHTML = '<p class="subtitle">Memuat kiriman tertunda...</p>';

        const { data, error } = await supabase
            .from(POSTS_TABLE)
            .select('*')
            .eq('status', 'pending')
            .order('id', { ascending: false });

        if (error) {
            console.error('Error fetching pending teas:', error);
            panelPendingContainer.innerHTML = '<p class="subtitle" style="color: red;">Gagal memuat: ' + error.message + '</p>';
            pendingTeas = [];
            return;
        }

        pendingTeas = data || [];
        renderPendingTeas(pendingTeas);
    }

    // === Logika Muat Tea yang Disetujui (untuk Manajemen) dari Supabase ===
    async function loadApprovedTeasForManagement() {
        panelApprovedContainer.innerHTML = '<p class="subtitle">Memuat Tea yang disetujui...</p>';

        const { data, error } = await supabase
            .from(POSTS_TABLE)
            .select('*')
            .eq('status', 'approved')
            .order('id', { ascending: false });

        if (error) {
            console.error('Error fetching approved teas for management:', error);
            panelApprovedContainer.innerHTML = '<p class="subtitle" style="color: red;">Gagal memuat: ' + error.message + '</p>';
            approvedTeas = [];
            return;
        }

        approvedTeas = data || [];
        renderApprovedTeas(approvedTeas);
    }

    // === Logika Perbarui Status Tea (Approve/Reject) ke Supabase ===
    async function updateTeaStatus(id, newStatus) {
        
        const { error } = await supabase
            .from(POSTS_TABLE)
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error(`Error updating status to ${newStatus} for ID ${id}:`, error);
            window.alert(`Gagal memperbarui status: ${error.message}`);
        } else {
            console.log(`Tea ID ${id} set to ${newStatus}. Realtime will handle refresh.`);
        }
    }

    // === Logika HAPUS PERMANEN Tea dari Supabase ===
    async function deleteTea(id) {
        if (!window.confirm(`Yakin ingin MENGHAPUS Tea ID ${id} secara PERMANEN? Tea akan hilang dari semua halaman. Aksi ini tidak bisa dibatalkan.`)) {
            return;
        }
        
        const { error } = await supabase
            .from(POSTS_TABLE)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting Tea ID ${id}:`, error);
            window.alert(`Gagal menghapus Tea: ${error.message}`);
        } else {
            console.log(`Tea ID ${id} has been permanently deleted. Realtime will handle refresh.`);
        }
    }

    // === Render Tea yang Tertunda ===
    function renderPendingTeas(teas) {
        if (teas.length === 0) {
            panelPendingContainer.innerHTML = '<p class="subtitle" style="text-align: center;">Tidak ada Tea yang menunggu persetujuan.</p>';
            return;
        }

        panelPendingContainer.innerHTML = ''; 
        teas.forEach(tea => {
            const teaElement = document.createElement('div');
            teaElement.className = 'tea-management-item';
            
            teaElement.innerHTML = `
                <h3>${tea.Person} (${tea.Class || 'Kelas tidak diketahui'})</h3>
                <p class="subtitle">Dikirim pada: ${new Date(tea.Date).toLocaleDateString()}</p>
                <textarea class="tea-content" rows="6" style="border: 1px solid rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 15px;" readonly>${tea.Tea}</textarea>
                
                <div class="admin-actions">
                    <button class="admin-button approve-btn" data-id="${tea.id}">Setujui</button>
                    <button class="admin-button reject-btn" data-id="${tea.id}">Tolak/Hapus</button>
                </div>
            `;
            panelPendingContainer.appendChild(teaElement);
        });

        document.querySelectorAll('.approve-btn').forEach(button => {
            button.addEventListener('click', () => updateTeaStatus(button.dataset.id, 'approved'));
        });
        document.querySelectorAll('.reject-btn').forEach(button => {
            button.addEventListener('click', () => deleteTea(button.dataset.id)); // Tolak = Hapus permanen
        });
    }

    // === Render Tea yang Disetujui (untuk Hapus Permanen) ===
    function renderApprovedTeas(teas) {
        if (teas.length === 0) {
            panelApprovedContainer.innerHTML = '<p class="subtitle" style="text-align: center;">Tidak ada Tea yang disetujui saat ini.</p>';
            return;
        }

        panelApprovedContainer.innerHTML = ''; 
        teas.forEach(tea => {
            const teaElement = document.createElement('div');
            teaElement.className = 'tea-management-item';
            
            teaElement.innerHTML = `
                <h3>${tea.Person} (${tea.Class || 'Kelas tidak diketahui'})</h3>
                <p class="subtitle">Dipublikasikan: ${new Date(tea.Date).toLocaleDateString()}</p>
                <p class="subtitle">Wow: ${tea.Wow || 0} | Lame: ${tea.Lame || 0}</p>
                <textarea class="tea-content" rows="6" style="border: 1px solid rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 15px;" readonly>${tea.Tea}</textarea>
                
                <div class="admin-actions">
                    <button class="admin-button delete-btn" data-id="${tea.id}">Hapus Permanen</button>
                </div>
            `;
            panelApprovedContainer.appendChild(teaElement);
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            if (button.closest('#admin-approved-container')) {
                button.addEventListener('click', () => deleteTea(button.dataset.id));
            }
        });
    }

});