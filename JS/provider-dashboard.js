// Firebase config and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getDatabase,ref,set,
  update,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Firebase config (PLACE YOUR ACTUAL API KEY AND OTHER DETAILS HERE)
const firebaseConfig = {
  apiKey: "AIzaSyBcGAlRNxn1oJ5SpQb179EdzXXW4tYpHrs", // Replace with your actual API Key
  authDomain: "nextstep-123.firebaseapp.com",
  databaseURL:
    "https://nextstep-123-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nextstep-123",
  storageBucket: "nextstep-123.appspot.com",
  messagingSenderId: "427076545876",
  appId: "1:427076545876:web:e588a15084e83343482cc1",
  measurementId: "G-6S22DPGVP3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Global state variables
let currentUser = null;
let currentScholarshipCount = 0;
let currentInternshipCount = 0;
let currentEditingId = null; // Stores the ID of the entry being edited
let currentEditingType = null; // Stores the type ('scholarship' or 'internship') being edited

// --- Utility Functions ---

/**
 * Returns the current time formatted for Western Indonesia Time (WIB).
 */
function getWIBTime() {
  const now = new Date();
  return now.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Updates the combined total count of scholarships and internships displayed in the UI.
 */
function updateCombinedTotal() {
  updateRealtimeTotalPostsDisplay(
    currentScholarshipCount + currentInternshipCount
  );
}

/**
 * Updates the display element for the total number of posts.
 * @param {number} count - The total count of posts to display.
 */
function updateRealtimeTotalPostsDisplay(count) {
  const totalPostsElement = document.getElementById("total-posts-count");
  if (totalPostsElement) {
    totalPostsElement.textContent = count;
  } else {
    console.error("Element with ID 'total-posts-count' not found.");
  }
}

/**
 * Fetches user data from Firestore based on the provided UID.
 * @param {string} uid - The user ID.
 * @returns {Object|null} The user data or null if not found.
 */
async function getUserDataByUid(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return null;
}

/**
 * Clears all input fields in the modal form.
 */
function clearModalForm() {
  const form = document.getElementById("addEntryForm");
  if (form) {
    form.querySelectorAll("input, textarea, select").forEach((input) => {
      input.value = "";
      if (input.tagName === "SELECT") {
        // Reset select to its first option
        if (input.options.length > 0) {
          input.value = input.options[0].value;
        }
      }
    });
  } else {
    console.warn("Form with ID 'addEntryForm' not found for clearing.");
  }
}

/**
 * Toggles the visibility of scholarship and internship input fields and modal buttons.
 * Adjusts buttons based on whether an item is being added or edited.
 */
function toggleEntryFields() {
  const selectedType = entryTypeSelect.value;

  // Hide all fields and buttons initially
  scholarshipFields.style.display = "none";
  internshipFields.style.display = "none";
  modalAddScholarshipBtn.style.display = "none";
  modalUpdateScholarshipBtn.style.display = "none";
  modalDeleteScholarshipBtn.style.display = "none";
  modalAddInternshipBtn.style.display = "none";
  modalUpdateInternshipBtn.style.display = "none";
  modalDeleteInternshipBtn.style.display = "none";

  if (selectedType === "scholarship") {
    scholarshipFields.style.display = "block";
    if (currentEditingType === "scholarship" && currentEditingId) {
      modalUpdateScholarshipBtn.style.display = "block";
      modalDeleteScholarshipBtn.style.display = "block";
    } else {
      modalAddScholarshipBtn.style.display = "block";
    }
  } else if (selectedType === "internship") {
    internshipFields.style.display = "block";
    if (currentEditingType === "internship" && currentEditingId) {
      modalUpdateInternshipBtn.style.display = "block";
      modalDeleteInternshipBtn.style.display = "block";
    } else {
      modalAddInternshipBtn.style.display = "block";
    }
  }
}

/**
 * Opens the add/edit entry modal in "edit" mode for a scholarship and populates its fields.
 * @param {string} id - The ID of the scholarship to edit.
 * @param {Object} data - The data object of the scholarship.
 */
function openEditScholarshipModal(id, data) {
  console.log("Opening edit modal for Scholarship ID:", id);
  currentEditingId = id;
  currentEditingType = "scholarship";

  clearModalForm();
  entryTypeSelect.value = "scholarship"; // Set dropdown value
  toggleEntryFields(); // Show scholarship-specific fields and edit buttons

  // Populate scholarship fields
  document.getElementById("modal_scholarship_title").value = data.title || "";
  document.getElementById("modal_scholarship_companyName").value =
    data.companyName || "";
  document.getElementById("modal_scholarship_location").value =
    data.location || "";
  document.getElementById("modal_scholarship_startDate").value =
    data.startDate || "";
  document.getElementById("modal_scholarship_duration").value =
    data.duration || "";
  document.getElementById("modal_scholarship_requirements").value =
    Array.isArray(data.requirements) ? data.requirements.join("\n") : "";
  document.getElementById("modal_scholarship_majors").value = Array.isArray(
    data.majors
  )
    ? data.majors.join("\n")
    : "";
  document.getElementById("modal_scholarship_description").value =
    data.description || "";
  document.getElementById("modal_scholarship_status").value =
    data.status || "Open";
  document.getElementById("modal_scholarship_deadline").value =
    data.deadline || "";

  addEntryModal.style.display = "flex"; // Show the modal
}

/**
 * Opens the add/edit entry modal in "edit" mode for an internship and populates its fields.
 * @param {string} id - The ID of the internship to edit.
 * @param {Object} data - The data object of the internship.
 */
function openEditInternshipModal(id, data) {
  console.log("Opening edit modal for Internship ID:", id);
  currentEditingId = id;
  currentEditingType = "internship";

  clearModalForm();
  entryTypeSelect.value = "internship"; // Set dropdown value
  toggleEntryFields(); // Show internship-specific fields and edit buttons

  // Populate internship fields
  document.getElementById("modal_internship_title").value = data.title || "";
  document.getElementById("modal_internship_companyName").value =
    data.companyName || "";
  document.getElementById("modal_internship_location").value =
    data.location || "";
  document.getElementById("modal_internship_startDate").value =
    data.startDate || "";
  document.getElementById("modal_internship_duration").value =
    data.duration || "";
  document.getElementById("modal_internship_Job").value = data.job || "";
  document.getElementById("modal_internship_expectedSalary").value =
    data.expectedSalary || "";
  document.getElementById("modal_internship_requirements").value =
    Array.isArray(data.requirements) ? data.requirements.join("\n") : "";
  document.getElementById("modal_internship_description").value =
    data.description || "";
  document.getElementById("modal_internship_status").value =
    data.status || "Open";
  document.getElementById("modal_internship_deadline").value =
    data.deadline || "";

  addEntryModal.style.display = "flex"; // Show the modal
}

/**
 * Loads scholarships from Firebase Realtime Database for the current user (or all if admin) and displays them.
 */
function loadScholarships() {
  const scholarshipContainer = document.getElementById("scholarshipCards");
  if (!scholarshipContainer) {
    console.error("Scholarship container not found!");
    return;
  }

  if (!currentUser || !currentUser.uid) {
    scholarshipContainer.innerHTML =
      "<p>Please log in to view your scholarships.</p>";
    currentScholarshipCount = 0;
    updateCombinedTotal();
    return;
  }

  let scholarshipsQuery;
  // Check if the current user has the 'admin' role
  if (currentUser.role === 'admin') {
    console.log("Admin user detected. Loading all scholarships.");
    scholarshipsQuery = ref(database, "scholarships"); // Load all scholarships
  } else {
    console.log("Provider user detected. Loading user-specific scholarships.");
    scholarshipsQuery = query(
      ref(database, "scholarships"),
      orderByChild("creatorId"),
      equalTo(currentUser.uid) // Filter by current user's ID
    );
  }

  onValue(
    scholarshipsQuery, // Use the dynamically determined query
    (snapshot) => {
      scholarshipContainer.innerHTML = "";
      let count = 0;
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          const id = childSnapshot.key;
          const cardElement = createScholarshipCard(data, id); // Pass ID
          scholarshipContainer.appendChild(cardElement);
          count++;
        });
      } else {
        console.log("No scholarships found."); // Admin will see this if no scholarships exist at all
        scholarshipContainer.innerHTML =
          "<p>No scholarships found yet.</p>";
      }
      currentScholarshipCount = count;
      updateCombinedTotal();
    },
    (error) => {
      console.error("Error fetching scholarships:", error);
      scholarshipContainer.innerHTML =
        "<p>Error loading scholarships. Please try again.</p>";
      currentScholarshipCount = 0;
      updateCombinedTotal();
    }
  );
}

