import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    serverTimestamp,
    getDocs,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import {
    getDatabase,
    ref,
    onValue,
    get
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
let currentUserId = null;
let currentUserEmail = null;

// Auth State
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const profileSection = document.getElementById('profileSection');
    const profileName = document.getElementById('profileName');
    const sidebarProfileName = document.getElementById('sidebarProfileName');
    const sidebarProfileSchool = document.getElementById('sidebarProfileSchool');
    const sidebarProfileMajor = document.getElementById('sidebarProfileMajor');

    if (user) {
        currentUserId = user.uid;
        currentUserEmail = user.email;
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                profileName.textContent = userData.name || "User";
                sidebarProfileName.textContent = userData.name || "User";
                sidebarProfileSchool.textContent = userData.school || "Unknown School";
                sidebarProfileMajor.textContent = userData.major || "Unknown Major";
                localStorage.setItem('userRole', userData.role);
            } else {
                profileName.textContent = "User";
            }

            const likedDocRef = doc(db, "likedScholarships", user.uid);
            const likedSnap = await getDoc(likedDocRef);

            likedScholarshipIds = likedSnap.exists() ? likedSnap.data().scholarshipIds || [] : [];

            loginBtn.style.display = "none";
            profileSection.style.display = "flex";
            loadScholarships();
        } catch (error) {
            console.error("Error getting user data:", error);
        } finally {
            document.body.classList.add('loaded');
        }
    }else {
        localStorage.removeItem('userRole');
    }
});

document.getElementById('homeLogo')?.addEventListener('click', function(e) {
  e.preventDefault();
  
  const userRole = localStorage.getItem('userRole');
  
  if (userRole === 'student') {
    window.location.href = 'student-dashboard.html';
  } 
  else if (userRole === 'provider' || userRole === 'admin') {
    window.location.href = 'provider-dashboard.html';
  } 
  else {
    window.location.href = 'index.html';
  }
});

