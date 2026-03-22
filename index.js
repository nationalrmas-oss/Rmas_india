require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const multer = require('multer');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const i18nextMiddleware = require('i18next-http-middleware');
const connectDB = require('./config/db');
const Member = require('./models/Member');
const Adhyaksh = require('./models/Adhyaksh');
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');
const Complaint = require('./models/Complaint');
const { isAdmin } = require('./middleware/auth');
const { adminActivityLogger } = require('./middleware/adminActivityLogger');
const { getDataFilter, canManageAdmins } = require('./utils/adminUtils');
const { logAuditAction, getAuditLogs } = require('./utils/auditUtils');
const { getBilingualDesignation } = require('./utils/roleDisplay');
const { toTitleCase } = require('./utils/textFormatting');
const { sendEmail, sendOtpEmail, sendPasswordResetSuccessEmail, sendRejectionEmail } = require('./utils/mailer');

// i18next configuration
i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: path.join(__dirname, 'locales/{{lng}}.json'),
    },
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
    },
  });

const app = express();

// Database Connection

// simply connect; no test apps anymore
connectDB();

// Middlewares
app.use(i18nextMiddleware.handle(i18next));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Admin Activity Logger - logs all admin POST/PUT/DELETE actions
app.use(adminActivityLogger);
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// make uploaded files accessible via /uploads/*
app.use('/uploads', express.static(uploadsDir));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Use timestamp + random number for unique filenames
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    cb(null, fileName);
  },
});

// File filter: photo (images) and documents (PDF)
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'photo' || file.fieldname === 'profilePhoto') {
    // Allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Photo must be an image file (JPG, PNG, etc.)'), false);
    }
  } else if (file.fieldname === 'documents') {
    // Allow PDF files only
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Documents must be a PDF file'), false);
    }
  } else {
    cb(new Error('Invalid file field'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 }, // 100KB limit per file
  fileFilter: fileFilter,
});

// Complaint file upload configuration
const complaintStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const complaintDir = path.join(uploadsDir, 'complaints');
    if (!fs.existsSync(complaintDir)) {
      fs.mkdirSync(complaintDir, { recursive: true });
    }
    cb(null, complaintDir);
  },
  filename: (req, file, cb) => {
    // Use timestamp + random number for unique filenames
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    cb(null, fileName);
  },
});

// File filter for complaint documents: PDF, images, videos
const complaintFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf', // PDF
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', // Images
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv' // Videos
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, images (JPG, PNG, GIF), and videos (MP4, AVI, MOV, WMV) are allowed.'), false);
  }
};

const complaintUpload = multer({
  storage: complaintStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
  fileFilter: complaintFileFilter,
}).fields([
  { name: 'policeReport', maxCount: 5 },
  { name: 'medicalReports', maxCount: 10 },
  { name: 'photos', maxCount: 20 },
  { name: 'videos', maxCount: 5 },
  { name: 'otherDocuments', maxCount: 10 }
]);

// View Engine Setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'partials/layout');

// Global Variables
app.use((req, res, next) => {
    res.locals.title = "RMAS National";
    res.locals.t = req.t;
    res.locals.lang = req.language;
    res.locals.dir = req.language === 'ur' ? 'rtl' : 'ltr';
    res.locals.fontFamily = req.language === 'ur' ? "'Noto Sans Arabic', serif" : "'Segoe UI', sans-serif";
    next();
});

