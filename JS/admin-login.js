import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBcGAlRNxn1oJ5SpQb179EdzXXW4tYpHrs",
    authDomain: "nextstep-123.firebaseapp.com",
    projectId: "nextstep-123",
    storageBucket: "nextstep-123.firebasestorage.app",
    messagingSenderId: "427076545876",
    appId: "1:427076545876:web:e588a15084e83343482cc1",
    measurementId: "G-6S22DPGVP3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById('adminLoginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.querySelector('.admin-btn');
    
    errorMessage.style.display = 'none';

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    if (!password) {
        showError('Please enter your password');
        return;
    }

    const originalBtnText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
    loginBtn.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, 'admins', user.uid));
        if (userDoc.exists()) {
            window.location.href = 'admin-dashboard.html';
        } else {
            await signOut(auth);
            showError('You do not have administrator privileges.');
        }
    } catch (error) {
        switch (error.code) {
            case 'auth/invalid-email':
                showError('Invalid email address');
                break;
            case 'auth/user-disabled':
                showError('This account has been disabled');
                break;
            case 'auth/user-not-found':
                showError('No account found with this email');
                break;
            case 'auth/wrong-password':
                showError('Incorrect password');
                break;
            case 'auth/too-many-requests':
                showError('Too many failed attempts. Please try again later.');
                break;
            default:
                showError('Failed to sign in. Please try again.');
                console.error('Login error:', error);
        }
    } finally {
        loginBtn.innerHTML = originalBtnText;
        loginBtn.disabled = false;
    }
});

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    errorMessage.classList.add('shake');
    setTimeout(() => errorMessage.classList.remove('shake'), 500);
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', function () {
        this.parentNode.style.transform = 'scale(1.02)';
    });

    input.addEventListener('blur', function () {
        this.parentNode.style.transform = 'scale(1)';
    });
});

const style = document.createElement('style');
style.textContent = `
    .shake {
        animation: shake 0.5s;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-5px); }
        40%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);