/**
 * Loads internships from Firebase Realtime Database for the current user (or all if admin) and displays them.
 */
function loadInternships() {
  const internshipContainer = document.getElementById("internshipCards");
  if (!internshipContainer) {
    console.error("Internship container not found!");
    return;
  }

  if (!currentUser || !currentUser.uid) {
    internshipContainer.innerHTML =
      "<p>Please log in to view your internships.</p>";
    currentInternshipCount = 0;
    updateCombinedTotal();
    return;
  }

  let internshipsQuery;
  // Check if the current user has the 'admin' role
  if (currentUser.role === 'admin') {
    console.log("Admin user detected. Loading all internships.");
    internshipsQuery = ref(database, "internships"); // Load all internships
  } else {
    console.log("Provider user detected. Loading user-specific internships.");
    internshipsQuery = query(
      ref(database, "internships"),
      orderByChild("creatorId"),
      equalTo(currentUser.uid) // Filter by current user's ID
    );
  }

  onValue(
    internshipsQuery, // Use the dynamically determined query
    (snapshot) => {
      internshipContainer.innerHTML = "";
      let count = 0;
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          const id = childSnapshot.key;
          const cardElement = createInternshipCard(data, id); // Pass ID
          internshipContainer.appendChild(cardElement);
          count++;
        });
      } else {
        console.log("No internships found."); // Admin will see this if no internships exist at all
        internshipContainer.innerHTML =
          "<p>No internships found yet.</p>";
      }
      currentInternshipCount = count;
      updateCombinedTotal();
    },
    (error) => {
      console.error("Error fetching internships:", error);
      internshipContainer.innerHTML =
        "<p>Error loading internships. Please try again.</p>";
      currentInternshipCount = 0;
      updateCombinedTotal();
    }
  );
}

