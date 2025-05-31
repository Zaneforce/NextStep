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
    onValue
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";


// Firebase Config
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
let likedScholarshipIds = [];

// Auth State
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const profileSection = document.getElementById('profileSection');
    const profileName = document.getElementById('profileName');
    const sidebarProfileName = document.getElementById('sidebarProfileName');
    const sidebarProfileSchool = document.getElementById('sidebarProfileSchool');
    const sidebarProfileMajor = document.getElementById('sidebarProfileMajor');

    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const likedRef = doc(db, "likedScholarships", user.uid);
            const likedSnap = await getDoc(likedRef);
            likedScholarshipIds = likedSnap.exists() ? likedSnap.data().scholarshipIds || [] : [];

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                profileName.textContent = userData.name || "User";
                sidebarProfileName.textContent = userData.name || "User";
                sidebarProfileSchool.textContent = userData.school || "Unknown School";
                sidebarProfileMajor.textContent = userData.major || "Unknown Major";
            } else {
                profileName.textContent = "User";
            }

            loginBtn.style.display = "none";
            profileSection.style.display = "flex";
            loadScholarships();
        } catch (error) {
            console.error("Error getting user data:", error);
            console.error("Gagal ambil likedScholarships:", e);
        }
    }
});

document.getElementById("searchBar").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        const keyword = e.target.value.trim().toLowerCase();
        if (keyword === "") {
            loadScholarships(); // Kembali ke semua data
        } else {
            searchScholarships(keyword);
        }
    }
});

// Time Formatter
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

