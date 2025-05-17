// Firebase config and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  increment
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBcGAlRNxn1oJ5SpQb179EdzXXW4tYpHrs",
  authDomain: "nextstep-123.firebaseapp.com",
  projectId: "nextstep-123",
  storageBucket: "nextstep-123.firebasestorage.app",
  messagingSenderId: "427076545876",
  appId: "1:427076545876:web:e588a15084e83343482cc1",
  measurementId: "G-6S22DPGVP3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

async function getUserDataByUid(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return null;
}

// Watch auth state
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    loadPosts();
  } else {
    alert("You must be logged in to use the forum.");
  }
});

console.log("🔥 Firebase Firestore initialized!");

document.addEventListener('DOMContentLoaded', () => {
  const showBtn = document.getElementById('showCreatePostBtn');
  const createSection = document.getElementById('createPostSection');
  const closeBtn = document.getElementById('closeCreatePostBtn'); 

  if (showBtn && createSection) {
    showBtn.addEventListener('click', () => {
      createSection.style.display = 'block';
      showBtn.style.display = 'none';
    });
  }

  if (closeBtn && createSection && showBtn) { 
    closeBtn.addEventListener('click', () => {
      createSection.style.display = 'none';
      showBtn.style.display = 'flex';
      document.getElementById("title").value = "";
      document.getElementById("content").value = "";
      document.getElementById("category").value = "General";
    });
  }
});

// Create a new post
window.createPost = async function () {
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const category = document.getElementById("category").value;

  if (!title || !content) {
    alert("Title and content cannot be empty.");
    return;
  }

  if (!currentUser) {
    alert("You must be logged in to create a post.");
    return;
  }

  try {
    const userData = await getUserDataByUid(currentUser.uid);
    const userName = userData ? userData.name : "Anonymous";
    const school = userData ? userData.school || "" : "";

    await addDoc(collection(db, "forumPosts"), {
      title,
      content,
      category,
      userName,
      userEmail: currentUser.email,
      school,
      createdAt: new Date(),
      score: 0,
    });
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
    document.getElementById("category").value = "General";

    loadPosts();

  } catch (err) {
    console.error("Error creating post:", err);
  }
};

let selectedCategory = "All";
window.filterByCategory = function (category) {
  selectedCategory = category;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === category);
  });
  loadPosts();
};

