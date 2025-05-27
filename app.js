const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { body, validationResult } = require('express-validator'); // Added for validation

dotenv.config(); // Load .env variables

const app = express();
const port = process.env.PORT || 3000;

//  Middleware 
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.static('public')); // Serve static files from 'public' directory
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure Upload Directory using .env
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'public', 'uploads', 'certificates');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`Created upload directory: ${uploadDir}`);
    } catch (mkdirError) {
        console.error(`Error creating upload directory ${uploadDir}:`, mkdirError);
    }
}
// Determine static path relative to 'public' for serving files via URL
const staticCertPath = path.relative(path.join(__dirname, 'public'), uploadDir).replace(/\\/g, '/');
app.use(`/${staticCertPath}`, express.static(uploadDir));


// --- Database Connection Pool ---
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'medical_records',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
};
const pool = mysql.createPool(dbConfig);
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to DB pool:', err);
        process.exit(1);
        return;
    }
    console.log('DB pool connected successfully.');
    connection.release();
});
pool.on('error', (err) => {
    console.error('DB pool encountered an error:', err);
});


// --- Multer Configuration (For Certificate Uploads) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        const rollNo = req.body.rollNo || 'unknown_roll';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeRollNo = rollNo.replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `cert-${safeRollNo}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const pdfFileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '5242880'); // 5MB default from .env
const upload = multer({
    storage: storage,
    fileFilter: pdfFileFilter,
    limits: { fileSize: maxFileSize }
});

// Authentication Middleware 
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here', (err, user) => {
        if (err) {
            console.error("JWT Verification Error:", err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ success: false, error: 'Forbidden: Token has expired.' });
            }
            return res.status(403).json({ success: false, error: 'Forbidden: Invalid token.' });
        }
        req.user = user; // Attach user payload (roll_no, role, name) to request
        next();
    });
};

//  Routes 

// POST /login - User Login 
app.post('/login', async (req, res) => {
    const { roll_no, password, role } = req.body;
    if (!roll_no || !password || !role) {
        return res.status(400).json({ success: false, error: 'Missing required fields (roll_no, password, role).' });
    }
    try {
        // Select hostel and room number along with other details
        const [users] = await pool.promise().query('SELECT roll_no, name, password, role, hostel_no, room_no FROM users WHERE roll_no = ? AND role = ?', [roll_no, role]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Authentication failed: User not found or invalid role.' });
        }
        const user = users[0];

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Authentication failed: Invalid credentials.' });
        }

        const tokenPayload = { roll_no: user.roll_no, role: user.role, name: user.name };
        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        
        const responseData = {
            success: true,
            token,
            role: user.role,
            name: user.name 
        };

        // Include hostel/room details ONLY for students
        if (user.role === 'student') {
            responseData.hostel_no = user.hostel_no;
            responseData.room_no = user.room_no;
        }

        res.json(responseData);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error during login process.' });
    }
});


// PUT /student/hostel-details - Update student hostel and room number (NEW)
app.put('/student/hostel-details',
    authenticateToken, 
    [ 
        body('hostel_no').optional({ nullable: true }).trim().isLength({ max: 50 }).escape(),
        body('room_no').optional({ nullable: true }).trim().isLength({ max: 50 }).escape()
    ],
    async (req, res) => {
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Only students can update their own details
        if (req.user.role !== 'student') {
            return res.status(403).json({ success: false, error: 'Forbidden: Only students can update hostel details.' });
        }

        const studentRollNo = req.user.roll_no;
        const { hostel_no, room_no } = req.body;

        
        const finalHostelNo = (hostel_no !== undefined && hostel_no !== '') ? hostel_no : null;
        const finalRoomNo = (room_no !== undefined && room_no !== '') ? room_no : null;


        try {
            const query = 'UPDATE users SET hostel_no = ?, room_no = ? WHERE roll_no = ? AND role = ?';
            const [result] = await pool.promise().query(query, [finalHostelNo, finalRoomNo, studentRollNo, 'student']);

            if (result.affectedRows === 1) {
                console.log(`Hostel details updated for student: ${studentRollNo}`);
                res.json({ success: true, message: 'Hostel details updated successfully.' });
            } else {
                console.warn(`Failed to update hostel details for non-existent student or incorrect role: ${studentRollNo}`);
                res.status(404).json({ success: false, error: 'Student not found or update failed.' });
            }
        } catch (error) {
            console.error(`Error updating hostel details for student ${studentRollNo}:`, error);
            res.status(500).json({ success: false, error: 'Server error updating details.' });
        }
    }
);