// Card Builder
function createScholarshipCard(data) {
    console.log("Rendering scholarship:", data.id);

    const maxTags = 5;
    const majors = Array.isArray(data.majors) ? data.majors : Object.values(data.majors || {});
    const requirements = data.requirements || [];

    const tagsToShow = majors.slice(0, maxTags);
    const hiddenCount = majors.length > maxTags ? majors.length - maxTags : 0;

    const tagHTML = tagsToShow.map(tag => `<span class="tag">${tag}</span>`).join("");
    const overflowTag = hiddenCount > 0 ? `<span class="tag">+${hiddenCount}</span>` : "";

    const requirementList = requirements.map((req, i) => `<li>${i + 1}. ${req}</li>`).join("");

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
        <div class="scholarship-card-tags">
            ${tagHTML}
            ${overflowTag}
        </div>
        <div class="scholarship-card-body">
            <h4>${data.title || "Beasiswa"}</h4>
            <p><strong>${data.startDate || "?"} - ${data.deadline || "?"}</strong></p>
            <p><strong>Requirement:</strong></p>
            <ul style="padding-left: 1.2rem; margin: 0;">
                ${requirementList}
            </ul>
            <span class="read-more">...</span>
        </div>
        <div class="scholarship-card-footer">
            <i class="bx bx-heart heart-icon" data-id="${data.id}" style="cursor: pointer;"></i>
            <div class="rating">
                <i class="bx bx-star"></i>
                <span>N/5</span>
            </div>
        </div>
    `;

    const heartIcon = wrapper.querySelector('.heart-icon');

    // ✅ Tandai jika sudah dilike
    if (likedScholarshipIds.includes(data.id)) {
        heartIcon.classList.remove("bx-heart");
        heartIcon.classList.add("bxs-heart");
        heartIcon.style.color = "red";
    }

    // ✅ Like/Unlike event
    heartIcon.addEventListener("click", async (event) => {
        event.stopPropagation();
        console.log("Heart clicked", data.id);

        const user = auth.currentUser;
        if (!user) {
            alert("Please login to like scholarships.");
            return;
        }

        const userDocRef = doc(db, "likedScholarships", user.uid);

        try {
            const userDocSnap = await getDoc(userDocRef);
            let liked = userDocSnap.exists() ? userDocSnap.data().scholarshipIds || [] : [];

            const isLiked = liked.includes(data.id);

            if (isLiked) {
                liked = liked.filter(id => id !== data.id);
                heartIcon.classList.remove("bxs-heart");
                heartIcon.classList.add("bx-heart");
                heartIcon.style.color = "";
            } else {
                liked.push(data.id);
                heartIcon.classList.remove("bx-heart");
                heartIcon.classList.add("bxs-heart");
                heartIcon.style.color = "red";
            }

            await setDoc(userDocRef, { scholarshipIds: liked });

        } catch (err) {
            console.error("Error updating wishlist:", err);
        }
    });

    // ✅ Modal
    wrapper.addEventListener("click", () => {
        const modal = document.getElementById("scholarshipModal");
        const modalBody = document.getElementById("modalBody");

        const fullMajorList = majors.map(tag => `<span class="tag">${tag}</span>`).join("");
        const fullRequirementList = requirements.map((req, i) => `<li>${i + 1}. ${req}</li>`).join("");

        modalBody.innerHTML = `
            <h2>${data.title || "Beasiswa"}</h2>
            <p>${data.companyName}</p>
            <p>${data.location}</p>
            <p>${data.startDate || "?"} - ${data.deadline || "?"}</p>
            <div class="modal-majors">${fullMajorList}</div>
            <p><strong>Requirements:</strong></p>
            <ul style="padding-left: 1.2rem;">${fullRequirementList}</ul>
        `;

        modal.style.display = "flex";
    });

    return wrapper;
}

function searchScholarships(keyword) {
    console.log("Searching...")
    const scholarshipContainer = document.getElementById("scholarshipCards");
    const scholarshipsRef = ref(rtdb, 'scholarships');

    onValue(scholarshipsRef, (snapshot) => {
        scholarshipContainer.innerHTML = "";

        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            data.id = childSnapshot.key;

            const fieldsToSearch = [
                data.companyName,
                data.description,
                data.title,
                data.location,
                ...(Array.isArray(data.majors) ? data.majors : Object.values(data.majors || {})),
                ...(Array.isArray(data.requirements) ? data.requirements : Object.values(data.requirements || {}))
            ];

            const matchFound = fieldsToSearch.some(field =>
                typeof field === "string" && field.toLowerCase().includes(keyword)
            );

            if (matchFound) {
                const cardElement = createScholarshipCard(data);
                scholarshipContainer.appendChild(cardElement);
            }
        });

        if (scholarshipContainer.children.length === 0) {
            scholarshipContainer.innerHTML = `<p style="padding: 2rem;">No scholarships matched your search.</p>`;
        }
    }, {
        onlyOnce: true
    });
}



// Modal Controls
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("scholarshipModal").style.display = "none";
});
window.addEventListener("click", (event) => {
    const modal = document.getElementById("scholarshipModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

// Load Scholarships
function loadScholarships() {
    const scholarshipContainer = document.getElementById("scholarshipCards");
    const scholarshipsRef = ref(rtdb, 'scholarships');
    
    onValue(scholarshipsRef, (snapshot) => {
        scholarshipContainer.innerHTML = "";
        snapshot.forEach(childSnapshot => {
        const data = childSnapshot.val();
        data.id = childSnapshot.key;
        const cardElement = createScholarshipCard(data);
        scholarshipContainer.appendChild(cardElement);
        });
    });
}

function showLikedScholarships() {
    const scholarshipContainer = document.getElementById("scholarshipCards");
    const scholarshipsRef = ref(rtdb, 'scholarships');

    onValue(scholarshipsRef, (snapshot) => {
        scholarshipContainer.innerHTML = ""; // clear cards

        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            data.id = childSnapshot.key;

            if (likedScholarshipIds.includes(data.id)) {
                const cardElement = createScholarshipCard(data);
                scholarshipContainer.appendChild(cardElement);
            }
        });

        // Jika tidak ada yang di-like
        if (scholarshipContainer.children.length === 0) {
            scholarshipContainer.innerHTML = `<p style="padding: 2rem;">You haven't liked any scholarships yet.</p>`;
        }
    }, {
        onlyOnce: true
    });
}

document.querySelector(".liked-scholarship-container").addEventListener("click", (e) => {
    e.preventDefault();
    showLikedScholarships();
});