// --- DOM Element References ---
const addEntryModal = document.getElementById("addEntryModal");
const closeAddEntryModalBtn = document.getElementById("closeAddEntryModal");
const showAddEntryModalBtn = document.getElementById("showAddEntryModalBtn");
const entryTypeSelect = document.getElementById("entryType");
const scholarshipFields = document.getElementById("scholarshipFields");
const internshipFields = document.getElementById("internshipFields");

const modalAddScholarshipBtn = document.getElementById(
  "modalAddScholarshipBtn"
);
const modalUpdateScholarshipBtn = document.getElementById(
  "modalUpdateScholarshipBtn"
);
const modalDeleteScholarshipBtn = document.getElementById(
  "modalDeleteScholarshipBtn"
);
const modalAddInternshipBtn = document.getElementById("modalAddInternshipBtn");
const modalUpdateInternshipBtn = document.getElementById(
  "modalUpdateInternshipBtn"
);
const modalDeleteInternshipBtn = document.getElementById(
  "modalDeleteInternshipBtn"
);

// --- Event Listeners ---

// Watch auth state and update UI, load data
onAuthStateChanged(auth, async (user) => {
  const profileSection = document.getElementById("profileSection");
  const profileNameElement = document.getElementById("profileName");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  
  const redirectPageForStudents = 'student-dashboard.html'; // Or 'access-denied.html'

  if (user) {
    currentUser = user;
    let userData = null;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        userData = userDoc.data();
        currentUser.role = userData.role; // **IMPORTANT: Attach role to currentUser object**
        console.log("User profile data found:", userData);

        // --- NEW: Role-based access control ---
        if (userData.role === 'provider' || userData.role === 'admin') { // Allow 'admin' role as well
          // User is a provider or admin, display the page content
          if (profileSection) profileSection.style.display = "flex";
          if (profileNameElement) {
            profileNameElement.textContent = userData?.name || user.displayName || user.email || "Pengguna";
          }
          if (loginBtn) loginBtn.style.display = "none";
          if (logoutBtn) logoutBtn.style.display = "block";

          // Reset counts and load data for the current user
          currentScholarshipCount = 0;
          currentInternshipCount = 0;
          updateCombinedTotal();
          loadScholarships(); // Will now check currentUser.role
          loadInternships();  // Will now check currentUser.role

          console.log(`User logged in as ${userData.role}:`, currentUser.uid);
        } else if (userData.role === 'student') {
          // User is a student, redirect them
          console.warn("Student user attempted to access provider page. Redirecting...");
          alert("You do not have permission to access this page. Redirecting..."); // Optional: user-friendly message
          window.location.href = redirectPageForStudents; // Redirect to a different page
          // Also hide any sensitive elements just in case the redirect is slow
          if (profileSection) profileSection.style.display = "none";
          if (loginBtn) loginBtn.style.display = "block"; // Show login for potential other roles
          if (logoutBtn) logoutBtn.style.display = "none";
          return; // Stop further execution for students on this page
        } else {
          // Handle other roles or no role defined (e.g., redirect or show message)
          console.warn("User has an unknown role or no role. Redirecting or blocking access.");
          alert("Your role does not permit access to this page. Redirecting...");
          window.location.href = redirectPageForStudents; // Default redirect for unknown roles
          if (profileSection) profileSection.style.display = "none";
          if (loginBtn) loginBtn.style.display = "block";
          if (logoutBtn) logoutBtn.style.display = "none";
          return;
        }

      } else {
        console.warn("User document not found in Firestore for UID:", user.uid);
        // If user doc not found, treat as unprivileged or redirect
        alert("Your user data could not be found. Please contact support or try logging in again.");
        window.location.href = redirectPageForStudents; // Redirect or clear content
        // Also ensure UI is hidden
        if (profileSection) profileSection.style.display = "none";
        if (loginBtn) loginBtn.style.display = "block";
        if (logoutBtn) logoutBtn.style.display = "none";
        return;
      }
    } catch (error) {
      console.error("Error fetching user data from Firestore:", error);
      // If there's an error fetching data, assume no access for safety
      alert("There was an error loading your user data. Please try again or contact support.");
      window.location.href = redirectPageForStudents; // Redirect on error
      if (profileSection) profileSection.style.display = "none";
      if (loginBtn) loginBtn.style.display = "block";
      if (logoutBtn) logoutBtn.style.display = "none";
      return;
    } finally {
      document.body.classList.add('loaded');
    }

  } else {
    // User is logged out
    console.log("User logged out, clearing content and displaying login.");
    if (profileSection) profileSection.style.display = "none";
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
    currentUser = null;

    // Clear displayed data if user logs out
    const scholarshipContainer = document.getElementById("scholarshipCards");
    if (scholarshipContainer) {
      scholarshipContainer.innerHTML = "<p>Please log in to view scholarships.</p>";
    }
    const internshipContainer = document.getElementById("internshipCards");
    if (internshipContainer) {
      internshipContainer.innerHTML = "<p>Please log in to view internships.</p>";
    }
    currentScholarshipCount = 0;
    currentInternshipCount = 0;
    updateCombinedTotal();

    // Optional: Redirect if logged out users shouldn't see this page at all
    // window.location.href = 'login.html'; // Redirect to login page if desired
  }
});

