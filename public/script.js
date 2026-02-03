const dropArea = document.getElementById('drop-area');
const gallery = document.getElementById('gallery');
const aiSummary = document.getElementById('ai-summary');
let filesToUpload = [];

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false)   
  document.body.addEventListener(eventName, preventDefaults, false)
});

function preventDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
}

// Highlight drop area when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false)
});
['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false)
});

function highlight(e) { dropArea.classList.add('highlight') }
function unhighlight(e) { dropArea.classList.remove('highlight') }

// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

function handleFiles(files) {
  filesToUpload = [...filesToUpload, ...files];
  updateGallery();
}

function updateGallery() {
    gallery.innerHTML = filesToUpload.map(f => `<div>${f.name}</div>`).join('');
}

// Upload to Server
document.getElementById('uploadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const url = '/upload';
    const formData = new FormData(document.getElementById('uploadForm'));
    
    // Append files manually
    filesToUpload.forEach(file => {
        formData.append('files', file);
    });

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('status').innerText = data.message;
        document.getElementById('status').style.color = 'green';
        if (data.aiSummary) {
            aiSummary.innerText = `Gemini summary:\n${data.aiSummary}`;
        } else {
            aiSummary.innerText = '';
        }
        filesToUpload = []; // Clear files
        updateGallery();
    })
    .catch(() => { 
        document.getElementById('status').innerText = "Upload failed.";
        document.getElementById('status').style.color = 'red';
        aiSummary.innerText = '';
    });
});