document.getElementById('homeLink')?.addEventListener('click', function(e) {
  e.preventDefault();
  
  const userRole = localStorage.getItem('userRole');
  
  if (userRole === 'student') {
    window.location.href = 'student-dashboard.html';
  } 
  else if (userRole === 'provider' || userRole === 'admin') {
    window.location.href = 'provider-dashboard.html';
  } 
  else {
    window.location.href = 'index.html';
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
    if (!createdTimeStr) return "Unknown time"; // Handle jika createdTimeStr null atau undefined
    const parts = createdTimeStr.split(", ");
    if (parts.length !== 2) return "Invalid time format";

    const [datePart, timePart] = parts;
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes, seconds] = timePart.split(".").map(Number);
    
    // Periksa apakah hasil parsing valid
    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        return "Invalid date components";
    }

    const createdDate = new Date(year, month - 1, day, hours, minutes, seconds);
    if (isNaN(createdDate.getTime())) return "Invalid date object"; // Periksa apakah objek Date valid

    const now = new Date();
    const diffInSeconds = Math.floor((now - createdDate) / 1000);

    if (diffInSeconds < 0) return `Just posted`;
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


    const requirementSnippet = requirements.slice(0, 2).map((req, i) => `<li>${i + 1}. ${req.substring(0, 50)}${req.length > 50 ? '...' : ''}</li>`).join("");

    const wrapper = document.createElement("div");
    wrapper.classList.add("scholarship-card");
    wrapper.style.cursor = "pointer";
    wrapper.dataset.scholarshipId = data.id;

    let applicationStatusHTML = "";
    if (data.applicationStatus) {
        const statusText = data.applicationStatus.charAt(0).toUpperCase() + data.applicationStatus.slice(1);
        applicationStatusHTML = `<p class="application-status" style="font-weight: bold; color: #007bff; margin-top: 5px; margin-bottom: 5px;">Status: ${statusText}</p>`;
    }

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
            ${applicationStatusHTML}
            <p><strong>${data.startDate || "?"} - ${data.deadline || "?"}</strong></p>
            <p><strong>Requirement:</strong></p>
            <ul style="padding-left: 1.2rem; margin: 0;">
                ${requirementSnippet}
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

    // Tandai jika sudah dilike
    if (currentUserId && likedScholarshipIds.includes(data.id)) {
        heartIcon.classList.remove("bx-heart");
        heartIcon.classList.add("bxs-heart");
        heartIcon.style.color = "red";
    }

    // Like/Unlike event
    heartIcon.addEventListener("click", async (event) => {
        event.stopPropagation();
        if (!currentUserId) {
            alert("Please login to like scholarships.");
            return;
        }
        const scholarshipIdForLike = heartIcon.dataset.id;
        const userDocRef = doc(db, "likedScholarships", currentUserId);

        try {
            const userDocSnap = await getDoc(userDocRef);
            let currentLiked = userDocSnap.exists() ? userDocSnap.data().scholarshipIds || [] : [];
            const isLiked = currentLiked.includes(scholarshipIdForLike);

            if (isLiked) {
                currentLiked = currentLiked.filter(id => id !== scholarshipIdForLike);
                heartIcon.classList.remove("bxs-heart");
                heartIcon.classList.add("bx-heart");
                heartIcon.style.color = "";
            } else {
                currentLiked.push(data.id);
                heartIcon.classList.remove("bx-heart");
                heartIcon.classList.add("bxs-heart");
                heartIcon.style.color = "red";
            }

            await setDoc(userDocRef, { scholarshipIds: currentLiked });
            likedScholarshipIds = currentLiked;
        } catch (err) {
            console.error("Error updating wishlist:", err);
        }
    });

    // Modal
    wrapper.addEventListener("click", async() => {
        const modal = document.getElementById("scholarshipModal");
        const modalBody = document.getElementById("modalBody");
        const applyBtnModal = document.getElementById("applyNowBtnModal");

        const fullRequirementListHTML = requirements.length > 0 ? requirements.map((req, i) => `<li>${i + 1}. ${req}</li>`).join("") : "<li>No specific requirements listed.</li>";
        const fullMajorListHTML = majors.length > 0 ? majors.map(tag => `<span class="tag">${tag}</span>`).join("") : "Any major";

        let modalApplicationStatusHTML = "";
        if (data.applicationStatus) {
            const statusText = data.applicationStatus.charAt(0).toUpperCase() + data.applicationStatus.slice(1);
            modalApplicationStatusHTML = `<p style="font-weight:bold; color: #007bff; margin-bottom:10px;">Your Application Status: ${statusText}</p>`;
        }

        modalBody.innerHTML = `
            <h2>${data.title || "Beasiswa"}</h2>
            ${modalApplicationStatusHTML}
            <p>${data.companyName}</p>
            <p>${data.location}</p>
            <p>${data.startDate || "?"} - ${data.deadline || "?"}</p>
            <div class="modal-majors">${fullMajorListHTML}</div>
            <p><strong>Requirements:</strong></p>
            <ul style="padding-left: 1.2rem;">${fullRequirementListHTML}</ul>
        `;
        applyBtnModal.dataset.scholarshipId = data.id;
        applyBtnModal.dataset.scholarshipTitle = data.title || "this scholarship"; // Untuk pesan konfirmasi

        // NGILANGIN BUTTON
        applyBtnModal.textContent = "Apply Now";
        applyBtnModal.disabled = false;
        applyBtnModal.style.display = "block";

        if (currentUserId) {
            try {
                const scholarshipApplicationDocRef = doc(db, "appliedScholar", data.id);
                const docSnap = await getDoc(scholarshipApplicationDocRef);

                if (docSnap.exists() && docSnap.data() && docSnap.data()[currentUserId]) {
                    applyBtnModal.style.display = "none"; // Hide the button

                    if (!modalApplicationStatusHTML) {
                        const userApplication = docSnap.data()[currentUserId];
                        const statusText = userApplication.status ? userApplication.status.charAt(0).toUpperCase() + userApplication.status.slice(1) : "Status Unknown";
                         // Prepend or append this status to modalBody if desired
                        const statusDiv = document.createElement('p');
                        statusDiv.innerHTML = `<p style="font-weight:bold; color: #007bff; margin-bottom:10px;">Your Application Status: ${statusText}</p>`;
                        modalBody.insertBefore(statusDiv, modalBody.firstChild);
                    }

                } else {
                    applyBtnModal.style.display = "block";
                }
            } catch (error) {
                console.error("Error checking application status for modal:", error);
                applyBtnModal.style.display = "block";
            }
        } else {
            applyBtnModal.style.display = "block"; 
        }
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
        if (!snapshot.exists()) {
            scholarshipContainer.innerHTML = `<p style="padding: 2rem;">No scholarships available at the moment.</p>`;
            return;
        }
        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            data.id = childSnapshot.key;
            const cardElement = createScholarshipCard(data);
            scholarshipContainer.appendChild(cardElement);
        });
    }, (error) => {
        console.error("Error loading scholarships from RTDB:", error);
        scholarshipContainer.innerHTML = `<p style="padding: 2rem; color: red;">Error loading scholarships. Please try again later.</p>`;
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

// APPLY SCHOLAR
const applyNowBtnModal = document.getElementById('applyNowBtnModal');
applyNowBtnModal.addEventListener('click', async () => {
    if (!currentUserId) {
        alert("Please login to apply for scholarships.");
        return;
    }

    const scholarshipId = applyNowBtnModal.dataset.scholarshipId;
    const scholarshipTitle = applyNowBtnModal.dataset.scholarshipTitle;

    if (!scholarshipId) {
        alert("Error: Scholarship ID not found.");
        return;
    }

    if (!confirm(`Are you sure you want to apply for "${scholarshipTitle}"?`)) {
        return;
    }
    
    applyNowBtnModal.disabled = true;
    applyNowBtnModal.textContent = "Processing...";

    try {
        const scholarshipApplicationDocRef = doc(db, "appliedScholar", scholarshipId);
        const docSnap = await getDoc(scholarshipApplicationDocRef);

        if (docSnap.exists() && docSnap.data()?.[currentUserId]) {
            alert(`You have already applied for "${scholarshipTitle}".`);
            document.getElementById("scholarshipModal").style.display = "none";
            applyNowBtnModal.disabled = false;
            applyNowBtnModal.textContent = "Apply Now";
            return;
        }
        
        // --- PERUBAHAN UTAMA ADA DI SINI ---
        const userApplicationData = {
            scholarshipTitle: scholarshipTitle,
            status: "applied",
            appliedAt: serverTimestamp(),
            userName: document.getElementById('sidebarProfileName').textContent,
            userSchool: document.getElementById('sidebarProfileSchool').textContent,
            userMajor: document.getElementById('sidebarProfileMajor').textContent,
            userEmail: currentUserEmail // Menambahkan email pengguna
        };

        const dataToWrite = {
            [currentUserId]: userApplicationData 
        };
        
        await setDoc(scholarshipApplicationDocRef, dataToWrite, { merge: true });

        alert(`Successfully applied for "${scholarshipTitle}"!`);
        
        // Update a list in the user's own document
        try {
            const userDocRef = doc(db, "users", currentUserId);
            await setDoc(userDocRef, {
                appliedScholarshipIds: arrayUnion(scholarshipId) 
            }, { merge: true });
        } catch (denormError) {
            console.error("Error updating user's applied list:", denormError);
        }
            
        document.getElementById("scholarshipModal").style.display = "none";

    } catch (error) {
        console.error("Error submitting application: ", error);
        alert("Failed to submit application. Please try again.");
    } finally {
        applyNowBtnModal.disabled = false;
        applyNowBtnModal.textContent = "Apply Now";
    }
});

async function showAppliedScholarships() {
    if (!currentUserId) {
        alert("Please login to see your applied scholarships.");
        loadScholarships();
        return;
    }

    const scholarshipContainer = document.getElementById("scholarshipCards");
    scholarshipContainer.innerHTML = `<p style="padding: 2rem;">Loading your applications...</p>`;

    try {
        const applicationsCollectionRef = collection(db, "appliedScholar");
        const allApplicationsSnapshot = await getDocs(applicationsCollectionRef);

        if (allApplicationsSnapshot.empty) {
            scholarshipContainer.innerHTML = `<p style="padding: 2rem;">No applications found system-wide, or you haven't applied yet.</p>`;
            return;
        }

        scholarshipContainer.innerHTML = "";
        let foundAppliedScholarships = [];

        allApplicationsSnapshot.forEach(docSnap => {
            if (docSnap.data()[currentUserId]) {
                foundAppliedScholarships.push(docSnap.id);
            }
        });

        if (foundAppliedScholarships.length === 0) {
            scholarshipContainer.innerHTML = `<p style="padding: 2rem;">You haven't applied for any scholarships yet.</p>`;
            return;
        }

        const scholarshipPromises = foundAppliedScholarships.map(scholarshipId => {
            const scholarshipRef = ref(rtdb, `scholarships/${scholarshipId}`);
            return get(scholarshipRef).then(scholarshipSnapshot => {
                if (scholarshipSnapshot.exists()) {
                    const scholarshipData = scholarshipSnapshot.val();
                    scholarshipData.id = scholarshipSnapshot.key;

                    return scholarshipData;
                }
                return null;
            });
        });

        const scholarshipDetails = await Promise.all(scholarshipPromises);
        
        let cardsRendered = 0;
        scholarshipDetails.forEach(data => {
            if (data) {
                const cardElement = createScholarshipCard(data);
                scholarshipContainer.appendChild(cardElement);
                cardsRendered++;
            }
        });
        
        if (cardsRendered === 0) {
            scholarshipContainer.innerHTML = `<p style="padding: 2rem;">Applied scholarships details could not be loaded, or they are no longer available.</p>`;
        }

    } catch (error) {
        console.error("Error fetching applied scholarships: ", error);
        scholarshipContainer.innerHTML = `<p style="padding: 2rem; color: red;">Error loading your applications.</p>`;
    }
}

document.getElementById("applied-scholarships-btn").addEventListener("click", (e) => {
    e.preventDefault();
    showAppliedScholarships();
});

async function showInProgressApplications() {
    if (!currentUserId) {
        alert("Please login to see your in-progress applications.");
        loadScholarships();
        return;
    }

    const scholarshipContainer = document.getElementById("scholarshipCards");
    scholarshipContainer.innerHTML = `<p style="padding: 2rem;">Loading your in-progress applications...</p>`;

    // Daftar status "In Progress"
    const inProgressTargetStatuses = ["applied", "under review", "shortlisted", "interview scheduled", "documents pending", "pending decision", "accepted", "rejected"];


    try {
        const applicationsCollectionRef = collection(db, "appliedScholar");
        const allApplicationsSnapshot = await getDocs(applicationsCollectionRef);

        if (allApplicationsSnapshot.empty) {
            scholarshipContainer.innerHTML = `<p style="padding: 2rem;">No application data found in the system.</p>`;
            return;
        }

        let inProgressScholarshipData = []; 

        allApplicationsSnapshot.forEach(scholarshipDoc => {
            const scholarshipId = scholarshipDoc.id;
            const applicationsInScholarship = scholarshipDoc.data(); 
            
            if (applicationsInScholarship && applicationsInScholarship[currentUserId]) {
                const userApplication = applicationsInScholarship[currentUserId];
                if (userApplication.status && inProgressTargetStatuses.includes(userApplication.status.toLowerCase())) {
                    inProgressScholarshipData.push({ 
                        id: scholarshipId, 
                        status: userApplication.status 
                    });
                }
            }
        });

        if (inProgressScholarshipData.length === 0) {
            scholarshipContainer.innerHTML = `<p style="padding: 2rem;">You have no applications currently matching the in-progress statuses: ${inProgressTargetStatuses.join(', ')}.</p>`;
            return;
        }

        scholarshipContainer.innerHTML = ""; 

        const scholarshipDetailPromises = inProgressScholarshipData.map(appData => {
            const scholarshipRTDBRef = ref(rtdb, `scholarships/${appData.id}`);
            return get(scholarshipRTDBRef).then(rtdbSnap => {
                if (rtdbSnap.exists()) {
                    const rtData = rtdbSnap.val();
                    rtData.id = rtdbSnap.key;
                    rtData.applicationStatus = appData.status; 
                    return rtData;
                }
                console.warn(`Scholarship details for ID ${appData.id} not found in RTDB for in-progress list.`);
                return null; 
            });
        });

        const finalScholarshipDetails = await Promise.all(scholarshipDetailPromises);
        
        let cardsRendered = 0;
        finalScholarshipDetails.forEach(data => {
            if (data) { 
                const cardElement = createScholarshipCard(data);
                scholarshipContainer.appendChild(cardElement);
                cardsRendered++;
            }
        });
        
        if (cardsRendered === 0 && inProgressScholarshipData.length > 0) {
            scholarshipContainer.innerHTML = `<p style="padding: 2rem;">Details for your in-progress applications could not be loaded or they are no longer available.</p>`;
        } else if (cardsRendered === 0) { 
             scholarshipContainer.innerHTML = `<p style="padding: 2rem;">You have no applications currently matching the in-progress statuses.</p>`;
        }

    } catch (error) {
        console.error("Error fetching in-progress applications: ", error);
        scholarshipContainer.innerHTML = `<p style="padding: 2rem; color: red;">Error loading your in-progress applications.</p>`;
    }
}

const inProgressBtn = document.getElementById("inprogress-scholarships-btn");
if (inProgressBtn) {
    inProgressBtn.addEventListener("click", (e) => {
        e.preventDefault();
        showInProgressApplications();
    });
}

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