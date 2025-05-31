import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import {
    getDatabase,
    ref,
    onValue,
    set
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
let allInternshipsData = [];

function renderInternships(snapshot) {
    internshipContainer.innerHTML = "";
    allInternshipsData = [];

    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        data.id = childSnapshot.key;
        allInternshipsData.push(data); // simpan ke cache

        const card = createInternshipCard(data);
        internshipContainer.appendChild(card);
    });
}

document.getElementById("searchBar").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const query = e.target.value.toLowerCase().trim();
        internshipContainer.innerHTML = "";

        if (!query) {
            // Jika kosong, tampilkan semua
            allInternshipsData.forEach(data => {
                const card = createInternshipCard(data);
                internshipContainer.appendChild(card);
            });
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
            return;
        }

        filtered.forEach(data => {
            const card = createInternshipCard(data);
            internshipContainer.appendChild(card);
        });
    }
});


// 🔄 Listen to internships and likes after auth
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const profileSection = document.getElementById('profileSection');
    const profileName = document.getElementById('profileName');
    const sidebarProfileName = document.getElementById('sidebarProfileName');
    const sidebarProfileSchool = document.getElementById('sidebarProfileSchool');
    const sidebarProfileMajor = document.getElementById('sidebarProfileMajor');

    if (user) {
        try {
            // Load profile info
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                profileName.textContent = userData.name || "User";
                sidebarProfileName.textContent = userData.name || "User";
                sidebarProfileSchool.textContent = userData.school || "Unknown School";
                sidebarProfileMajor.textContent = userData.major || "Unknown Major";
            }

            loginBtn.style.display = "none";
            profileSection.style.display = "flex";

            // 🔄 Listen to liked internships
            const likedDocRef = doc(db, "likedInternships", user.uid);
            const likedSnap = await getDoc(likedDocRef);
            likedInternshipIds.clear();
            if (likedSnap.exists()) {
                const data = likedSnap.data();
                (data.internshipIds || []).forEach(id => likedInternshipIds.add(id));
            }
            onValue(internshipsRef, renderInternships);

        } catch (error) {
            console.error("Error getting user data:", error);
        }
    } else {
        // Not logged in
        onValue(internshipsRef, renderInternships);
    }
});

function calculateTimeAgo(createdTimeStr) {
    const [datePart, timePart] = createdTimeStr.split(", ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes, seconds] = timePart.split(".").map(Number);
    const createdDate = new Date(year, month - 1, day, hours, minutes, seconds);
    const now = new Date();
    const diffInSeconds = Math.floor((now - createdDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
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
            <i class="bx ${likedInternshipIds.has(data.id) ? "bxs-heart" : "bx-heart"} heart-icon" 
                data-id="${data.id}" style="cursor: pointer; ${likedInternshipIds.has(data.id) ? "color: red;" : ""}">
            </i>
            <div class="rating">
                <i class="bx bx-star"></i>
                <span>N/5</span>
            </div>
        </div>
    `;

    const heartIcon = wrapper.querySelector('.heart-icon');

    heartIcon.addEventListener("click", async (event) => {
        event.stopPropagation();

        const user = auth.currentUser;
        if (!user) {
            alert("Please login to like internships.");
            return;
        }

        const likedDocRef = doc(db, "likedInternships", user.uid);
        const isLiked = likedInternshipIds.has(data.id);

        try {
            const likedSnap = await getDoc(likedDocRef);
            let currentLikes = likedSnap.exists() ? likedSnap.data().internshipIds || [] : [];

            if (isLiked) {
                currentLikes = currentLikes.filter(id => id !== data.id);
                likedInternshipIds.delete(data.id);
                heartIcon.classList.remove("bxs-heart");
                heartIcon.classList.add("bx-heart");
                heartIcon.style.color = "";
            } else {
                if (data.id) {
                    currentLikes.push(data.id);
                    likedInternshipIds.add(data.id);
                    heartIcon.classList.remove("bx-heart");
                    heartIcon.classList.add("bxs-heart");
                    heartIcon.style.color = "red";
                } else {
                    console.warn("data.id is undefined, cannot like this internship.");
                    return;
                }
            }


            await setDoc(likedDocRef, { internshipIds: currentLikes });
        } catch (err) {
            console.error("Error updating like in Firestore:", err);
        }
    });

    wrapper.addEventListener("click", () => {
        const modal = document.getElementById("internshipModal");
        const modalBody = document.getElementById("modalBody");

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

document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("internshipModal").style.display = "none";
});
window.addEventListener("click", (event) => {
    const modal = document.getElementById("intersnhipModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

document.getElementById("liked-internship-btn").addEventListener("click", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("Please login to view liked internships.");
        return;
    }

    try {
        // 🔄 Ambil dari Firestore
        const likedDocRef = doc(db, "likedInternships", user.uid);
        const likedSnap = await getDoc(likedDocRef);

        if (!likedSnap.exists()) {
            internshipContainer.innerHTML = "<p>No liked internships yet.</p>";
            return;
        }

        const likedIds = likedSnap.data().internshipIds || [];

        // 🔄 Ambil semua internship dari Realtime DB
        onValue(internshipsRef, (snapshot) => {
            internshipContainer.innerHTML = "";

            snapshot.forEach((childSnapshot) => {
                const id = childSnapshot.key;
                if (likedIds.includes(id)) {
                    const internshipData = childSnapshot.val();
                    internshipData.id = id;

                    const cardElement = createInternshipCard(internshipData);
                    internshipContainer.appendChild(cardElement);
                }
            });
        });
    } catch (err) {
        console.error("Error loading liked internships:", err);
    }
});