console.log("🔥 Firebase initialized for provider dashboard!");

// --- Header scroll effect ---
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

// --- Modal logic for adding/managing entries ---

// Event listener for "Add New Scholarship / Internship" button
if (showAddEntryModalBtn) {
  showAddEntryModalBtn.addEventListener("click", () => {
    // Reset editing state for a new entry
    currentEditingId = null;
    currentEditingType = null;

    clearModalForm(); // Clear any previous data
    entryTypeSelect.value = "scholarship"; // Default to scholarship when adding
    toggleEntryFields(); // Show appropriate fields and ADD buttons

    addEntryModal.style.display = "flex";
  });
}

// Event listener for changes in entry type dropdown (inside modal)
if (entryTypeSelect) {
  entryTypeSelect.addEventListener("change", toggleEntryFields);
}

// Event listener for closing the modal using the close button
if (closeAddEntryModalBtn) {
  closeAddEntryModalBtn.addEventListener("click", () => {
    addEntryModal.style.display = "none";
    currentEditingId = null; // Clear editing state on close
    currentEditingType = null;
  });
}

// Event listener for clicking outside the modal (to close it)
if (addEntryModal) {
  addEntryModal.addEventListener("click", (e) => {
    if (e.target === addEntryModal) {
      addEntryModal.style.display = "none";
      currentEditingId = null; // Clear editing state on close
      currentEditingType = null;
    }
  });
}

/**
 * Handles adding a new scholarship entry to Firebase Realtime Database.
 */
