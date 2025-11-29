// Firebase init
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

// footer year
const fy = document.getElementById('footerYear');
if (fy) fy.textContent = new Date().getFullYear().toString();

/* -------- Helper: normalize note object -------- */
function normalizeNote(raw) {
  let tags = raw.tags || [];
  if (typeof tags === 'string') {
    tags = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  }

  return {
    title: raw.title || '',
    subject: raw.subject || '',
    semester: String(raw.semester || ''),
    faculty: raw.faculty || '',
    tags,
    fileSize: String(raw.fileSize || ''),
    driveLink: raw.driveLink || '',
    uploadDate: firebase.firestore.FieldValue.serverTimestamp()
  };
}

/* -------- Shared import function (array -> Firestore) -------- */
async function importNotesArray(items, setStatus) {
  if (!Array.isArray(items) || items.length === 0) {
    setStatus('No items found to import.', '#ffcc00');
    return;
  }

  const batchSize = 400;

  try {
    let imported = 0;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = db.batch();
      const slice = items.slice(i, i + batchSize);

      slice.forEach(raw => {
        const docRef = db.collection('notes').doc();
        batch.set(docRef, normalizeNote(raw));
      });

      await batch.commit();
      imported += slice.length;
      setStatus('Imported ' + imported + ' / ' + items.length + ' notes...', '#aaaaaa');
    }

    setStatus('Import completed for ' + items.length + ' notes.', '#00ff9d');
  } catch (err) {
    console.error(err);
    setStatus('Error during import: ' + err.message, '#ff6b6b');
  }
}

/* -------- 1) Bulk import from JSON textarea -------- */

const bulkJsonInput = document.getElementById('bulkJsonInput');
const bulkImportBtn = document.getElementById('bulkImportBtn');
const bulkImportStatus = document.getElementById('bulkImportStatus');

if (bulkImportBtn && bulkJsonInput && bulkImportStatus) {
  bulkImportBtn.addEventListener('click', () => {
    const text = bulkJsonInput.value.trim();
    if (!text) {
      bulkImportStatus.textContent = 'Paste JSON data first.';
      bulkImportStatus.style.color = '#ffcc00';
      return;
    }

    let items;
    try {
      items = JSON.parse(text);
      if (!Array.isArray(items)) {
        throw new Error('JSON must be an array of note objects');
      }
    } catch (err) {
      bulkImportStatus.textContent = 'Invalid JSON: ' + err.message;
      bulkImportStatus.style.color = '#ff6b6b';
      return;
    }

    bulkImportStatus.textContent = 'Starting import...';
    bulkImportStatus.style.color = '#aaaaaa';

    importNotesArray(items, (msg, color) => {
      bulkImportStatus.textContent = msg;
      bulkImportStatus.style.color = color;
    }).then(() => {
      bulkJsonInput.value = '';
    });
  });
}

/* -------- 2) Import from Google Sheet JSON URL -------- */

const sheetUrlInput = document.getElementById('sheetUrlInput');
const sheetImportBtn = document.getElementById('sheetImportBtn');
const sheetImportStatus = document.getElementById('sheetImportStatus');

if (sheetImportBtn && sheetUrlInput && sheetImportStatus) {
  sheetImportBtn.addEventListener('click', async () => {
    const url = sheetUrlInput.value.trim();
    if (!url) {
      sheetImportStatus.textContent = 'Enter a Sheet JSON URL first.';
      sheetImportStatus.style.color = '#ffcc00';
      return;
    }

    sheetImportStatus.textContent = 'Fetching data from sheet...';
    sheetImportStatus.style.color = '#aaaaaa';

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.rows)
        ? data.rows
        : [];

      await importNotesArray(items, (msg, color) => {
        sheetImportStatus.textContent = msg;
        sheetImportStatus.style.color = color;
      });
    } catch (err) {
      console.error(err);
      sheetImportStatus.textContent = 'Error fetching sheet: ' + err.message;
      sheetImportStatus.style.color = '#ff6b6b';
    }
  });
}
