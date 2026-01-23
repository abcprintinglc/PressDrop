const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Configure Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Safe filename: timestamp + original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Handle File Upload
app.post('/upload', upload.array('files'), (req, res) => {
    console.log('Files received:', req.files);
    console.log('Form data:', req.body);
    
    // In a real app, you would email this info to the print shop here
    
    res.json({ message: 'Upload successful! We have received your files.' });
});

app.listen(PORT, () => {
    console.log(`PressDrop server running at http://localhost:${PORT}`);
});