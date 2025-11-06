document.addEventListener('DOMContentLoaded', () => {
    const teaListContainer = document.getElementById('tea-list-container');
    const USER_REACTIONS_KEY = 'teaReactions'; // Kunci Local Storage untuk melacak reaksi per perangkat (DIPERTAHANKAN)

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

    if (teaListContainer) {
        setupRealtimeListener();
    }
    
    // === Helper: Muat Reaksi Pengguna dari Local Storage ===
    function getUserReactions() {
        return JSON.parse(localStorage.getItem(USER_REACTIONS_KEY)) || {};
    }

    // === SETUP REALTIME LISTENERS ===
    function setupRealtimeListener() {
        // Listener untuk perubahan pada data yang disetujui
        // Ini memastikan Tea yang disetujui atau perubahan hitungan Wow/Lame
        // disinkronkan ke SEMUA perangkat publik secara instan.
        supabase
            .channel('public_teas_approved')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: POSTS_TABLE,
                filter: 'status=eq.approved' // Hanya dengarkan perubahan pada Tea yang disetujui
            }, payload => {
                console.log('Approved Tea change received!', payload.eventType);
                // Muat ulang daftar saat ada perubahan
                loadApprovedTeas(); 
            })
            .subscribe();

        // Muat data inisial
        loadApprovedTeas(); 
    }

    // === Logika utama memuat Tea yang Disetujui dari Supabase ===
    async function loadApprovedTeas() {
        teaListContainer.innerHTML = '<p class="subtitle" style="text-align: center;">Memuat Tea yang disetujui...</p>';

        const userReactions = getUserReactions();
        
        const { data, error } = await supabase
            .from(POSTS_TABLE)
            .select('*')
            .eq('status', 'approved') // Hanya ambil yang sudah disetujui
            .order('id', { ascending: false }); // Urutkan dari terbaru

        if (error) {
            console.error('Error fetching approved teas:', error);
            teaListContainer.innerHTML = '<p class="subtitle" style="text-align: center; color: red;">Gagal memuat: ' + error.message + '</p>';
            return;
        }

        renderTeas(data || [], userReactions);
    }

    // === Helper: Render Tea ke DOM ===
    function renderTeas(teas, userReactions) {
        if (teas.length === 0) {
            teaListContainer.innerHTML = '<p class="subtitle" style="text-align: center;">Saat ini belum ada Tea yang disetujui oleh Admin.</p>';
            return;
        }

        teaListContainer.innerHTML = ''; 

        teas.forEach(tea => {
            const hasReacted = userReactions[tea.id];
            
            // Menggunakan properti Supabase: Person, Class, Tea, Wow, Lame, Date
            const teaElement = document.createElement('div');
            teaElement.className = 'tea-item';
            teaElement.innerHTML = `
                <h3>${tea.Person} (${tea.Class || 'Kelas tidak diketahui'})</h3>
                <p class="subtitle">Dipublikasikan: ${new Date(tea.Date).toLocaleDateString()}</p>
                <p class="tea-content">${tea.Tea}</p>
                
                <div class="tea-reactions">
                    <button class="reaction-button wow-btn ${hasReacted ? 'disabled' : ''} ${hasReacted === 'wow' ? 'selected' : ''}" data-id="${tea.id}" data-reaction="wow" ${hasReacted ? 'disabled' : ''}>
                      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ff5d5d"><path d="m296-224-56-56 240-240 240 240-56 56-184-183-184 183Zm0-240-56-56 240-240 240 240-56 56-184-183-184 183Z"/></svg>
                        <span id="wow-count-${tea.id}">${tea.Wow || 0}</span> 
                    </button>
                    <button class="reaction-button lame-btn ${hasReacted ? 'disabled' : ''} ${hasReacted === 'lame' ? 'selected' : ''}" data-id="${tea.id}" data-reaction="lame" ${hasReacted ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5d5dff"><path d="M480-200 240-440l56-56 184 183 184-183 56 56-240 240Zm0-240L240-680l56-56 184 183 184-183 56 56-240 240Z"/></svg>
                        <span id="lame-count-${tea.id}">${tea.Lame || 0}</span> 
                    </button>
                </div>
            `;
            teaListContainer.appendChild(teaElement);
        });

        // Tambahkan event listeners untuk reaksi setelah elemen dirender
        document.querySelectorAll('.reaction-button:not(.disabled)').forEach(button => {
            button.addEventListener('click', handleReaction);
        });
    }


    // === Logika Penanganan Reaksi (Reaksi di Supabase) ===
    async function handleReaction(event) {
        const button = event.currentTarget;
        const id = button.dataset.id;
        const reactionType = button.dataset.reaction; // 'wow' atau 'lame'

        const userReactions = getUserReactions();

        // 1. Verifikasi apakah pengguna sudah bereaksi (check Local Storage)
        if (userReactions[id]) {
            console.log('User already reacted to this tea.');
            return;
        }

        // 2. Tandai bahwa pengguna telah bereaksi di Local Storage pengguna (PENTING untuk sinkronisasi)
        userReactions[id] = reactionType;
        localStorage.setItem(USER_REACTIONS_KEY, JSON.stringify(userReactions));

        // 3. Nonaktifkan semua tombol reaksi untuk Tea ini di UI
        const wowButton = document.querySelector(`.reaction-button[data-id="${id}"][data-reaction="wow"]`);
        const lameButton = document.querySelector(`.reaction-button[data-id="${id}"][data-reaction="lame"]`);
        
        if (wowButton) wowButton.classList.add('disabled');
        if (lameButton) lameButton.classList.add('disabled');
        button.classList.add('selected');

        // 4. Update count secara ATOMIK di Supabase (Menggunakan RPC/Stored Procedure)
        const columnName = reactionType === 'wow' ? 'Wow' : 'Lame'; // Menggunakan nama kolom Supabase
        
        // Catatan: Ini mengasumsikan Anda telah membuat fungsi Stored Procedure (RPC) di Supabase.
        // Tanpa ini, Anda harus menggunakan metode fetch-increment-update yang rentan terhadap race condition.
        const { error } = await supabase
            .rpc('increment_count', { 
                row_id: id,
                column_name: columnName
            });

        if (error) {
            console.error('Error updating reaction count:', error);
            // KEMBALIKAN status Local Storage jika Supabase gagal
            delete userReactions[id];
            localStorage.setItem(USER_REACTIONS_KEY, JSON.stringify(userReactions));
            if (wowButton) wowButton.classList.remove('disabled');
            if (lameButton) lameButton.classList.remove('disabled');
            button.classList.remove('selected');
            window.alert(`Gagal mengirim reaksi: ${error.message}`);
            return;
        } 
        
        // Supabase Realtime akan memperbarui tampilan count secara otomatis.
        console.log('Reaction success, count updated in Supabase.');
    }
});