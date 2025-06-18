import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    serverTimestamp,
    getDocs,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import {
    getDatabase,
    ref,
    remove,
    onValue,
    get
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBcGAlRNxn1oJ5SpQb179EdzXXW4tYpHrs",
    authDomain: "nextstep-123.firebaseapp.com",
    databaseURL: "https://nextstep-123-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "nextstep-123",
    storageBucket: "nextstep-123.appspot.com",
    messagingSenderId: "427076545876",
    appId: "1:427076545876:web:e588a15084e83343482cc1",
    measurementId: "G-6S22DPGVP3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

const internshipContainer = document.getElementById("internshipCards");
const internshipsRef = ref(rtdb, "internships");

let likedInternshipIds = new Set(); // ✅ store liked IDs
let isAdmin = false;
let allInternshipsData = [];
let currentUserId = null;
let currentUserEmail = null;

function displayInternships(internshipList) {
    internshipContainer.innerHTML = "";
    if (!internshipList || internshipList.length === 0) {
        internshipContainer.innerHTML = "<p>No internships to display.</p>";
        return;
    }
    internshipList.forEach(data => {
        const card = createInternshipCard(data);
        internshipContainer.appendChild(card);
    });
}

// 🔄 Listen to internships and likes after auth
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const profileSection = document.getElementById('profileSection');
    const profileName = document.getElementById('profileName');
    const sidebarProfileName = document.getElementById('sidebarProfileName');
    const sidebarProfileSchool = document.getElementById('sidebarProfileSchool');
    const sidebarProfileMajor = document.getElementById('sidebarProfileMajor');

     // Reset status admin di awal setiap kali auth state berubah
    isAdmin = false; // Penting: Atur ulang setiap kali

    if (user) {
        currentUserId = user.uid;
        currentUserEmail = user.email;

        // Sembunyikan tombol login dan tampilkan profil secara default jika ada user (baik siswa/admin)
        if (loginBtn) loginBtn.style.display = "none";
        if (profileSection) profileSection.style.display = "flex"; // Pastikan ini 'flex' sesuai CSS

        try {
            // === Ambil data pengguna biasa (seperti sebelumnya) ===
            // Ini tetap dibutuhkan untuk mengisi data profil sidebar untuk siswa
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (profileName) profileName.textContent = userData.name || "User";
                if (sidebarProfileName) sidebarProfileName.textContent = userData.name || "User";
                if (sidebarProfileSchool) sidebarProfileSchool.textContent = userData.school || "Unknown School";
                if (sidebarProfileMajor) sidebarProfileMajor.textContent = userData.major || "Unknown Major";
                localStorage.setItem('userRole', userData.role || 'student'); // Simpan role, default 'student'
            } else {
                if (profileName) profileName.textContent = "User";
                 localStorage.setItem('userRole', 'student'); // Default 'student' jika user doc tidak ada
            }

            // === **TAMBAHAN:** Periksa apakah pengguna juga seorang admin ===
            const adminDocRef = doc(db, "admins", user.uid);
            const adminDocSnap = await getDoc(adminDocRef);

            if (adminDocSnap.exists()) {
                console.log("User is also verified as an admin.");
                isAdmin = true; // **SET STATUS ADMIN JADI TRUE**
                localStorage.setItem('userRole', 'admin'); // Simpan role admin
                if (profileName) profileName.textContent = "Admin"; // Ganti nama profil menjadi Admin jika admin
                // Anda bisa menambah logika UI khusus admin di sini jika perlu
            } else {
                 isAdmin = false; // Pastikan status admin false jika tidak ditemukan
                 console.log("Authenticated user is not an admin.");
            }


            // === Ambil data liked internships (untuk siswa/user biasa) ===
            // Logika ini tetap berjalan karena halaman ini bisa diakses siswa
            // Admin akan memiliki likedInternshipIds kosong jika tidak ada docnya
            const likedDocRef = doc(db, "likedInternships", user.uid);
            const likedSnap = await getDoc(likedDocRef);

             likedInternshipIds.clear(); // Bersihkan Set sebelum mengisi
            if (likedSnap.exists()) {
                const data = likedSnap.data();
                (data.internshipIds || []).forEach(id => likedInternshipIds.add(id));
            }


            // === Muat magang ===
            // loadInternships() akan dipanggil di sini, dan fungsi createInternshipCard di dalamnya
            // akan menggunakan variabel global 'isAdmin' untuk menampilkan/menyembunyikan tombol delete
            // dan menyesuaikan perilaku modal/like.
            loadInternships(); // Pastikan ini dipanggil setelah cek admin selesai


        } catch (error) {
            console.error("Error in Auth State Listener:", error);
             // Jika ada error saat mengambil data user/admin,
             // perlakukan sebagai non-admin dan muat magang publik
             isAdmin = false;
             currentUserId = user.uid; // Tetap set UID jika autentikasi berhasil
             currentUserEmail = user.email;
             likedInternshipIds.clear(); // Kosongkan Set jika error ambil data like
             if (profileName) profileName.textContent = "User"; // Default text
             // Asumsikan sidebar tidak terisi jika ada error
             // Asumsikan role tidak dapat ditentukan jika ada error
             localStorage.setItem('userRole', 'unknown'); // Status error atau tidak diketahui

             if (loginBtn) loginBtn.style.display = "none"; // Tetap sembunyikan jika terautentikasi
             if (profileSection) profileSection.style.display = "flex"; // Tetap tampilkan profil dasar

            loadInternships(); // Tetap muat magang
        } finally {
            document.body.classList.add('loaded'); // Sembunyikan loader setelah semua proses selesai
        }
    } else {
        // Tidak ada pengguna yang terautentikasi sama sekali
        currentUserId = null;
        currentUserEmail = null;
        likedInternshipIds.clear(); // Kosongkan Set
        isAdmin = false; // Pastikan status admin false jika tidak ada user
        localStorage.removeItem('userRole'); // Hapus role jika logout

        // Tampilkan tombol login dan sembunyikan profil jika tidak ada user
        if (loginBtn) loginBtn.style.display = "block";
        if (profileSection) profileSection.style.display = "none";
        // Kosongkan sidebar jika tidak ada user
         if (sidebarProfileName) sidebarProfileName.textContent = "";
         if (sidebarProfileSchool) sidebarProfileSchool.textContent = "";
         if (sidebarProfileMajor) sidebarProfileMajor.textContent = "";


        // Muat magang untuk pengguna anonim (tanpa info like/apply/admin)
        loadInternships();

        document.body.classList.add('loaded'); // Sembunyikan loader
    }
});


