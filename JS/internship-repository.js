import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
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
let currentUserId = null;

function displayInternships(internshipList) {
    internshipContainer.innerHTML = "";
    if (!internshipList || internshipList.length === 0) {
        internshipContainer.innerHTML = "<p>No internships to display.</p>";
        return;
    }
    internshipList.forEach(data => {
        const card = createInternshipCard(data);
        internshipContainer.appendChild(card);
    });
}

// 🔄 Listen to internships and likes after auth
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const profileSection = document.getElementById('profileSection');
    const profileName = document.getElementById('profileName');
    const sidebarProfileName = document.getElementById('sidebarProfileName');
    const sidebarProfileSchool = document.getElementById('sidebarProfileSchool');
    const sidebarProfileMajor = document.getElementById('sidebarProfileMajor');
    
    if (user) {
        currentUserId = user.uid;
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                profileName.textContent = userData.name || "User";
                sidebarProfileName.textContent = userData.name || "User";
                sidebarProfileSchool.textContent = userData.school || "Unknown School";
                sidebarProfileMajor.textContent = userData.major || "Unknown Major";
            }

            // 🔄 Listen to liked internships
            const likedDocRef = doc(db, "likedInternships", user.uid);
            const likedSnap = await getDoc(likedDocRef);
            
            likedInternshipIds.clear();
            if (likedSnap.exists()) {
                const data = likedSnap.data();
                (data.internshipIds || []).forEach(id => likedInternshipIds.add(id));
            }
            
            loginBtn.style.display = "none";
            profileSection.style.display = "flex";
            loadInternships();

        } catch (error) {
            console.error("Error getting user data:", error);
            loadInternships();
        }
    } else {
        // Not logged in
        loadInternships();
    }
});

