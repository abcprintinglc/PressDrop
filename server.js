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

async function generateGeminiSummary({ name, email, notes, files }) {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const fileList = files.map(file => `- ${file.originalname}`).join('\n') || '- No files listed';

    const prompt = [
        'Summarize this print job in 2-3 bullet points.',
        '',
        `Name: ${name || 'N/A'}`,
        `Email: ${email || 'N/A'}`,
        `Notes: ${notes || 'N/A'}`,
        'Files:',
        fileList
    ].join('\n');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ]
            })
        }
    );

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini request failed: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Handle File Upload
app.post('/upload', upload.array('files'), async (req, res) => {
    console.log('Files received:', req.files);
    console.log('Form data:', req.body);

    // In a real app, you would email this info to the print shop here
    try {
        const aiSummary = await generateGeminiSummary({
            name: req.body.name,
            email: req.body.email,
            notes: req.body.notes,
            files: req.files || []
        });

        res.json({
            message: 'Upload successful! We have received your files.',
            aiSummary
        });
    } catch (error) {
        console.error('Gemini summary failed:', error);
        res.json({ message: 'Upload successful! We have received your files.' });
    }
});

app.listen(PORT, () => {
    console.log(`PressDrop server running at http://localhost:${PORT}`);
});