document.getElementById('homeLogo')?.addEventListener('click', function(e) {
  e.preventDefault();
  
  const userRole = localStorage.getItem('userRole');
  
  if (userRole === 'student') {
    window.location.href = 'student-dashboard.html';
  } 
  else if (userRole === 'provider') {
    window.location.href = 'provider-dashboard.html';
  }
  else if (userRole === 'admin') {
    window.location.href = 'admin-dashboard.html';
  }
  else {
    window.location.href = 'index.html';
  }
});

document.getElementById('homeLink')?.addEventListener('click', function(e) {
  e.preventDefault();
  
  const userRole = localStorage.getItem('userRole');
  
  if (userRole === 'student') {
    window.location.href = 'student-dashboard.html';
  } 
  else if (userRole === 'provider') {
    window.location.href = 'provider-dashboard.html';
  }
  else if (userRole === 'admin') {
    window.location.href = 'admin-dashboard.html'; 
  }
  else {
    window.location.href = 'index.html';
  }
});


document.getElementById("searchBar").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const query = e.target.value.toLowerCase().trim();

        if (!query) {
            displayInternships(allInternshipsData);
            return;
        }

        const filtered = allInternshipsData.filter(data => {
            const combined = `
                ${data.companyName || ""}
                ${data.description || ""}
                ${data.expectedSalary || ""}
                ${data.location || ""}
                ${data.title || ""}
                ${(data.requirements || []).join(" ")}
            `.toLowerCase();
            return combined.includes(query);
        });

        if (filtered.length === 0) {
            internshipContainer.innerHTML = "<p>No internships match your search.</p>";
        }
        else{
            displayInternships(filtered);
        }
    }
});

