const photoshop = require('photoshop');
const { storage } = require('uxp');

const fileList = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const addDocBtn = document.getElementById('addDoc');
const addFilesBtn = document.getElementById('addFiles');
const statusEl = document.getElementById('status');

const filesToUpload = [];

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function renderFiles() {
  if (filesToUpload.length === 0) {
    fileList.innerHTML = '<li class="empty">No files selected yet.</li>';
    return;
  }

  fileList.innerHTML = filesToUpload
    .map((file) => `<li><span>${file.name}</span></li>`)
    .join('');
}

async function addCurrentDocument() {
  const document = photoshop.app.activeDocument;
  if (!document) {
    setStatus('No active document found in Photoshop.', 'error');
    return;
  }

  const tempFolder = await storage.localFileSystem.getTemporaryFolder();
  const safeName = document.title.replace(/\s+/g, '-').replace(/[^a-z0-9-_.]/gi, '');
  const fileEntry = await tempFolder.createFile(`${safeName || 'pressdrop'}-export.png`, {
    overwrite: true
  });

  await document.saveAs.png(fileEntry);
  filesToUpload.push(fileEntry);
  renderFiles();
  setStatus('Current document added as PNG.', 'success');
}

async function addFiles() {
  const entries = await storage.localFileSystem.getFileForOpening({
    allowMultiple: true,
    types: ['png', 'jpg', 'jpeg', 'psd', 'pdf', 'ai']
  });

  if (!entries || entries.length === 0) {
    return;
  }

  const selectedEntries = Array.isArray(entries) ? entries : [entries];
  selectedEntries.forEach((entry) => filesToUpload.push(entry));
  renderFiles();
  setStatus('Files added for upload.', 'success');
}

async function uploadFiles() {
  if (filesToUpload.length === 0) {
    setStatus('Add at least one file before uploading.', 'error');
    return;
  }

  const serverUrl = document.getElementById('serverUrl').value.trim();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const notes = document.getElementById('notes').value.trim();

  if (!serverUrl) {
    setStatus('Please provide an upload URL.', 'error');
    return;
  }

  if (!name || !email) {
    setStatus('Name and email are required.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('email', email);
  formData.append('notes', notes);

  for (const fileEntry of filesToUpload) {
    const binary = await fileEntry.read({ format: storage.formats.binary });
    const blob = new Blob([binary], { type: 'application/octet-stream' });
    formData.append('files', blob, fileEntry.name);
  }

  setStatus('Uploading...', 'info');

  const response = await fetch(serverUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    setStatus(`Upload failed (${response.status}).`, 'error');
    return;
  }

  const payload = await response.json();
  const summaryText = payload.aiSummary ? ` Gemini: ${payload.aiSummary}` : '';
  setStatus(`${payload.message || 'Upload completed.'}${summaryText}`, 'success');
  filesToUpload.length = 0;
  renderFiles();
}

addDocBtn.addEventListener('click', () => {
  addCurrentDocument().catch((error) => {
    setStatus(`Failed to export document: ${error.message}`, 'error');
  });
});

addFilesBtn.addEventListener('click', () => {
  addFiles().catch((error) => {
    setStatus(`Failed to select files: ${error.message}`, 'error');
  });
});

uploadBtn.addEventListener('click', () => {
  uploadFiles().catch((error) => {
    setStatus(`Upload error: ${error.message}`, 'error');
  });
});

renderFiles();
setStatus('Ready to upload.', 'info');
