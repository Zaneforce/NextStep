// === Firebase SDK ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
// Impor getDatabase jika Anda berencana menggunakan Realtime Database di dashboard admin
// import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";


// === Firebase Config & Init ===
// Pastikan konfigurasi ini sesuai dengan proyek Anda
const firebaseConfig = {
    apiKey: "AIzaSyBcGAlRNxn1oJ5SpQb179EdzXXW4tYpHrs",
    authDomain: "nextstep-123.firebaseapp.com",
    databaseURL: "https://nextstep-123-default-rtdb.asia-southeast1.firebasedatabase.app", // Opsional jika hanya pakai Firestore
    projectId: "nextstep-123",
    storageBucket: "nextstep-123.appspot.com", // Opsional jika tidak pakai Cloud Storage
    messagingSenderId: "427076545876", // Opsional jika tidak pakai FCM
    appId: "1:427076545876:web:e588a15084e83343482cc1",
    measurementId: "G-6S22DPGVP3" // Opsional jika tidak pakai Analytics
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const rtdb = getDatabase(app); // Inisialisasi RTDB jika dibutuhkan

// === Scroll Hide Header ===
let lastScroll = 0;
const header = document.querySelector('header');
const scrollThreshold = 200; // Jarak scroll sebelum header mulai menghilang

// Event listener untuk menyembunyikan/menampilkan header saat scroll
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Selalu tampilkan header jika di paling atas atau di bawah threshold
    if (currentScroll <= scrollThreshold) {
        header.classList.remove('hidden');
    } else if (currentScroll > lastScroll && !header.classList.contains('hidden')) {
        // Scroll ke bawah
        header.classList.add('hidden');
    } else if (currentScroll < lastScroll && header.classList.contains('hidden')) {
        // Scroll ke atas
        header.classList.remove('hidden');
    }
    lastScroll = currentScroll;
});


// === Authentication State Change Listener ===
// Listener ini berjalan setiap kali status login berubah (saat halaman dimuat, login, logout)
onAuthStateChanged(auth, async (user) => {
    // Ambil elemen-elemen DOM yang dibutuhkan
    const profileSection = document.getElementById('profileSection');
    const profileName = document.getElementById('profileName');
    const loginBtn = document.getElementById('loginBtn');
    const reportsContent = document.querySelector('.reports-content');
    const reportsContainer = document.querySelector('.reports-container');

    // **LOG 1: Cek apakah elemen ditemukan**
    console.log("Profile Section Element found:", !!profileSection); // !! mengubah ke boolean
    console.log("Login Button Element found:", !!loginBtn);
    console.log("Reports Content Element found:", !!reportsContent);


    if (reportsContent) reportsContent.style.display = 'none'; // Sembunyikan awal


    if (user) {
        // Pengguna sudah terautentikasi
        console.log("User authenticated:", user.uid);
        // **LOG 2: Pengguna terautentikasi**

        try {
            const adminDocRef = doc(db, "admins", user.uid);
            const adminDocSnap = await getDoc(adminDocRef);

            // **LOG 3: Hasil cek dokumen admin**
            console.log("Admin document exists:", adminDocSnap.exists());

            if (adminDocSnap.exists()) {
                // Pengguna adalah seorang admin
                console.log("User is verified as an admin. Showing admin UI.");

                if (profileName) profileName.textContent = "Admin";

                // **LOG 4: Sebelum mengubah display**
                console.log("Before setting display: profileSection =", profileSection?.style.display, ", loginBtn =", loginBtn?.style.display);


                if (loginBtn) loginBtn.style.display = "none";
                if (profileSection) profileSection.style.display = "flex"; // atau "block" sesuai CSS Anda

                // **LOG 5: Setelah mengubah display**
                console.log("After setting display: profileSection =", profileSection?.style.display, ", loginBtn =", loginBtn?.style.display);


                if (reportsContent) reportsContent.style.display = 'block'; // Tampilkan konten admin


                console.log("Loading admin reports content...");
                // ... logika memuat data admin ...

            } else {
                // Pengguna terautentikasi tapi BUKAN admin
                console.log("Authenticated user is NOT an admin. Redirecting or showing access denied.");

                await signOut(auth);
                window.location.href = 'admin-login.html';

                if (reportsContainer) {
                    reportsContainer.innerHTML = "<h2>Akses Ditolak</h2><p>Anda tidak memiliki izin administrator. Silakan login kembali dengan akun admin.</p>";
                    // ... styling pesan ...
                    if (reportsContent) reportsContent.style.display = 'block'; // Tampilkan pesan akses ditolak
                }

                if (profileSection) profileSection.style.display = "none";
                if (loginBtn) loginBtn.style.display = "block";
            }
        } catch (error) {
            console.error("Error during admin verification:", error);

            await signOut(auth);
            window.location.href = 'admin-login.html';

            if (reportsContainer) {
                reportsContainer.innerHTML = "<h2>Error Verifikasi</h2><p>Terjadi kesalahan saat memverifikasi status admin Anda. Silakan coba login kembali.</p>";
                 // ... styling pesan error ...
                if (reportsContent) reportsContent.style.display = 'block'; // Tampilkan pesan error
            }

            if (profileSection) profileSection.style.display = "none";
            if (loginBtn) loginBtn.style.display = "block";

        } finally {
            document.body.classList.add('loaded');
        }
    } else {
        // Tidak ada pengguna yang terautentikasi
        console.log("No user authenticated. Redirecting to admin login page.");
        // **LOG 6: Pengguna tidak terautentikasi**


        if (profileSection) profileSection.style.display = "none";
        if (loginBtn) loginBtn.style.display = "block";

        window.location.href = 'admin-login.html';

        if (reportsContainer) {
            reportsContainer.innerHTML = "<h2>Mohon Masuk</h2><p>Anda perlu masuk menggunakan akun admin untuk melihat halaman ini.</p>";
              // ... styling pesan login ...
            if (reportsContent) reportsContent.style.display = 'block'; // Tampilkan pesan login
        }

        document.body.classList.add('loaded');
    }
})

// === Logout Functionality ===
// === Logout Functionality ===
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (event) => {
        event.preventDefault(); // Mencegah perilaku default link (misalnya, "#" di href)
        console.log("Attempting to sign out...");
        try {
            await signOut(auth);
            console.log("User signed out successfully.");
            // Setelah logout berhasil, onAuthStateChanged listener akan mendeteksi
            // bahwa tidak ada lagi pengguna (user menjadi null).
            // Ini akan memicu blok 'else' di onAuthStateChanged,
            // yang akan menyembunyikan bagian profil, menampilkan tombol login,
            // dan (sesuai logika yang kita tambahkan) me-redirect ke admin-login.html.
            // Jadi, tidak perlu redirect manual lagi di sini setelah signOut().

        } catch (error) {
            console.error("Error signing out:", error);
            // Anda bisa menampilkan pesan kesalahan logout kepada pengguna di sini
            alert("Gagal logout. Silakan coba lagi."); // Contoh sederhana
        }
    }); // <-- Penutup addEventListener
} // <-- Penutup if (logoutBtn)