function calculateTimeAgo(createdTimeStr) {
    if (!createdTimeStr) return "Unknown time";
    const parts = createdTimeStr.split(", ");
    if (parts.length !== 2) return "Invalid time format";

    const [datePart, timePart] = parts;
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes, seconds] = timePart.split(".").map(Number);
    
    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        return "Invalid date components";
    }

    const createdDate = new Date(year, month - 1, day, hours, minutes, seconds);
    if (isNaN(createdDate.getTime())) return "Invalid date object"; 
    const now = new Date();
    const diffInSeconds = Math.floor((now - createdDate) / 1000);

    if (diffInSeconds < 0) return `Just posted`;
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function createInternshipCard(data) {
    // console.log("Creating internship card:", data.id, " isAdmin:", isAdmin); // Debugging log

    const jobTag = data.job ? `<span class="tag">${data.job}</span>` : "";
    // Pastikan requirements adalah array. RTDB menyimpan array sebagai objek jika hanya ada satu elemen, perlu penyesuaian.
    const requirements = Array.isArray(data.requirements) ? data.requirements : (data.requirements ? Object.values(data.requirements) : []);

    // Snippet kebutuhan untuk tampilan ringkasan di kartu (hanya 2 item pertama)
     const requirementSnippet = requirements.slice(0, 2).map((req, i) => `<li>${i + 1}. ${req.substring(0, 50)}${req.length > 50 ? '...' : ''}</li>`).join("");


    const wrapper = document.createElement("div");
    wrapper.classList.add("internship-card");
    wrapper.style.cursor = "pointer"; // Tetap pointer agar bisa diklik (untuk modal)
    wrapper.dataset.internshipId = data.id; // Simpan ID magang di dataset

    // applicationStatusHTML hanya relevan untuk siswa yang sudah apply.
    // Tidak perlu ditampilkan di kartu ringkasan untuk admin.
    let applicationStatusHTML = "";
    if (!isAdmin && data.applicationStatus) { // Hanya tampilkan jika BUKAN admin
        const statusText = data.applicationStatus.charAt(0).toUpperCase() + data.applicationStatus.slice(1);
        applicationStatusHTML = `<p class="application-status" style="font-weight: bold; color: #007bff; margin-top: 5px; margin-bottom: 5px;">Status: ${statusText}</p>`;
    }

    // **Bagian HTML Card (Struktur Dasar - TETAP Menyertakan Heart dan Rating)**
    wrapper.innerHTML = `
        <div class="internship-card-header">
            <div>
                <h3 class="internship-card-provider">${data.companyName}</h3>
                <p class="internship-card-provider-loc">${data.location}</p>
                <p class="internship-card-salary">Expected Salary: ${data.expectedSalary || "-"}</p>
            </div>
            <span class="time-ago">${calculateTimeAgo(data.createdTime)}</span>
        </div>
        <div class="internship-card-tags">${jobTag}</div>
        <div class="internship-card-body">
            <h4>${data.title || "Internship"}</h4>
            ${applicationStatusHTML}
            <p><strong>${data.startDate || "?"} - ${data.deadline || "?"}</strong></p>
            <p><strong>Requirement:</strong></p>
            <ul style="padding-left: 1.2rem; margin: 0;">
                ${requirementSnippet}
            </ul>
            <span class="read-more">...</span>
        </div>
        <div class="internship-card-footer">
            <i class="bx bx-heart heart-icon" data-id="${data.id}" style="cursor: pointer;"></i>
            <div class="rating">
                <i class="bx bx-star"></i>
                <span>N/5</span>
            </div>
        </div>
    `;

    // Ambil referensi ke elemen setelah innerHTML diatur
    const heartIcon = wrapper.querySelector('.heart-icon');
    const ratingElement = wrapper.querySelector('.rating');
    const cardFooter = wrapper.querySelector('.internship-card-footer'); // Ambil elemen footer


    // === Logika Like/Unlike (Hanya untuk Pengguna Biasa, BUKAN Admin) ===
    // Tandai jika sudah dilike (Hanya jika BUKAN admin dan ada user/heartIcon)
    if (!isAdmin && currentUserId && heartIcon && likedInternshipIds.has(data.id)) { // Menggunakan .has() untuk Set
         heartIcon.classList.remove("bx-heart");
         heartIcon.classList.add("bxs-heart");
         heartIcon.style.color = "red";
    }
    else{
        heartIcon.style.display = "none";
        ratingElement.style.display = "none";
    }

    // Event listener Like/Unlike (Hanya jika BUKAN admin dan ada heartIcon)
    if (!isAdmin && heartIcon) { // Tambahkan cek !isAdmin di sini
        heartIcon.addEventListener("click", async (event) => {
            event.stopPropagation(); // Penting: Hentikan event dari bubble up

            if (!currentUserId) {
                alert("Please login to like internships.");
                return;
            }
            const internshipIdForLike = heartIcon.dataset.id;
            const likedDocRef = doc(db, "likedInternships", currentUserId); // Menggunakan db (Firestore)

            try {
                 // Ambil dokumen likedInternships user
                const likedSnap = await getDoc(likedDocRef);
                let currentLikes = likedSnap.exists() ? likedSnap.data().internshipIds || [] : [];

                const isLiked = currentLikes.includes(internshipIdForLike); // Periksa di array/list

                if (isLiked) {
                    currentLikes = currentLikes.filter(id => id !== internshipIdForLike);
                    likedInternshipIds.delete(internshipIdForLike); // Update Set lokal
                    heartIcon.classList.remove("bxs-heart");
                    heartIcon.classList.add("bx-heart");
                    heartIcon.style.color = "";
                } else {
                    currentLikes.push(internshipIdForLike);
                    likedInternshipIds.add(internshipIdForLike); // Update Set lokal
                    heartIcon.classList.remove("bx-heart");
                    heartIcon.classList.add("bxs-heart");
                    heartIcon.style.color = "red";
                }

                // Simpan kembali list yang diperbarui ke Firestore
                await setDoc(likedDocRef, { internshipIds: currentLikes }, { merge: true }); // Gunakan merge true
                console.log(`User ${currentUserId} updated liked internships.`);

            } catch (err) {
                console.error("Error updating wishlist:", err);
                alert("Failed to update wishlist. Please try again.");
            }
        });
    }
    // Jika isAdmin, ikon heart tidak akan mendapatkan event listener ini,
    // sehingga admin tidak bisa mengklik ikon heart untuk like/unlike dari tampilan ini.


    // === Event Listener untuk Membuka Modal (Ditambahkan untuk SEMUA Pengguna) ===
    // Listener ini ditambahkan ke 'wrapper' (kartu) dan akan dipicu saat kartu diklik
    wrapper.addEventListener("click", async() => {
        const modal = document.getElementById("internshipModal"); // Pastikan ID modal ini benar di HTML Anda
        const modalBody = document.getElementById("modalBody"); // Pastikan ID modalBody ini benar
        const applyBtnModal = document.getElementById("applyBtnModal"); // Pastikan ID tombol Apply ini benar

         // Pastikan elements modal ditemukan sebelum diisi.
         // Cek applyBtnModal hanya jika BUKAN admin, karena admin mungkin tidak punya tombol apply di modalnya.
        if (!modal || !modalBody || (!isAdmin && applyBtnModal === null)) {
             console.error("Modal elements not found or apply button missing for non-admin!");
             // Optional: Tambahkan pesan error di UI atau log lebih detail
             return; // Hentikan jika elemen modal penting tidak ada
         }

        // Format daftar kebutuhan untuk modal
        const fullRequirementListHTML = requirements.length > 0 ? requirements.map((req, i) => `<li>${i + 1}. ${req}</li>`).join("") : "<li>No specific requirements listed.</li>";
        // Format job tag untuk modal
        const fullJobTagHTML = jobTag ? `<div class="modal-tags">${jobTag}</div>` : '';


        // Ambil status aplikasi spesifik user untuk modal (hanya jika ada user dan BUKAN admin)
        let modalApplicationStatusHTML = "";
        if (!isAdmin && currentUserId) { // Hanya ambil dan tampilkan status jika BUKAN admin
            try {
                 // Asumsi status aplikasi magang disimpan di dokumen appliedIntern/internshipId di Firestore
                 const internshipApplicationDocRef = doc(db, "appliedIntern", data.id);
                const docSnap = await getDoc(internshipApplicationDocRef);
                

                if (docSnap.exists() && docSnap.data() && docSnap.data()[currentUserId]) {
                    const userApplication = docSnap.data()[currentUserId];
                     const statusText = userApplication.status ? userApplication.status.charAt(0).toUpperCase() + userApplication.status.slice(1) : "Status Unknown";
                     modalApplicationStatusHTML = `<p style="font-weight:bold; color: #007bff; margin-bottom:10px;">Your Application Status: ${statusText}</p>`;
                }
            } catch (error) {
                 console.error("Error fetching user application status for modal:", error);
                 // Lanjutkan tanpa status aplikasi jika ada error
            }
        }

        // Isi modal body dengan detail magang
        modalBody.innerHTML = `
            <h2>${data.title || "Internship"}</h2>
            ${modalApplicationStatusHTML}
            <p>${data.companyName}</p>
            <p>${data.location}</p>
            <p>${data.expectedSalary || "-"}</p>
            <p><strong>${data.startDate || "?"} - ${data.deadline || "?"}</strong></p>
            ${fullJobTagHTML}
            <p><strong>Requirements:</strong></p>
            <ul style="padding-left: 1.2rem;">${fullRequirementListHTML}</ul>
        `;

        // Atur visibilitas tombol Apply Now di modal
         if (applyBtnModal) { // Pastikan tombol applyBtnModal ditemukan di HTML
             if (isAdmin) {
                //  applyBtnModal.style.display = "none"; // Sembunyikan tombol Apply jika admin
             } else {
                 // Logika untuk siswa/anonim:
                 applyBtnModal.style.display = "block"; // Tampilkan tombol Apply
                 applyBtnModal.dataset.internshipId = data.id; // Set data-id untuk tombol Apply
                 applyBtnModal.dataset.internshipTitle = data.title || "this internship"; // Set data-title

                 // Cek status aplikasi siswa untuk menyembunyikan tombol apply jika sudah melamar
                 if (currentUserId) { // Hanya lakukan cek ini jika ada user yang login
                     try {
                         const internshipApplicationDocRef = doc(db, "appliedIntern", data.id);
                         const docSnap = await getDoc(internshipApplicationDocRef);
                         if (docSnap.exists() && docSnap.data()?.[currentUserId]) {
                             applyBtnModal.style.display = "none"; // Sembunyikan jika sudah melamar
                         }
                     } catch (error) {
                         console.error("Error checking user application status for modal:", error);
                         // Biarkan tombol apply tetap tampil jika ada error cek
                     }
                 } else {
                      // Jika tidak ada user (anonim), tombol apply tetap tampil,
                      // login check akan dilakukan di event listener tombol apply (di luar fungsi ini)
                 }
             }
         }


        modal.style.display = "flex"; // Tampilkan modal
    });


    // === **TAMBAHAN:** Tambahkan Ikon Delete hanya jika Admin ===
    if (isAdmin && cardFooter) { // Cek isAdmin DAN pastikan footer ditemukan
        // Buat elemen ikon tempat sampah (gunakan class Boxicons)
        const deleteIcon = document.createElement('i');
        deleteIcon.classList.add('bx', 'bx-trash'); // Class untuk ikon tempat sampah
        deleteIcon.classList.add('delete-internship-icon'); // Class kustom untuk styling (opsional)
        deleteIcon.dataset.internshipId = data.id; // Simpan ID magang
        deleteIcon.style.cursor = 'pointer';
        deleteIcon.style.color = '#f44336'; // Warna merah untuk ikon delete (opsional)
        deleteIcon.style.fontSize = '24px'; // Ukuran ikon (opsional)
        // Gunakan flexbox untuk menempatkan ikon delete di ujung kanan footer
        // Ini bisa dilakukan di CSS dengan class pada footer, atau inline style:
        deleteIcon.style.cssText += 'margin-left: auto;'; // Tambahkan inline style untuk dorong ke kanan


        // Tambahkan ikon delete ke footer kartu
        cardFooter.appendChild(deleteIcon);


        // === Event Listener untuk Ikon Delete ===
        deleteIcon.addEventListener('click', async (event) => {
            event.stopPropagation(); // Sangat penting: Hentikan event klik dari bubble ke wrapper card dan listener modal
            console.log("Delete icon clicked for:", data.id);

            const internshipIdToDelete = event.target.dataset.internshipId;
            const internshipTitleToDelete = data.title || "this internship"; // Ambil judul untuk konfirmasi

            if (confirm(`Are you sure you want to delete the internship "${internshipTitleToDelete}"? This action cannot be undone.`)) {
                // Panggil fungsi hapus magang (Kita akan buat fungsi deleteInternship setelah ini)
                await deleteInternship(internshipIdToDelete);
            }
        });
    } // Penutup if (isAdmin && cardFooter)


    // Kembalikan elemen wrapper (kartu magang)
    return wrapper;
}

