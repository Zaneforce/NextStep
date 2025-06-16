// internship-provider.js (Customized from scholarship-provider.js)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getDatabase, ref, onValue, push, remove, set, get } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

// FIREBASE
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

// DOM
const internshipListElement = document.getElementById('internshipList');
const selectedInternshipTitleElement = document.getElementById('selectedInternshipTitle');
const applicantsTableBody = document.getElementById('applicantsTableBody');
const addNewInternshipBtn = document.getElementById('addNewInternshipBtn');
const addInternshipModal = document.getElementById('addInternshipModal');
const closeAddModalBtn = document.getElementById('closeAddModal');
const addInternshipForm = document.getElementById('addInternshipForm');
const applicantDetailModal = document.getElementById('applicantDetailModal');
const closeDetailModalBtn = document.getElementById('closeDetailModal');
const applicantDetailBody = document.getElementById('applicantDetailBody');
const modalTitle = document.getElementById('modalTitle');
const modalSubmitBtn = document.getElementById('modalSubmitBtn');

let currentProviderId = null;
let providerCompany = null;
let currentEditInternshipId = null;
let authCheckCompleted = false;

// AUTHENTICATION
onAuthStateChanged(auth, async (user) => {
    if (authCheckCompleted) return;
    authCheckCompleted = true;

    const loginBtn = document.getElementById('loginBtn');
    const profileSection = document.getElementById('profileSection');
    const profileNameEl = document.getElementById('profileName');

    if (user) {
        currentProviderId = user.uid;
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && (userDocSnap.data().role === 'provider' || userDocSnap.data().role === 'admin')) {
                const provider = userDocSnap.data();
                profileNameEl.textContent = provider.name || "Provider User";
                providerCompany = provider.companyName;
                loginBtn.style.display = "none";
                profileSection.style.display = "flex";
                loadProviderInternships();
            } else {
                alert("Access Denied.");
                window.location.href = 'student-dashboard.html';
            }
        } catch (error) {
            console.error("Error verifying user role:", error);
            window.location.href = 'login.html';
        } finally {
            document.body.classList.add('loaded');
        }
    } else {
        alert("Please log in to access this page.");
        window.location.href = 'login.html';
    }
});

// LOGOUT FUNCTIONALITY
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

// HELPER FUNCTIONS
function formatDateToDDMMYYYY(d) { if (!d) return ''; const p = d.split('-'); return (p.length === 3) ? `${p[2]}/${p[1]}/${p[0]}` : d; }
function formatDateToYYYYMMDD(d) { if (!d) return ''; const p = d.split('/'); return (p.length === 3) ? `${p[2]}-${p[1]}-${p[0]}` : d; }

// INTERNSHIP CRUD
function loadProviderInternships() {
    const internshipsRef = ref(rtdb, 'internships'); 
    onValue(internshipsRef, (snapshot) => {
        internshipListElement.innerHTML = '';
        if (!snapshot.exists()) {
            internshipListElement.innerHTML = '<li>You have not posted any internships yet.</li>';
            return;
        }
        let hasInternships = false;
        snapshot.forEach(childSnapshot => {
            const internshipData = childSnapshot.val();
            if (internshipData.creatorId === currentProviderId) {
                hasInternships = true;
                const internshipId = childSnapshot.key;
                const li = document.createElement('li'); 
                li.innerHTML = `
                    <span class="internship-title">${internshipData.title}</span>
                    <div class="options-container">
                        <button class="options-btn">...</button>
                        <div class="options-dropdown" id="dropdown-${internshipId}">
                            <a href="#" class="update-btn">Update</a>
                            <a href="#" class="delete-btn">Delete</a>
                        </div>
                    </div>
                `;
                li.addEventListener('click', () => {
                    document.querySelectorAll('.internship-list li.active').forEach(item => item.classList.remove('active'));
                    li.classList.add('active');
                    loadApplicantsForInternship(internshipId, internshipData.title);
                });
                li.querySelector('.options-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.options-dropdown.show').forEach(d => { if (d.id !== `dropdown-${internshipId}`) d.classList.remove('show'); });
                    document.getElementById(`dropdown-${internshipId}`).classList.toggle('show');
                });
                li.querySelector('.update-btn').addEventListener('click', (e) => { 
                    e.preventDefault(); e.stopPropagation(); openUpdateModal(internshipId, internshipData); 
                });
                li.querySelector('.delete-btn').addEventListener('click', (e) => { 
                    e.preventDefault(); e.stopPropagation(); deleteInternship(internshipId, internshipData.title); 
                });
                internshipListElement.appendChild(li);
            }
        });
        if (!hasInternships) {
            internshipListElement.innerHTML = '<li>You have not posted any internships yet.</li>';
        }
        document.body.classList.add('loaded');
    });
}

