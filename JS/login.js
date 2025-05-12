// Fungsi redirect
function redirectBasedOnRole(role) {
    if (role === 'student') {
        window.location.href = 'student-dashboard.html';
    } else if (role === 'provider') {
        window.location.href = 'provider-dashboard.html';
    }
}

// Login dengan Email/Password
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    try {
        // 1. Login dengan Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // 2. Cek data di Firestore
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
        
        if (!userDoc.exists) {
            throw new Error('Akun tidak ditemukan!');
        }
        
        // 3. Redirect berdasarkan role
        redirectBasedOnRole(userDoc.data().role);
        
    } catch (error) {
        errorMessage.textContent = error.message.replace('Firebase: ', '');
        errorMessage.style.display = 'block';
        console.error('Login Error:', error);
    }
});

// Login dengan Google
document.getElementById('googleLogin').addEventListener('click', async () => {
    try {
        // 1. Autentikasi dengan Google
        const result = await auth.signInWithPopup(googleProvider);
        
        // 2. Cek apakah user baru
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        
        if (!userDoc.exists) {
            // Jika baru, redirect ke halaman complete profile
            window.location.href = `complete-profile.html?uid=${result.user.uid}`;
        } else {
            // Jika sudah ada, redirect berdasarkan role
            redirectBasedOnRole(userDoc.data().role);
        }
        
    } catch (error) {
        document.getElementById('errorMessage').textContent = error.message.replace('Firebase: ', '');
        console.error('Google Login Error:', error);
    }
});