document.getElementById("searchBar").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const query = e.target.value.toLowerCase().trim();

        if (!query) {
            displayInternships(allInternshipsData);
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
        }
        else{
            displayInternships(filtered);
        }
    }
});
function calculateTimeAgo(createdTimeStr) {
    if (!createdTimeStr) return "Unknown time";
    const parts = createdTimeStr.split(", ");
    if (parts.length !== 2) return "Invalid time format";

    const [datePart, timePart] = parts;
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes, seconds] = timePart.split(".").map(Number);
    
    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        return "Invalid date components";
    }

    const createdDate = new Date(year, month - 1, day, hours, minutes, seconds);
    if (isNaN(createdDate.getTime())) return "Invalid date object"; 
    const now = new Date();
    const diffInSeconds = Math.floor((now - createdDate) / 1000);

    if (diffInSeconds < 0) return `Just posted`;
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
    wrapper.dataset.internshipId = data.id;

    let applicationStatusHTML = "";
    if (data.applicationStatus) {
        const statusText = data.applicationStatus.charAt(0).toUpperCase() + data.applicationStatus.slice(1);
        applicationStatusHTML = `<p class="application-status" style="font-weight: bold; color: #007bff; margin-top: 5px; margin-bottom: 5px;">Status: ${statusText}</p>`;
    }

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
            ${applicationStatusHTML}
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

        const internshipId = heartIcon.dataset.id;
        const likedDocRef = doc(db, "likedInternships", user.uid);
        const isLiked = likedInternshipIds.has(internshipId);

        try {
            const likedSnap = await getDoc(likedDocRef);
            let currentLikes = likedSnap.exists() ? likedSnap.data().internshipIds || [] : [];

            if (isLiked) {
                currentLikes = currentLikes.filter(id => id !== internshipId);
                likedInternshipIds.delete(internshipId);
                heartIcon.classList.remove("bxs-heart");
                heartIcon.classList.add("bx-heart");
                heartIcon.style.color = "";
            } else {
                currentLikes.push(internshipId);
                likedInternshipIds.add(internshipId);
                heartIcon.classList.remove("bx-heart");
                heartIcon.classList.add("bxs-heart");
                heartIcon.style.color = "red";
            }
            await setDoc(likedDocRef, { internshipIds: currentLikes });
        } catch (err) {
            console.error("Error updating wishlist:", err);
        }
    });

    wrapper.addEventListener("click", async () => {
        const modal = document.getElementById("internshipModal");
        const modalBody = document.getElementById("modalBody");
        const applyBtnModal = document.getElementById("applyBtnModal");

        const fullRequirementList = requirements.map((req, i) => `<li>${i + 1}. ${req}</li>`).join("");

        let modalApplicationStatusHTML = "";
        if (data.applicationStatus) {
            const statusText = data.applicationStatus.charAt(0).toUpperCase() + data.applicationStatus.slice(1);
            modalApplicationStatusHTML = `<p style="font-weight:bold; color: #007bff; margin-bottom:10px;">Your Application Status: ${statusText}</p>`;
        }

        modalBody.innerHTML = `
            <h2>${data.title || "Internship"}</h2>
            ${modalApplicationStatusHTML}
            <p>${data.companyName}</p>
            <p>${data.location}</p>
            <p>Expected Salary: ${data.expectedSalary || "-"}</p>
            <p>${data.startDate || "?"} - ${data.deadline || "?"}</p>
            <div class="modal-majors"><span class="tag">${data.job || "-"}</span></div>
            <p><strong>Requirements:</strong></p>
            <ul style="padding-left: 1.2rem;">${fullRequirementList}</ul>
        `;

        const modalStatusElement = modalBody.querySelector('#modalInternshipStatusInfo');
        if (data.applicationStatus && modalStatusElement) {
            const statusText = data.applicationStatus.charAt(0).toUpperCase() + data.applicationStatus.slice(1);
            modalStatusElement.innerHTML = `<p style="font-weight:bold; color: #007bff;">Your Application Status: ${statusText}</p>`;
        } else if (modalStatusElement) {
            modalStatusElement.innerHTML = ""; 
        }

        applyBtnModal.dataset.internshipId = data.id;
        applyBtnModal.dataset.internshipTitle = data.title || "this internship";

        applyBtnModal.textContent = "Apply Now";
        applyBtnModal.disabled = false;
        applyBtnModal.style.display = "block";

        if (currentUserId) {
            try {
                const internshipApplicationDocRef = doc(db, "appliedIntern", data.id); 
                const docSnap = await getDoc(internshipApplicationDocRef);

                if (docSnap.exists() && docSnap.data() && docSnap.data()[currentUserId]) {
                    applyBtnModal.style.display = "none"; 

                    if (modalStatusElement) {
                        const userApplication = docSnap.data()[currentUserId];
                        const statusText = userApplication.status 
                            ? userApplication.status.charAt(0).toUpperCase() + userApplication.status.slice(1) 
                            : "Applied (Status Unknown)";
                        modalStatusElement.innerHTML = `<p style="font-weight:bold; color: #007bff;">Your Application Status: ${statusText}</p>`;
                    }
                } else {
                    applyBtnModal.style.display = "block"; 
                    if (!data.applicationStatus && modalStatusElement) {
                        modalStatusElement.innerHTML = "";
                    }
                }
            } catch (error) {
                console.error("Error checking application status for modal:", error);
                applyBtnModal.style.display = "block";
                if (modalStatusElement && !data.applicationStatus) {
                     modalStatusElement.innerHTML = "";
                }
            }
        } else {
            applyBtnModal.style.display = "block"; 
            if (modalStatusElement && !data.applicationStatus) {
                modalStatusElement.innerHTML = "";
            }
        }

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

function loadInternships() {
    const internshipContainer = document.getElementById("internshipCards");
    const internshipRef = ref(rtdb, 'internships');
    
    onValue(internshipRef, (snapshot) => {
        internshipContainer.innerHTML = "";
        if (!snapshot.exists()) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">No internships available at the moment.</p>`;
            return;
        }
        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            data.id = childSnapshot.key;
            const cardElement = createInternshipCard(data);
            internshipContainer.appendChild(cardElement);
        });
    }, (error) => {
        console.error("Error loading internships from RTDB:", error);
        internshipContainer.innerHTML = `<p style="padding: 2rem; color: red;">Error loading internships. Please try again later.</p>`;
    });
}

async function fetchAndDisplayFilteredInternships(filterLogic, noMatchMessage) {
    const user = auth.currentUser;
    if (!user) {
        alert("Please login to view this section.");
        return;
    }

    internshipContainer.innerHTML = "<p>Loading internships...</p>";

    try {
        const userId = user.uid;
        const userApplicationsRef = doc(db, "appliedIntern", userId);
        const likedInternshipsRef = doc(db, "likedInternships", userId); 

        let targetInternshipIds = [];

        if (filterLogic.type === "application_status") {
            const userApplicationsSnap = await getDoc(userApplicationsRef);
            if (userApplicationsSnap.exists()) {
                const applications = userApplicationsSnap.data().applications || [];
                targetInternshipIds = applications
                    .filter(app => app.status === filterLogic.status)
                    .map(app => app.internshipId);
            }
        } else if (filterLogic.type === "liked") {
            const likedSnap = await getDoc(likedInternshipsRef);
            if (likedSnap.exists()) {
                targetInternshipIds = likedSnap.data().internshipIds || [];
            }
        }


        if (targetInternshipIds.length === 0) {
            internshipContainer.innerHTML = `<p>${noMatchMessage}</p>`;
            return;
        }
        
        if (allInternshipsData.length === 0) {
            onValue(internshipsRef, (snapshot) => {
                allInternshipsData = [];
                snapshot.forEach((childSnapshot) => {
                    const internship = childSnapshot.val();
                    internship.id = childSnapshot.key;
                    allInternshipsData.push(internship);
                });
                const filteredInternships = allInternshipsData.filter(internship =>
                    targetInternshipIds.includes(internship.id)
                );
                 displayInternships(filteredInternships);
                 if (filteredInternships.length === 0) {
                    internshipContainer.innerHTML = `<p>No internships found that match your criteria (they may have been removed or changed).</p>`;
                 }

            }, { onlyOnce: true }); 
        } else {
            const filteredInternships = allInternshipsData.filter(internship =>
                targetInternshipIds.includes(internship.id)
            );
            displayInternships(filteredInternships);
            if (filteredInternships.length === 0) {
                internshipContainer.innerHTML = `<p>No internships found that match your criteria (they may have been removed or changed).</p>`;
            }
        }

    } catch (error) {
        console.error(`Error loading ${filterLogic.status || 'liked'} internships:`, error);
        internshipContainer.innerHTML = `<p>Error loading internships. Please try again.</p>`;
    }
}