if (modalAddScholarshipBtn) {
  modalAddScholarshipBtn.addEventListener("click", () => {
    const title = document
      .getElementById("modal_scholarship_title")
      .value.trim();
    const companyName = document
      .getElementById("modal_scholarship_companyName")
      .value.trim();
    const location = document
      .getElementById("modal_scholarship_location")
      .value.trim();
    const startDate = document
      .getElementById("modal_scholarship_startDate")
      .value.trim();
    const duration = document
      .getElementById("modal_scholarship_duration")
      .value.trim();
    const requirementsText = document
      .getElementById("modal_scholarship_requirements")
      .value.trim();
    const requirements = requirementsText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item !== "");
    const majorsText = document
      .getElementById("modal_scholarship_majors")
      .value.trim();
    const majors = majorsText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item !== "");
    const description = document
      .getElementById("modal_scholarship_description")
      .value.trim();
    const status = document.getElementById("modal_scholarship_status").value;
    const deadline = document
      .getElementById("modal_scholarship_deadline")
      .value.trim();

    if (!title || !companyName || !location || !deadline) {
      alert(
        "Please fill all required fields (title, company, location, deadline)."
      );
      console.warn("Required scholarship fields are missing.");
      return;
    }
    if (!currentUser || !currentUser.uid) {
      alert("You must be logged in to add a scholarship.");
      console.error(
        "User not logged in or UID missing for scholarship addition."
      );
      return;
    }

    const now = getWIBTime();
    const newScholarshipRef = push(ref(database, "scholarships/"));
    const newScholarshipData = {
      title,
      companyName,
      location,
      startDate,
      duration,
      requirements, // Stored as Array
      majors, // Stored as Array
      description,
      createdTime: now,
      updateTime: now,
      status,
      deadline,
      creatorId: currentUser.uid,
    };
    console.log("Attempting to add scholarship with data:", newScholarshipData);

    set(newScholarshipRef, newScholarshipData)
      .then(() => {
        console.log("Scholarship added successfully to Firebase!");
        alert("Scholarship added successfully!");
        addEntryModal.style.display = "none";
        clearModalForm();
        currentEditingId = null;
        currentEditingType = null;
      })
      .catch((err) => {
        console.error("Error saving scholarship to Firebase:", err);
        alert("Something went wrong: " + err.message);
        addEntryModal.style.display = "none"; // Close modal even on error for better UX
      });
  });
}

/**
 * Handles updating an existing scholarship entry in Firebase Realtime Database.
 */
if (modalUpdateScholarshipBtn) {
  modalUpdateScholarshipBtn.addEventListener("click", () => {
    if (!currentEditingId || currentEditingType !== "scholarship") {
      alert("Please select a scholarship to update by clicking its card.");
      return;
    }
    const scholarshipId = currentEditingId;

    const title = document
      .getElementById("modal_scholarship_title")
      .value.trim();
    const companyName = document
      .getElementById("modal_scholarship_companyName")
      .value.trim();
    const location = document
      .getElementById("modal_scholarship_location")
      .value.trim();
    const startDate = document
      .getElementById("modal_scholarship_startDate")
      .value.trim();
    const duration = document
      .getElementById("modal_scholarship_duration")
      .value.trim();

    const requirementsText = document
      .getElementById("modal_scholarship_requirements")
      .value.trim();
    const requirements = requirementsText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item !== "");

    const majorsText = document
      .getElementById("modal_scholarship_majors")
      .value.trim();
    const majors = majorsText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item !== "");

    const description = document
      .getElementById("modal_scholarship_description")
      .value.trim();
    const status = document.getElementById("modal_scholarship_status").value;
    const deadline = document
      .getElementById("modal_scholarship_deadline")
      .value.trim();

    const updates = {};
    if (title) updates["title"] = title;
    if (companyName) updates["companyName"] = companyName;
    if (location) updates["location"] = location;
    if (startDate) updates["startDate"] = startDate;
    if (duration) updates["duration"] = duration;
    // Only update if array has items, otherwise don't overwrite if it was empty string
    if (requirements.length > 0) updates["requirements"] = requirements;
    if (majors.length > 0) updates["majors"] = majors;

    if (description) updates["description"] = description;
    if (status) updates["status"] = status;
    if (deadline) updates["deadline"] = deadline;

    updates["updateTime"] = getWIBTime(); // Always update timestamp

    // Check if any actual data was changed (beyond just the updateTime)
    if (
      Object.keys(updates).length === 1 &&
      updates.hasOwnProperty("updateTime")
    ) {
      alert("Please fill at least one field to update.");
      return;
    }

    const dbRef = ref(database, "scholarships/" + scholarshipId);
    update(dbRef, updates)
      .then(() => {
        alert("Scholarship updated successfully!");
        addEntryModal.style.display = "none";
        clearModalForm(); // Clear form after successful update
        currentEditingId = null; // Clear editing state
        currentEditingType = null;
      })
      .catch((err) => {
        console.error("Error updating scholarship:", err);
        alert("Something went wrong: " + err.message);
        addEntryModal.style.display = "none"; // Close modal even on error
      });
  });
}