async function deleteInternship(internshipId) {
    // Memastikan ID magang valid sebelum mencoba menghapus
    if (!internshipId) {
        console.error("Error: No internship ID provided for deletion.");
        alert("Error deleting internship. Please try again.");
        return; // Hentikan eksekusi jika tidak ada ID
    }

    // Tampilkan pesan di konsol untuk logging
    console.log(`Attempting to delete internship with ID: ${internshipId}`);
    // Anda bisa menambahkan indikator loading di UI di sini jika ada elemen untuk itu

    try {
        // 1. Buat referensi ke lokasi data magang di Realtime Database
        // Pathnya adalah 'internships' diikuti dengan ID magang
        const internshipRefToDelete = ref(rtdb, `internships/${internshipId}`);

        // 2. Hapus data di lokasi tersebut menggunakan fungsi 'remove()'
        await remove(internshipRefToDelete);

        // Jika penghapusan berhasil:
        console.log(`Internship ${internshipId} successfully deleted from RTDB.`);
        // onValue listener di loadInternships akan secara otomatis mendeteksi perubahan
        // di Realtime Database dan memperbarui tampilan daftar kartu di halaman.
        alert("Internship deleted successfully!"); // Beri umpan balik sukses ke pengguna

        // 3. Opsional: Menangani data terkait di Firestore (data 'appliedIntern' atau 'likedInternships')
        // Ini adalah bagian yang *bisa* Anda tambahkan jika data terkait magang
        // juga perlu dihapus dari Firestore. Contoh: Jika ada dokumen di
        // koleksi 'appliedIntern' di mana ID dokumennya adalah ID magang,
        // atau jika ID magang disimpan dalam array 'internshipIds' di dokumen
        // 'likedInternships' milik setiap pengguna.
        // Bagian ini lebih kompleks dan seringkali lebih baik ditangani oleh
        // Cloud Functions agar konsisten dan aman di sisi server.
        // Namun, jika Anda ingin mencoba menghapusnya dari sisi klien (dengan hati-hati):

        /* --- Contoh Penghapusan Data Terkait di Firestore (Opsional & Perlu Penyesuaian Struktur Data Anda) ---
         // Contoh: Menghapus dokumen aplikasi spesifik magang di koleksi 'appliedIntern' (jika strukturnya appliedIntern/internshipId)
        try {
             const appliedDocRef = doc(db, "appliedIntern", internshipId);
             // Periksa apakah dokumen ada sebelum mencoba menghapus
             const appliedDocSnap = await getDoc(appliedDocRef);
             if(appliedDocSnap.exists()) {
                await deleteDoc(appliedDocRef);
                console.log(`Deleted appliedIntern document for internship ID ${internshipId}.`);
             }
        } catch (firestoreDeleteError) {
             console.warn(`Failed to delete appliedIntern document for ${internshipId}:`, firestoreDeleteError);
             // Lanjutkan meskipun gagal menghapus data terkait di Firestore, karena penghapusan RTDB sudah berhasil
        }

        // Contoh: Menghapus ID magang dari array 'internshipIds' di dokumen 'likedInternships' milik SEMUA pengguna (Ini bisa sangat mahal dan lambat jika banyak pengguna!)
        // Pendekatan ini tidak disarankan dari sisi klien. Lebih baik pakai Cloud Function.
        // const likedUsersQuery = query(collection(db, "likedInternships"), where("internshipIds", "array-contains", internshipId));
        // const likedUsersSnapshot = await getDocs(likedUsersQuery);
        // likedUsersSnapshot.forEach(async (userDocSnap) => {
        //     const userId = userDocSnap.id;
        //     const currentLiked = userDocSnap.data().internshipIds || [];
        //     const newLiked = currentLiked.filter(id => id !== internshipId);
        //     await updateDoc(userDocSnap.ref, { internshipIds: newLiked });
        // });
        // console.log(`Removed internship ID ${internshipId} from users' liked lists (Firestore).`);
        --- Akhir Contoh Opsional --- */


    } catch (error) {
        // Jika penghapusan gagal:
        console.error(`Error deleting internship ${internshipId}:`, error);
        // Properti 'code' pada objek error seringkali sangat membantu (misal: "PERMISSION_DENIED")
        console.error("Detail Error:", { code: error.code, message: error.message, fullError: error });
        alert("Failed to delete internship. Please try again."); // Beri umpan balik error ke pengguna
    }
     // Sembunyikan indikator loading di UI di sini jika Anda menambahkannya
}

