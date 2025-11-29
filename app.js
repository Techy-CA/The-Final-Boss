// Firebase initialization
const firebaseConfig = {
  apiKey: "AIzaSyBFWCCiw-9_8gsBaXoJ1RxMEL89lvyOIho",
  authDomain: "the-final-boss-notes.firebaseapp.com",
  projectId: "the-final-boss-notes",
  storageBucket: "the-final-boss-notes.appspot.com",
  messagingSenderId: "319601095052",
  appId: "1:319601095052:web:691823298ab7c1826f66a9",
  measurementId: "G-CVCSSCXMCB",
};
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

// UI Elements
const notesList = document.getElementById('notesList');
const searchInput = document.getElementById('searchInput');
const semesterFilter = document.getElementById('semesterFilter');
const sortSelect = document.getElementById('sortSelect');
const footerYearEl = document.getElementById('footerYear');

// stats elements
const statTotalNotes = document.getElementById('statTotalNotes');
const statSubjects = document.getElementById('statSubjects');
const statSemesters = document.getElementById('statSemesters');
const statLastUpdated = document.getElementById('statLastUpdated');

let notesCache = [];

// footer year
if (footerYearEl) {
  footerYearEl.textContent = new Date().getFullYear().toString();
}

// Helper: clear children of element
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// Helper: sanitize text for search/filter
function sanitize(text) {
  return text.toLowerCase().trim();
}

// Render note cards
function renderNotes(notes) {
  clearChildren(notesList);
  if (notes.length === 0) {
    notesList.innerHTML = '<div class="empty-state">No notes found matching your criteria.</div>';
    return;
  }
  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <div class="note-header">
        <div class="note-title" title="${note.title}">${note.title}</div>
        <div class="note-badge">Sem ${note.semester}</div>
      </div>
      <div class="note-body">
        <div class="note-info"><span class="icon">📚</span> ${note.subject}</div>
        <div class="note-info"><span class="icon">👨‍🏫</span> ${note.faculty}</div>
        <div class="note-tags">${note.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>
      </div>
      <div class="note-footer">
        <div class="file-size">${note.fileSize} MB</div>
        <a class="download-btn" href="${note.driveLink}" target="_blank" rel="noopener noreferrer">
          Download
        </a>
      </div>
    `;
    notesList.appendChild(card);
  });
}

// Update quick stats
function updateStats(notes) {
  statTotalNotes.textContent = notes.length.toString();

  const subjectSet = new Set();
  const semesterSet = new Set();
  let latest = null;

  notes.forEach(n => {
    if (n.subject) subjectSet.add(n.subject);
    if (n.semester) semesterSet.add(n.semester);
    if (n.uploadDate && n.uploadDate.toDate) {
      const d = n.uploadDate.toDate();
      if (!latest || d > latest) latest = d;
    }
  });

  statSubjects.textContent = subjectSet.size ? subjectSet.size.toString() : '–';
  statSemesters.textContent = semesterSet.size ? semesterSet.size.toString() : '–';

  if (latest) {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    statLastUpdated.textContent = latest.toLocaleDateString(undefined, options);
  } else {
    statLastUpdated.textContent = '–';
  }
}

// Filter, search, sort notes dynamically
function updateDisplayedNotes() {
  let filtered = notesCache.slice();

  const semFilterVal = semesterFilter.value;
  if (semFilterVal) {
    filtered = filtered.filter(n => n.semester === semFilterVal);
  }

  const searchVal = sanitize(searchInput.value);
  if (searchVal) {
    filtered = filtered.filter(note => {
      return (
        sanitize(note.title).includes(searchVal) ||
        sanitize(note.subject).includes(searchVal) ||
        sanitize(note.faculty).includes(searchVal) ||
        note.tags.some(tag => sanitize(tag).includes(searchVal))
      );
    });
  }

  const sortVal = sortSelect.value;
  filtered.sort((a,b) => {
    if (sortVal === 'uploadDateDesc') {
      return b.uploadDate.seconds - a.uploadDate.seconds;
    } else if (sortVal === 'uploadDateAsc') {
      return a.uploadDate.seconds - b.uploadDate.seconds;
    } else if (sortVal === 'titleAsc') {
      return a.title.localeCompare(b.title);
    } else if (sortVal === 'titleDesc') {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  renderNotes(filtered);
  updateStats(notesCache);
}

// Load notes from Firestore
async function loadNotes() {
  notesList.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const querySnapshot = await db.collection('notes').get();
    notesCache = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        subject: data.subject || '',
        semester: data.semester || '',
        faculty: data.faculty || '',
        tags: data.tags || [],
        fileSize: data.fileSize || '',
        driveLink: data.driveLink || '',
        uploadDate: data.uploadDate || { seconds: 0 }
      };
    });
    updateDisplayedNotes();
  } catch (error) {
    console.error(error);
    notesList.innerHTML = '<div class="error-state">Failed to load notes. Please try again later.</div>';
  }
}

// Event listeners
searchInput.addEventListener('input', updateDisplayedNotes);
semesterFilter.addEventListener('change', updateDisplayedNotes);
sortSelect.addEventListener('change', updateDisplayedNotes);

// Initial load
loadNotes();