// Routes
app.get('/', async (req, res) => {
    try {
        // Yahan hum future mein dynamic stats dikhayenge
        res.render('home', { title: 'Home' });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// membership form
app.get('/join', (req, res) => {
    // pass empty oldData so template doesn't break
    res.render('join', { title: 'Join Us', oldData: {} });
});

// sort helpers
const rolePriority = {
    'Adhyaksh': 1,
    'Varishth Upadhyaksh': 2,
    'Upadhyaksh': 3,
    'Mahasachiv': 4,
    'Sachiv': 5,
    'Zila Sangathan Sachiv': 6,
    'Sanyukt Sachiv': 7,
    'Vidhi Sachiv': 8,
    'Koshadhyaksh': 9,
    'Media Prabhari': 10,
    'Media Sachiv': 11,
    'Prachar Sachiv': 12,
    'Press Sachiv': 13,
    'Pravakta': 14,
    'Karyakram Sachiv': 15,
    'Karyakarini Sadasya': 99
};

function sortTeamMembers(a, b) {
    const aPri = rolePriority[a.position] || 999;
    const bPri = rolePriority[b.position] || 999;
    if (aPri !== bPri) return aPri - bPri;
    return (a.fullName || '').localeCompare(b.fullName || '');
}

// public team page
app.get('/team', async (req, res) => {
    try {
        const Adhyaksh = require('./models/Adhyaksh');
        // fetch active records (latest assignments)
        const team = await Adhyaksh.find({ isActive: true });
        team.sort(sortTeamMembers);
        res.render('team', { title: 'Our Team', team });
    } catch (error) {
        console.error('Error loading team page:', error);
        res.status(500).render('team', { title: 'Our Team', team: [] });
    }
});

// API endpoint used by dynamic team page
app.get('/api/team', async (req, res) => {
    try {
        const Adhyaksh = require('./models/Adhyaksh');
        const filter = { isActive: true };
        const { state, division, district, block, panchayat } = req.query;
        if (state) filter.state = state;
        if (division) filter.division = division;
        if (district) filter.district = district;
        if (block) filter.block = block;
        if (panchayat) filter.panchayat = panchayat;

        const team = await Adhyaksh.find(filter);
        team.sort(sortTeamMembers);
        res.json({ team });
    } catch (error) {
        console.error('Error fetching team API:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
});

// About Us page
app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us' });
});

// Activities page
app.get('/activities', (req, res) => {
    res.render('activities', { title: 'Our Activities' });
});

// News page
app.get('/news', (req, res) => {
    try {
        // Load news cards from the locale files
        const fs = require('fs');
        const path = require('path');
        const locale = req.language || 'en';
        const localeFile = path.join(__dirname, `locales/${locale}.json`);
        const localeData = JSON.parse(fs.readFileSync(localeFile, 'utf8'));
        const newsCards = localeData.news?.cards || [];
        
        res.render('news', { 
            title: 'News & Blog',
            newsCards: newsCards
        });
    } catch (error) {
        console.error('Error loading news page:', error);
        res.render('news', { 
            title: 'News & Blog',
            newsCards: []
        });
    }
});

// Gallery page
app.get('/gallery', (req, res) => {
    try {
        // Load gallery data from the locale files
        const fs = require('fs');
        const path = require('path');
        const locale = req.language || 'en';
        const localeFile = path.join(__dirname, `locales/${locale}.json`);
        const localeData = JSON.parse(fs.readFileSync(localeFile, 'utf8'));
        const galleryImages = localeData.gallery?.images || [];
        const galleryVideos = localeData.gallery?.videos || [];
        
        res.render('gallery', { 
            title: 'Gallery',
            galleryImages: galleryImages,
            galleryVideos: galleryVideos
        });
    } catch (error) {
        console.error('Error loading gallery page:', error);
        res.render('gallery', { 
            title: 'Gallery',
            galleryImages: [],
            galleryVideos: []
        });
    }
});

// Contact Us page
app.get('/contact', (req, res) => {
    try {
        // Load contact subjects from the locale files
        const fs = require('fs');
        const path = require('path');
        const locale = req.language || 'en';
        const localeFile = path.join(__dirname, `locales/${locale}.json`);
        const localeData = JSON.parse(fs.readFileSync(localeFile, 'utf8'));
        const subjectOptions = localeData.contact?.formFields?.subjects || [];
        
        res.render('contact', { 
            title: 'Contact Us',
            subjectOptions: subjectOptions
        });
    } catch (error) {
        console.error('Error loading contact page:', error);
        res.render('contact', { 
            title: 'Contact Us',
            subjectOptions: []
        });
    }
});

// Complaint Form - Public Route
app.get('/complaint', (req, res) => {
    try {
        res.render('complaint', {
            title: 'Online Complaint Form'
        });
    } catch (error) {
        console.error('Error loading complaint page:', error);
        res.status(500).send('Server error while loading complaint form.');
    }
});

// Download Verify - Public Route for ID Card Download
app.get('/download-verify', (req, res) => {
    try {
        res.render('download-verify', {
            title: 'Download Documents',
            error: null,
            success: null,
            downloads: null,
            memberId: null,
            member: null
        });
    } catch (error) {
        console.error('Error rendering download-verify page:', error);
        res.status(500).send('Server error while loading download page.');
    }
});

// Handle Search and Send OTP
app.post('/download-verify', async (req, res) => {
    try {
        const { fullName, dob, email } = req.body;
        
        console.log('[DOWNLOAD-VERIFY] Received:', { fullName, dob, email });

        // Validate DD/MM/YYYY format
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
            return res.render('download-verify', { error: 'Invalid date format. Please enter DD/MM/YYYY (e.g., 14/08/2002)' });
        }

        console.log('[DOWNLOAD-VERIFY] DOB Format Valid:', dob);

        // Find member with exact match
        let query = {
            fullName: { $regex: new RegExp('^' + fullName.trim() + '$', 'i') },
            dob: dob,
            email: { $regex: new RegExp('^' + email.trim() + '$', 'i') },
            status: 'approved'
        };
        
        console.log('[DOWNLOAD-VERIFY] Query:', {
            fullName: fullName.trim(),
            dob: dob,
            email: email.trim(),
            status: 'approved'
        });
        
        let member = await Member.findOne(query);
        
        // If exact match fails, try name + email match (most reliable combination)
        if (!member) {
            member = await Member.findOne({
                fullName: { $regex: new RegExp('^' + fullName.trim() + '$', 'i') },
                email: { $regex: new RegExp('^' + email.trim() + '$', 'i') },
                status: 'approved'
            });
        }
        
        console.log('[DOWNLOAD-VERIFY] Found member:', member ? { id: member._id, name: member.fullName, email: member.email, dob: member.dob, isIDCardApproved: member.isIDCardApproved } : 'NONE');
        
        // Debug: Count total approved members
        const totalApproved = await Member.countDocuments({ status: 'approved' });
        console.log('[DOWNLOAD-VERIFY] Total approved members in DB:', totalApproved);

        if (!member) {
            return res.render('download-verify', {
                title: 'Download Documents',
                error: 'No matching member found with the provided details.',
                success: null,
                downloads: null,
                memberId: null,
                member: null
            });
        }

        if (!member.isIDCardApproved) {
            return res.render('download-verify', {
                title: 'Download Documents',
                error: 'Your ID Card is pending for Super Admin approval. Please contact support.',
                success: null,
                downloads: null,
                memberId: null,
                member: null
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        req.session.downloadOTP = { otp, memberId: member._id, expires: Date.now() + 10 * 60 * 1000 }; // 10 min

        // Send OTP email
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <body>
            <h2>RMAS - ID Card Download OTP</h2>
            <p>Dear ${member.fullName},</p>
            <p>Your OTP for downloading ID Card and Joining Letter is: <strong>${otp}</strong></p>
            <p>This OTP is valid for 10 minutes.</p>
            <p>Regards,<br>RMAS Team</p>
        </body>
        </html>
        `;

        // Send OTP email via centralized mailer utility
        const emailResult = await sendOtpEmail(member.email, otp, member.fullName);
        if (!emailResult.success) {
            console.warn('[DOWNLOAD-VERIFY] Failed to send OTP email:', emailResult.error);
            // Continue so the user can still try again (UI will show success message regardless)
        }

        res.render('download-verify', {
            title: 'Download Documents',
            success: 'OTP sent to your email. Please enter it below.',
            error: null,
            downloads: null,
            memberId: member._id,
            member: null
        });
    } catch (error) {
        console.error('Error in download-verify:', error);
        res.render('download-verify', {
            title: 'Download Documents',
            error: 'An error occurred. Please try again.',
            success: null,
            downloads: null,
            memberId: null,
            member: null
        });
    }
});

// Verify OTP and Show Download Links
app.post('/verify-otp', async (req, res) => {
    try {
        const { otp, memberId } = req.body;

        if (!req.session.downloadOTP || req.session.downloadOTP.memberId !== memberId || req.session.downloadOTP.otp !== otp) {
            return res.render('download-verify', {
                title: 'Download Documents',
                error: 'Invalid OTP. Please try again.',
                success: null,
                downloads: null,
                memberId,
                member: null
            });
        }

        if (Date.now() > req.session.downloadOTP.expires) {
            delete req.session.downloadOTP;
            return res.render('download-verify', {
                title: 'Download Documents',
                error: 'OTP expired. Please request a new one.',
                success: null,
                downloads: null,
                memberId,
                member: null
            });
        }

        const member = await Member.findById(memberId);
        if (!member) {
            return res.render('download-verify', {
                title: 'Download Documents',
                error: 'Member not found.',
                success: null,
                downloads: null,
                memberId: null,
                member: null
            });
        }

        // Clear OTP
        delete req.session.downloadOTP;

        res.render('download-verify', {
            title: 'Download Documents',
            error: null,
            success: null,
            downloads: {
                kit: `/membership-kit/${encodeURIComponent(member.membershipId)}`
            },
            memberId: null,
            member
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.render('download-verify', {
            title: 'Download Documents',
            error: 'An error occurred. Please try again.',
            success: null,
            downloads: null,
            memberId: null,
            member: null
        });
    }
});

// terms and conditions page
app.get('/terms', (req, res) => {
    res.render('terms', { title: 'Terms & Conditions' });
});

// membership verification page
app.get('/verify/:membershipId', async (req, res) => {
    try {
        const { membershipId } = req.params;

        // Find member by membershipId
        const member = await Member.findOne({ membershipId: membershipId });

        if (!member) {
            return res.render('verification', {
                title: 'Membership Verification',
                valid: false
            });
        }

        // Check if membership is approved
        if (member.status !== 'approved') {
            return res.render('verification', {
                title: 'Membership Verification',
                valid: false
            });
        }

        // Generate QR code data URL (now with formatted membershipId)
        const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://rmas-national.vercel.app/v/${member.membershipId}`)}`;

        res.render('verification', {
            title: 'Membership Verification',
            valid: true,
            membership: {
                fullName: member.fullName,
                membershipId: member.membershipId,
                district: member.district,
                mobile: member.mobile,
                email: member.email,
                photo: member.photo ? `/uploads/${member.photo}` : null,
                createdAt: member.createdAt,
                pdfUrl: `/certificate/${member.membershipId}`
            },
            qrCode: qrCode
        });
    } catch (error) {
        console.error('Error verifying membership:', error);
        res.status(500).render('verification', {
            title: 'Membership Verification',
            valid: false
        });
    }
});

// New mobile-friendly member verification page (public, no login required)
// Using regex to match paths with slashes like /v/RMAS/BR/26/0004
app.get(/^\/v\/(.+)$/, async (req, res) => {
    try {
        const membershipId = req.params[0];
        
        console.log('Verification request for:', membershipId);

        // Find member by membershipId
        const member = await Member.findOne({ membershipId: membershipId });

        if (!member) {
            return res.render('verify-member', {
                valid: false,
                member: null
            });
        }

        // Check if membership is approved
        if (member.status !== 'approved') {
            return res.render('verify-member', {
                valid: false,
                member: null
            });
        }

        // Calculate valid until date (1 year from creation)
        const createdDate = new Date(member.createdAt);
        const validUntil = new Date(createdDate);
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        const validUntilStr = validUntil.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Prepare member data for display
        const designation = getBilingualDesignation(member);
        const memberData = {
            fullName: toTitleCase(member.fullName) || 'N/A',
            membershipId: member.membershipId || 'N/A',
            designation: designation || 'Member',
            fatherName: toTitleCase(member.fatherName) || 'N/A',
            mobile: member.mobile || 'N/A',
            idNumber: member.idNumber || 'N/A',
            district: toTitleCase(member.district) || 'N/A',
            state: toTitleCase(member.state) || 'N/A',
            photo: member.photo ? `/uploads/${member.photo}` : null,
            validUntil: validUntilStr
        };

        res.render('verify-member', {
            valid: true,
            member: memberData
        });
    } catch (error) {
        console.error('Error verifying membership:', error);
        res.status(500).render('verify-member', {
            valid: false,
            member: null
        });
    }
});

// Legacy /verify route - uses new mobile-friendly template
app.get(/^\/verify\/(.+)$/, async (req, res) => {
    try {
        const membershipId = req.params[0];
        
        console.log('Verification request for:', membershipId);

        // Find member by membershipId
        const member = await Member.findOne({ membershipId: membershipId });

        if (!member) {
            return res.render('verify-member', {
                valid: false,
                member: null
            });
        }

        // Check if membership is approved
        if (member.status !== 'approved') {
            return res.render('verify-member', {
                valid: false,
                member: null
            });
        }

        // Calculate valid until date (1 year from creation)
        const createdDate = new Date(member.createdAt);
        const validUntil = new Date(createdDate);
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        const validUntilStr = validUntil.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Prepare member data for display
        const designation = getBilingualDesignation(member);
        const memberData = {
            fullName: toTitleCase(member.fullName) || 'N/A',
            membershipId: member.membershipId || 'N/A',
            designation: designation || 'Member',
            fatherName: toTitleCase(member.fatherName) || 'N/A',
            mobile: member.mobile || 'N/A',
            idNumber: member.idNumber || 'N/A',
            district: toTitleCase(member.district) || 'N/A',
            state: toTitleCase(member.state) || 'N/A',
            photo: member.photo ? `/uploads/${member.photo}` : null,
            validUntil: validUntilStr
        };

        res.render('verify-member', {
            valid: true,
            member: memberData
        });
    } catch (error) {
        console.error('Error verifying membership:', error);
        res.status(500).render('verify-member', {
            valid: false,
            member: null
        });
    }
});

app.post('/join', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'documents', maxCount: 1 }
]), async (req, res) => {
    console.log('[POST /join] Request received');
    console.log('[POST /join] Files:', Object.keys(req.files || {}));
    console.log('[POST /join] Body keys:', Object.keys(req.body || {}));
    
    try {
        const { body, files } = req;
        const uploadedFiles = files || {};
        console.log('[POST /join] uploadedFiles keys:', Object.keys(uploadedFiles));

        // ============ VALIDATION ============
        
        // Required text fields
        const requiredFields = [
            'fullName',
            'fatherName',
            'dob',
            'gender',
            'mobile',
            'email',
            'state',
            'division',
            'district',
            'block',
            'reason',
            'agreedToTerms',
        ];

        const missingFields = requiredFields.filter(field => !body[field]);
        if (missingFields.length > 0) {
            // Clean up uploaded files if validation fails
            if (uploadedFiles.photo) {
                fs.unlinkSync(uploadedFiles.photo[0].path);
            }
            if (uploadedFiles.documents) {
                fs.unlinkSync(uploadedFiles.documents[0].path);
            }
            const context = {
                title: 'Join Us',
                oldData: body,
                error: `Missing required fields: ${missingFields.join(', ')}`,
            };
            return res.render('join', context);
        }

        // File upload validation
        if (!uploadedFiles.photo || uploadedFiles.photo.length === 0) {
            const context = {
                title: 'Join Us',
                oldData: body,
                error: 'Photo is required. Please upload an image.',
            };
            return res.render('join', context);
        }

        if (!uploadedFiles.documents || uploadedFiles.documents.length === 0) {
            // Clean up photo if documents are missing
            if (uploadedFiles.photo) {
                fs.unlinkSync(uploadedFiles.photo[0].path);
            }
            const context = {
                title: 'Join Us',
                oldData: body,
                error: 'Documents (PDF) are required. Please upload your Aadhar + Certificate.',
            };
            return res.render('join', context);
        }

        // Mobile validation (10 digits)
        if (!/^\d{10}$/.test(body.mobile)) {
            // Clean up files
            fs.unlinkSync(uploadedFiles.photo[0].path);
            fs.unlinkSync(uploadedFiles.documents[0].path);
            const context = {
                title: 'Join Us',
                oldData: body,
                error: 'Mobile number must be exactly 10 digits.',
            };
            return res.render('join', context);
        }

        // Email validation (basic)
        if (!/^\S+@\S+\.\S+$/.test(body.email)) {
            // Clean up files
            fs.unlinkSync(uploadedFiles.photo[0].path);
            fs.unlinkSync(uploadedFiles.documents[0].path);
            const context = {
                title: 'Join Us',
                oldData: body,
                error: 'Please provide a valid email address.',
            };
            return res.render('join', context);
        }

        // Agreement validation
        if (body.agreedToTerms !== 'on' && body.agreedToTerms !== true) {
            // Clean up files
            fs.unlinkSync(uploadedFiles.photo[0].path);
            fs.unlinkSync(uploadedFiles.documents[0].path);
            const context = {
                title: 'Join Us',
                oldData: body,
                error: 'You must agree to the terms and conditions.',
            };
            return res.render('join', context);
        }

        // ============ SAVE TO MONGODB ============

        const memberData = {
            fullName: body.fullName,
            fatherName: body.fatherName,
            dob: body.dob,
            gender: body.gender,
            mobile: body.mobile,
            email: body.email,
            bloodGroup: body.bloodGroup || null,
            education: body.education || null,
            occupation: body.occupation || null,
            idNumber: body.idNumber || null,
            state: body.state,
            division: body.division,
            district: body.district,
            block: body.block,
            houseNo: body.houseNo || null,
            street: body.street || null,
            panchayat: body.panchayat || null,
            village: body.village || null,
            pincode: body.pincode || null,
            reason: body.reason,
            photo: uploadedFiles.photo[0].filename,
            documents: uploadedFiles.documents[0].filename,
            agreedToTerms: true,
        };

        const member = new Member(memberData);
        // Initial application record
        member.reviewHistory.push({ action: 'applied', comment: 'Application submitted' });
        await member.save();

        // ============ SUCCESS ============
        // --- send welcome email asynchronously (don't block the response) ---
        (async () => {
            try {
                console.log(`[EMAIL] Email routine started for ${member.email}`);
                console.log(`[EMAIL] BREVO_API_KEY length ${(process.env.BREVO_API_KEY || '').length}`);
                console.log(`[EMAIL] SENDER_EMAIL ${process.env.SENDER_EMAIL}`);

                // find contact for district adhyaksh
                let contact = { name: 'Md Jawed Akhter', mobile: '7249779703' };
                const adh = await Adhyaksh.findOne({ district: member.district });
                if (adh) {
                    contact = { name: adh.name, mobile: adh.mobile };
                }

                const htmlContent = `
                <!DOCTYPE html>
                <html lang="hi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>RMAS - स्वागत</title>
                </head>
                <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
                        <tr>
                            <td align="center" style="padding: 20px;">
                                <table width="100%" maxwidth="600" cellpadding="0" cellspacing="0" style="background-color: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                                    
                                    <!-- HEADER -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 40px 20px; text-align: center;">
                                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
                                                🌟 RMAS में आपका स्वागत है!
                                            </h1>
                                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                                                राष्ट्रीय मानव अधिकार संगठन
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- GREETING -->
                                    <tr>
                                        <td style="padding: 30px 35px;">
                                            <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600;">
                                                नमस्ते ${member.fullName} जी,
                                            </p>
                                            
                                            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.8; color: #555;">
                                                हमें आपको यह बताते हुए अत्यंत प्रसन्नता हो रही है कि राष्ट्रीय मानव अधिकार संगठन (RMAS) में आपकी सदस्यता का आवेदन सफलतापूर्वक प्राप्त हो गया है।
                                            </p>
                                            
                                            <p style="margin: 0 0 30px 0; font-size: 15px; line-height: 1.8; color: #555;">
                                                संगठन के नियमों और सामाजिक न्याय की दिशा में आगे बढ़ने के लिए आपको अपने क्षेत्र के अधिकारी से समन्वय (Coordination) करना अनिवार्य है।
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- CONTACT BOX -->
                                    <tr>
                                        <td style="padding: 0 35px;">
                                            <div style="background: linear-gradient(135deg, #ecf0f1 0%, #f8f9fa 100%); border-left: 4px solid #1e3a8a; border-radius: 6px; padding: 25px; margin-bottom: 25px;">
                                                <h3 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 18px; font-weight: 600;">
                                                    📞 अपने जिला अध्यक्ष से संपर्क करें
                                                </h3>
                                                
                                                <p style="margin: 0 0 12px 0; font-size: 15px;">
                                                    <strong style="color: #1e3a8a;">नाम:</strong> <span style="color: #333;">${contact.name}</span>
                                                </p>
                                                
                                                <p style="margin: 0 0 20px 0; font-size: 15px;">
                                                    <strong style="color: #1e3a8a;">मोबाइल:</strong> 
                                                    <a href="tel:${contact.mobile}" style="color: #1e3a8a; text-decoration: none; font-weight: 600;">
                                                        ${contact.mobile}
                                                    </a>
                                                </p>
                                                
                                                <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.6; font-style: italic;">
                                                    कृपया अगले 24 घंटों के भीतर उपरोक्त नंबर पर संपर्क कर अपनी सदस्यता प्रक्रिया को पूर्ण करें।
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- FOOTER CONTENT -->
                                    <tr>
                                        <td style="padding: 25px 35px; border-top: 1px solid #eee; text-align: center;">
                                            <p style="margin: 0 0 10px 0; color: #1e3a8a; font-weight: 600; font-size: 15px;">
                                                मानवता के हित में, राष्ट्र के गौरव में।
                                            </p>
                                            <p style="margin: 0; color: #666; font-size: 14px;">
                                                राष्ट्रीय मानव अधिकार संगठन (RMAS) - भारत
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- DISCLAIMER -->
                                    <tr>
                                        <td style="padding: 20px 35px; background-color: #f9f9f9; border-top: 1px solid #eee; text-align: center;">
                                            <p style="margin: 0; color: #999; font-size: 12px; font-style: italic;">
                                                ⚠️ यह एक ऑटो-जेनरेटेड ईमेल है। कृपया इसे सीधे उत्तर न दें।
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                `;

                console.log(`[EMAIL] Sending welcome email via mailer utility...`);
                const emailResult = await sendEmail(
                    member.email,
                    'RMAS (राष्ट्रीय मानव अधिकार संगठन) में आपका स्वागत है!',
                    htmlContent
                );
                if (emailResult.success) {
                    console.log(`[EMAIL] SUCCESS sent to ${member.email}, messageId =`, emailResult.messageId);
                } else {
                    console.error(`[EMAIL] ERROR for ${member.email}:`, emailResult.error);
                }
            } catch (err) {
                console.error(`[EMAIL] ERROR for ${member.email}:`, err.message || err);
            }
        })();

        const context = {
            title: 'Join Us',
            oldData: {},
            success: `✓ Application submitted successfully! Your Member ID: ${member._id.toString().slice(-8).toUpperCase()}`,
        };
        res.render('join', context);

    } catch (error) {
        console.error('Error processing Join form:', error);

        // Clean up uploaded files on error
        if (req.files) {
            if (req.files.photo) {
                req.files.photo.forEach(file => {
                    fs.unlink(file.path, (err) => {
                        if (err) console.error('Error deleting photo:', err);
                    });
                });
            }
            if (req.files.documents) {
                req.files.documents.forEach(file => {
                    fs.unlink(file.path, (err) => {
                        if (err) console.error('Error deleting documents:', err);
                    });
                });
            }
        }

        const context = {
            title: 'Join Us',
            oldData: req.body || {},
            error: error.message || 'An error occurred while processing your application. Please try again.',
        };
        res.render('join', context);
    }
});

// ============ MEMBER REGISTRATION ROUTES ============

// Member Registration Form - GET
app.get('/member-registration', (req, res) => {
    try {
        res.render('member-registration', { title: 'Member Registration', layout: false });
    } catch (error) {
        console.error('Error loading member registration form:', error);
        res.status(500).send('Error loading registration form');
    }
});

// Member Registration API - POST
app.post('/api/members/register', upload.single('profilePhoto'), async (req, res) => {
    console.log('[POST /api/members/register] Request received');
    
    try {
        const { fullName, fatherName, mobile, gender, state, division, district, block } = req.body;

        // ============ VALIDATION ============
        
        // Check required fields
        if (!fullName || !fatherName || !mobile || !gender || !state || !division || !district || !block) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                error: 'All fields are required',
                missingFields: ['fullName', 'fatherName', 'mobile', 'gender', 'state', 'division', 'district', 'block']
            });
        }

        // Validate mobile number (10 digits)
        if (!/^\d{10}$/.test(mobile)) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'Mobile number must be exactly 10 digits.' });
        }

        // Check if photo was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'Profile photo is required.' });
        }

        // ============ SAVE MEMBER ============

        const memberData = {
            fullName: fullName.trim(),
            fatherName: fatherName.trim(),
            mobile: mobile.trim(),
            gender: gender.trim(),
            location: {
                state: state.trim(),
                division: division.trim(),
                district: district.trim(),
                block: block.trim()
            },
            profilePhoto: req.file.filename,
            registeredAt: new Date(),
            status: 'pending' // Default status
        };

        // Create and save member
        const member = new Member(memberData);
        await member.save();

        console.log(`[MEMBER REGISTRATION] New member registered: ${fullName} (${mobile})`);

        // Send success response
        return res.status(201).json({
            success: true,
            message: 'Registration submitted successfully!',
            memberId: member._id.toString().slice(-8).toUpperCase(),
            memberData: {
                id: member._id,
                fullName: member.fullName,
                mobile: member.mobile,
                status: member.status
            }
        });

    } catch (error) {
        console.error('[POST /api/members/register] Error:', error);

        // Clean up uploaded file on error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
        }

        return res.status(500).json({
            error: 'Error processing registration',
            message: error.message || 'An unexpected error occurred',
            success: false
        });
    }
});

// ============ ADMIN ROUTES ============

// Admin Login - GET
app.get('/admin/login', (req, res) => {
    if (req.session && req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { title: 'Admin Login', layout: false });
});

// Admin Login - POST
app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.render('admin/login', {
                title: 'Admin Login',
                layout: false,
                error: 'Username and password are required.'
            });
        }

        const admin = await User.findOne({ username });
        if (!admin) {
            return res.render('admin/login', {
                title: 'Admin Login',
                layout: false,
                error: 'Invalid username or password.'
            });
        }

        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            return res.render('admin/login', {
                title: 'Admin Login',
                layout: false,
                error: 'Invalid username or password.'
            });
        }

        // level-based location field validation
        if (admin.role !== 'Superadmin') {
            const loc = admin.location || {};
            let missingField = null;
            
            if (admin.level === 'State' && !loc.state) {
                missingField = 'State';
            } else if (admin.level === 'Division' && !loc.division) {
                missingField = 'Division';
            } else if (admin.level === 'District' && !loc.district) {
                missingField = 'District';
            } else if (admin.level === 'Block' && !loc.block) {
                missingField = 'Block';
            } else if (admin.level === 'Panchayat' && !loc.panchayat) {
                missingField = 'Panchayat';
            }
            
            if (missingField) {
                return res.render('admin/login', {
                    title: 'Admin Login',
                    layout: false,
                    error: `No area assigned. ${missingField} is required.`
                });
            }
        }

        // Set session
        req.session.adminId = admin._id.toString();
        req.session.admin = {
            id: admin._id,
            fullName: admin.fullName,
            username: admin.username,
            role: admin.role,
            level: admin.level,
            location: admin.location || {}
        };

        // Log the login action
        await logAuditAction({
            req,
            action: 'login',
            targetId: admin._id,
            targetType: 'User',
            targetName: admin.fullName,
            details: {
                username: admin.username,
                role: admin.role,
                level: admin.level,
                location: admin.location || {},
                ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown',
                userAgent: req.get('user-agent') || req.headers['user-agent'] || 'unknown'
            }
        });

        console.log(`[ADMIN LOGIN] ${admin.fullName} (${admin.username}) logged in`);
        res.redirect('/admin/dashboard');

    } catch (error) {
        console.error('Error during admin login:', error);
        res.render('admin/login', {
            title: 'Admin Login',
            layout: false,
            error: 'An error occurred. Please try again.'
        });
    }
});

// Admin Dashboard
app.get('/admin/dashboard', isAdmin, async (req, res) => {
    try {
        // Get data filter based on admin's level
        const dataFilter = getDataFilter(req.session.admin);

        const totalMembers = await Member.countDocuments(dataFilter);
        const approvedUsers = Math.floor(totalMembers * 0.8);
        const mediaPosts = 0;

        const stats = {
            totalMembers,
            approvedUsers,
            mediaPosts,
            filterLevel: req.session.admin.level,
            filterLocation: req.session.admin.location
        };

        // For Superadmin, fetch members pending ID Card approval
        let pendingIDCardApprovals = [];
        if (req.session.admin.role === 'Superadmin') {
            pendingIDCardApprovals = await Member.find({ status: 'approved', isIDCardApproved: false }).limit(10);
            console.log(`[DEBUG] Superadmin ${req.session.admin.fullName} - Pending approvals: ${pendingIDCardApprovals.length}`);
        }

        res.render('admin/dashboard', {
            title: 'Dashboard',
            layout: 'admin/layout',
            admin: req.session.admin,
            stats,
            pendingIDCardApprovals,
            currentPath: req.path
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('admin/dashboard', {
            title: 'Dashboard',
            layout: 'admin/layout',
            admin: req.session.admin,
            stats: { totalMembers: 0, approvedUsers: 0, mediaPosts: 0 },
            currentPath: req.path
        });
    }
});

// Admin Analytics Report
app.get('/admin/analytics', isAdmin, async (req, res) => {
    try {
        // Get data filter based on admin's level
        const dataFilter = getDataFilter(req.session.admin);

        // ============ STATS CARDS ============
        const totalMembers = await Member.countDocuments(dataFilter);
        const pendingApprovals = await Member.countDocuments({ ...dataFilter, status: 'pending' });
        const approvedMembers = await Member.countDocuments({ ...dataFilter, status: 'approved' });
        const claimedCount = await Member.countDocuments({ ...dataFilter, status: 'forwarded' });
        
        // Today's registrations (from midnight to now)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRegistrations = await Member.countDocuments({ 
            ...dataFilter, 
            createdAt: { $gte: today } 
        });

        const totals = {
            total: totalMembers,
            accepted: approvedMembers
        };

        const appStatus = {
            pending: pendingApprovals,
            claimed: claimedCount
        };

        // ============ MONTHLY GROWTH (Last 12 Months) ============
        const today_date = new Date();
        const monthlyGrowth = [];
        for (let i = 11; i >= 0; i--) {
            const monthDate = new Date(today_date.getFullYear(), today_date.getMonth() - i, 1);
            const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
            const monthStr = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            const monthlyCount = await Member.countDocuments({
                ...dataFilter,
                createdAt: { $gte: monthDate, $lt: nextMonth }
            });

            monthlyGrowth.push({ _id: monthStr, count: monthlyCount });
        }

        // ============ STATUS DISTRIBUTION ============
        const statusCounts = await Member.aggregate([
            { $match: dataFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ============ TEAM TYPE DISTRIBUTION ============
        const teamDistribution = await Member.aggregate([
            { $match: dataFilter },
            { $group: { _id: '$teamType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ============ LOCATION SUMMARY ============
        const locationData = await Member.aggregate([
            { $match: dataFilter },
            { $group: { _id: { state: '$state', division: '$division', district: '$district' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);

        // ============ DOWNLOAD STATS ============
        const totalDownloads = await AuditLog.countDocuments({
            action: { $in: ['joining_letter_downloaded', 'id_card_downloaded'] }
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const dailyDownloads = await AuditLog.aggregate([
            { $match: {
                action: { $in: ['joining_letter_downloaded', 'id_card_downloaded'] },
                timestamp: { $gte: thirtyDaysAgo }
            } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                count: { $sum: 1 }
            } },
            { $sort: { _id: 1 } }
        ]);

        const analyticsData = {
            totals,
            appStatus,
            totalDownloads,
            locationData,
            stats: {
                statusCounts,
                teamDistribution,
                monthlyGrowth
            },
            downloads: {
                dailyDownloads
            }
        };

        console.log(`[ANALYTICS] ${req.session.admin.fullName} accessed analytics`);

        res.render('admin/analytics', {
            title: 'Reports & Analytics',
            layout: 'admin/layout',
            admin: req.session.admin,
            currentUser: req.session.admin,
            totals,
            appStatus,
            totalDownloads,
            locationData,
            stats: {
                statusCounts,
                teamDistribution,
                monthlyGrowth
            },
            downloads: { dailyDownloads },
            currentPath: req.path
        });

    } catch (error) {
        console.error('Error loading analytics:', error);
        res.status(500).render('admin/analytics', {
            title: 'Reports & Analytics',
            layout: 'admin/layout',
            admin: req.session.admin,
            currentUser: req.session.admin,
            totals: { total: 0, accepted: 0 },
            appStatus: { pending: 0, claimed: 0 },
            totalDownloads: 0,
            locationData: [],
            stats: {
                statusCounts: [],
                teamDistribution: [],
                monthlyGrowth: []
            },
            downloads: { dailyDownloads: [] },
            error: 'Error loading analytics',
            currentPath: req.path
        });
    }
});

// Admin Audit Logs - View audit trail
app.get('/admin/logs', isAdmin, async (req, res) => {
    try {
        const { page = 1 } = req.query;

        // Prepare filters
        const filters = {
            action: req.query.action || null,
            performedBy: req.query.performedBy || null,
            level: req.query.level || null,
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null,
            search: req.query.search || null
        };

        const result = await getAuditLogs(req.session.admin, filters, parseInt(page) || 1, 20);

        console.log(`[AUDIT LOGS] ${req.session.admin.fullName} accessed audit logs`);

        // Build query string for pagination
        const queryString = Object.entries(req.query)
            .filter(([key]) => key !== 'page' && req.query[key])
            .map(([key, value]) => `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('');

        res.render('admin/logs', {
            title: 'Audit Logs',
            layout: 'admin/layout',
            admin: req.session.admin,
            logs: result.logs,
            pagination: result.pagination,
            query: req.query,
            queryString,
            currentPath: req.path
        });

    } catch (error) {
        console.error('Error loading audit logs:', error);
        res.status(500).render('admin/logs', {
            title: 'Audit Logs',
            layout: 'admin/layout',
            admin: req.session.admin,
            logs: [],
            pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false },
            query: {},
            queryString: '',
            error: 'Error loading audit logs',
            currentPath: req.path
        });
    }
});

// Redirect /admin/audit-logs to the audit log view
app.get('/admin/audit-logs', isAdmin, (req, res) => {
    return res.redirect('/admin/logs');
});

// Export audit logs as CSV
app.get('/admin/audit-logs/export', isAdmin, async (req, res) => {
    try {
        const filters = {
            action: req.query.action || null,
            performedBy: req.query.performedBy || null,
            level: req.query.level || null,
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null,
            search: req.query.search || null
        };

        const result = await getAuditLogs(req.session.admin, filters, 1, 10000);
        const logs = result.logs || [];

        const header = [
            'Timestamp',
            'Action',
            'Performed By',
            'Performed By Email',
            'Performed By Role',
            'Level',
            'Level ID',
            'Target Type',
            'Target Name',
            'Target ID',
            'IP Address',
            'User Agent',
            'Note',
            'Details'
        ];

        const csvRows = [header.join(',')];

        for (const log of logs) {
            const details = typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '');
            const row = [
                '"' + (new Date(log.timestamp || log.createdAt).toISOString()) + '"',
                '"' + (log.action || '') + '"',
                '"' + (log.performedByName || '') + '"',
                '"' + (log.performedByEmail || '') + '"',
                '"' + (log.performedByRole || '') + '"',
                '"' + (log.level || '') + '"',
                '"' + (log.levelId || '') + '"',
                '"' + (log.targetType || '') + '"',
                '"' + (log.targetName || '') + '"',
                '"' + (log.targetId || '') + '"',
                '"' + (log.ipAddress || '') + '"',
                '"' + (log.userAgent || '') + '"',
                '"' + (log.note || '') + '"',
                '"' + details.replace(/"/g, '""') + '"'
            ];
            csvRows.push(row.join(','));
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        res.send(csvRows.join('\n'));
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).send('Error exporting audit logs');
    }
});

// Redirect /admin/audit to /admin/logs
app.get('/admin/audit', (req, res) => {
    return res.redirect('/admin/logs');
});

// Approve ID Card for Superadmin
app.post('/admin/approve-id-card/:memberId', isAdmin, async (req, res) => {
    try {
        if (req.session.admin.role !== 'Superadmin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const member = await Member.findById(req.params.memberId);
        if (!member || member.status !== 'approved') {
            return res.status(400).json({ success: false, message: 'Invalid member' });
        }
        member.isIDCardApproved = true;
        await member.save();
        res.json({ success: true, message: 'ID Card approved successfully' });
    } catch (error) {
        console.error('Error approving ID Card:', error);
        res.status(500).json({ success: false, message: 'Error approving ID Card' });
    }
});


// Membership Applications - Admin Review Center (universal 5-level hierarchy)
app.get('/admin/membership-applications', isAdmin, async (req, res) => {
    try {
        // Only super-admin, secretary, president may view
        const allowed = ['Superadmin', 'Secretary', 'President'];
        const user = req.session.admin || req.user;
        if (!user || !allowed.includes(user.role)) {
            return res.status(403).render('admin/dashboard', {
                title: 'Access Denied',
                layout: 'admin/layout',
                admin: user || {},
                stats: { totalMembers:0, approvedUsers:0, mediaPosts:0 },
                error: '403 Forbidden - You do not have permission to view applications.',
                currentPath: req.path
            });
        }

        // universal cascading filter based on area hierarchy
        let filter = {};
        const u = user.location || {};
        
        if (user.role.toLowerCase() === 'superadmin') {
            filter = {}; // sees all
        } else if (u.block) {
            filter.block = { $regex: new RegExp('^' + u.block.trim() + '$', 'i') };
        } else if (u.district) {
            filter.district = { $regex: new RegExp('^' + u.district.trim() + '$', 'i') };
        } else if (u.division) {
            filter.division = { $regex: new RegExp('^' + u.division.trim() + '$', 'i') };
        } else if (u.state) {
            filter.state = { $regex: new RegExp('^' + u.state.trim() + '$', 'i') };
        }
        
        // preserve optional search/status query parameters
        const { search, status } = req.query;
        
        // Status filter - allow explicit status query parameter, otherwise use role-based defaults
        if (status) {
            // User explicitly selected a status filter
            filter.status = status;
        } else {
            // Apply default role-based filtering only if no explicit status selected
            if (user.role.toLowerCase() === 'secretary') {
                filter.status = 'pending';
            } else if (user.role.toLowerCase() === 'president') {
                filter.status = { $in: ['pending', 'verified', 'approved'] };
            }
            // Superadmin sees all statuses by default
        }
        
        if (search) {
            filter.$or = [
                { fullName: new RegExp(search, 'i') },
                { mobile: new RegExp(search, 'i') }
            ];
        }

        const applications = await Member.find(filter).sort({ createdAt: -1 });
        res.render('admin/membership-applications', {
            title: 'Membership Applications',
            layout: 'admin/layout',
            admin: user,
            applications,
            search,
            status,
            error: req.query.error,
            currentPath: req.path
        });
    } catch (error) {
        console.error('Error loading applications:', error);
        res.status(500).render('admin/dashboard', {
            title: 'Error',
            layout: 'admin/layout',
            admin: req.session.admin,
            stats: { totalMembers:0, approvedUsers:0, mediaPosts:0 },
            error: 'Error loading applications list',
            currentPath: req.path
        });
    }
});

// Application detail view
app.get('/admin/membership-applications/:id', isAdmin, async (req, res) => {
    try {
        const allowed = ['Superadmin', 'Admin', 'Secretary', 'President'];
        if (!allowed.includes(req.session.admin.role)) {
            return res.status(403).render('admin/dashboard', {
                title: 'Access Denied',
                layout: 'admin/layout',
                admin: req.session.admin,
                stats: { totalMembers:0, approvedUsers:0, mediaPosts:0 },
                error: '403 Forbidden - You do not have permission to view application details.',
                currentPath: '/admin/membership-applications'
            });
        }
        const application = await Member.findById(req.params.id).populate('reviewHistory.by', 'fullName role level');
        if (!application) {
            return res.redirect('/admin/membership-applications?error=notfound');
        }
        res.render('admin/membership-application-detail', {
            title: 'Application Detail',
            layout: 'admin/layout',
            admin: req.session.admin,
            application,
            currentPath: '/admin/membership-applications',
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading application detail:', error);
        res.status(500).render('admin/dashboard', {
            title: 'Error',
            layout: 'admin/layout',
            admin: req.session.admin,
            stats: { totalMembers:0, approvedUsers:0, mediaPosts:0 },
            error: 'Error loading application detail',
            currentPath: '/admin/membership-applications'
        });
    }
});

// Secretary or President may mark application as verified
app.post('/admin/membership-applications/:id/verify', isAdmin, async (req, res) => {
    try {
        const role = req.session.admin.role;
        if (role !== 'Secretary' && role !== 'President' && role !== 'Superadmin') {
            return res.status(403).send('Forbidden');
        }
        const appDoc = await Member.findById(req.params.id);
        if (!appDoc) return res.redirect('/admin/membership-applications?error=notfound');
        appDoc.status = 'verified';
        appDoc.reviewHistory.push({
            by: req.session.admin._id,
            action: 'verified',
            comment: req.body.comment || ''
        });
        await appDoc.save();
        
        // Log to audit trail
        await logAuditAction({
            req,
            action: 'Update',
            targetId: appDoc._id,
            targetType: 'Membership',
            targetName: appDoc.fullName,
            details: `Membership application verified. Comment: ${req.body.comment || 'None'}`
        });
        
        res.redirect(`/admin/membership-applications/${req.params.id}?success=verified`);
    } catch (err) {
        console.error('Verify error', err);
        res.redirect(`/admin/membership-applications/${req.params.id}?error=verify`);
    }
});

// President final approval
app.post('/admin/membership-applications/:id/approve', isAdmin, async (req, res) => {
    try {
        if (req.session.admin.role !== 'President' && req.session.admin.role !== 'Superadmin') {
            return res.status(403).send('Forbidden');
        }
        const appDoc = await Member.findById(req.params.id);
        if (!appDoc) return res.redirect('/admin/membership-applications?error=notfound');
        // generate new formatted ID if not present
        if (!appDoc.membershipId) {
            appDoc.membershipId = await Member.generateMembershipId(appDoc.state);
        }
        appDoc.status = 'approved';
        appDoc.reviewHistory.push({
            by: req.session.admin._id,
            action: 'approved',
            comment: req.body.comment || ''
        });
        await appDoc.save();
        
        // Log to audit trail
        await logAuditAction({
            req,
            action: 'Approve',
            targetId: appDoc._id,
            targetType: 'Membership',
            targetName: appDoc.fullName,
            details: `Membership application approved. Membership ID: ${appDoc.membershipId}. Comment: ${req.body.comment || 'None'}`
        });
        
        res.redirect(`/admin/membership-applications/${req.params.id}?success=approved`);
    } catch (err) {
        console.error('Approve error', err);
        res.redirect(`/admin/membership-applications/${req.params.id}?error=approve`);
    }
});

// Reject membership application
app.post('/admin/membership-applications/:id/reject', isAdmin, async (req, res) => {
    try {
        // Allow Secretary, President, and Superadmin to reject
        const allowedRoles = ['Secretary', 'President', 'Superadmin'];
        if (!allowedRoles.includes(req.session.admin.role)) {
            return res.status(403).send('Forbidden');
        }
        
        const { reason } = req.body;
        
        // Validate reason
        if (!reason || reason.trim().length < 5) {
            return res.redirect(`/admin/membership-applications/${req.params.id}?error=reason_required`);
        }
        
        const appDoc = await Member.findById(req.params.id);
        if (!appDoc) return res.redirect('/admin/membership-applications?error=notfound');
        
        // Don't allow rejecting already rejected or approved applications
        if (appDoc.status === 'rejected') {
            return res.redirect(`/admin/membership-applications/${req.params.id}?error=already_rejected`);
        }
        if (appDoc.status === 'approved') {
            return res.redirect(`/admin/membership-applications/${req.params.id}?error=cannot_reject_approved`);
        }
        
        // Update status to rejected
        appDoc.status = 'rejected';
        appDoc.rejectionReason = reason.trim();
        appDoc.reviewHistory.push({
            by: req.session.admin._id,
            action: 'rejected',
            comment: reason.trim()
        });
        await appDoc.save();
        
        // Log to audit trail
        await logAuditAction({
            req,
            action: 'Reject',
            targetId: appDoc._id,
            targetType: 'Membership',
            targetName: appDoc.fullName,
            details: `Membership application rejected. Reason: ${reason.trim()}. Rejected by: ${req.session.admin.fullName}`
        });
        
        // Send rejection email to member
        try {
            await sendRejectionEmail(appDoc.email, appDoc.fullName, reason.trim());
            console.log(`✅ Rejection email sent to ${appDoc.email}`);
        } catch (emailErr) {
            console.error('❌ Failed to send rejection email:', emailErr.message);
        }
        
        res.redirect(`/admin/membership-applications/${req.params.id}?success=rejected`);
    } catch (err) {
        console.error('Reject error', err);
        res.redirect(`/admin/membership-applications/${req.params.id}?error=reject`);
    }
});

// Role Assignment - GET form
app.get('/admin/membership-applications/:id/assign-role', isAdmin, async (req, res) => {
    try {
        const allowed = ['President', 'Superadmin'];
        if (!allowed.includes(req.session.admin.role)) {
            return res.status(403).render('admin/dashboard', {
                title: 'Access Denied',
                layout: 'admin/layout',
                admin: req.session.admin,
                stats: { totalMembers:0, approvedUsers:0, mediaPosts:0 },
                error: '403 Forbidden - Only President/Superadmin can assign roles.',
                currentPath: req.path
            });
        }

        const application = await Member.findById(req.params.id);
        if (!application) {
            return res.redirect('/admin/membership-applications?error=notfound');
        }

        if (application.status !== 'approved') {
            return res.redirect(`/admin/membership-applications/${req.params.id}?error=not_approved`);
        }

        // strict list of Karyakarini roles with per‑area limits
        const rolesWithLimits = {
            'Adhyaksh': 1,
            'Varishth Upadhyaksh': 1,
            'Upadhyaksh': 4,
            'Mahasachiv': 1,
            'Sachiv': 1,
            'Zila Sangathan Sachiv': 4,
            'Sanyukt Sachiv': 4,
            'Vidhi Sachiv': 4,
            'Koshadhyaksh': 1,
            'Media Prabhari': 1,
            'Media Sachiv': 4,
            'Prachar Sachiv': 4,
            'Press Sachiv': 4,
            'Pravakta': 4,
            'Karyakram Sachiv': 4,
            'Karyakarini Sadasya': 30
        };
        const positions = Object.keys(rolesWithLimits);

        // determine allowed assignment levels based on admin's own level
        const levelHierarchy = {
            'National': ['National','State','Division','District','Block','Panchayat'],
            'State': ['State','Division','District','Block','Panchayat'],
            'Division': ['Division','District','Block','Panchayat'],
            'District': ['District','Block','Panchayat'],
            'Block': ['Block','Panchayat'],
            'Panchayat': ['Panchayat']
        };
        let allowedLevels = levelHierarchy[req.session.admin.level] || [];
        if (req.session.admin.role === 'Superadmin') {
            allowedLevels = levelHierarchy['National'];
        }

        res.render('admin/assign-role', {
            title: 'Assign Position',
            layout: 'admin/layout',
            admin: req.session.admin,
            member: application,
            positions,
            roleLimits: rolesWithLimits,
            allowedLevels,
            adminLocation: req.session.admin.location || {},
            currentPath: '/admin/membership-applications'
        });
    } catch (error) {
        console.error('Error loading assign-role form:', error);
        res.redirect(`/admin/membership-applications/${req.params.id}?error=load_form`);
    }
});

// Role Assignment - POST handler
app.post('/admin/membership-applications/:id/assign-role', isAdmin, async (req, res) => {
    try {
        const allowed = ['President', 'Superadmin'];
        if (!allowed.includes(req.session.admin.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { position, teamType, level, state, division, district, block, panchayat } = req.body;
        // debug helpers: log what we received
        console.log('assign-role POST body:', req.body, 'params.id', req.params.id);
        const member = await Member.findById(req.params.id);

        if (!member || member.status !== 'approved') {
            console.warn('assign-role failed, invalid member or not approved', { member });
            return res.status(400).json({ success: false, message: 'Invalid member or not approved' });
        }

        // Permission check - hierarchical validation
        const adminLevel = req.session.admin.level;
        const adminLocation = req.session.admin.location || {};

        // compute allowed levels based on admin role/level (same logic as GET handler)
        const levelHierarchyConfig = {
            'National': ['National','State','Division','District','Block','Panchayat'],
            'State': ['State','Division','District','Block','Panchayat'],
            'Division': ['Division','District','Block','Panchayat'],
            'District': ['District','Block','Panchayat'],
            'Block': ['Block','Panchayat'],
            'Panchayat': ['Panchayat']
        };
        // limits check
        const rolesWithLimits = {
            'Adhyaksh': 1,
            'Varishth Upadhyaksh': 1,
            'Upadhyaksh': 4,
            'Mahasachiv': 1,
            'Sachiv': 1,
            'Zila Sangathan Sachiv': 4,
            'Sanyukt Sachiv': 4,
            'Vidhi Sachiv': 4,
            'Koshadhyaksh': 1,
            'Media Prabhari': 1,
            'Media Sachiv': 4,
            'Prachar Sachiv': 4,
            'Press Sachiv': 4,
            'Pravakta': 4,
            'Karyakram Sachiv': 4,
            'Karyakarini Sadasya': 30
        };
        let allowedLevelsForUser = levelHierarchyConfig[adminLevel] || [];
        if (req.session.admin.role === 'Superadmin') {
            allowedLevelsForUser = levelHierarchyConfig['National'];
        }
        if (!allowedLevelsForUser.includes(level)) {
            return res.status(403).json({ success: false, message: `Assignment to ${level} not permitted for your level` });
        }

        // Define numeric hierarchy for comparisons
        const levelHierarchy = {
            'National': 0,
            'State': 1,
            'Division': 2,
            'District': 3,
            'Block': 4,
            'Panchayat': 5
        };
        
        // Superadmin and National level can assign anywhere
        if (req.session.admin.role !== 'Superadmin' && adminLevel !== 'National') {
            const assignLevel = levelHierarchy[level];
            const userLevel = levelHierarchy[adminLevel];

            // User cannot assign at higher levels
            if (assignLevel < userLevel) {
                return res.status(403).json({ success: false, message: `Cannot assign positions at ${level} level` });
            }

            // Validate location hierarchy
            if (adminLevel === 'State' && level !== 'National') {
                if (adminLocation.state !== state) {
                    return res.status(403).json({ success: false, message: 'Can only assign in your state' });
                }
            } else if (adminLevel === 'Division') {
                if (level === 'State' || level === 'National') {
                    return res.status(403).json({ success: false, message: `Cannot assign at ${level} level` });
                }
                if (adminLocation.state !== state || adminLocation.division !== division) {
                    return res.status(403).json({ success: false, message: 'Can only assign within your division' });
                }
            } else if (adminLevel === 'District') {
                if (level === 'State' || level === 'Division' || level === 'National') {
                    return res.status(403).json({ success: false, message: `Cannot assign at ${level} level` });
                }
                if (adminLocation.state !== state || adminLocation.division !== division || adminLocation.district !== district) {
                    return res.status(403).json({ success: false, message: 'Can only assign within your district' });
                }
            } else if (adminLevel === 'Block') {
                if (['State','Division','District','National'].includes(level)) {
                    return res.status(403).json({ success: false, message: `Cannot assign at ${level} level` });
                }
                if (adminLocation.state !== state || adminLocation.division !== division || adminLocation.district !== district || adminLocation.block !== block) {
                    return res.status(403).json({ success: false, message: 'Can only assign within your block' });
                }
            }
        }

        // ** limit enforcement (FIXED: use Adhyaksh, only active, area-specific, team-aware) **
        const maxAllowed = rolesWithLimits[position] || 0;
        if (maxAllowed > 0) {
            const Adhyaksh = require('./models/Adhyaksh');
            // Build area-specific query for active padadhikari
            const adhQuery = {
                position,
                level,
                teamType: teamType || null, // ensure separate limits per team (Core/Mahila/Yuva/Alpsankhyak/SC-ST)
                isActive: true
            };
            // Area fields: only match up to the level, others must be null
            if (level === 'National') {
                // No area fields needed
                adhQuery.state = null;
                adhQuery.division = null;
                adhQuery.district = null;
                adhQuery.block = null;
                adhQuery.panchayat = null;
            } else if (level === 'State') {
                adhQuery.state = state;
                adhQuery.division = null;
                adhQuery.district = null;
                adhQuery.block = null;
                adhQuery.panchayat = null;
            } else if (level === 'Division') {
                adhQuery.state = state;
                adhQuery.division = division;
                adhQuery.district = null;
                adhQuery.block = null;
                adhQuery.panchayat = null;
            } else if (level === 'District') {
                adhQuery.state = state;
                adhQuery.division = division;
                adhQuery.district = district;
                adhQuery.block = null;
                adhQuery.panchayat = null;
            } else if (level === 'Block') {
                adhQuery.state = state;
                adhQuery.division = division;
                adhQuery.district = district;
                adhQuery.block = block;
                adhQuery.panchayat = null;
            } else if (level === 'Panchayat') {
                adhQuery.state = state;
                adhQuery.division = division;
                adhQuery.district = district;
                adhQuery.block = block;
                adhQuery.panchayat = panchayat;
            }

            // Count only active padadhikari in this area
            const existingAdhyaksh = await Adhyaksh.find(adhQuery);
            if (existingAdhyaksh.length >= maxAllowed) {
                // Debug: print all conflicting Adhyaksh
                console.warn('assign-role limit reached', {
                    position,
                    teamType,
                    level,
                    state,
                    division,
                    district,
                    block,
                    panchayat,
                    maxAllowed,
                    conflicting: existingAdhyaksh.map(a => ({
                        id: a._id,
                        memberId: a.memberId,
                        fullName: a.fullName,
                        teamType: a.teamType,
                        isActive: a.isActive,
                        area: {
                            state: a.state,
                            division: a.division,
                            district: a.district,
                            block: a.block,
                            panchayat: a.panchayat
                        }
                    }))
                });
                return res.status(400).json({
                    success: false,
                    message: `${position} limit of ${maxAllowed} reached for this area and team`,
                    reason: 'Active padadhikari already assigned',
                    conflicting: existingAdhyaksh.map(a => ({
                        id: a._id,
                        memberId: a.memberId,
                        fullName: a.fullName,
                        teamType: a.teamType,
                        isActive: a.isActive,
                        area: {
                            state: a.state,
                            division: a.division,
                            district: a.district,
                            block: a.block,
                            panchayat: a.panchayat
                        }
                    }))
                });
            }
        }

        // Update Member
        console.log('assign-role updating member', { memberId: member._id, position, teamType, level, state, division, district, block, panchayat });
        member.assignedPosition = position;
        member.teamType = teamType;
        member.positionLevel = level;
        member.positionLocation = { state, division, district, block, panchayat };
        member.positionAssignedAt = new Date();
        member.positionAssignedBy = req.session.admin._id;
        await member.save();

        // Create/Update Adhyaksh record
        const adhyakshData = {
            memberId: member._id,
            fullName: member.fullName,
            mobile: member.mobile,
            email: member.email,
            photo: member.photo,
            position,
            teamType,
            level,
            state,
            division: division || null,
            district: district || null,
            block: block || null,
            panchayat: panchayat || null,
            assignedBy: req.session.admin._id || req.session.admin.id,
            isActive: true
        };

        // Upsert Adhyaksh record (no duplicate key error)
        console.log('assign-role upserting Adhyaksh record for', member._id);
        await require('./models/Adhyaksh').findOneAndUpdate(
            { memberId: member._id },
            adhyakshData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Log to audit trail
        await logAuditAction({
            req,
            action: 'Role Change',
            targetId: member._id,
            targetType: 'Membership',
            targetName: member.fullName,
            details: `Position assigned: ${position} at ${level} level`
        });

        res.json({ success: true, message: 'Position assigned successfully!', memberId: member._id });
    } catch (error) {
        console.error('Error assigning role:', error);
        console.error(error.stack || error);
        // Always return JSON error
        res.status(500).json({ success: false, message: 'Error assigning position', details: error.message });
    }
});

// ============ USER MANAGEMENT ROUTES ============

// List all authorized persons/admins
app.get('/admin/users', isAdmin, async (req, res) => {
    try {
        // All logged-in admins can view users, but data is filtered based on location
        let filter = {};

        // SuperAdmin and National level can see all users
        if (req.session.admin.role !== 'Superadmin' && req.session.admin.level !== 'National') {
            // Other admins can only see users from their own location
            if (req.session.admin.location?.state) {
                filter['location.state'] = req.session.admin.location.state;
            }
            if (req.session.admin.location?.district) {
                filter['location.district'] = req.session.admin.location.district;
            }
            if (req.session.admin.location?.block) {
                filter['location.block'] = req.session.admin.location.block;
            }
        }

        const users = await User.find(filter).sort({ createdAt: -1 }).select('-password');

        res.render('admin/users', {
            title: 'User Management',
            layout: 'admin/layout',
            admin: req.session.admin,
            users,
            canAdd: req.session.admin.role === 'Superadmin',
            query: req.query,
            currentPath: req.path
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).render('admin/users', {
            title: 'User Management',
            layout: 'admin/layout',
            admin: req.session.admin,
            users: [],
            canAdd: req.session.admin.role === 'Superadmin',
            error: 'Error loading users list',
            currentPath: req.path
        });
    }
});

// Add new official form (GET)
app.get('/admin/users/add', isAdmin, (req, res) => {
    try {
        // Only SuperAdmin can add new officials
        if (req.session.admin.role !== 'Superadmin') {
            return res.status(403).render('admin/dashboard', {
                title: 'Access Denied',
                layout: 'admin/layout',
                admin: req.session.admin,
                stats: { totalMembers: 0, approvedUsers: 0, mediaPosts: 0 },
                error: '403 Forbidden - Only Super Admin can add officials.',
                currentPath: req.path
            });
        }

        res.render('admin/users-add', {
            title: 'Add New Official',
            layout: 'admin/layout',
            admin: req.session.admin,
            currentPath: req.path
        });
    } catch (error) {
        console.error('Error loading add user form:', error);
        res.status(500).render('admin/dashboard', {
            title: 'Error',
            layout: 'admin/layout',
            admin: req.session.admin,
            stats: { totalMembers: 0, approvedUsers: 0, mediaPosts: 0 },
            error: 'Error loading form',
            currentPath: req.path
        });
    }
});

// Create new official (POST)
app.post('/admin/users/add', isAdmin, async (req, res) => {
    try {
        // Only SuperAdmin can add new officials
        if (req.session.admin.role !== 'Superadmin') {
            return res.status(403).json({ error: '403 Forbidden - Only Super Admin can add officials.' });
        }

        const { fullName, username, email, password, phone, role, level, state, division, district, block, panchayat } = req.body;

        // Validation
        if (!fullName || !username || !email || !password || !role || !level) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Permission check: ensure admin cannot assign user above their level
        const hierarchy = { 'National':5, 'State':4, 'Division':3, 'District':2, 'Block':1, 'Panchayat':0 };
        const adminLevelRank = hierarchy[req.session.admin.level] || 0;
        const targetRank = hierarchy[level] || 0;
        if (targetRank > adminLevelRank && req.session.admin.role !== 'Superadmin') {
            return res.status(403).json({ error: 'Cannot assign a role above your own level' });
        }

        // Check location bounds (admin can only create within their area)
        if (req.session.admin.role !== 'Superadmin' && req.session.admin.level !== 'National') {
            if (req.session.admin.location.state && state !== req.session.admin.location.state) {
                return res.status(403).json({ error: 'State must match your assigned state' });
            }
            if (req.session.admin.location.division && division !== req.session.admin.location.division) {
                return res.status(403).json({ error: 'Division must match your assigned division' });
            }
            if (req.session.admin.location.district && district !== req.session.admin.location.district) {
                return res.status(403).json({ error: 'District must match your assigned district' });
            }
            if (req.session.admin.location.block && block !== req.session.admin.location.block) {
                return res.status(403).json({ error: 'Block must match your assigned block' });
            }
        }

        // Check if username already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Create new user
        const newUser = new User({
            fullName,
            username,
            email,
            password,
            phone,
            role,
            level,
            location: { state, division, district, block, panchayat },
            isVerified: true,
            isActive: true
        });

        await newUser.save();

        console.log(`[ADMIN] ${req.session.admin.fullName} created new user: ${fullName} (${username})`);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            userId: newUser._id
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Edit official form (GET)
app.get('/admin/users/:id/edit', isAdmin, async (req, res) => {
    try {
        // Only SuperAdmin can edit officials
        if (req.session.admin.role !== 'Superadmin') {
            return res.status(403).render('admin/dashboard', {
                title: 'Access Denied',
                layout: 'admin/layout',
                admin: req.session.admin,
                stats: { totalMembers: 0, approvedUsers: 0, mediaPosts: 0 },
                error: '403 Forbidden - Only Super Admin can edit officials.',
                currentPath: req.path
            });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).render('admin/dashboard', {
                title: 'Not Found',
                layout: 'admin/layout',
                admin: req.session.admin,
                stats: { totalMembers: 0, approvedUsers: 0, mediaPosts: 0 },
                error: 'User not found',
                currentPath: req.path
            });
        }

        res.render('admin/users-edit', {
            title: 'Edit Official',
            layout: 'admin/layout',
            admin: req.session.admin,
            user,
            currentPath: req.path
        });
    } catch (error) {
        console.error('Error loading edit user form:', error);
        res.status(500).render('admin/dashboard', {
            title: 'Error',
            layout: 'admin/layout',
            admin: req.session.admin,
            stats: { totalMembers: 0, approvedUsers: 0, mediaPosts: 0 },
            error: 'Error loading form',
            currentPath: req.path
        });
    }
});

// Update official (POST)
app.post('/admin/users/:id/edit', isAdmin, async (req, res) => {
    try {
        // Only SuperAdmin can edit officials
        if (req.session.admin.role !== 'Superadmin') {
            return res.status(403).json({ error: '403 Forbidden - Only Super Admin can edit officials.' });
        }

        const { fullName, email, phone, role, level, state, division, district, block, panchayat, isActive } = req.body;

        // Permission check similar to add
        const hierarchy = { 'National':5, 'State':4, 'Division':3, 'District':2, 'Block':1, 'Panchayat':0 };
        const adminLevelRank = hierarchy[req.session.admin.level] || 0;
        const targetRank = hierarchy[level] || 0;
        if (targetRank > adminLevelRank && req.session.admin.role !== 'Superadmin') {
            return res.status(403).json({ error: 'Cannot assign a level above your own' });
        }
        if (req.session.admin.role !== 'Superadmin' && req.session.admin.level !== 'National') {
            if (req.session.admin.location.state && state !== req.session.admin.location.state) {
                return res.status(403).json({ error: 'State must match your assigned state' });
            }
            if (req.session.admin.location.division && division !== req.session.admin.location.division) {
                return res.status(403).json({ error: 'Division must match your assigned division' });
            }
            if (req.session.admin.location.district && district !== req.session.admin.location.district) {
                return res.status(403).json({ error: 'District must match your assigned district' });
            }
            if (req.session.admin.location.block && block !== req.session.admin.location.block) {
                return res.status(403).json({ error: 'Block must match your assigned block' });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                fullName,
                email,
                phone,
                role,
                level,
                location: { state, division, district, block, panchayat },
                isActive: isActive === 'true'
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[ADMIN] ${req.session.admin.fullName} updated user: ${user.fullName}`);

        res.json({
            success: true,
            message: 'User updated successfully'
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// APPLICATION APPROVAL ROUTES

// DEBUG helper: set a fake admin in session (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.get('/debug/login-as', (req, res) => {
        // example query: ?role=Secretary&level=State&state=Bihar
        const { role, level, state, division, district, block, panchayat } = req.query;
        req.session.admin = {
            id: 'debug123',
            fullName: 'Debug User',
            username: 'debug',
            role: role || 'Secretary',
            level: level || 'State',
            location: { state, division, district, block, panchayat }
        };
        req.session.adminId = 'debug123';
        res.send(`Logged in as ${req.session.admin.role} at ${req.session.admin.level}`);
    });
}

// Delete official (GET)
app.get('/admin/users/:id/delete', isAdmin, async (req, res) => {
    try {
        // Only SuperAdmin can delete officials
        if (req.session.admin.role !== 'Superadmin') {
            return res.status(403).render('admin/dashboard', {
                title: 'Access Denied',
                layout: 'admin/layout',
                admin: req.session.admin,
                stats: { totalMembers: 0, approvedUsers: 0, mediaPosts: 0 },
                error: '403 Forbidden - Only Super Admin can delete officials.',
                currentPath: req.path
            });
        }

        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).render('admin/dashboard', {
                title: 'Not Found',
                layout: 'admin/layout',
                admin: req.session.admin,
                stats: { totalMembers: 0, approvedUsers: 0, mediaPosts: 0 },
                error: 'User not found',
                currentPath: req.path
            });
        }

        console.log(`[ADMIN] ${req.session.admin.fullName} deleted user: ${user.fullName}`);

        res.redirect('/admin/users?deleted=true');

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).render('admin/dashboard', {
            title: 'Error',
            layout: 'admin/layout',
            admin: req.session.admin,
            stats: { totalMembers: 0, approvedUsers: 0, mediaPosts: 0 },
            error: 'Error deleting user',
            currentPath: req.path
        });
    }
});

// Certificate download route
app.get('/certificate/:membershipId', async (req, res) => {
    try {
        const { membershipId } = req.params;

        // Find member by membershipId
        const member = await Member.findOne({ membershipId: membershipId });

        if (!member || member.status !== 'approved') {
            return res.status(404).send('Certificate not found or membership not approved');
        }

        if (!member.isIDCardApproved) {
            return res.status(403).send('ID Card approval pending. Please contact Super Admin.');
        }

        // Generate ID card PDF
        const { generateIdCard } = require('./utils/idCardGenerator');
        const pdfUrl = await generateIdCard(member);

        // Serve the PDF
        const pdfPath = path.join(__dirname, 'public', pdfUrl);
        if (fs.existsSync(pdfPath)) {
            // Log the ID card download
            await logAuditAction({
                action: 'id_card_downloaded',
                targetId: member._id,
                targetType: 'Membership',
                targetName: member.fullName,
                details: {
                    membershipId: member.membershipId,
                    memberName: member.fullName,
                    fileName: `RMAS_ID_Card_${member.membershipId}.pdf`,
                    documentType: 'ID Card'
                }
            });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="RMAS_ID_Card_${member.membershipId.replace(/\//g, '_')}.pdf"`);
            const pdfStream = fs.createReadStream(pdfPath);
            pdfStream.pipe(res);
        } else {
            res.status(500).send('Error generating certificate');
        }
    } catch (error) {
        console.error('Error generating certificate:', error);
        res.status(500).send('Error generating certificate');
    }
});

// Joining letter download route
app.get('/joining-letter/:membershipId', async (req, res) => {
    try {
        const { membershipId } = req.params;

        // Find member by membershipId
        const member = await Member.findOne({ membershipId: membershipId });

        if (!member || member.status !== 'approved') {
            return res.status(404).send('Joining letter not found or membership not approved');
        }

        if (!member.isIDCardApproved) {
            return res.status(403).send('ID Card approval pending. Please contact Super Admin.');
        }

        // Generate joining letter PDF
        const { generateJoiningLetter } = require('./utils/joiningLetterGenerator');
        const pdfUrl = await generateJoiningLetter(member);

        // Serve the PDF
        const pdfPath = path.join(__dirname, 'public', pdfUrl);
        if (fs.existsSync(pdfPath)) {
            // Log the joining letter download
            await logAuditAction({
                action: 'joining_letter_downloaded',
                targetId: member._id,
                targetType: 'Membership',
                targetName: member.fullName,
                details: {
                    membershipId: member.membershipId,
                    memberName: member.fullName,
                    fileName: `RMAS_Joining_Letter_${member.membershipId}.pdf`,
                    documentType: 'Joining Letter'
                }
            });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="RMAS_Joining_Letter_${member.membershipId.replace(/\//g, '_')}.pdf"`);
            const pdfStream = fs.createReadStream(pdfPath);
            pdfStream.pipe(res);
        } else {
            res.status(500).send('Error generating joining letter');
        }
    } catch (error) {
        console.error('Error generating joining letter:', error);
        res.status(500).send('Error generating joining letter');
    }
});

// Membership Kit download route
app.get(/^\/membership-kit\/(.+)/, async (req, res) => {
    try {
        const membershipId = decodeURIComponent(req.params[0]);

        // Find member by membershipId
        const member = await Member.findOne({ membershipId: membershipId });

        if (!member || member.status !== 'approved') {
            return res.status(404).send('Membership Kit not available or membership not approved');
        }

        if (!member.isIDCardApproved) {
            return res.status(403).send('ID Card approval pending. Please contact Super Admin.');
        }

        // Generate membership kit PDF
        const { generateMembershipKit } = require('./utils/membershipKitGenerator');
        const pdfUrl = await generateMembershipKit(member);

        // Log the membership kit generation
        await logAuditAction({
            action: 'membership_kit_generated',
            targetId: member._id,
            targetType: 'Membership',
            targetName: member.fullName,
            details: {
                membershipId: member.membershipId,
                memberName: member.fullName,
                fileName: `RMAS_Membership_Kit_${member.membershipId}.pdf`,
                documentType: 'Membership Kit'
            }
        });

        // Serve the PDF
        const pdfPath = path.join(__dirname, 'public', pdfUrl);
        if (fs.existsSync(pdfPath)) {
            // Log the membership kit download
            await logAuditAction({
                action: 'membership_kit_downloaded',
                targetId: member._id,
                targetType: 'Membership',
                targetName: member.fullName,
                details: {
                    membershipId: member.membershipId,
                    memberName: member.fullName,
                    fileName: `RMAS_Membership_Kit_${member.membershipId}.pdf`,
                    documentType: 'Membership Kit'
                }
            });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="RMAS_Membership_Kit_${member.membershipId.replace(/\//g, '_')}.pdf"`);
            const pdfStream = fs.createReadStream(pdfPath);
            pdfStream.pipe(res);
        } else {
            res.status(500).send('Error generating membership kit');
        }
    } catch (error) {
        console.error('Error generating membership kit:', error);
        const errorMessage = error?.message || 'Unknown error';
        res.status(500).send(`Error generating membership kit: ${errorMessage}`);
    }
});

// Redirect old /documents/request-download route to current download verification page
app.get('/documents/request-download', (req, res) => {
    return res.redirect('/download-verify');
});

// OTP-Based Password Reset Routes

// GET Forgot Password Page
app.get('/forgot-password', (req, res) => {
    if (req.session && req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }
    res.render('forgot-password', {
        title: 'Forgot Password',
        layout: false,
        error: null,
        success: null
    });
});

// POST Forgot Password - Send OTP
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.render('forgot-password', {
                title: 'Forgot Password',
                layout: false,
                error: 'Email is required',
                success: null
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        // Security: Don't reveal if email exists or not
        // Always show success message
        if (user) {
            // Rate limiting: Check if user has requested OTP recently
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            // Reset attempts if last request was more than an hour ago
            if (user.otpLastRequestTime && user.otpLastRequestTime < oneHourAgo) {
                user.otpAttempts = 0;
            }
            
            // Check rate limit (max 5 OTP requests per hour)
            if (user.otpAttempts >= 5) {
                return res.render('forgot-password', {
                    title: 'Forgot Password',
                    layout: false,
                    error: 'Too many OTP requests. Please try again after 1 hour.',
                    success: null
                });
            }
            
            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Set OTP expiry to 10 minutes
            const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000);
            
            // Update user with OTP
            user.otp = otp;
            user.otpExpiry = otpExpiry;
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            user.otpLastRequestTime = now;
            await user.save();
            
            // Send OTP email
            await sendOtpEmail(user.email, otp, user.fullName);
            
            console.log(`[OTP] OTP sent to ${user.email}: ${otp}`);
            
            // Store email in session for verification
            req.session.otpEmail = user.email;
            
            return res.redirect('/verify-password-otp');
        } else {
            // User not found - still show success to prevent email enumeration
            console.log(`[OTP] Password reset requested for non-existent email: ${email}`);
            return res.render('forgot-password', {
                title: 'Forgot Password',
                layout: false,
                error: null,
                success: 'If an account exists with this email, an OTP has been sent.'
            });
        }
    } catch (error) {
        console.error('Error in forgot-password:', error);
        return res.render('forgot-password', {
            title: 'Forgot Password',
            layout: false,
            error: 'An error occurred. Please try again.',
            success: null
        });
    }
});

// GET Verify OTP Page
app.get('/verify-password-otp', (req, res) => {
    if (req.session && req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }
    
    const otpEmail = req.session.otpEmail;
    if (!otpEmail) {
        return res.redirect('/forgot-password');
    }
    
    res.render('verify-otp', {
        title: 'Verify OTP',
        layout: false,
        email: otpEmail,
        error: null
    });
});

// POST Verify OTP
app.post('/verify-password-otp', async (req, res) => {
    try {
        const { otp, email } = req.body;
        
        if (!otp || !email) {
            return res.render('verify-otp', {
                title: 'Verify OTP',
                layout: false,
                email: email,
                error: 'OTP and email are required'
            });
        }
        
        // Find user
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (!user) {
            return res.render('verify-otp', {
                title: 'Verify OTP',
                layout: false,
                email: email,
                error: 'Invalid request'
            });
        }
        
        // Check if OTP is valid
        if (!user.otp || user.otp !== otp) {
            return res.render('verify-otp', {
                title: 'Verify OTP',
                layout: false,
                email: email,
                error: 'Invalid OTP'
            });
        }
        
        // Check if OTP is expired
        if (!user.otpExpiry || new Date() > user.otpExpiry) {
            // Clear expired OTP
            user.otp = null;
            user.otpExpiry = null;
            await user.save();
            
            return res.render('verify-otp', {
                title: 'Verify OTP',
                layout: false,
                email: email,
                error: 'OTP has expired. Please request a new one.'
            });
        }
        
        // OTP is valid - set session and clear OTP
        user.otp = null;
        user.otpExpiry = null;
        await user.save();
        
        // Set session for password reset
        req.session.otpVerified = true;
        req.session.otpUserId = user._id.toString();
        req.session.otpEmail = null; // Clear this
        
        console.log(`[OTP] OTP verified for ${email}`);
        
        return res.redirect('/reset-password-otp');
    } catch (error) {
        console.error('Error in verify-otp:', error);
        return res.render('verify-otp', {
            title: 'Verify OTP',
            layout: false,
            email: req.body.email,
            error: 'An error occurred. Please try again.'
        });
    }
});

// GET Reset Password Page
app.get('/reset-password-otp', (req, res) => {
    if (req.session && req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }
    
    // Check if OTP is verified in session
    if (!req.session.otpVerified || !req.session.otpUserId) {
        return res.redirect('/forgot-password');
    }
    
    res.render('reset-password-otp', {
        title: 'Reset Password',
        layout: false,
        error: null,
        success: null
    });
});

// POST Reset Password
app.post('/reset-password-otp', async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        
        // Check if OTP is verified in session
        if (!req.session.otpVerified || !req.session.otpUserId) {
            return res.redirect('/forgot-password');
        }
        
        if (!password || !confirmPassword) {
            return res.render('reset-password-otp', {
                title: 'Reset Password',
                layout: false,
                error: 'Both password fields are required',
                success: null
            });
        }
        
        if (password !== confirmPassword) {
            return res.render('reset-password-otp', {
                title: 'Reset Password',
                layout: false,
                error: 'Passwords do not match',
                success: null
            });
        }
        
        // Password strength validation
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.render('reset-password-otp', {
                title: 'Reset Password',
                layout: false,
                error: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
                success: null
            });
        }
        
        // Find user and update password
        const user = await User.findById(req.session.otpUserId);
        
        if (!user) {
            return res.redirect('/forgot-password');
        }
        
        // Update password
        await user.setPassword(password);
        
        // Clear OTP fields and save
        user.otpAttempts = 0;
        await user.save();
        
        // Clear session
        req.session.otpVerified = null;
        req.session.otpUserId = null;
        
        // Send confirmation email
        await sendPasswordResetSuccessEmail(user.email, user.fullName);
        
        console.log(`[PASSWORD] Password reset successful for ${user.email}`);
        
        // Show success page
        res.render('reset-password-otp', {
            title: 'Password Reset Successful',
            layout: false,
            success: true
        });
    } catch (error) {
        console.error('Error in reset-password-otp:', error);
        return res.render('reset-password-otp', {
            title: 'Reset Password',
            layout: false,
            error: 'An error occurred. Please try again.',
            success: null
        });
    }
});

// Admin Logout
app.get('/admin/logout', (req, res) => {
    const adminName = req.session.admin?.fullName || 'Unknown';
    const adminEmail = req.session.admin?.username || 'unknown';
    
    // Log the logout action before destroying session
    logAuditAction({
        req,
        action: 'logout',
        targetType: 'User',
        targetName: adminName,
        details: {
            username: adminEmail,
            role: req.session.admin?.role,
            level: req.session.admin?.level,
            location: req.session.admin?.location || {},
            ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || req.headers['user-agent'] || 'unknown'
        }
    }).then(() => {
        console.log(`[ADMIN LOGOUT] ${adminName} logged out`);
        req.session.destroy();
        res.redirect('/admin/login');
    }).catch(() => {
        console.log(`[ADMIN LOGOUT] ${adminName} logged out`);
        req.session.destroy();
        res.redirect('/admin/login');
    });
});

// ============ TEMPORARY MASTER CLEANUP ROUTE ============
// WARNING: Delete this route after use!
app.get('/admin/master-cleanup-system', isAdmin, async (req, res) => {
    try {
        console.log('\n🔧 MASTER CLEANUP INITIATED...\n');
        
        // 1. Delete all members
        const memberResult = await Member.deleteMany({});
        const totalMembersDeleted = memberResult.deletedCount;
        console.log(`✅ Deleted ${totalMembersDeleted} member(s)`);
        
        // 2. Delete all users except Superadmin
        const userResult = await User.deleteMany({ role: { $ne: 'Superadmin' } });
        const totalUsersDeleted = userResult.deletedCount;
        console.log(`✅ Deleted ${totalUsersDeleted} user(s)`);
        
        // 3. Drop old membershipId index
        try {
            await Member.collection.dropIndex('membershipId_1');
            console.log('✅ Dropped membershipId_1 index');
        } catch (err) {
            console.log('ℹ️  Index not found (may not exist)');
        }
        
        // 4. Sync indexes
        await Member.syncIndexes();
        console.log('✅ Synced indexes\n');
        
        // Report
        const report = `
========================================
📊 MASTER CLEANUP REPORT
========================================
Total Members Deleted: ${totalMembersDeleted}
Total Users Deleted: ${totalUsersDeleted}
Index Status: SUCCESS
========================================
`;
        console.log(report);
        
        res.send(`<html><body style="font-family:Arial;padding:40px;background:#f5f5f5;"><h1 style="color:green;">✅ Cleanup Complete!</h1><pre style="background:white;padding:20px;border-radius:8px;">${report}</pre><p><a href="/admin/dashboard" style="padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;">Go to Dashboard</a></p></body></html>`);
    } catch (err) {
        console.error('❌ Cleanup Error:', err);
        res.status(500).send(`<html><body style="font-family:Arial;padding:40px;"><h1 style="color:red;">❌ Error: ${err.message}</h1></body></html>`);
    }
});
// ============ END TEMPORARY ROUTE ============

// ============ COMPLAINT SUBMISSION API ============

// POST /api/complaints - Handle complaint form submission
app.post('/api/complaints', complaintUpload, async (req, res) => {
    console.log('[POST /api/complaints] Request received');
    
    try {
        const { body, files } = req;
        const uploadedFiles = files || {};
        
        console.log('[POST /api/complaints] Body keys:', Object.keys(body || {}));
        console.log('[POST /api/complaints] Files keys:', Object.keys(uploadedFiles));
        
        // ============ VALIDATION ============
        
        // Required fields validation
        const requiredFields = [
            'complainant_fullName', 'complainant_fatherName', 'complainant_age', 'complainant_gender',
            'complainant_mobile', 'complainant_email', 'complainant_district',
            'victim_fullName', 'victim_contactNumber',
            'incident_category', 'incident_subCategory', 'incident_incidentDate', 'incident_incidentTime',
            'incident_location', 'incident_description', 'incident_district'
        ];
        
        const missingFields = requiredFields.filter(field => !body[field] || body[field].trim() === '');
        if (missingFields.length > 0) {
            // Clean up uploaded files if validation fails
            Object.values(uploadedFiles).forEach(fileArray => {
                if (fileArray) {
                    fileArray.forEach(file => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                }
            });
            
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                missingFields: missingFields
            });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.complainant_email)) {
            // Clean up files
            Object.values(uploadedFiles).forEach(fileArray => {
                if (fileArray) {
                    fileArray.forEach(file => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                }
            });
            
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }
        
        // Mobile validation (10 digits)
        const mobileRegex = /^\d{10}$/;
        if (!mobileRegex.test(body.complainant_mobile) || !mobileRegex.test(body.victim_contactNumber)) {
            // Clean up files
            Object.values(uploadedFiles).forEach(fileArray => {
                if (fileArray) {
                    fileArray.forEach(file => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                }
            });
            
            return res.status(400).json({
                success: false,
                error: 'Mobile numbers must be exactly 10 digits'
            });
        }
        
        // Date validation (not in future)
        const incidentDate = new Date(body.incident_incidentDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        if (incidentDate > today) {
            // Clean up files
            Object.values(uploadedFiles).forEach(fileArray => {
                if (fileArray) {
                    fileArray.forEach(file => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                }
            });
            
            return res.status(400).json({
                success: false,
                error: 'Incident date cannot be in the future'
            });
        }
        
        // ============ GENERATE TRACKING ID ============
        
        const currentYear = new Date().getFullYear();
        const trackingId = await Complaint.generateTrackingId(currentYear);
        
        // ============ PREPARE COMPLAINT DATA ============
        
        const complaintData = {
            // Tracking
            trackingId: trackingId,
            status: 'submitted',
            priority: body.urgencyLevel === 'urgent' ? 'high' : 
                     body.urgencyLevel === 'critical' ? 'critical' : 'normal',
            
            // Complainant Information
            complainant: {
                fullName: body.complainant_fullName.trim(),
                fatherName: body.complainant_fatherName.trim(),
                age: parseInt(body.complainant_age),
                gender: body.complainant_gender,
                mobile: body.complainant_mobile.trim(),
                email: body.complainant_email.trim().toLowerCase(),
                address: {
                    street: body.complainant_street ? body.complainant_street.trim() : null,
                    city: body.complainant_city ? body.complainant_city.trim() : null,
                    district: body.complainant_district.trim(),
                    state: body.complainant_state ? body.complainant_state.trim() : 'Delhi',
                    pincode: body.complainant_pincode ? body.complainant_pincode.trim() : null
                },
                occupation: body.complainant_occupation ? body.complainant_occupation.trim() : null,
                relationToVictim: body.complainant_relationToVictim || 'self'
            },
            
            // Victim Information
            victim: {
                fullName: body.victim_fullName.trim(),
                fatherName: body.victim_fatherName ? body.victim_fatherName.trim() : null,
                age: body.victim_age ? parseInt(body.victim_age) : null,
                gender: body.victim_gender || null,
                caste: body.victim_caste ? body.victim_caste.trim() : null,
                religion: body.victim_religion ? body.victim_religion.trim() : null,
                occupation: body.victim_occupation ? body.victim_occupation.trim() : null,
                address: {
                    street: body.victim_street ? body.victim_street.trim() : null,
                    city: body.victim_city ? body.victim_city.trim() : null,
                    district: body.victim_district ? body.victim_district.trim() : null,
                    state: body.victim_state ? body.victim_state.trim() : null,
                    pincode: body.victim_pincode ? body.victim_pincode.trim() : null
                },
                contactNumber: body.victim_contactNumber.trim(),
                sameAsComplainant: body.sameAsComplainant === 'true' || body.sameAsComplainant === true
            },
            
            // Incident Details
            incident: {
                category: body.incident_category.trim(),
                subCategory: body.incident_subCategory ? body.incident_subCategory.trim() : null,
                incidentDate: incidentDate,
                incidentTime: body.incident_incidentTime.trim(),
                location: {
                    type: 'Point',
                    coordinates: [0, 0], // Default coordinates, can be updated later
                    address: {
                        street: body.incident_location.trim(),
                        city: body.incident_city ? body.incident_city.trim() : null,
                        district: body.incident_district ? body.incident_district.trim() : null,
                        state: body.incident_state ? body.incident_state.trim() : null,
                        pincode: body.incident_pincode ? body.incident_pincode.trim() : null
                    }
                },
                description: body.incident_description.trim(),
                policeStation: body.incident_policeStation ? body.incident_policeStation.trim() : null,
                firNumber: body.incident_firNumber ? body.incident_firNumber.trim() : null,
                firDate: body.incident_firDate ? new Date(body.incident_firDate) : null
            },
            
            // Additional Information
            witnesses: body.witnesses ? body.witnesses.trim() : null,
            previousComplaints: body.previousComplaints ? body.previousComplaints.trim() : null,
            legalAction: body.legalAction ? body.legalAction.trim() : null,
            medicalTreatment: body.medicalTreatment ? body.medicalTreatment.trim() : null,
            financialLoss: body.financialLoss ? body.financialLoss.trim() : null,
            otherDetails: body.otherDetails ? body.otherDetails.trim() : null,
            
            // Documents
            documents: {
                policeReport: uploadedFiles.policeReport ? uploadedFiles.policeReport.map(f => f.filename) : [],
                medicalReports: uploadedFiles.medicalReports ? uploadedFiles.medicalReports.map(f => f.filename) : [],
                photos: uploadedFiles.photos ? uploadedFiles.photos.map(f => f.filename) : [],
                videos: uploadedFiles.videos ? uploadedFiles.videos.map(f => f.filename) : [],
                otherDocuments: uploadedFiles.otherDocuments ? uploadedFiles.otherDocuments.map(f => f.filename) : []
            },
            
            // Metadata
            submittedAt: new Date(),
            ipAddress: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || 'unknown'
        };
        
        // ============ SAVE TO DATABASE ============
        
        const complaint = new Complaint(complaintData);
        await complaint.save();
        
        console.log(`[COMPLAINT] New complaint submitted: ${trackingId} by ${body.complainant_fullName}`);
        
        // ============ SUCCESS RESPONSE ============
        
        res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully',
            trackingId: trackingId,
            complaintId: complaint._id.toString(),
            status: 'submitted',
            submittedAt: complaint.submittedAt,
            nextSteps: [
                'Your complaint has been registered with tracking ID: ' + trackingId,
                'You will receive updates via email and SMS',
                'Save this tracking ID for future reference',
                'You can check complaint status at: /complaint-status/' + trackingId
            ]
        });
        
    } catch (error) {
        console.error('[POST /api/complaints] Error:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                if (fileArray) {
                    fileArray.forEach(file => {
                        if (fs.existsSync(file.path)) {
                            try {
                                fs.unlinkSync(file.path);
                            } catch (unlinkError) {
                                console.error('Error cleaning up file:', unlinkError);
                            }
                        }
                    });
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to submit complaint',
            message: error.message || 'An unexpected error occurred'
        });
    }
});

// ============ END COMPLAINT SUBMISSION API ============

// Ensure required folders exist at startup
const foldersToCreate = [
    path.join(__dirname, 'public', 'pdfs'),
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'public', 'uploads')
];

foldersToCreate.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log('✅ Created folder:', folder);
    }
});

// Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ============================================
    🚀 RMAS National Server is LIVE
    🌐 URL: http://localhost:${PORT}
    📂 Environment: ${process.env.NODE_ENV}
    ============================================
    `);
    console.log('Using BREVO_API_KEY length', (process.env.BREVO_API_KEY||'').length);
    console.log('Using SENDER_EMAIL', process.env.SENDER_EMAIL);
});