function openUpdateModal(internshipId, internshipData) {
    currentEditInternshipId = internshipId;
    modalTitle.textContent = 'Update Internship';
    modalSubmitBtn.textContent = 'Update Internship';
    document.getElementById('int-title').value = internshipData.title || '';
    document.getElementById('int-location').value = internshipData.location || '';
    document.getElementById('int-startDate').value = formatDateToYYYYMMDD(internshipData.startDate);
    document.getElementById('int-deadline').value = formatDateToYYYYMMDD(internshipData.deadline);
    document.getElementById('int-duration').value = internshipData.duration || '';
    
    document.getElementById('int-job').value = internshipData.job || '';
    document.getElementById('int-salary').value = internshipData.expectedSalary || '';

    document.getElementById('int-description').value = internshipData.description || '';
    document.getElementById('int-status').value = internshipData.status || 'Open';
    document.getElementById('int-requirements').value = (internshipData.requirements || []).join('\n');
    addInternshipModal.style.display = 'flex';
}

addInternshipForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const internshipData = {
        title: document.getElementById('int-title').value,
        location: document.getElementById('int-location').value,
        startDate: formatDateToDDMMYYYY(document.getElementById('int-startDate').value),
        deadline: formatDateToDDMMYYYY(document.getElementById('int-deadline').value),
        duration: document.getElementById('int-duration').value,
        
        // --> Tambahkan baris ini
        job: document.getElementById('int-job').value,
        expectedSalary: document.getElementById('int-salary').value,

        description: document.getElementById('int-description').value,
        status: document.getElementById('int-status').value,
        requirements: document.getElementById('int-requirements').value.split(/\n|,/).map(s => s.trim()).filter(Boolean),
        companyName: providerCompany,
        creatorId: currentProviderId,
    };
    if (!internshipData.title || !internshipData.deadline) { alert("Please fill in at least the Title and Deadline fields."); return; }
    if (currentEditInternshipId) {
        const originalRef = ref(rtdb, 'internships/' + currentEditInternshipId);
        get(originalRef).then((snapshot) => {
            if (snapshot.exists()) internshipData.createdTime = snapshot.val().createdTime; 
            internshipData.updatedTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" });
            set(ref(rtdb, 'internships/' + currentEditInternshipId), internshipData)
                .then(() => {
                    alert('Internship updated successfully!'); resetAndCloseModal();
                })
                .catch(error => {
                    console.error(error);
                    alert('Failed to update internship.');
                });
        });
    } else {
        internshipData.createdTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" });
        push(ref(rtdb, 'internships'), internshipData)
            .then(() => { alert('Internship posted successfully!'); resetAndCloseModal(); })
            .catch(error => { console.error(error); alert('Failed to post internship.'); });
    }
});

addNewInternshipBtn.addEventListener('click', () => { resetAndCloseModal(); addInternshipModal.style.display = 'flex'; });
closeAddModalBtn.addEventListener('click', resetAndCloseModal);

closeDetailModalBtn.addEventListener('click', () => {
    applicantDetailModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == addInternshipModal) resetAndCloseModal();
    if (event.target == applicantDetailModal) applicantDetailModal.style.display = 'none';
    if (!event.target.closest('.options-container')) {
        document.querySelectorAll('.options-dropdown.show').forEach(d => d.classList.remove('show'));
    }
});

// --- APPLICANT MANAGEMENT ---
async function loadApplicantsForInternship(internshipId, internshipTitle) {
    selectedInternshipTitleElement.textContent = `Applicants for: ${internshipTitle}`;
    applicantsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
    try {
        const appDocRef = doc(db, "appliedIntern", internshipId); // <-- Path diubah ke 'appliedIntern'
        const appDocSnap = await getDoc(appDocRef);
        if (!appDocSnap.exists() || Object.keys(appDocSnap.data()).length === 0) {
            applicantsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No applicants yet.</td></tr>';
            return;
        }
        const applicantsData = appDocSnap.data();
        applicantsTableBody.innerHTML = '';
        
        for (const applicantId in applicantsData) {
            const application = applicantsData[applicantId];
            const tr = document.createElement('tr');
            const appliedDate = application.appliedAt ? new Date(application.appliedAt.seconds * 1000).toLocaleDateString("en-GB") : 'N/A';
            
            tr.innerHTML = `
                <td data-label="Applicant Name">${application.userName || 'N/A'}</td>
                <td data-label="School">${application.userSchool || 'N/A'}</td>
                <td data-label="Applied Date">${appliedDate}</td>
                <td data-label="Current Status">
                    <select class="status-select" data-internship-id="${internshipId}" data-applicant-id="${applicantId}">
                        <option value="applied" ${application.status === 'applied' ? 'selected' : ''}>Applied</option>
                        <option value="under review" ${application.status === 'under review' ? 'selected' : ''}>Under Review</option>
                        <option value="shortlisted" ${application.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                        <option value="interview scheduled" ${application.status === 'interview scheduled' ? 'selected' : ''}>Interview Scheduled</option>
                        <option value="pending decision" ${application.status === 'pending decision' ? 'selected' : ''}>Pending Decision</option>
                        <option value="accepted" ${application.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                        <option value="rejected" ${application.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </td>
                <td data-label="Actions">
                    <button class="view-details-btn" data-applicant-id="${applicantId}" data-internship-id="${internshipId}">View Details</button>
                </td>
            `;
            applicantsTableBody.appendChild(tr);
        }

        applicantsTableBody.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => showApplicantDetails(btn.dataset.internshipId, btn.dataset.applicantId));
        });

        applicantsTableBody.querySelectorAll('.status-select').forEach(select => {
            let originalStatus = select.value;
            select.addEventListener('change', (e) => {
                const newStatus = e.target.value;
                if (window.confirm(`Change this applicant's status to "${newStatus}"?`)) {
                    updateApplicantStatus(e.target.dataset.internshipId, e.target.dataset.applicantId, newStatus);
                    originalStatus = newStatus;
                } else {
                    select.value = originalStatus;
                }
            });
        });
    } catch (error) {
        console.error("Error loading applicants:", error);
        applicantsTableBody.innerHTML = '<tr><td colspan="5" style="color:red;text-align:center;">Could not load applicants.</td></tr>';
    }
}