// GET /student/:rollno - Get Student Info (Used for auto-fetch name by staff)
app.get('/student/:rollno', authenticateToken, async (req, res) => {
    const requestedRollno = req.params.rollno;
    const userRollno = req.user.roll_no;
    const userRole = req.user.role;

    // Authorization: Students can only fetch their own name. Staff can fetch any student's name.
    if (userRole === 'student' && userRollno !== requestedRollno) {
        return res.status(403).json({ success: false, error: 'Forbidden: Students can only fetch their own data.' });
    }
    if (userRole !== 'student' && userRole !== 'medical-staff') {
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions.' });
    }

    try {
       
        const [results] = await pool.promise().query('SELECT name FROM users WHERE roll_no = ? AND role = ?', [requestedRollno, 'student']);
        if (results.length === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        res.json({ success: true, name: results[0].name });
    } catch (error) {
        console.error(`Error fetching student data ${requestedRollno}:`, error);
        res.status(500).json({ success: false, error: 'Server error fetching student data.' });
    }
});


// GET /records/:rollno - Get Medical Records for a Student (MODIFIED to include cert path)
app.get('/records/:rollno', authenticateToken, async (req, res) => {
     const requestedRollno = req.params.rollno;
     const userRollno = req.user.roll_no;
     const userRole = req.user.role;

     // Authorization check
     if (userRole === 'student' && userRollno !== requestedRollno) {
        return res.status(403).json({ success: false, error: 'Forbidden: Students can only access their own medical records.' });
     }
     if (userRole !== 'student' && userRole !== 'medical-staff') {
         return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions.' });
     }

    try {
        // Query patient_data and LEFT JOIN with certificates
        const query = `
            SELECT
                p.id, p.date, p.diagnosis, p.medications,
                c.file_path AS certificate_file_path
            FROM
                patient_data p
            LEFT JOIN
                certificates c ON c.patient_data_id = p.id AND c.roll_no = p.roll_no
            WHERE
                p.roll_no = ?
            ORDER BY
                p.date DESC, p.created_at DESC;
        `;
        const [results] = await pool.promise().query(query, [requestedRollno]);

        // Format results, creating the full download path
        const formattedResults = results.map(record => ({
            ...record,
            certificate_download_path: record.certificate_file_path
                                          ? `/${staticCertPath}/${record.certificate_file_path}`
                                          : null
        }));

        res.json({ success: true, data: formattedResults }); // Send the modified results
    } catch (error) {
        console.error(`Error fetching medical records for ${requestedRollno}:`, error);
        res.status(500).json({ success: false, error: 'Server error fetching medical records.' });
    }
});

// GET /medical/staff/records - Get Records for Staff Dashboard
// ... (existing route, no changes needed here for student profile) ...
app.get('/medical/staff/records', authenticateToken, async (req, res) => {
    if (req.user.role !== 'medical-staff') {
        return res.status(403).json({ success: false, error: 'Forbidden: Access restricted to medical staff.' });
    }
    // ... (rest of the staff records logic) ...
    try {
        let targetDate = req.query.date;
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!targetDate || !dateRegex.test(targetDate)) {
             targetDate = 'CURDATE()';
        } else {
             targetDate = pool.escape(targetDate);
        }
        const query = `
            SELECT
                p.id AS recordId, p.name, p.roll_no, p.diagnosis, p.medications, p.created_at,
                MAX(CASE WHEN c.id IS NOT NULL THEN TRUE ELSE FALSE END) AS hasCertificate
            FROM patient_data p
            LEFT JOIN certificates c ON c.patient_data_id = p.id
            WHERE DATE(p.created_at) = ${targetDate}
            GROUP BY p.id, p.name, p.roll_no, p.diagnosis, p.medications, p.created_at
            ORDER BY p.created_at DESC;
        `;
        const [results] = await pool.promise().query(query);
        const finalResults = results.map(record => ({
            ...record,
            recordId: record.recordId,
            hasCertificate: Boolean(record.hasCertificate)
        }));
        res.json({ success: true, data: finalResults });
    } catch (error) {
        console.error('Error fetching staff records:', error);
        res.status(500).json({ success: false, error: 'Server error while fetching records for staff dashboard.' });
    }
});