/**
 * Handles deleting a scholarship entry from Firebase Realtime Database.
 */
if (modalDeleteScholarshipBtn) {
  modalDeleteScholarshipBtn.addEventListener("click", () => {
    if (!currentEditingId || currentEditingType !== "scholarship") {
      alert("Please select a scholarship to delete by clicking its card.");
      return;
    }
    const scholarshipId = currentEditingId;

    const confirmDelete = confirm(
      "Are you sure you want to delete this scholarship?"
    );
    if (!confirmDelete) return;

    const dbRef = ref(database, "scholarships/" + scholarshipId);
    set(dbRef, null) // Set to null to delete the record
      .then(() => {
        alert("Scholarship deleted successfully!");
        addEntryModal.style.display = "none";
        clearModalForm(); // Clear form after deletion
        currentEditingId = null; // Clear editing state
        currentEditingType = null;
      })
      .catch((err) => {
        console.error("Error deleting scholarship:", err);
        alert("Something went wrong: " + err.message);
        addEntryModal.style.display = "none"; // Close modal even on error
      });
  });
}

/**
 * Handles adding a new internship entry to Firebase Realtime Database.
 */
if (modalAddInternshipBtn) {
  modalAddInternshipBtn.addEventListener("click", () => {
    const title = document
      .getElementById("modal_internship_title")
      .value.trim();
    const companyName = document
      .getElementById("modal_internship_companyName")
      .value.trim();
    const location = document
      .getElementById("modal_internship_location")
      .value.trim();
    const startDate = document
      .getElementById("modal_internship_startDate")
      .value.trim();
    const duration = document
      .getElementById("modal_internship_duration")
      .value.trim();
    const job = document.getElementById("modal_internship_Job").value.trim();
    const expectedSalary = document
      .getElementById("modal_internship_expectedSalary")
      .value.trim();
    const requirementsText = document
      .getElementById("modal_internship_requirements")
      .value.trim();
    const requirements = requirementsText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item !== "");
    const description = document
      .getElementById("modal_internship_description")
      .value.trim();
    const status = document.getElementById("modal_internship_status").value;
    const deadline = document
      .getElementById("modal_internship_deadline")
      .value.trim();

    if (!title || !companyName || !location || !deadline) {
      alert(
        "Please fill all required fields (title, company, location, deadline)."
      );
      console.warn("Required internship fields are missing.");
      return;
    }
    if (!currentUser || !currentUser.uid) {
      alert("You must be logged in to add an internship.");
      console.error(
        "User not logged in or UID missing for internship addition."
      );
      return;
    }

    const now = getWIBTime();
    const newInternshipRef = push(ref(database, "internships/"));
    const newInternshipData = {
      title,
      companyName,
      location,
      startDate,
      duration,
      job,
      expectedSalary,
      requirements, // Stored as Array
      description,
      createdTime: now,
      updateTime: now,
      status,
      deadline,
      creatorId: currentUser.uid,
    };
    console.log("Attempting to add internship with data:", newInternshipData);

    set(newInternshipRef, newInternshipData)
      .then(() => {
        console.log("Internship added successfully to Firebase!");
        alert("Internship added successfully!");
        addEntryModal.style.display = "none";
        clearModalForm();
        currentEditingId = null;
        currentEditingType = null;
      })
      .catch((err) => {
        console.error("Error saving internship to Firebase:", err);
        alert("Something went wrong: " + err.message);
        addEntryModal.style.display = "none"; // Close modal even on error
      });
  });
}

/**
 * Handles updating an existing internship entry in Firebase Realtime Database.
 */