document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("internshipModal").style.display = "none";
});

window.addEventListener("click", (event) => {
    const modal = document.getElementById("intersnhipModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

function loadInternships() {
    const internshipContainer = document.getElementById("internshipCards");
    const internshipRef = ref(rtdb, 'internships');
    
    onValue(internshipRef, (snapshot) => {
        internshipContainer.innerHTML = "";
        if (!snapshot.exists()) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">No internships available at the moment.</p>`;
            return;
        }
        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            data.id = childSnapshot.key;
            const cardElement = createInternshipCard(data);
            internshipContainer.appendChild(cardElement);
        });
    }, (error) => {
        console.error("Error loading internships from RTDB:", error);
        internshipContainer.innerHTML = `<p style="padding: 2rem; color: red;">Error loading internships. Please try again later.</p>`;
    });
}

async function fetchAndDisplayFilteredInternships(filterLogic, noMatchMessage) {
    const user = auth.currentUser;
    if (!user) {
        alert("Please login to view this section.");
        return;
    }

    internshipContainer.innerHTML = "<p>Loading internships...</p>";

    try {
        const userId = user.uid;
        const userApplicationsRef = doc(db, "appliedIntern", userId);
        const likedInternshipsRef = doc(db, "likedInternships", userId); 

        let targetInternshipIds = [];

        if (filterLogic.type === "application_status") {
            const userApplicationsSnap = await getDoc(userApplicationsRef);
            if (userApplicationsSnap.exists()) {
                const applications = userApplicationsSnap.data().applications || [];
                targetInternshipIds = applications
                    .filter(app => app.status === filterLogic.status)
                    .map(app => app.internshipId);
            }
        } else if (filterLogic.type === "liked") {
            const likedSnap = await getDoc(likedInternshipsRef);
            if (likedSnap.exists()) {
                targetInternshipIds = likedSnap.data().internshipIds || [];
            }
        }


        if (targetInternshipIds.length === 0) {
            internshipContainer.innerHTML = `<p>${noMatchMessage}</p>`;
            return;
        }
        
        if (allInternshipsData.length === 0) {
            onValue(internshipsRef, (snapshot) => {
                allInternshipsData = [];
                snapshot.forEach((childSnapshot) => {
                    const internship = childSnapshot.val();
                    internship.id = childSnapshot.key;
                    allInternshipsData.push(internship);
                });
                const filteredInternships = allInternshipsData.filter(internship =>
                    targetInternshipIds.includes(internship.id)
                );
                 displayInternships(filteredInternships);
                 if (filteredInternships.length === 0) {
                    internshipContainer.innerHTML = `<p>No internships found that match your criteria (they may have been removed or changed).</p>`;
                 }

            }, { onlyOnce: true }); 
        } else {
            const filteredInternships = allInternshipsData.filter(internship =>
                targetInternshipIds.includes(internship.id)
            );
            displayInternships(filteredInternships);
            if (filteredInternships.length === 0) {
                internshipContainer.innerHTML = `<p>No internships found that match your criteria (they may have been removed or changed).</p>`;
            }
        }

    } catch (error) {
        console.error(`Error loading ${filterLogic.status || 'liked'} internships:`, error);
        internshipContainer.innerHTML = `<p>Error loading internships. Please try again.</p>`;
    }
}

