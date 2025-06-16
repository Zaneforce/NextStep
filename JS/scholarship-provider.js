import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
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
const scholarshipListElement = document.getElementById('scholarshipList');
const selectedSchTitleElement = document.getElementById('selectedScholarshipTitle');
const applicantsTableBody = document.getElementById('applicantsTableBody');
const addNewScholarshipBtn = document.getElementById('addNewScholarshipBtn');
const addScholarshipModal = document.getElementById('addScholarshipModal');
const closeAddModalBtn = document.getElementById('closeAddModal');
const addScholarshipForm = document.getElementById('addScholarshipForm');
const applicantDetailModal = document.getElementById('applicantDetailModal');
const closeDetailModalBtn = document.getElementById('closeDetailModal');
const applicantDetailBody = document.getElementById('applicantDetailBody');
const modalTitle = document.getElementById('modalTitle');
const modalSubmitBtn = document.getElementById('modalSubmitBtn');

let currentProviderId = null;
let providerCompany = null;
let currentEditScholarshipId = null;
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
                loadProviderScholarships();
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

// SCHOLARSHIP CRUD
function loadProviderScholarships() {
    const scholarshipsRef = ref(rtdb, 'scholarships');
    onValue(scholarshipsRef, (snapshot) => {
        scholarshipListElement.innerHTML = '';
        if (!snapshot.exists()) {
            scholarshipListElement.innerHTML = '<li>You have not posted any scholarships yet.</li>';
            return;
        }
        let hasScholarships = false;
        snapshot.forEach(childSnapshot => {
            const scholarshipData = childSnapshot.val();
            if (scholarshipData.creatorId === currentProviderId) {
                hasScholarships = true;
                const scholarshipId = childSnapshot.key;
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="scholarship-title">${scholarshipData.title}</span>
                    <div class="options-container">
                        <button class="options-btn">...</button>
                        <div class="options-dropdown" id="dropdown-${scholarshipId}">
                            <a href="#" class="update-btn">Update</a>
                            <a href="#" class="delete-btn">Delete</a>
                        </div>
                    </div>
                `;
                li.addEventListener('click', () => {
                    document.querySelectorAll('.scholarship-list li.active').forEach(item => item.classList.remove('active'));
                    li.classList.add('active');
                    loadApplicantsForScholarship(scholarshipId, scholarshipData.title);
                });
                li.querySelector('.options-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.options-dropdown.show').forEach(d => { if (d.id !== `dropdown-${scholarshipId}`) d.classList.remove('show'); });
                    document.getElementById(`dropdown-${scholarshipId}`).classList.toggle('show');
                });
                li.querySelector('.update-btn').addEventListener('click', (e) => { 
                    e.preventDefault(); e.stopPropagation(); openUpdateModal(scholarshipId, scholarshipData);
                });
                li.querySelector('.delete-btn').addEventListener('click', (e) => { 
                    e.preventDefault(); e.stopPropagation(); deleteScholarship(scholarshipId, scholarshipData.title); 
                });
                scholarshipListElement.appendChild(li);
            }
        });
        if (!hasScholarships) {
            scholarshipListElement.innerHTML = '<li>You have not posted any scholarships yet.</li>';
        }
    }, { onlyOnce: false });
}

function openUpdateModal(scholarshipId, scholarshipData) {
    currentEditScholarshipId = scholarshipId;
    modalTitle.textContent = 'Update Scholarship';
    modalSubmitBtn.textContent = 'Update Scholarship';
    document.getElementById('sch-title').value = scholarshipData.title || '';
    document.getElementById('sch-location').value = scholarshipData.location || '';
    document.getElementById('sch-startDate').value = formatDateToYYYYMMDD(scholarshipData.startDate);
    document.getElementById('sch-deadline').value = formatDateToYYYYMMDD(scholarshipData.deadline);
    document.getElementById('sch-duration').value = scholarshipData.duration || '';
    document.getElementById('sch-description').value = scholarshipData.description || '';
    document.getElementById('sch-status').value = scholarshipData.status || 'Open';
    document.getElementById('sch-requirements').value = (scholarshipData.requirements || []).join('\n');
    document.getElementById('sch-majors').value = (scholarshipData.majors || []).join('\n');
    addScholarshipModal.style.display = 'flex';
}

addScholarshipForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const scholarshipData = {
        title: document.getElementById('sch-title').value,
        location: document.getElementById('sch-location').value,
        startDate: formatDateToDDMMYYYY(document.getElementById('sch-startDate').value),
        deadline: formatDateToDDMMYYYY(document.getElementById('sch-deadline').value),
        duration: document.getElementById('sch-duration').value,
        description: document.getElementById('sch-description').value,
        status: document.getElementById('sch-status').value,
        requirements: document.getElementById('sch-requirements').value.split(/\n|,/).map(s => s.trim()).filter(Boolean),
        majors: document.getElementById('sch-majors').value.split(/\n|,/).map(s => s.trim()).filter(Boolean),
        companyName: providerCompany,
        creatorId: currentProviderId,
    };
    if (!scholarshipData.title || !scholarshipData.deadline) { alert("Please fill in at least the Title and Deadline fields."); return; }
    if (currentEditScholarshipId) {
        const originalRef = ref(rtdb, 'scholarships/' + currentEditScholarshipId);
        get(originalRef).then((snapshot) => {
            if (snapshot.exists()) scholarshipData.createdTime = snapshot.val().createdTime; 

            scholarshipData.updatedTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" });
            set(ref(rtdb, 'scholarships/' + currentEditScholarshipId), scholarshipData)
                .then(() => {
                    alert('Scholarship updated successfully!');
                    resetAndCloseModal();
                })
                .catch(error => {
                    console.error("Error updating scholarship:", error);
                    alert('Failed to update scholarship.');
                });
        });
    } else {
        scholarshipData.createdTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" });
        push(ref(rtdb, 'scholarships'), scholarshipData)
            .then(() => {
                alert('Scholarship posted successfully!');
                resetAndCloseModal();
            })
            .catch(error => {
                console.error("Error posting scholarship:", error);
                alert('Failed to post scholarship.');
            });
    }
});

addNewScholarshipBtn.addEventListener('click', () => { resetAndCloseModal(); addScholarshipModal.style.display = 'flex'; });
closeAddModalBtn.addEventListener('click', resetAndCloseModal);

closeDetailModalBtn.addEventListener('click', () => {
    applicantDetailModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == addScholarshipModal) resetAndCloseModal();
    if (event.target == applicantDetailModal) applicantDetailModal.style.display = 'none';
    if (!event.target.closest('.options-container')) {
        document.querySelectorAll('.options-dropdown.show').forEach(d => d.classList.remove('show'));
    }
});

// APPLICANT MANAGEMENT
async function loadApplicantsForScholarship(scholarshipId, scholarshipTitle) {
    selectedSchTitleElement.textContent = `Applicants for: ${scholarshipTitle}`;
    applicantsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
    try {
        const appDocRef = doc(db, "appliedScholar", scholarshipId);
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
                    <select class="status-select" data-scholarship-id="${scholarshipId}" data-applicant-id="${applicantId}">
                        <option value="applied" ${application.status === 'applied' ? 'selected' : ''}>Applied</option>
                        <option value="under review" ${application.status === 'under review' ? 'selected' : ''}>Under Review</option>
                        <option value="shortlisted" ${application.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                        <option value="interview scheduled" ${application.status === 'interview scheduled' ? 'selected' : ''}>Interview Scheduled</option>
                        <option value="documents pending" ${application.status === 'documents pending' ? 'selected' : ''}>Documents Pending</option>
                        <option value="pending decision" ${application.status === 'pending decision' ? 'selected' : ''}>Pending Decision</option>
                        <option value="accepted" ${application.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                        <option value="rejected" ${application.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </td>
                <td data-label="Actions">
                <button class="view-details-btn" data-applicant-id="${applicantId}" data-scholarship-id="${scholarshipId}">View Details</button>
            </td>
            `;
            applicantsTableBody.appendChild(tr);
        }

        applicantsTableBody.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => showApplicantDetails(btn.dataset.scholarshipId, btn.dataset.applicantId));
        });

        applicantsTableBody.querySelectorAll('.status-select').forEach(select => {
            let originalStatus = select.value;
            select.addEventListener('change', (e) => {
                const newStatus = e.target.value;
                if (window.confirm(`Change this applicant's status to "${newStatus}"?`)) {
                    updateApplicantStatus(e.target.dataset.scholarshipId, e.target.dataset.applicantId, newStatus);
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

async function updateApplicantStatus(scholarshipId, applicantId, newStatus) {
    if (!scholarshipId || !applicantId) {
        console.error("Cannot update status: scholarshipId or applicantId is missing.");
        alert("An error occurred: Missing critical ID.");
        return;
    }

    const appDocRef = doc(db, "appliedScholar", scholarshipId);
    const fieldPath = `${applicantId}.status`;

    try {
        await updateDoc(appDocRef, {[fieldPath]: newStatus});
        alert(`Status updated to "${newStatus}" successfully.`);
    } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status. Please try again.");
    }
}

function deleteScholarship(scholarshipId, scholarshipTitle) {
    if (confirm(`Delete "${scholarshipTitle}"?`)) {
        remove(ref(rtdb, 'scholarships/' + scholarshipId))
            .then(() => { alert('Scholarship deleted.'); })
            .catch(error => { console.error(error); alert("Failed to delete."); });
    }
}

async function showApplicantDetails(scholarshipId, applicantId) {
    applicantDetailBody.innerHTML = '<p>Loading details...</p>';
    applicantDetailModal.style.display = 'flex';

    if (!scholarshipId || !applicantId) {
        applicantDetailBody.innerHTML = '<p style="color:red;">Error: Missing information to load details.</p>';
        return;
    }

    try {
        const appDocRef = doc(db, "appliedScholar", scholarshipId);
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
    addScholarshipForm.reset();
    currentEditScholarshipId = null;
    modalTitle.textContent = 'Add New Scholarship';
    modalSubmitBtn.textContent = 'Add Scholarship';
    addScholarshipModal.style.display = 'none';
}

let lastScroll = 0;
const header = document.querySelector("header");

// SCROLL NAV
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