if (modalUpdateInternshipBtn) {
  modalUpdateInternshipBtn.addEventListener("click", () => {
    if (!currentEditingId || currentEditingType !== "internship") {
      alert("Please select an internship to update by clicking its card.");
      return;
    }
    const internshipId = currentEditingId;

    const title = document
      .getElementById("modal_internship_title")
      .value.trim();
    const companyName = document
      .getElementById("modal_internship_companyName")
      .value.trim();
    const location = document
      .getElementById("modal_internship_location")
      .value.trim();
    const startDate = document
      .getElementById("modal_internship_startDate")
      .value.trim();
    const duration = document
      .getElementById("modal_internship_duration")
      .value.trim();
    const job = document.getElementById("modal_internship_Job").value.trim();
    const expectedSalary = document
      .getElementById("modal_internship_expectedSalary")
      .value.trim();
    const requirementsText = document
      .getElementById("modal_internship_requirements")
      .value.trim(); // Get as text
    const requirements = requirementsText // Parse into array
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item !== "");
    const description = document
      .getElementById("modal_internship_description")
      .value.trim();
    const status = document.getElementById("modal_internship_status").value;
    const deadline = document
      .getElementById("modal_internship_deadline")
      .value.trim();

    const updates = {};
    if (title) updates["title"] = title;
    if (companyName) updates["companyName"] = companyName;
    if (location) updates["location"] = location;
    if (startDate) updates["startDate"] = startDate;
    if (duration) updates["duration"] = duration;
    if (job) updates["job"] = job;
    if (expectedSalary) updates["expectedSalary"] = expectedSalary;
    if (requirements.length > 0) updates["requirements"] = requirements; // Update as array
    if (description) updates["description"] = description;
    if (status) updates["status"] = status;
    if (deadline) updates["deadline"] = deadline;
    updates["updateTime"] = getWIBTime(); // Always update timestamp

    // Check if any actual data was changed (beyond just the updateTime)
    if (
      Object.keys(updates).length === 1 &&
      updates.hasOwnProperty("updateTime")
    ) {
      alert("Please fill at least one field to update.");
      return;
    }

    const dbRef = ref(database, "internships/" + internshipId);
    update(dbRef, updates)
      .then(() => {
        alert("Internship updated successfully!");
        addEntryModal.style.display = "none";
        clearModalForm(); // Clear form after successful update
        currentEditingId = null; // Clear editing state
        currentEditingType = null;
      })
      .catch((err) => {
        console.error("Error updating internship:", err);
        alert("Something went wrong: " + err.message);
        addEntryModal.style.display = "none"; // Close modal even on error
      });
  });
}

/**
 * Handles deleting an internship entry from Firebase Realtime Database.
 */
if (modalDeleteInternshipBtn) {
  modalDeleteInternshipBtn.addEventListener("click", () => {
    if (!currentEditingId || currentEditingType !== "internship") {
      alert("Please select an internship to delete by clicking its card.");
      return;
    }
    const internshipId = currentEditingId;

    const confirmDelete = confirm(
      "Are you sure you want to delete this internship?"
    );
    if (!confirmDelete) return;

    const dbRef = ref(database, "internships/" + internshipId);
    set(dbRef, null) // Set to null to delete the record
      .then(() => {
        alert("Internship deleted successfully!");
        addEntryModal.style.display = "none";
        clearModalForm(); // Clear form after deletion
        currentEditingId = null; // Clear editing state
        currentEditingType = null;
      })
      .catch((err) => {
        console.error("Error deleting internship:", err);
        alert("Something went wrong: " + err.message);
        addEntryModal.style.display = "none"; // Close modal even on error
      });
  });
}

/**
 * Calculates the time elapsed since a given creation time string.
 * @param {string} createdTimeStr - The creation time string in "DD/MM/YYYY, HH:MM:SS" format.
 * @returns {string} A human-readable string representing the time ago.
 */
function calculateTimeAgo(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') {
        return 'a while ago';
    }
    try {
        const [datePart, timePart] = timestamp.split(', ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes, seconds] = timePart.split(':');

        const postDate = new Date(year, month - 1, day, hours, minutes, seconds);
        const now = new Date();
        const secondsPast = (now.getTime() - postDate.getTime()) / 1000;

        if (secondsPast < 60)
          return `${Math.floor(secondsPast)} seconds ago`;
        if (secondsPast < 3600)
          return `${Math.floor(secondsPast / 60)} minutes ago`;
        
        if (secondsPast <= 86400)
          return `${Math.floor(secondsPast / 3600)} hours ago`;
        if (secondsPast <= 2592000)
          return `${Math.floor(secondsPast / 86400)} days ago`;
        if (secondsPast <= 31536000)
          return `${Math.floor(secondsPast / 2592000)} months ago`;
        return `over a year ago`;

    } catch (error) {
        console.error("Could not parse timestamp:", timestamp, error);
        return 'invalid date';
    }
}

/**
 * Creates an HTML card element for a scholarship.
 * @param {Object} data - The scholarship data.
 * @param {string} id - The ID of the scholarship.
 * @returns {HTMLElement} The created scholarship card element.
 */