document.getElementById("liked-internship-btn").addEventListener("click", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("Please login to view liked internships.");
        return;
    }

    try {
        fetchAndDisplayFilteredInternships(
            { type: "liked" },
            "You have not liked any internships yet."
        );
    } catch (err) {
        console.error("Error loading liked internships:", err);
    }
});

// APPLY INTERN
const applyNowBtnModal = document.getElementById("applyBtnModal");
applyNowBtnModal.addEventListener("click", async () => {
    if (!currentUserId) {
        alert("Please login to apply for internships.");
        return;
    }

    const internshipId = applyNowBtnModal.dataset.internshipId;
    const internshipTitle = applyNowBtnModal.dataset.internshipTitle;
    
    if (!internshipId) {
        alert("Error: Internship ID not found.");
        return;
    }
    if (!confirm(`Are you sure you want to apply for "${internshipTitle}"?`)) {
        return;
    }

    applyNowBtnModal.disabled = true;
    applyNowBtnModal.textContent = "Processing...";

    try {
        const internshipApplicationDocRef = doc(db, "appliedIntern", internshipId);

        const docSnap = await getDoc(internshipApplicationDocRef);

        if (docSnap.exists() && docSnap.data() && docSnap.data()[currentUserId]) {
            alert(`You have already applied for "${internshipTitle}".`);
            document.getElementById("internshipModal").style.display = "none";
            applyNowBtnModal.disabled = false;
            applyNowBtnModal.textContent = "Apply Now";
            return;
        }
        
        const userApplicationData = {
            internshipTitle: internshipTitle,
            status: "applied",
            appliedAt: serverTimestamp(),
            userName: document.getElementById('sidebarProfileName').textContent,
            userSchool: document.getElementById('sidebarProfileSchool').textContent,
            userMajor: document.getElementById('sidebarProfileMajor').textContent,
            userEmail: currentUserEmail
        };

        const dataToWrite = {
            [currentUserId]: userApplicationData 
        };
        
        await setDoc(internshipApplicationDocRef, dataToWrite, { merge: true });

        console.log(`Application submitted for user ${currentUserId} to internship ${internshipId}`);
        alert(`Successfully applied for "${internshipTitle}"! Your application status is "applied".`);
        
        try {
            const userDocRef = doc(db, "users", currentUserId);
            await setDoc(userDocRef, {
                appliedInternshipIds: arrayUnion(internshipId) 
            }, { merge: true });
            console.log(`Added ${internshipId} to user's applied list.`);
        } catch (denormError) {
            console.error("Error updating user's applied list (denormalization):", denormError);
        }
            
        document.getElementById("internshipModal").style.display = "none";

    } catch (error) {
        console.error("Error submitting application: ", error);
        alert("Failed to submit application. Please try again. Check console for details.");
    } finally {
        applyNowBtnModal.disabled = false;
        applyNowBtnModal.textContent = "Apply Now";
    }
});