// Load posts and replies
async function loadPosts() {
  const container = document.getElementById("forumContainer");
  if (!container) return;
  container.innerHTML = "";

  try {
    const postsQuery = query(collection(db, "forumPosts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(postsQuery);

    for (const docSnap of snapshot.docs) {
      const post = docSnap.data();
      const postId = docSnap.id;

      let dateStr = "";
      if (post.createdAt && post.createdAt.toDate) {
        const date = post.createdAt.toDate();
        dateStr = date.toLocaleString();
      }

      if (selectedCategory !== "All" && (post.category || "General") !== selectedCategory) {
        continue;
      }

      const isAuthor = currentUser && currentUser.email === post.userEmail;
      // FIX: Prevent modal popup on delete by stopping propagation
      const deleteBtn = isAuthor
        ? `<button onclick="event.stopPropagation(); deletePost('${postId}')"> <img src="../Assets/trash-alt.png" alt="delete" style="width: 20px; height: 20px; cursor: pointer;" /></button>`
        : "";

      let repliesHTML = "";
      const repliesQuery = query(collection(db, "forumPosts", postId, "replies"), orderBy("createdAt"));
      const replySnap = await getDocs(repliesQuery);
      let replyCount = 0;

      replySnap.forEach(r => {
        const data = r.data();
        const replyId = r.id;
        const canDelete = currentUser && currentUser.email === data.userEmail;
        repliesHTML += `<div class="reply"><strong>${data.userName || data.userEmail}</strong>: ${data.content}
          ${canDelete ? `<button onclick="event.stopPropagation(); deleteReply('${postId}', '${replyId}')"
            style="background:none; border:none; color:red; cursor:pointer; margin-left:8px;">🗑️</button>` : ""}
        </div>`;
        replyCount++;
      });

      let userVote = 0;
      let score = 0;
      if (currentUser) {
        userVote = await getUserVote(postId, currentUser.uid);
      }
      score = await getPostScore(postId);

      const upDisabled = userVote === 1 ? "disabled" : "";
      const downDisabled = (userVote === -1 || score === 0) ? "disabled" : "";

      container.innerHTML += `
      <div class="post" style="position: relative; cursor:pointer; display: flex; align-items: flex-start;" onclick="showPostModal('${postId}')">
        <div class="vote-column" style="display: flex; flex-direction: column; align-items: center; margin-right: 18px; min-width: 40px;">
          <button onclick="event.stopPropagation(); votePost('${postId}', 1)" ${upDisabled} style="background:none; border:none; padding:0;">
            <img src="../Assets/like.png" alt="Upvote" style="width: 20px; height: 20px; cursor: pointer;" />
          </button>
          <span style="font-weight:bold; margin: 6px 0;">${score}</span>
          <button onclick="event.stopPropagation(); votePost('${postId}', -1)" ${downDisabled} style="background:none; border:none; padding:0">
            <img src="../Assets/dislike (1).png" alt="Downvote" style="width: 20px; height: 20px; cursor: pointer;" />
          </button>
        </div>
        <div style="flex:1;">
          <span style="position: absolute; top: 10px; right: 15px; font-size: 0.9em; color: #888;">${dateStr}</span> 
          <span class="category-tag category-${(post.category || "discussion").toLowerCase()}">
            ${post.category ? post.category.charAt(0).toUpperCase() + post.category.slice(1) : "Discussion"} 
          </span>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #888;"><em>by ${post.userName || post.userEmail}</em></span>
            ${post.school ? `
              <span style="display: flex; align-items: center; gap: 4px; color: #4a90e2; font-size: 0.95em;">
                <img src="../Assets/school.png" alt="School" style="width: 15px; height: 15px; cursor: pointer;" />
                ${post.school}
              </span>
            ` : ""}
          </div>
          <h3 style="margin:0; font-size: 1.5em;">${post.title}</h3>
          <p>${post.content}</p>
          <div class="post-buttons" style="display: flex; gap: 8px; align-items: center;">
            <button class="reply-toggle" onclick="event.stopPropagation(); showPostModal('${postId}')" style="display: flex; align-items: center; gap: 4px;">
              <span class="reply-toggle-icon" style="display: flex; align-items: center;">
                <img src="../Assets/message-circle.png" alt="Message" style="width: 15px; height: 15px; cursor: pointer; padding: 5px;" />
              </span>
              <span class="reply-count">${replyCount}</span>
            </button>
            ${deleteBtn}
          </div>
        </div>
      </div>
      `;
    }
  } catch (err) {
    console.error("Error loading posts:", err);
  }
}

// Reply to post
window.replyToPost = async function (postId, inputId) {
  const replyText = document.getElementById(inputId).value.trim();
  if (!replyText) return;

  if (!currentUser) {
    alert("You must be logged in to reply.");
    return;
  }

  try {
    const repliesRef = collection(db, "forumPosts", postId, "replies");
    const userData = await getUserDataByUid(currentUser.uid);
    const userName = userData ? userData.name : "Anonymous";

    await addDoc(repliesRef, {
      content: replyText,
      userName,
      userEmail: currentUser.email,
      createdAt: new Date()
    });

    showPostModal(postId);
  } catch (err) {
    console.error("Error replying to post:", err);
  }
};

// Delete post and its replies
window.deletePost = async function (postId) {
  const confirmDelete = confirm("Are you sure you want to delete this post?");
  if (!confirmDelete) return;

  try {
    const postRef = doc(db, "forumPosts", postId);
    const repliesRef = collection(db, "forumPosts", postId, "replies");

    const repliesSnapshot = await getDocs(repliesRef);
    for (const replyDoc of repliesSnapshot.docs) {
      await deleteDoc(replyDoc.ref);
    }

    await deleteDoc(postRef);

    loadPosts();
  } catch (err) {
    console.error("Error deleting post:", err);
  }
};

window.deleteReply = async function (postId, replyId) {
  const confirmDelete = confirm("Are you sure you want to delete this reply?");
  if (!confirmDelete) return;
  try {
    await deleteDoc(doc(db, "forumPosts", postId, "replies", replyId));
    // Refresh modal if open, else reload posts
    const modal = document.getElementById("postModal");
    if (modal && modal.style.display === "block") {
      showPostModal(postId);
    } else {
      loadPosts();
    }
  } catch (err) {
    alert("Error deleting reply.");
    console.error(err);
  }
};

window.showPostModal = async function (postId) {
  const modal = document.getElementById("postModal");
  const modalContent = document.getElementById("modalContent");
  modalContent.innerHTML = "Loading...";

  try {
    const postRef = doc(db, "forumPosts", postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      modalContent.innerHTML = "Post not found.";
      modal.style.display = "block";
      return;
    }
    const post = postSnap.data();

    const repliesQuery = query(collection(db, "forumPosts", postId, "replies"), orderBy("createdAt"));
    const replySnap = await getDocs(repliesQuery);
    let repliesHTML = "";
    replySnap.forEach(r => {
      const data = r.data();
      const replyId = r.id;
      const canDelete = currentUser && currentUser.email === data.userEmail;
      repliesHTML += `<div class="reply" style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f7f9fb; border-radius: 6px; margin-bottom: 6px;">
        <strong>${data.userName || data.userEmail}</strong>:&nbsp;<span>${data.content}</span>
        ${canDelete ? `<button onclick="event.stopPropagation(); deleteReply('${postId}', '${replyId}')"
          style="background:none; border:none; color:red; cursor:pointer; margin-left:8px; display: flex; align-items: center;">
          <img src="../Assets/trash-alt.png" alt="delete" style="width: 20px; height: 20px; cursor: pointer;" />
        </button>` : ""}
      </div>`;
    });

    let userVote = 0;
    let score = 0;
    if (currentUser) {
      userVote = await getUserVote(postId, currentUser.uid);
    }
    score = await getPostScore(postId);

    const upDisabled = userVote === 1 ? "disabled" : "";
    const downDisabled = userVote === -1 ? "disabled" : "";

    // Modal content
    modalContent.innerHTML = `
      <span class="category-tag category-${(post.category || "discussion").toLowerCase()}">
        ${post.category ? post.category.charAt(0).toUpperCase() + post.category.slice(1) : "Discussion"}
      </span>
      <h3 style="margin:0; font-size: 2em;">${post.title}</h3>
      <p>${post.content}</p>
      <h4>Replies</h4>
      ${repliesHTML}
      <textarea id="modalReply_${postId}" placeholder="Reply..."></textarea>
      <button onclick="replyToPost('${postId}', 'modalReply_${postId}')">Reply</button>
    `;
    modal.style.display = "block";
  } catch (err) {
    modalContent.innerHTML = "Error loading post.";
  }
};

document.getElementById("closeModal").onclick = function () {
  document.getElementById("postModal").style.display = "none";
};

document.getElementById("postModal").onclick = function (e) {
  if (e.target === this) this.style.display = "none";
};

async function getUserVote(postId, userId) {
  const voteDoc = await getDoc(doc(db, "forumPosts", postId, "votes", userId));
  if (voteDoc.exists()) {
    return voteDoc.data().vote;
  }
  return 0;
}

// Helper: Get total score for a post
async function getPostScore(postId) {
  const postRef = doc(db, "forumPosts", postId);
  const postSnap = await getDoc(postRef);
  return postSnap.exists() ? (postSnap.data().score || 0) : 0;
}

// Upvote/downvote logic
window.votePost = async function (postId, voteValue) {
  if (!currentUser) {
    alert("You must be logged in to vote.");
    return;
  }

  const userId = currentUser.uid;
  const voteRef = doc(db, "forumPosts", postId, "votes", userId);
  const postRef = doc(db, "forumPosts", postId);

  try {
    const [voteSnap, postSnap] = await Promise.all([
      getDoc(voteRef),
      getDoc(postRef)
    ]);

    const prevVote = voteSnap.exists() ? voteSnap.data().vote : 0;
    const currentScore = postSnap.data().score || 0;

    let newVote = voteValue;
    let scoreChange = 0;

    if (prevVote === voteValue) {
      newVote = 0;
      scoreChange = -prevVote;
    }
    else if (prevVote !== 0) {
      newVote = voteValue;
      scoreChange = voteValue - prevVote;
    }
    else {
      newVote = voteValue;
      scoreChange = voteValue;
    }

    if (prevVote === 1 && voteValue === -1) {
      scoreChange = -1;
    } else if (prevVote === -1 && voteValue === 1) {
      scoreChange = 1;
    }

    if (newVote === 0) {
      await deleteDoc(voteRef);
    } else {
      await setDoc(voteRef, { vote: newVote });
    }

    await updateDoc(postRef, {
      score: increment(scoreChange)
    });

    loadPosts();
  } catch (err) {
    console.error("Voting error:", err);
  }
};