function createScholarshipCard(data, id) {
  const maxTags = 5;
  // Ensure majors is an array, handling cases where it might be stored as an object or not exist
  const majors = Array.isArray(data.majors)
    ? data.majors
    : data.majors
    ? Object.values(data.majors)
    : [];
  const requirements = Array.isArray(data.requirements)
    ? data.requirements
    : data.requirements
    ? Object.values(data.requirements)
    : [];

  const tagsToShow = majors.slice(0, maxTags);
  const hiddenCount = majors.length > maxTags ? majors.length - maxTags : 0;

  const tagHTML = tagsToShow
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join("");
  const overflowTag =
    hiddenCount > 0 ? `<span class="tag">+${hiddenCount}</span>` : "";

  const requirementList = requirements
    .map((req, index) => `<li>${index + 1}. ${req}</li>`)
    .join("");

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
            <h4>${data.title || "Beasiswa"}
              <span class="scholarship-item-id-title">(ID: ${id})</span></h4>
            <p><strong>${data.startDate || "Start date not available"} - ${
    data.deadline || "Batas waktu tidak tersedia"
  }</strong></p>
            <p><strong>Requirement:</strong></p>
            <ul style="padding-left: 1.2rem; margin: 0;">
                ${requirementList}
            </ul>
            <span class="read-more">...</span>
        </div>
        <div class="scholarship-card-footer">
        </div>
    `;

  // Attach event listener to open edit modal
  wrapper.addEventListener("click", () => {
    openEditScholarshipModal(id, data);
  });

  return wrapper;
}

/**
 * Creates an HTML card element for an internship.
 * @param {Object} data - The internship data.
 * @param {string} id - The ID of the internship.
 * @returns {HTMLElement} The created internship card element.
 */
function createInternshipCard(data, id) {
  const maxTags = 5;
  // Ensure requirements is an array
  const requirements = Array.isArray(data.requirements)
    ? data.requirements
    : data.requirements
    ? Object.values(data.requirements)
    : [];
  const job = data.job || "Job Role Not Specified";

  const tagsToShow = requirements.slice(0, maxTags);
  const hiddenCount =
    requirements.length > maxTags ? requirements.length - maxTags : 0;

  const tagHTML = tagsToShow
    .map((tag) => `<span class="tag internship-tag">${tag}</span>`)
    .join("");
  const overflowTag =
    hiddenCount > 0
      ? `<span class="tag internship-tag">+${hiddenCount}</span>`
      : "";

  const requirementList = requirements
    .map((req, index) => `<li>${index + 1}. ${req}</li>`)
    .join("");

  const wrapper = document.createElement("div");
  wrapper.classList.add("internship-card");
  wrapper.style.cursor = "pointer";

  wrapper.innerHTML = `
        <div class="internship-card-header">
            <div>
                <h3 class="internship-card-provider">${data.companyName}</h3>
                <p class="internship-card-provider-loc">${data.location}</p>
            </div>
            <span class="time-ago">${calculateTimeAgo(data.createdTime)}</span>
        </div>
        <div class="internship-card-tags">
            ${tagHTML}
            ${overflowTag}
        </div>
        <div class="internship-card-body">
            <h4>${data.title || "Internship Offer"}</h4>
            <p><strong>ID:</strong> ${id}</p>
            <p><strong>Job Role:</strong> ${job}</p>
            <p><strong>${data.startDate || "Start date not available"} - ${
    data.deadline || "Deadline not available"
  }</strong></p>
            <p><strong>Expected Salary:</strong> ${
              data.expectedSalary || "Not specified"
            }</p>
            <p><strong>Requirement:</strong></p>
            <ul style="padding-left: 1.2rem; margin: 0;">
                ${requirementList}
            </ul>
            <span class="read-more">...</span>
        </div>
        <div class="internship-card-footer">
        </div>
    `;

  // Attach event listener to open edit modal
  wrapper.addEventListener("click", () => {
    openEditInternshipModal(id, data);
  });

  return wrapper;
}

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', (e) => {
    // Prevent the link's default behavior
    e.preventDefault(); 
    
    // Use the Firebase signOut function
    signOut(auth)
        .then(() => {
            // When sign-out is successful:
            alert("You have been successfully logged out.");
            // Redirect the user to the login page
            window.location.href = 'login.html';
        })
        .catch((error) => {
            // If there's an error during logout:
            console.error("Logout Error:", error);
            alert("Failed to log out. Please try again.");
        });
});