async function updateApplicantStatus(internshipId, applicantId, newStatus) {
    if (!internshipId || !applicantId) {
        console.error("Cannot update status: internshipId or applicantId is missing.");
        alert("An error occurred: Missing critical ID.");
        return;
    }
    const appDocRef = doc(db, "appliedIntern", internshipId);
    const fieldPath = `${applicantId}.status`;
    try {
        await updateDoc(appDocRef, {[fieldPath]: newStatus});
        alert(`Status updated to "${newStatus}" successfully.`);
    } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status. Please try again.");
    }
}

function deleteInternship(internshipId, internshipTitle) {
    if (confirm(`Delete "${internshipTitle}"?`)) {
        remove(ref(rtdb, 'internships/' + internshipId))
            .then(() => alert('Internship deleted.'))
            .catch(error => { console.error(error); alert("Failed to delete."); });
    }
}

async function showApplicantDetails(internshipId, applicantId) {
    applicantDetailBody.innerHTML = '<p>Loading details...</p>';
    applicantDetailModal.style.display = 'flex';
    if (!internshipId || !applicantId) {
        applicantDetailBody.innerHTML = '<p style="color:red;">Error: Missing information to load details.</p>';
        return;
    }
    try {
        const appDocRef = doc(db, "appliedIntern", internshipId);
        const appDocSnap = await getDoc(appDocRef);

        if (!appDocSnap.exists() || !appDocSnap.data()[applicantId]) {
            applicantDetailBody.innerHTML = '<p>Could not find application data for this user.</p>';
            return;
        }

        const applicationData = appDocSnap.data()[applicantId];
        const userDocRef = doc(db, "users", applicantId);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? userDocSnap.data() : {};
        const skills = Array.isArray(userData.skills) ? userData.skills.join(', ') : 'N/A';

        applicantDetailBody.innerHTML = `
            <p><strong>Full Name:</strong> ${applicationData.userName || 'N/A'}</p>
            <p><strong>Email:</strong> ${applicationData.userEmail || 'N/A'}</p>
            <p><strong>Phone:</strong> ${userData.phoneNumber || 'N/A'}</p><hr>
            <p><strong>Institution:</strong> ${applicationData.userSchool || 'N/A'}</p>
            <p><strong>Major:</strong> ${applicationData.userMajor || 'N/A'}</p><hr>
            <p><strong>CV:</strong> ${userData.cvUrl ? `<a href="${userData.cvUrl}" target="_blank">View/Download CV</a>` : 'Not Provided'}</p>
            <p><strong>Skills:</strong> ${skills}</p>
        `;
    } catch (error) {
        console.error("Error fetching applicant details:", error);
        applicantDetailBody.innerHTML = '<p style="color:red;">Error loading details.</p>';
    }
}

// MODAL CONTROLS
function resetAndCloseModal() {
    addInternshipForm.reset();
    currentEditInternshipId = null;
    modalTitle.textContent = 'Add New Internship';
    modalSubmitBtn.textContent = 'Add Internship';
    addInternshipModal.style.display = 'none';
}

// SCROLL NAV
let lastScroll = 0;
const header = document.querySelector("header");

if (header) {
  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll <= 0) {
      header.classList.remove("hidden");
      return;
    }
    if (currentScroll > lastScroll && !header.classList.contains("hidden")) {
      header.classList.add("hidden");
    } else if (
      currentScroll < lastScroll &&
      header.classList.contains("hidden")
    ) {
      header.classList.remove("hidden");
    }
    lastScroll = currentScroll;
  });
}