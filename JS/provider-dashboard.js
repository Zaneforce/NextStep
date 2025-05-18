import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getDatabase, ref, set, update } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";

// Firebase config
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

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
    second: "2-digit"
  });
}


// Add Scholarship
document.getElementById("AddScholarshipBtn").addEventListener("click", () => {
  const scholarshipId = document.getElementById("scholarship_id").value;
  const title = document.getElementById("scholarship_title").value;
  const companyName = document.getElementById("scholarship_companyName").value;
  const location = document.getElementById("scholarship_location").value;
  const startDate = document.getElementById("scholarship_startDate").value;
  const duration = document.getElementById("scholarship_duration").value;
  const requirements = document.getElementById("scholarship_requirements").value;
  // const createdTime = document.getElementById("scholarship_createdTime").value;
  // const updateTime = document.getElementById("scholarship_updateTime").value;
  const status = document.getElementById("scholarship_status").value;
  const deadline = document.getElementById("scholarship_deadline").value;

  if (!title || !companyName || !location || !deadline) {
    alert("Please fill all required fields (title, company, location, deadline).");
    return;
  }

  const now = getWIBTime();

  const dbRef = ref(database, 'scholarships/' + scholarshipId);
  set(dbRef, {
    title,
    companyName,
    location,
    startDate,
    duration,
    requirements,
    createdTime: now,
    updateTime: now,
    status,
    deadline
  })
    .then(() => alert("Scholarship added successfully!"))
    .catch((err) => {
      console.error("Error saving scholarship:", err);
      alert("Something went wrong.");
    });
});


// Add Internship
document.getElementById("AddInternshipBtn").addEventListener("click", () => {
  const internshipId = document.getElementById("internship_id").value;
  const title = document.getElementById("internship_title").value;
  const companyName = document.getElementById("internship_companyName").value;
  const location = document.getElementById("internship_location").value;
  const startDate = document.getElementById("internship_startDate").value;
  const duration = document.getElementById("internship_duration").value;
  const requirements = document.getElementById("internship_requirements").value;
  // const createdTime = document.getElementById("internship_createdTime").value;
  // const updateTime = document.getElementById("internship_updateTime").value;
  const status = document.getElementById("internship_status").value;
  const deadline = document.getElementById("internship_deadline").value;

  if (!title || !companyName || !location || !deadline) {
    alert("Please fill all required fields (title, company, location, deadline).");
    return;
  }

  const now = getWIBTime();
  const dbRef = ref(database, 'internships/' + internshipId);
  set(dbRef, {
    title,
    companyName,
    location,
    startDate,
    duration,
    requirements,
    createdTime: now,
    updateTime: now,
    status,
    deadline
  })
    .then(() => alert("Internship added successfully!"))
    .catch((err) => {
      console.error("Error saving internship:", err);
      alert("Something went wrong.");
    });
});

// Delete Scholarship
document.getElementById("DeleteScholarshipBtn").addEventListener("click", () => {
  const scholarshipId = document.getElementById("scholarship_id").value;
  if (!scholarshipId) {
    alert("Please provide a Scholarship ID to delete.");
    return;
  }

  const dbRef = ref(database, 'scholarships/' + scholarshipId);
  set(dbRef, null)
    .then(() => alert("Scholarship deleted successfully!"))
    .catch((err) => {
      console.error("Error deleting scholarship:", err);
      alert("Something went wrong.");
    });
});


// Delete Internship
document.getElementById("DeleteInternshipBtn").addEventListener("click", () => {
  const internshipId = document.getElementById("internship_id").value;
  if (!internshipId) {
    alert("Please provide an Internship ID to delete.");
    return;
  }

  const dbRef = ref(database, 'internships/' + internshipId);
  set(dbRef, null)
    .then(() => alert("Internship deleted successfully!"))
    .catch((err) => {
      console.error("Error deleting internship:", err);
      alert("Something went wrong.");
    });
});

// Update internship
document.getElementById("UpdateInternshipBtn").addEventListener("click", () => {
  const internshipId = document.getElementById("internship_id").value;
  if (!internshipId) {
    alert("Internship ID is required.");
    return;
  }

  const title = document.getElementById("internship_title").value;
  const companyName = document.getElementById("internship_companyName").value;
  const location = document.getElementById("internship_location").value;
  const startDate = document.getElementById("internship_startDate").value;
  const duration = document.getElementById("internship_duration").value;
  const requirements = document.getElementById("internship_requirements").value;
  const status = document.getElementById("internship_status").value;
  const deadline = document.getElementById("internship_deadline").value;

  const updates = {};
  if (title) updates["title"] = title;
  if (companyName) updates["companyName"] = companyName;
  if (location) updates["location"] = location;
  if (startDate) updates["startDate"] = startDate;
  if (duration) updates["duration"] = duration;
  if (requirements) updates["requirements"] = requirements;
  if (status) updates["status"] = status;
  if (deadline) updates["deadline"] = deadline;
  // Always update this:
  updates["updateTime"] = getWIBTime();
  if (Object.keys(updates).length === 1) { // only updateTime
    alert("Please fill at least one field to update.");
    return;
  }

  const dbRef = ref(database, 'internships/' + internshipId);
  update(dbRef, updates)
    .then(() => alert("Internship updated successfully!"))
    .catch((err) => {
      console.error("Error updating internship:", err);
      alert("Something went wrong.");
    });
});


// Update scholarship
document.getElementById("UpdateScholarshipBtn").addEventListener("click", () => {
  const scholarshipId = document.getElementById("scholarship_id").value;
  if (!scholarshipId) {
    alert("Scholarship ID is required.");
    return;
  }

  const title = document.getElementById("scholarship_title").value;
  const companyName = document.getElementById("scholarship_companyName").value;
  const location = document.getElementById("scholarship_location").value;
  const startDate = document.getElementById("scholarship_startDate").value;
  const duration = document.getElementById("scholarship_duration").value;
  const requirements = document.getElementById("scholarship_requirements").value;
  const status = document.getElementById("scholarship_status").value;
  const deadline = document.getElementById("scholarship_deadline").value;

  const updates = {};
  if (title) updates["title"] = title;
  if (companyName) updates["companyName"] = companyName;
  if (location) updates["location"] = location;
  if (startDate) updates["startDate"] = startDate;
  if (duration) updates["duration"] = duration;
  if (requirements) updates["requirements"] = requirements;
  if (status) updates["status"] = status;
  if (deadline) updates["deadline"] = deadline;

  // Always update this:
  updates["updateTime"] = getWIBTime();

  if (Object.keys(updates).length === 1) { // only updateTime
    alert("Please fill at least one field to update.");
    return;
  }

  const dbRef = ref(database, 'scholarships/' + scholarshipId);
  update(dbRef, updates)
    .then(() => alert("Scholarship updated successfully!"))
    .catch((err) => {
      console.error("Error updating scholarship:", err);
      alert("Something went wrong.");
    });
});


