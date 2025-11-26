const firebaseConfig = {
  apiKey: "AIzaSyBFWCCiw-9_8gsBaXoJ1RxMEL89lvyOIho",
  authDomain: "the-final-boss-notes.firebaseapp.com",
  projectId: "the-final-boss-notes",
  storageBucket: "the-final-boss-notes.appspot.com",
  messagingSenderId: "319601095052",
  appId: "1:319601095052:web:691823298ab7c1826f66a9"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");
const noteForm = document.getElementById("noteForm");
const notesList = document.getElementById("notesList");

let editingId = null;

// Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    loginSection.classList.add("hidden");
    adminSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loadNotes();
  } else {
    loginSection.classList.remove("hidden");
    adminSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
});

// Login
loginForm.addEventListener("submit", e => {
  e.preventDefault();
  const email = loginEmail.value;
  const pass = loginPassword.value;

  auth.signInWithEmailAndPassword(email, pass)
    .catch(err => loginMessage.innerText = err.message);
});

// Logout
logoutBtn.onclick = () => auth.signOut();

// Load Notes
async function loadNotes() {
  notesList.innerHTML = "";
  const snapshot = await db.collection("notes").orderBy("uploadDate","desc").get();

  snapshot.forEach(doc => {
    let note = doc.data();

    let div = document.createElement("div");
    div.className = "note-item";
    div.innerHTML = `
      <div>${note.title} (Sem ${note.semester})</div>
      <div>
        <button onclick="editNote('${doc.id}')">Edit</button>
        <button onclick="deleteNote('${doc.id}')">Delete</button>
      </div>
    `;
    notesList.appendChild(div);
  });
}

// Add / Update Note
noteForm.addEventListener("submit", async e => {
  e.preventDefault();

  let data = {
    title: noteTitle.value,
    subject: noteSubject.value,
    semester: noteSemester.value,
    faculty: noteFaculty.value,
    tags: noteTags.value.split(','),
    fileSize: noteFileSize.value,
    driveLink: noteDriveLink.value,
    uploadDate: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (editingId) {
    await db.collection("notes").doc(editingId).update(data);
    editingId = null;
  } else {
    await db.collection("notes").add(data);
  }

  noteForm.reset();
  loadNotes();
});

// Edit
async function editNote(id) {
  let doc = await db.collection("notes").doc(id).get();
  let data = doc.data();

  noteTitle.value = data.title;
  noteSubject.value = data.subject;
  noteSemester.value = data.semester;
  noteFaculty.value = data.faculty;
  noteTags.value = data.tags.join(",");
  noteFileSize.value = data.fileSize;
  noteDriveLink.value = data.driveLink;

  editingId = id;
}

// Delete
async function deleteNote(id) {
  if (!confirm("Delete this note?")) return;
  await db.collection("notes").doc(id).delete();
  loadNotes();
}