// POST /medical/staff/record - Submit a New Medical Record (Staff only)
// ... (existing route, no changes needed here) ...
app.post('/medical/staff/record', authenticateToken, async (req, res) => {
    if (req.user.role !== 'medical-staff') {
        return res.status(403).json({ success: false, error: 'Forbidden: Only medical staff can submit records.' });
    }
    const { name, roll_no, diagnosis, medications, date } = req.body;
    if (!name || !roll_no || !diagnosis || !medications || !date) {
        return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    try {
        const query = 'INSERT INTO patient_data (date, name, roll_no, diagnosis, medications, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
        const [result] = await pool.promise().query(query, [date, name, roll_no, diagnosis, medications]);
        if (result.affectedRows === 1) {
            res.status(201).json({ success: true, message: 'Medical record saved successfully.' });
        } else {
            throw new Error('Database insert failed unexpectedly.');
        }
    } catch (error) {
        console.error('Error submitting medical record:', error);
        res.status(500).json({ success: false, error: 'Server error saving medical record.' });
    }
});

// POST /generate-and-save-certificate - Upload PDF and Save Certificate Details (Staff only)
// ... (existing route, no changes needed here) ...
app.post('/generate-and-save-certificate', authenticateToken, upload.single('pdf'), async (req, res) => {
    if (req.user.role !== 'medical-staff') {
        if (req.file) fs.unlink(req.file.path, (err) => { if (err) console.error("Error deleting temp file after auth failure:", err); });
       return res.status(403).json({ success: false, error: 'Forbidden: Only medical staff can issue certificates.' });
    }
    if (!req.file) return res.status(400).json({ success: false, error: 'Certificate generation failed: PDF file is required.' });

    const { rollNo, name, date, diagnosis, medications, age, gender, relaxations, serialNo, recordId } = req.body;
    const filename = req.file.filename;
    if (!rollNo || !name || !date || !diagnosis || !medications || !age || !gender || !serialNo || !filename || !recordId) {
         fs.unlink(req.file.path, (err) => { if (err) console.error("Error deleting file after validation fail:", err); });
        return res.status(400).json({ success: false, error: 'Missing required fields for certificate generation.' });
    }
    try {
        const query = `
            INSERT INTO certificates
            (roll_no, name, date, diagnosis, medications, age, gender, relaxations, serial_no, file_path, created_at, patient_data_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        `;
        const [results] = await pool.promise().query(query,
            [rollNo, name, date, diagnosis, medications, age, gender, relaxations || null, serialNo, filename, recordId]
        );
        if (results.affectedRows === 1) {
            res.status(201).json({ success: true, message: 'Certificate saved successfully.', pdfPath: `/${staticCertPath}/${filename}` });
        } else {
            throw new Error('Database insert for certificate failed unexpectedly.');
        }
    } catch (error) {
        console.error('Error saving certificate to database:', error);
        fs.unlink(req.file.path, (err) => { if (err) console.error(`Error deleting orphaned file ${filename} after DB error:`, err); });
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ success: false, error: 'Conflict: A certificate already exists for this specific medical record entry.' });
        }
        res.status(500).json({ success: false, error: 'Server error saving certificate details.' });
    }
});


