let lastScroll = 0;
const header = document.querySelector('header');
const scrollThreshold = 200; 

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll <= 0) {
        header.classList.remove('hidden');
        return;
    }
    if (currentScroll > lastScroll && !header.classList.contains('hidden')) {
        header.classList.add('hidden');
    } 
    else if (currentScroll < lastScroll && header.classList.contains('hidden')) {
        header.classList.remove('hidden');
    }
    lastScroll = currentScroll;
});

const cards = document.querySelectorAll('.card');
const modal = document.getElementById('detailModal');
const span = document.getElementsByClassName("close")[0];

cards.forEach(card => {
    card.addEventListener('click', () => {
        const title = card.querySelector('.card-title').innerText;
        // const imgSrc = card.querySelector('img').src;
        const location = card.querySelector('.card-subtitle').innerText;
        const tags = [...card.querySelectorAll('.tag')].map(tag => tag.innerText);
        const desc = card.querySelector('.card-body').innerText;
        
        document.getElementById('modalTitle').innerText = title;
        // document.getElementById('modalImage').src = imgSrc;
        document.getElementById('modalLocation').innerText = location;
        document.getElementById('modalDescription').innerText = desc;
        
        const tagsContainer = document.getElementById('modalTags');
        tagsContainer.innerHTML = tags.map(tag => 
            `<span class="modal-tag">${tag}</span>`
        ).join('');
        
        modal.style.display = "block";
    });
});

span.onclick = () => modal.style.display = "none";
window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
}

document.querySelector('.apply-btn').addEventListener('click', () => {
    alert('Application form will open in new window');
    // window.open('apply-form.html', '_blank');
});

auth.onAuthStateChanged(async (user) => {
    const profileSection = document.getElementById('profileSection');
    const loginBtn = document.getElementById('loginBtn');
    
    if (user) {
        // Ambil data pengguna dari Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        // Tampilkan profil
        profileSection.style.display = 'flex';
        document.getElementById('profileName').textContent = userData.name;
        loginBtn.style.display = 'none';
    } else {
        // Tampilkan tombol login
        profileSection.style.display = 'none';
        loginBtn.style.display = 'block';
    }
});