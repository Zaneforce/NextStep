let selectedRole = '';

// Fungsi untuk memilih role
function selectRole(role) {
    selectedRole = role;
    document.getElementById('role').value = role;

    // Update UI
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.role === role) {
            option.classList.add('selected');
        }
    });

    // Tampilkan field sesuai role
    const studentFields = document.querySelector('.student-fields');
    const providerFields = document.querySelector('.provider-fields');
    
    // Reset semua required
    document.querySelectorAll('input').forEach(input => input.removeAttribute('required'));
    
    if (role === 'student') {
        studentFields.classList.remove('hidden');
        providerFields.classList.add('hidden');
        document.querySelectorAll('.student-fields input').forEach(input => {
            input.setAttribute('required', 'true');
        });
    } else {
        providerFields.classList.remove('hidden');
        studentFields.classList.add('hidden');
        document.querySelectorAll('.provider-fields input').forEach(input => {
            input.setAttribute('required', 'true');
        });
    }
}

// Event listener untuk role options
document.querySelectorAll('.role-option').forEach(option => {
    option.addEventListener('click', () => {
        const role = option.dataset.role;
        selectRole(role);
    });
});

// Handle form submission
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('errorMessage');

    // Validasi dasar
    if (!selectedRole) {
        errorMessage.textContent = 'Please select a role!';
        errorMessage.style.display = 'block';
        return;
    }

    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match!';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        // Buat user dengan email/password
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // Data untuk Firestore
        const userData = {
            name,
            email,
            role: selectedRole,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Tambahkan data spesifik role
        if (selectedRole === 'student') {
            userData.school = document.getElementById('school').value;
            userData.nim = document.getElementById('nim').value;
            userData.major = document.getElementById('major').value;
        } else {
            userData.companyName = document.getElementById('companyName').value;
            userData.address = document.getElementById('address').value;
        }

        // Simpan ke Firestore
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set(userData);
        
        // Redirect
        window.location.href = `${selectedRole}-dashboard.html`;

    } catch (error) {
        errorMessage.textContent = error.message.replace('Firebase: ', '');
        errorMessage.style.display = 'block';
        console.error('Registration Error:', error);
    }
});

// Registrasi Google
function redirectBasedOnRole(role) {
    if (role === 'student') window.location.href = 'student-dashboard.html';
    else if (role === 'provider') window.location.href = 'provider-dashboard.html';
  }
  
  // Handle Google Signup
  document.getElementById('googleRegister').addEventListener('click', () => {
    firebase.auth().signInWithPopup(googleProvider)
      .then(async (result) => {
        const user = result.user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
          window.location.href = `complete-profile.html?uid=${user.uid}`;
        } else {
          redirectBasedOnRole(userDoc.data().role);
        }
      })
      .catch(error => {
        console.error('Google Signup Error:', error);
        alert(`Error: ${error.message}`);
      });
  });