document.getElementById("liked-internship-btn").addEventListener("click", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("Please login to view liked internships.");
        return;
    }

    try {
        fetchAndDisplayFilteredInternships(
            { type: "liked" },
            "You have not liked any internships yet."
        );
    } catch (err) {
        console.error("Error loading liked internships:", err);
    }
});

// APPLY INTERN
const applyNowBtnModal = document.getElementById("applyBtnModal");
applyNowBtnModal.addEventListener("click", async () => {
    if (!currentUserId) {
        alert("Please login to apply for internships.");
        return;
    }

    const internshipId = applyNowBtnModal.dataset.internshipId;
    const internshipTitle = applyNowBtnModal.dataset.internshipTitle;
    
    if (!internshipId) {
        alert("Error: Internship ID not found.");
        return;
    }
    if (!confirm(`Are you sure you want to apply for "${internshipTitle}"?`)) {
        return;
    }

    applyNowBtnModal.disabled = true;
    applyNowBtnModal.textContent = "Processing...";

    try {
        const internshipApplicationDocRef = doc(db, "appliedIntern", internshipId);

        const docSnap = await getDoc(internshipApplicationDocRef);

        if (docSnap.exists() && docSnap.data() && docSnap.data()[currentUserId]) {
            alert(`You have already applied for "${internshipTitle}".`);
            document.getElementById("internshipModal").style.display = "none";
            applyNowBtnModal.disabled = false;
            applyNowBtnModal.textContent = "Apply Now";
            return;
        }
        
        const userApplicationData = {
            internshipTitle: internshipTitle,
            status: "applied",
            appliedAt: serverTimestamp(),
            userName: document.getElementById('sidebarProfileName').textContent,
            userSchool: document.getElementById('sidebarProfileSchool').textContent,
            userMajor: document.getElementById('sidebarProfileMajor').textContent
        };

        const dataToWrite = {
            [currentUserId]: userApplicationData 
        };
        
        await setDoc(internshipApplicationDocRef, dataToWrite, { merge: true });

        console.log(`Application submitted for user ${currentUserId} to internship ${internshipId}`);
        alert(`Successfully applied for "${internshipTitle}"! Your application status is "applied".`);
        
        try {
            const userDocRef = doc(db, "users", currentUserId);
            await setDoc(userDocRef, {
                appliedInternshipIds: arrayUnion(internshipId) 
            }, { merge: true });
            console.log(`Added ${internshipId} to user's applied list.`);
        } catch (denormError) {
            console.error("Error updating user's applied list (denormalization):", denormError);
        }
            
        document.getElementById("internshipModal").style.display = "none";

    } catch (error) {
        console.error("Error submitting application: ", error);
        alert("Failed to submit application. Please try again. Check console for details.");
    } finally {
        applyNowBtnModal.disabled = false;
        applyNowBtnModal.textContent = "Apply Now";
    }
});

