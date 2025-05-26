let selectedRole = '';
const urlParams = new URLSearchParams(window.location.search);
const uid = urlParams.get('uid');

// Fungsi pilih role
function selectRole(role) {
    selectedRole = role;

    // Hapus required dari semua field
    document.querySelectorAll('input').forEach(input => {
        input.removeAttribute('required');
    });

    // Tampilkan field sesuai role & tambahkan required
    if (role === 'student') {
        document.getElementById('studentFields').style.display = 'block';
        document.getElementById('studentName').setAttribute('required', '');
        document.getElementById('school').setAttribute('required', '');
        document.getElementById('nim').setAttribute('required', '');
        document.getElementById('major').setAttribute('required', '');

        // Sembunyikan provider fields
        document.getElementById('providerFields').style.display = 'none';

    } else if (role === 'provider') {
        document.getElementById('providerFields').style.display = 'block';
        document.getElementById('providerName').setAttribute('required', '');
        document.getElementById('companyName').setAttribute('required', '');
        document.getElementById('address').setAttribute('required', '');

        // Sembunyikan student fields
        document.getElementById('studentFields').style.display = 'none';
    }
}

// Handle form submission
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedRole) {
        alert('Pilih role terlebih dahulu!');
        return;
    }

    const userData = {
        role: selectedRole,
        completedAt: new Date()
    };

    // Tambahkan data spesifik role
    if (selectedRole === 'student') {
        userData.name = document.getElementById('name').value;
        userData.school = document.getElementById('school').value;
        userData.nim = document.getElementById('nim').value;
        userData.major = document.getElementById('major').value;
    } else {
        userData.name = document.getElementById('name').value;
        userData.companyName = document.getElementById('companyName').value;
        userData.address = document.getElementById('address').value;
    }

    try {
        // Simpan ke Firestore
        await firebase.firestore()
            .collection('users')
            .doc(uid)
            .set(userData, { merge: true });

        // Redirect ke dashboard
        window.location.href = `${selectedRole}-dashboard.html`;

    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan profil!');
    }
});