async function showAppliedInternships() {
    if (!currentUserId) {
        alert("Please login to see your applied internships.");
        loadInternships();
        return;
    }

    const internshipContainer = document.getElementById("internshipCards");
    internshipContainer.innerHTML = `<p style="padding: 2rem;">Loading your applications...</p>`;

    try {
        const applicationsCollectionRef = collection(db, "appliedIntern");
        const allApplicationsSnapshot = await getDocs(applicationsCollectionRef);

        if (allApplicationsSnapshot.empty) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">No applications found system-wide, or you haven't applied yet.</p>`;
            return;
        }

        internshipContainer.innerHTML = "";
        let foundAppliedInternships = [];

        allApplicationsSnapshot.forEach(docSnap => {
            if (docSnap.data()[currentUserId]) {
                foundAppliedInternships.push(docSnap.id);
            }
        });

        if (foundAppliedInternships.length === 0) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">You haven't applied for any internships yet.</p>`;
            return;
        }

        const internshipPromises = foundAppliedInternships.map(internshipId => {
            const internshipRef = ref(rtdb, `internships/${internshipId}`);
            return get(internshipRef).then(internshipSnapshot => {
                if (internshipSnapshot.exists()) {
                    const internshipData = internshipSnapshot.val();
                    internshipData.id = internshipSnapshot.key;

                    return internshipData;
                }
                return null;
            });
        });

        const internshipDetails = await Promise.all(internshipPromises);
        
        let cardsRendered = 0;
        internshipDetails.forEach(data => {
            if (data) {
                const cardElement = createInternshipCard(data);
                internshipContainer.appendChild(cardElement);
                cardsRendered++;
            }
        });
        
        if (cardsRendered === 0) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">Applied internships details could not be loaded, or they are no longer available.</p>`;
        }

    } catch (error) {
        console.error("Error fetching applied internships: ", error);
        internshipContainer.innerHTML = `<p style="padding: 2rem; color: red;">Error loading your applications.</p>`;
    }
}