// GET /student/certificates/:rollno - Get List of Certificates for a Student 
app.get('/student/certificates/:rollno', authenticateToken, async (req, res) => {
    const requestedRollno = req.params.rollno;
    const userRollno = req.user.roll_no;
    const userRole = req.user.role;
    if (userRole !== 'student' || userRollno !== requestedRollno) {
        return res.status(403).json({ success: false, error: 'Forbidden: You can only view your own certificates.' });
    }
    try {
        const query = `
            SELECT id, name, date, diagnosis, medications, serial_no, file_path, created_at
            FROM certificates WHERE roll_no = ? ORDER BY date DESC, created_at DESC
        `;
        const [results] = await pool.promise().query(query, [requestedRollno]);
        const validCertificates = results
            .filter(cert => cert.file_path)
            .map(cert => ({
                ...cert,
                downloadPath: `/${staticCertPath}/${cert.file_path}`
            }));
        res.json({ success: true, certificates: validCertificates });
    } catch (error) {
        console.error(`Error fetching certificates list for ${requestedRollno}:`, error);
        res.status(500).json({ success: false, error: 'Server error fetching certificates list.' });
    }
});


// GET /download/certificate/:filename - Download a Specific Certificate PDF

app.get('/download/certificate/:filename', authenticateToken, async (req, res) => {
     const filename = req.params.filename;
     if (filename.includes('..') || filename.includes('/') || path.basename(filename) !== filename) {
        return res.status(400).json({ success: false, error: 'Invalid filename format.' });
     }
     const filePath = path.join(uploadDir, filename);
     try {
         await fs.promises.access(filePath, fs.constants.R_OK);
         const [certResults] = await pool.promise().query('SELECT roll_no FROM certificates WHERE file_path = ? LIMIT 1', [filename]);
         if (certResults.length === 0) {
            return res.status(404).json({ success: false, error: 'Certificate record not found.' });
         }
         const ownerRollNo = certResults[0].roll_no;
         const isOwner = (req.user.role === 'student' && req.user.roll_no === ownerRollNo);
         const isStaff = (req.user.role === 'medical-staff');
         if (!isOwner && !isStaff) {
             return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to download this certificate.' });
         }
         res.download(filePath, filename, (err) => { /* ... error handling ... */ });
     } catch (error) {
         if (error.code === 'ENOENT') return res.status(404).json({ success: false, error: 'File not found on server.' });
         if (error.code === 'EACCES') return res.status(500).json({ success: false, error: 'Server error: Cannot access file.' });
         console.error(`Unexpected error during certificate download preparation for ${filename}:`, error);
         if (!res.headersSent) res.status(500).json({ success: false, error: 'Server error during download preparation.' });
     }
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error("----- Unhandled Error Caught By Middleware -----");
    console.error(err.stack || err.message || err);
    if (err instanceof multer.MulterError) {
         if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: `File upload failed: File too large. Maximum size allowed is ${Math.round(maxFileSize / 1024 / 1024)}MB.` });
        return res.status(400).json({ success: false, error: `File upload error: ${err.message}` });
    }
    else if (err.message === 'Only PDF files are allowed!') {
         return res.status(400).json({ success: false, error: err.message });
    }
    if (!res.headersSent) {
         const errorMessage = (process.env.NODE_ENV === 'development' && err.message) ? err.message : 'An unexpected internal server error occurred.';
         return res.status(err.status || 500).json({ success: false, error: 'Internal Server Error', message: errorMessage });
    }
    next(err);
});

// --- 404 Not Found Handler ---
app.use((req, res, next) => {
    res.status(404).json({ success: false, error: 'Not Found', message: `The requested resource '${req.originalUrl}' was not found on this server.` });
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port} [${process.env.NODE_ENV||'development'}]`);
    console.log(`Certificate uploads directory: ${uploadDir}`);
    console.log(`Certificates served at static path: /${staticCertPath}`);
});

// --- Global Unhandled Error Handlers ---
process.on('uncaughtException', (err, origin) => { /* ... */ });
process.on('unhandledRejection', (reason, promise) => { /* ... */ });