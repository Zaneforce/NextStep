// === Firebase SDK ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import {
    getDatabase,
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

// === Firebase Config & Init ===
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

// === Scroll Hide Header ===
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
    } else if (currentScroll < lastScroll && header.classList.contains('hidden')) {
        header.classList.remove('hidden');
    }
    lastScroll = currentScroll;
});

// === Modal Close ===
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("scholarshipModal").style.display = "none";
});
window.addEventListener("click", (event) => {
    const modal = document.getElementById("scholarshipModal");
    if (event.target === modal) modal.style.display = "none";
});

document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("internshipModal").style.display = "none";
});
window.addEventListener("click", (event) => {
    const modal = document.getElementById("internshipModal");
    if (event.target === modal) modal.style.display = "none";
});

// === Auth & Profile Section ===
onAuthStateChanged(auth, async (user) => {
    const profileSection = document.getElementById('profileSection');
    const loginBtn = document.getElementById('loginBtn');
    const profileName = document.getElementById('profileName');
    const sidebarProfileName = document.getElementById('sidebarProfileName');
    const sidebarProfileSchool = document.getElementById('sidebarProfileSchool');
    const sidebarProfileMajor = document.getElementById('sidebarProfileMajor');

    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (profileName) profileName.textContent = userData.name || "User";
                if (sidebarProfileName) sidebarProfileName.textContent = userData.name || "User";
                if (sidebarProfileSchool) sidebarProfileSchool.textContent = userData.school || "Unknown School";
                if (sidebarProfileMajor) sidebarProfileMajor.textContent = userData.major || "Unknown Major";
            } else {
                profileName.textContent = "User";
            }

            if (loginBtn) loginBtn.style.display = "none";
            if (profileSection) profileSection.style.display = "flex";

            loadScholarships();
            loadInternships();
        } catch (error) {
            console.error("Error getting user data:", error);
        } finally {
            document.body.classList.add('loaded');
        }
    } else {
        if (loginBtn) loginBtn.style.display = "block";
        if (profileSection) profileSection.style.display = "none";
        loadScholarships();
    } 
});

// === Time Ago Utility ===
function calculateTimeAgo(createdTimeStr) {
    const [datePart, timePart] = createdTimeStr.split(", ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes, seconds] = timePart.split(".").map(Number);
    const createdDate = new Date(year, month - 1, day, hours, minutes, seconds);
    const now = new Date();
    const diff = Math.floor((now - createdDate) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

// === Scholarship Card Builder ===
function createScholarshipCard(data) {
    const majors = Array.isArray(data.majors) ? data.majors : Object.values(data.majors || {});
    const requirements = data.requirements || [];
    const tagHTML = majors.slice(0, 5).map(tag => `<span class="tag">${tag}</span>`).join("");
    const overflowTag = majors.length > 5 ? `<span class="tag">+${majors.length - 5}</span>` : "";

    const wrapper = document.createElement("div");
    wrapper.classList.add("scholarship-card");
    wrapper.style.cursor = "pointer";

    wrapper.innerHTML = `
        <div class="scholarship-card-header">
            <div>
                <h3 class="scholarship-card-provider">${data.companyName}</h3>
                <p class="scholarship-card-provider-loc">${data.location}</p>
            </div>
            <span class="time-ago">${calculateTimeAgo(data.createdTime)}</span>
        </div>
        <div class="scholarship-card-tags">${tagHTML}${overflowTag}</div>
        <div class="scholarship-card-body">
            <h4>${data.title || "Beasiswa"}</h4>
            <p><strong>${data.startDate || "?"} - ${data.deadline || "?"}</strong></p>
            <p><strong>Requirement:</strong></p>
            <ul style="padding-left: 1.2rem; margin: 0;">
                ${requirements.map((r, i) => `<li>${i + 1}. ${r}</li>`).join("")}
            </ul>
            <span class="read-more">...</span>
        </div>
        <div class="scholarship-card-footer">
        </div>
    `;

    wrapper.addEventListener("click", () => {
        const modal = document.getElementById("scholarshipModal");
        const modalBody = document.getElementById("scholarshipModalBody");

        modalBody.innerHTML = `
            <h2>${data.title || "Beasiswa"}</h2>
            <p>${data.companyName}</p>
            <p>${data.location}</p>
            <p>${data.startDate || "?"} - ${data.deadline || "?"}</p>
            <div class="modal-majors">${majors.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
            <p><strong>Requirements:</strong></p>
            <ul style="padding-left: 1.2rem;">${requirements.map((req, i) => `<li>${i + 1}. ${req}</li>`).join("")}</ul>
        `;
        modal.style.display = "flex";
    });

    return wrapper;
}

function createInternshipCard(data) {
    const jobTag = data.job ? `<span class="tag">${data.job}</span>` : "";
    const requirements = data.requirements || [];
    const requirementList = requirements.map((req, i) => `<li>${i + 1}. ${req}</li>`).join("");

    const wrapper = document.createElement("div");
    wrapper.classList.add("internship-card");
    wrapper.style.cursor = "pointer";

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
            <p><strong>${data.startDate || "?"} - ${data.deadline || "?"}</strong></p>
            <p><strong>Requirement:</strong></p>
            <ul style="padding-left: 1.2rem; margin: 0;">${requirementList}</ul>
            <span class="read-more">...</span>
        </div>
        <div class="internship-card-footer">
        </div>
    `;

    wrapper.addEventListener("click", () => {
        const modal = document.getElementById("internshipModal");
        const modalBody = document.getElementById("internshipModalBody");

        const fullRequirementList = requirements.map((req, i) => `<li>${i + 1}. ${req}</li>`).join("");

        modalBody.innerHTML = `
            <h2>${data.title || "Internship"}</h2>
            <p>${data.companyName}</p>
            <p>${data.location}</p>
            <p>Expected Salary: ${data.expectedSalary || "-"}</p>
            <p>${data.startDate || "?"} - ${data.deadline || "?"}</p>
            <div class="modal-majors"><span class="tag">${data.job || "-"}</span></div>
            <p><strong>Requirements:</strong></p>
            <ul style="padding-left: 1.2rem;">${fullRequirementList}</ul>
        `;

        modal.style.display = "flex";
    });

    return wrapper;
}

// === Load All Scholarships ===
function loadScholarships() {
    const scholarshipContainer = document.getElementById("scholarshipCards");
    const scholarshipsRef = ref(rtdb, 'scholarships');

    onValue(scholarshipsRef, (snapshot) => {
        scholarshipContainer.innerHTML = "";
        let count = 0;
        snapshot.forEach(childSnapshot => {
            if (count >= 3) return;
            const data = childSnapshot.val();
            data.id = childSnapshot.key;
            const card = createScholarshipCard(data);
            scholarshipContainer.appendChild(card);
            count++;
        });
    });
}


// === Load All Internships ===
function loadInternships() {
    const internshipContainer = document.getElementById("internshipCards");
    const internshipsRef = ref(rtdb, 'internships');

    onValue(internshipsRef, (snapshot) => {
        internshipContainer.innerHTML = "";
        let count = 0;
        snapshot.forEach(childSnapshot => {
            if (count >= 3) return;
            const data = childSnapshot.val();
            data.id = childSnapshot.key;
            const card = createInternshipCard(data);
            internshipContainer.appendChild(card);
            count++;
        });
    });
}

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