async function showAppliedInternships() {
    if (!currentUserId) {
        alert("Please login to see your applied internships.");
        loadInternships();
        return;
    }

    const internshipContainer = document.getElementById("internshipCards");
    internshipContainer.innerHTML = `<p style="padding: 2rem;">Loading your applications...</p>`;

    try {
        const applicationsCollectionRef = collection(db, "appliedIntern");
        const allApplicationsSnapshot = await getDocs(applicationsCollectionRef);

        if (allApplicationsSnapshot.empty) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">No applications found system-wide, or you haven't applied yet.</p>`;
            return;
        }

        internshipContainer.innerHTML = "";
        let foundAppliedInternships = [];

        allApplicationsSnapshot.forEach(docSnap => {
            if (docSnap.data()[currentUserId]) {
                foundAppliedInternships.push(docSnap.id);
            }
        });

        if (foundAppliedInternships.length === 0) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">You haven't applied for any internships yet.</p>`;
            return;
        }

        const internshipPromises = foundAppliedInternships.map(internshipId => {
            const internshipRef = ref(rtdb, `internships/${internshipId}`);
            return get(internshipRef).then(internshipSnapshot => {
                if (internshipSnapshot.exists()) {
                    const internshipData = internshipSnapshot.val();
                    internshipData.id = internshipSnapshot.key;

                    return internshipData;
                }
                return null;
            });
        });

        const internshipDetails = await Promise.all(internshipPromises);
        
        let cardsRendered = 0;
        internshipDetails.forEach(data => {
            if (data) {
                const cardElement = createInternshipCard(data);
                internshipContainer.appendChild(cardElement);
                cardsRendered++;
            }
        });
        
        if (cardsRendered === 0) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">Applied internships details could not be loaded, or they are no longer available.</p>`;
        }

    } catch (error) {
        console.error("Error fetching applied internships: ", error);
        internshipContainer.innerHTML = `<p style="padding: 2rem; color: red;">Error loading your applications.</p>`;
    }
}

document.getElementById("applied-internship-btn").addEventListener("click", (e) => {
    e.preventDefault();
    showAppliedInternships();
});

async function showInProgressApplications() {
    if (!currentUserId) {
        alert("Please login to see your in-progress applications.");
        loadInternships();
        return;
    }

    const internshipContainer = document.getElementById("internshipCards");
    internshipContainer.innerHTML = `<p style="padding: 2rem;">Loading your in-progress applications...</p>`;

    // Daftar status "In Progress"
    const inProgressTargetStatuses = ["applied", "under review", "interview scheduled", "documents pending", "pending decision"];

    try {
        const applicationsCollectionRef = collection(db, "appliedIntern");
        const allApplicationsSnapshot = await getDocs(applicationsCollectionRef);

        if (allApplicationsSnapshot.empty) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">No application data found in the system.</p>`;
            return;
        }

        let inProgressInternshipData = [];

        allApplicationsSnapshot.forEach(internshipDoc => {
            const internshipId = internshipDoc.id;
            const applicationsInInternship = internshipDoc.data(); 
            
            if (applicationsInInternship && applicationsInInternship[currentUserId]) {
                const userApplication = applicationsInInternship[currentUserId];
                if (userApplication.status && inProgressTargetStatuses.includes(userApplication.status.toLowerCase())) {
                    inProgressInternshipData.push({ 
                        id: internshipId, 
                        status: userApplication.status 
                    });
                }
            }
        });

        if (inProgressInternshipData.length === 0) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">You have no applications currently matching the in-progress statuses: ${inProgressTargetStatuses.join(', ')}.</p>`;
            return;
        }

        internshipContainer.innerHTML = ""; 

        const internshipDetailPromises = inProgressInternshipData.map(appData => {
            const internshipRTDBRef = ref(rtdb, `internships/${appData.id}`);
            return get(internshipRTDBRef).then(rtdbSnap => {
                if (rtdbSnap.exists()) {
                    const rtData = rtdbSnap.val();
                    rtData.id = rtdbSnap.key; 
                    rtData.applicationStatus = appData.status; 
                    return rtData;
                }
                console.warn(`Internship details for ID ${appData.id} not found in RTDB for in-progress list.`);
                return null; 
            });
        });

        const finalInternshipDetails = await Promise.all(internshipDetailPromises);
        
        let cardsRendered = 0;
        finalInternshipDetails.forEach(data => {
            if (data) { 
                const cardElement = createInternshipCard(data);
                internshipContainer.appendChild(cardElement);
                cardsRendered++;
            }
        });
        
        if (cardsRendered === 0 && inProgressInternshipData.length > 0) {
            internshipContainer.innerHTML = `<p style="padding: 2rem;">Details for your in-progress applications could not be loaded or they are no longer available.</p>`;
        } else if (cardsRendered === 0) { 
             internshipContainer.innerHTML = `<p style="padding: 2rem;">You have no applications currently matching the in-progress statuses.</p>`;
        }

    } catch (error) {
        console.error("Error fetching in-progress applications: ", error);
        internshipContainer.innerHTML = `<p style="padding: 2rem; color: red;">Error loading your in-progress applications.</p>`;
    }
}

document.getElementById("inprogress-internship-btn").addEventListener("click", (e) => {
    e.preventDefault();
    showInProgressApplications();
});