document.getElementById("applied-internship-btn").addEventListener("click", (e) => {
    e.preventDefault();
    showAppliedInternships();
});

async function showInProgressApplications() {
    if (!currentUserId) {
        alert("Please login to see your in-progress applications.");
        loadInternships();
        return;
    }

    const internshipContainer = document.getElementById("internshipCards");
    internshipContainer.innerHTML = `<p style="padding: 2rem;">Loading your in-progress applications...</p>`;

    // Daftar status "In Progress"
    const inProgressTargetStatuses = ["applied", "under review", "interview scheduled", "documents pending", "pending decision"];

    try {
        const applicationsCollectionRef = collection(db, "appliedIntern");
        const allApplicationsSnapshot = await getDocs(applicationsCollectionRef);

        if (allApplicationsSnapshot.empty) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">No application data found in the system.</p>`;
            return;
        }

        let inProgressInternshipData = [];

        allApplicationsSnapshot.forEach(internshipDoc => {
            const internshipId = internshipDoc.id;
            const applicationsInInternship = internshipDoc.data(); 
            
            if (applicationsInInternship && applicationsInInternship[currentUserId]) {
                const userApplication = applicationsInInternship[currentUserId];
                if (userApplication.status && inProgressTargetStatuses.includes(userApplication.status.toLowerCase())) {
                    inProgressInternshipData.push({ 
                        id: internshipId, 
                        status: userApplication.status 
                    });
                }
            }
        });

        if (inProgressInternshipData.length === 0) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">You have no applications currently matching the in-progress statuses: ${inProgressTargetStatuses.join(', ')}.</p>`;
            return;
        }

        internshipContainer.innerHTML = ""; 

        const internshipDetailPromises = inProgressInternshipData.map(appData => {
            const internshipRTDBRef = ref(rtdb, `internships/${appData.id}`);
            return get(internshipRTDBRef).then(rtdbSnap => {
                if (rtdbSnap.exists()) {
                    const rtData = rtdbSnap.val();
                    rtData.id = rtdbSnap.key; 
                    rtData.applicationStatus = appData.status; 
                    return rtData;
                }
                console.warn(`Internship details for ID ${appData.id} not found in RTDB for in-progress list.`);
                return null; 
            });
        });

        const finalInternshipDetails = await Promise.all(internshipDetailPromises);
        
        let cardsRendered = 0;
        finalInternshipDetails.forEach(data => {
            if (data) { 
                const cardElement = createInternshipCard(data);
                internshipContainer.appendChild(cardElement);
                cardsRendered++;
            }
        });
        
        if (cardsRendered === 0 && inProgressInternshipData.length > 0) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">Details for your in-progress applications could not be loaded or they are no longer available.</p>`;
        } else if (cardsRendered === 0) { 
             internshipContainer.innerHTML = `<p style="padding: 2rem;">You have no applications currently matching the in-progress statuses.</p>`;
        }

    } catch (error) {
        console.error("Error fetching in-progress applications: ", error);
        internshipContainer.innerHTML = `<p style="padding: 2rem; color: red;">Error loading your in-progress applications.</p>`;
    }
}

document.getElementById("inprogress-internship-btn").addEventListener("click", (e) => {
    e.preventDefault();
    showInProgressApplications();
});

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    
    signOut(auth)
        .then(() => {
            alert("You have been successfully logged out.");
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error("Logout Error:", error);
            alert("Failed to log out. Please try again.");
        });
});