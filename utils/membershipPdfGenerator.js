const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const htmlPdf = require('html-pdf');
const QRCode = require('qrcode');
const Member = require('../models/Member');

// Helper to read file as base64
function safeBase64FromFile(paths) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p).toString('base64');
      }
    } catch (e) {
      // ignore
    }
  }
  return '';
}

// Get Noto Sans Devanagari font as base64
function getNotoFontBase64() {
  const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'noto_sans_devanagari.ttf');
  if (fs.existsSync(fontPath)) {
    return fs.readFileSync(fontPath).toString('base64');
  }
  return '';
}

function getJurisdiction(member) {
  const level = ((member.assignedRoles && member.assignedRoles[0] && member.assignedRoles[0].level) || member.level || '').toString().trim().toLowerCase();
  const locationName = ((member.assignedRoles && member.assignedRoles[0] && member.assignedRoles[0].location) || member.district || member.state || '').toString().trim();
  const districtName = (member.district || (member.assignedRoles && member.assignedRoles[0] && member.assignedRoles[0].district) || '').toString().trim();

  switch (level) {
    case 'national':
      return 'All India';
    case 'state':
    case 'pradesh':
      return locationName ? `All ${locationName}` : 'All India';
    case 'division':
      return locationName ? `All ${locationName}` : 'All India';
    case 'district':
      return locationName ? `All ${locationName}` : 'All India';
    case 'block':
    case 'panchayat':
      return districtName ? `All ${districtName}` : (locationName ? `All ${locationName}` : 'All India');
    default:
      return 'All India';
  }
}

// Create PDF using html-pdf
function createPdf(pdfHtml, pdfPath, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      format: 'A4',
      orientation: 'portrait',
      border: '10mm',
      type: 'pdf',
      quality: '100',
      renderDelay: 1000,
      phantomArgs: ['--ignore-ssl-errors=true', '--ssl-protocol=any', '--web-security=false', '--local-url-access=true']
    };
    const finalOptions = Object.assign({}, defaultOptions, options);
    htmlPdf.create(pdfHtml, finalOptions).toFile(pdfPath, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

// Main function to generate unified membership PDF
async function generateMembershipPdf(memberOrId) {
  try {
    let member = null;

    if (!memberOrId) {
      throw new Error('Member ID or object is required');
    }

    if (typeof memberOrId === 'string') {
      member = await Member.findById(memberOrId);
    } else if (typeof memberOrId === 'object') {
      member = memberOrId;
    }

    if (!member) {
      throw new Error('Member not found');
    }

    if (member.status !== 'approved' && member.status !== 'accepted') {
      throw new Error(`Member not approved. Status: ${member.status}`);
    }

    console.log('📄 Generating unified PDF for:', member.fullName);

    // ========== PREPARE DATA ==========
    
    // Get organization logo
    const rmasLogo = safeBase64FromFile([
      path.join(__dirname, '..', 'public', 'images', 'logo.jpeg'),
      path.join(__dirname, '..', 'public', 'images', 'logo.jpg'),
      path.join(__dirname, '..', 'public', 'images', 'logo.png')
    ]);

    // Get member photo
    let memberPhoto = '';
    if (member.photo) {
      if (typeof member.photo === 'string' && member.photo.startsWith('data:')) {
        memberPhoto = member.photo.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      } else {
        const normalized = member.photo.replace(/^[\\/]+/, '');
        const pathsToTry = [
          path.join(__dirname, '..', 'public', normalized),
          path.join(__dirname, '..', 'public', 'uploads', normalized),
          path.join(__dirname, '..', 'uploads', normalized),
          path.join(__dirname, '..', normalized)
        ];
        for (const p of pathsToTry) {
          if (fs.existsSync(p)) {
            memberPhoto = fs.readFileSync(p).toString('base64');
            break;
          }
        }
      }
    }

    // Get stamp image
    const stampBase64 = safeBase64FromFile([
      path.join(__dirname, '..', 'public', 'images', 'stamp.png'),
      path.join(__dirname, '..', 'public', 'images', 'stamp.jpeg')
    ]);

    // Generate QR code
    const qrBaseUrl = process.env.BASE_URL || 'https://rmas.org.in';
    const qrCodeDataURL = await QRCode.toDataURL(`${qrBaseUrl}/verify/${member.membershipId}`);

    // ========== BUILD DESIGNATION ==========
    let levelName = '';
    let roleName = '';
    let locationName = '';
    let level = '';

    if (member.assignedRoles && member.assignedRoles[0]) {
      const ar = member.assignedRoles[0];
      level = ar.level;
      locationName = ar.location || '';
      
      if (ar.level === 'state' || ar.level === 'pradesh') levelName = 'State';
      else if (ar.level === 'division') levelName = 'Division';
      else if (ar.level === 'district') levelName = 'District';
      else if (ar.level === 'block') levelName = 'Block';
      else levelName = ar.level || '';
      
      roleName = ar.roleName || ar.role || '';
    } else {
      levelName = member.level || '';
      roleName = member.role || member.jobRole || '';
      locationName = member.district || member.state || '';
    }

    // Map Hindi roles to English
    const englishRoleMap = {
      'अध्यक्ष': 'President',
      'उपाध्यक्ष': 'Vice President',
      'वरिष्ठ उपाध्यक्ष': 'Senior Vice President',
      'महासचिव': 'General Secretary',
      'सचिव': 'Secretary',
      'संगठन सचिव': 'Organization Secretary',
      'संयुक्त सचिव': 'Joint Secretary',
      'विधि सचिव': 'Legal Secretary',
      'कोषाध्यक्ष': 'Treasurer',
      'आईटी सेल प्रभारी': 'IT Cell Incharge',
      'मीडिया प्रभारी': 'Media Incharge',
      'मीडिया सचिव': 'Media Secretary',
      'प्रचार सचिव': 'Publicity Secretary',
      'प्रेस सचिव': 'Press Secretary',
      'प्रवक्ता': 'Spokesperson',
      'युवा समन्वयक': 'Youth Coordinator',
      'महिला समन्वयक': 'Women Coordinator',
      'अल्पसंख्यक समन्वयक': 'Minority Coordinator',
      'SC/ST समन्वयक': 'SC/ST Coordinator',
      'जाँच दल सदस्य': 'Investigation Team Member'
    };

    if (englishRoleMap[roleName]) {
      roleName = englishRoleMap[roleName];
    }

    let designation = '';
    if (level === 'state' || level === 'pradesh') {
      designation = (levelName ? levelName + ' ' : '') + roleName;
    } else if (level === 'division' || level === 'district' || level === 'block') {
      designation = (locationName ? locationName + ' ' : '') + roleName;
    } else {
      designation = (levelName ? levelName + ' ' : '') + (locationName ? locationName + ' ' : '') + roleName;
    }
    designation = designation || 'Member';

    // ========== DATES ==========
    const issueDate = new Date();
    const issueDay = String(issueDate.getDate()).padStart(2, '0');
    const issueMonth = String(issueDate.getMonth() + 1).padStart(2, '0');
    const issueYear = issueDate.getFullYear();
    const issuedOn = `${issueDay}/${issueMonth}/${issueYear}`;

    const validUpto = new Date(issueDate);
    validUpto.setFullYear(issueDate.getFullYear() + 1);
    const validUptoStr = validUpto.toLocaleDateString('en-GB');

    let dobStr = 'N/A';
    if (member.dob) {
      try {
        dobStr = new Date(member.dob).toLocaleDateString('en-GB');
      } catch (e) {
        dobStr = member.dob;
      }
    }

    const jurisdiction = getJurisdiction(member);

    // ========== BUILD HTML ==========
    const html = `
<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<title>RMAS Membership Kit</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet">
<style>
    @font-face {
      font-family: 'Noto Sans Devanagari';
      src: url('data:font/ttf;base64,<%= notoFontBase64 %>') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Noto Sans Devanagari';
      src: url('data:font/ttf;base64,<%= notoFontBase64 %>') format('truetype');
      font-weight: 700;
      font-style: normal;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Noto Sans Devanagari', sans-serif;
      background: #fff;
      font-size: 11px;
      line-height: 1.4;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto 20px;
      padding: 0;
      page-break-after: always;
      background: #fff;
    }

    .page:last-child {
      page-break-after: auto;
    }

    /* ========== WEBSITE HEADER ========== */
    .pdf-header {
      position: relative;
      color: #fff;
      padding: 0;
      height: 50px;
      overflow: hidden;
    }

    .pdf-header-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    .pdf-header > * {
      position: relative;
      z-index: 1;
    }

    .pdf-slogan {
      display: flex;
      justify-content: space-between;
      padding: 2px 15px;
      font-size: 9px;
      background: rgba(0,0,0,0.1);
    }

    .pdf-main-header {
      display: flex;
      align-items: center;
      padding: 5px 15px;
      height: 38px;
    }

    .pdf-logo img {
      height: 28px;
      margin-right: 10px;
    }

    .pdf-org-name {
      flex: 1;
      text-align: center;
    }

    .pdf-org-name h1 {
      font-size: 16px;
      line-height: 1.2;
    }

    .pdf-reg-num {
      font-size: 8px;
      text-align: right;
      line-height: 1.2;
    }

    .pdf-org-address {
      text-align: center;
      font-size: 9px;
      font-weight: bold;
      color: #000;
      padding: 2px 15px;
      background: #f5f5f5;
    }

    /* ========== PAGE 1: ID CARD (FRONT + BACK) ========== */
    .id-card-section {
      padding: 15px;
    }

    .id-card-section h2 {
      text-align: center;
      color: #2b235f;
      margin-bottom: 15px;
      font-size: 14px;
    }

    .id-cards-container {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-top: 10px;
    }

    .id-card {
      width: 54mm;
      height: 85.6mm;
      border: 1px solid #000;
      display: flex;
      flex-direction: column;
      background: #fff;
      position: relative;
      overflow: hidden;
    }

    .id-card::before {
      content: '';
      position: absolute;
      top: 60%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 25mm;
      height: 25mm;
      background-image: url('data:image/png;base64,<%= rmasLogo %>');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.1;
      z-index: 0;
      pointer-events: none;
    }

    .id-card > * {
      position: relative;
      z-index: 1;
    }

    .id-header {
      position: relative;
      color: #fff;
      padding: 1mm;
      font-size: 2mm;
      font-weight: bold;
    }

    .id-header-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
    }

    .id-slogan {
      display: flex;
      justify-content: space-between;
      font-size: 1.3mm;
      margin-bottom: 0.2mm;
    }

    .id-main-header {
      display: grid;
      grid-template-columns: 5mm 1fr 8mm;
      align-items: center;
    }

    .id-main-header img {
      height: 3mm;
    }

    .id-main-header .title {
      font-size: 2mm;
      text-align: center;
    }

    .id-main-header .reg-num {
      font-size: 1.2mm;
      text-align: right;
    }

    .id-org-address-small {
      font-size: 2mm;
      text-align: center;
      font-weight: bold;
      color: #000;
      padding: 0;
    }

    .id-photo-box {
      text-align: center;
      margin-top: 1mm;
      position: relative;
    }

    .id-photo-box img {
      width: 20mm;
      height: 20mm;
      border: 1px solid #000;
      object-fit: cover;
    }

    .id-stamp {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 6mm;
      height: 6mm;
      border-radius: 50%;
    }

    .id-details {
      padding: 1.5mm;
      font-size: 2.2mm;
      flex: 1;
    }

    .id-field {
      margin-bottom: 0.5mm;
    }

    .id-label {
      font-weight: bold;
      color: rgb(1,0,102);
    }

    .id-value {
      margin-left: 1mm;
    }

    .id-official {
      text-align: center;
      font-size: 1.8mm;
      margin-top: 0.5mm;
      font-weight: bold;
    }

    .id-footer {
      background: rgb(254,0,0);
      color: #fff;
      text-align: center;
      font-size: 2mm;
      padding: 0.5mm;
    }

    /* Back side */
    .id-card-back {
      border: 1px solid #000;
    }

    .id-back-header {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgb(1,0,102);
      color: #fff;
      font-size: 2mm;
      font-weight: bold;
      padding: 1mm;
    }

    .id-back-content {
      padding: 2mm;
      font-size: 2.2mm;
    }

    .id-back-field {
      margin-bottom: 1mm;
    }

    .id-back-qr {
      display: flex;
      justify-content: center;
      margin-top: 2mm;
    }

    .id-back-qr img {
      width: 22mm;
      height: 22mm;
    }

    .id-back-qr-text {
      text-align: center;
      font-size: 1.5mm;
      margin: 0.5mm 0;
      font-weight: bold;
    }

    .id-back-disclaimer {
      border: 0.5px solid #000;
      padding: 1mm;
      margin: 1mm 0;
      font-size: 1.3mm;
      line-height: 1.2;
      text-align: center;
    }

    .id-back-footer {
      background: rgb(254,0,0);
      color: #fff;
      text-align: center;
      font-size: 1.8mm;
      padding: 0.5mm;
    }

    /* ========== PAGE 2: REGISTRATION CERTIFICATE ========== */
    .registration-section {
      padding: 15px;
    }

    .registration-section h2 {
      text-align: center;
      color: #2b235f;
      margin-bottom: 15px;
      font-size: 14px;
    }

    .reg-content {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }

    .reg-photo {
      width: 100px;
      height: 120px;
      border: 2px solid #2b235f;
      object-fit: cover;
    }

    .reg-details {
      flex: 1;
    }

    .reg-row {
      display: flex;
      margin-bottom: 6px;
      border-bottom: 1px solid #eee;
      padding-bottom: 3px;
    }

    .reg-label {
      font-weight: bold;
      width: 120px;
      color: #2b235f;
    }

    .reg-value {
      flex: 1;
    }

    .reg-address {
      margin-bottom: 10px;
    }

    .reg-dates {
      margin-bottom: 15px;
    }

    .reg-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 15px;
    }

    .reg-signature {
      width: 180px;
      text-align: center;
    }

    .reg-signature-line {
      border-top: 1px solid #000;
      font-size: 9px;
      margin-top: 5px;
    }

    .org-info {
      text-align: center;
      margin-top: 20px;
      font-size: 9px;
      color: #666;
    }
</style>
</head>
<body>

<!-- ========== PAGE 1: ID CARD (FRONT + BACK) ========== -->
<div class="page">
    <div class="pdf-header">
        <svg class="pdf-header-bg" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 830 50" preserveAspectRatio="none">
            <polygon points="0,0 830,0 0,50" fill="#2b235f" />
            <polygon points="0,50 830,0 830,50" fill="#d92523" />
        </svg>
        <div class="pdf-slogan">
            <span>मानव हित सर्वोपरि</span>
            <span>सत्यमेव जयते</span>
            <span>न्याय ही धर्म है</span>
        </div>
        <div class="pdf-main-header">
            <div class="pdf-logo">
                <img src="data:image/png;base64,<%= rmasLogo %>">
            </div>
            <div class="pdf-org-name">
                <h1>राष्ट्रीय मानवाधिकार संगठन</h1>
            </div>
            <div class="pdf-reg-num">
                पंजीकरण<br>4120/2020
            </div>
        </div>
    </div>
    <div class="pdf-org-address">
        D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara Delhi-94
    </div>

    <div class="id-card-section">
        <h2>Official Member Identity Card</h2>
        
        <div class="id-cards-container">
            <!-- FRONT SIDE -->
            <div class="id-card">
                <div class="id-header">
                    <svg class="id-header-bg" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 830 40" preserveAspectRatio="none">
                        <polygon points="0,0 830,0 0,40" fill="#2b235f" />
                        <polygon points="0,40 830,0 830,40" fill="#d92523" />
                    </svg>
                    <div class="id-slogan">
                        <span>मानव हित</span>
                        <span>सत्यमेव</span>
                        <span>न्याय धर्म</span>
                    </div>
                    <div class="id-main-header">
                        <img src="data:image/png;base64,<%= rmasLogo %>">
                        <div class="title">राष्ट्रीय मानवाधिकार संगठन</div>
                        <div class="reg-num">4120/2020</div>
                    </div>
                </div>

                <div class="id-org-address-small">
                    D-2, Shahdara Delhi-94
                </div>

                <div class="id-photo-box">
                    <img src="data:image/jpeg;base64,<%= memberPhoto %>">
                    <% if (stampBase64) { %>
                    <img src="data:image/png;base64,<%= stampBase64 %>" class="id-stamp">
                    <% } %>
                </div>

                <div class="id-details">
                    <div class="id-field">
                        <span class="id-label">Name:</span>
                        <span class="id-value"><%= member.fullName %></span>
                    </div>

                    <div class="id-field">
                        <span class="id-label">Father:</span>
                        <span class="id-value"><%= member.fatherName %></span>
                    </div>

                    <div class="id-field">
                        <span class="id-label">Designation:</span>
                        <span class="id-value"><%= designation %></span>
                    </div>

                    <div class="id-field">
                        <span class="id-label">DOB:</span>
                        <span class="id-value"><%= dob %></span>
                    </div>

                    <div class="id-field">
                        <span class="id-label">Blood:</span>
                        <span class="id-value"><%= member.bloodGroup || 'N/A' %></span>
                    </div>

                    <div class="id-field">
                        <span class="id-label">Jurisdiction:</span>
                        <span class="id-value"><%= jurisdiction || 'All India' %></span>
                    </div>

                    <div class="id-field">
                        <span class="id-label">Issued:</span>
                        <span class="id-value"><%= issuedOn %></span>
                    </div>

                    <div class="id-official">
                        Official Member Identity Card
                    </div>
                </div>

                <div class="id-footer">
                    ID: <%= member.membershipId %>
                </div>
            </div>

            <!-- BACK SIDE -->
            <div class="id-card id-card-back">
                <div class="id-back-header">
                    Rashtriya Manav Adhikar Sangathan
                </div>

                <div class="id-back-content">
                    <div class="id-back-field">
                        <span class="id-label">Mobile:</span>
                        <span class="id-value"><%= member.mobile %></span>
                    </div>

                    <div class="id-back-field">
                        <span class="id-label">Email:</span>
                        <span class="id-value"><%= member.email || 'N/A' %></span>
                    </div>

                    <div class="id-back-field">
                        <span class="id-label">Address:</span>
                        <span class="id-value">
                            <%= member.houseNo || '' %><%= member.houseNo ? ', ' : '' %><%= member.street || '' %>, <%= member.village || '' %>, <%= member.district %>, <%= member.state %>
                        </span>
                    </div>

                    <div class="id-back-field">
                        <span class="id-label">Valid Upto:</span>
                        <span class="id-value"><%= validUpto %></span>
                    </div>

                    <div class="id-back-qr">
                        <img src="<%= qrCodeDataURL %>">
                    </div>
                    <div class="id-back-qr-text">
                        Scan to Verify
                    </div>
                    <div class="id-back-disclaimer">
                        <div>Issued to member only.</div>
                        <div>Misuse may lead to cancellation.</div>
                        <div>Association not responsible for illegal activity.</div>
                    </div>
                </div>

                <div class="id-back-footer">
                    Authorized ID Card
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ========== PAGE 2: REGISTRATION CERTIFICATE ========== -->
<div class="page">
    <div class="pdf-header">
        <svg class="pdf-header-bg" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 830 50" preserveAspectRatio="none">
            <polygon points="0,0 830,0 0,50" fill="#2b235f" />
            <polygon points="0,50 830,0 830,50" fill="#d92523" />
        </svg>
        <div class="pdf-slogan">
            <span>मानव हित सर्वोपरि</span>
            <span>सत्यमेव जयते</span>
            <span>न्याय ही धर्म है</span>
        </div>
        <div class="pdf-main-header">
            <div class="pdf-logo">
                <img src="data:image/png;base64,<%= rmasLogo %>">
            </div>
            <div class="pdf-org-name">
                <h1>राष्ट्रीय मानवाधिकार संगठन</h1>
            </div>
            <div class="pdf-reg-num">
                पंजीकरण<br>4120/2020
            </div>
        </div>
    </div>
    <div class="pdf-org-address">
        D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara Delhi-94
    </div>

    <div class="registration-section">
        <h2>Membership Registration Certificate</h2>

        <div class="reg-content">
            <img src="data:image/jpeg;base64,<%= memberPhoto %>" class="reg-photo" alt="Photo">
            
            <div class="reg-details">
                <div class="reg-row">
                    <span class="reg-label">Name:</span>
                    <span class="reg-value"><%= member.fullName %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">Father/Husband:</span>
                    <span class="reg-value"><%= member.fatherName %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">Date of Birth:</span>
                    <span class="reg-value"><%= dob %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">Gender:</span>
                    <span class="reg-value"><%= member.gender %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">Mobile:</span>
                    <span class="reg-value"><%= member.mobile %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">Email:</span>
                    <span class="reg-value"><%= member.email || 'N/A' %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">Blood Group:</span>
                    <span class="reg-value"><%= member.bloodGroup || 'N/A' %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">Designation:</span>
                    <span class="reg-value"><%= designation %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">Membership ID:</span>
                    <span class="reg-value"><%= member.membershipId %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">State:</span>
                    <span class="reg-value"><%= member.state %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">District:</span>
                    <span class="reg-value"><%= member.district %></span>
                </div>
                <div class="reg-row">
                    <span class="reg-label">Block:</span>
                    <span class="reg-value"><%= member.block %></span>
                </div>
            </div>
        </div>

        <div class="reg-address">
            <strong>Address:</strong> 
            <%= member.houseNo || '' %><%= member.houseNo ? ', ' : '' %><%= member.street || '' %><%= member.street ? ', ' : '' %><%= member.village || '' %><%= member.village ? ', ' : '' %><%= member.district %>, <%= member.state %> - <%= member.pincode || 'N/A' %>
        </div>

        <div class="reg-dates">
            <strong>Issued On:</strong> <%= issuedOn %> &nbsp;&nbsp;|&nbsp;&nbsp; 
            <strong>Valid Upto:</strong> <%= validUpto %>
        </div>

        <div class="reg-footer">
            <div></div>
            <div class="reg-signature">
                <div style="font-size: 11px; font-weight: bold; color: #2b235f;">Authorized Signature</div>
                <div class="reg-signature-line">Secretary / President</div>
            </div>
        </div>

        <div class="org-info">
            <p>D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara, Delhi-94</p>
            <p>Website: www.rmas.org.in | Email: info@rmas.org.in</p>
        </div>
    </div>
</div>

</body>
</html>
    `;

    // Render the HTML
    const renderedHtml = ejs.render(html, {
      member,
      rmasLogo,
      memberPhoto,
      stampBase64,
      qrCodeDataURL,
      designation,
      jurisdiction,
      dob: dobStr,
      issuedOn,
      validUpto: validUptoStr,
      notoFontBase64: getNotoFontBase64()
    });

    // Create output directory
    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Generate PDF filename
    const pdfFilename = `membership_kit_${(member.membershipId || 'unknown').replace(/\//g, '_')}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);

    // Generate PDF
    await createPdf(renderedHtml, pdfPath, { format: 'A4', orientation: 'portrait', border: '0' });

    console.log('✅ Membership PDF generated:', pdfPath);

    // Update member record
    if (member && typeof member.save === 'function') {
      member.idCardUrl = `/pdfs/${pdfFilename}`;
      member.history = member.history || [];
      member.history.push({
        by: null,
        role: 'system',
        action: 'membership_pdf_generated',
        note: 'Unified membership PDF generated',
        timestamp: new Date()
      });
      await member.save();
    }

    return `/pdfs/${pdfFilename}`;
  } catch (error) {
    console.error('❌ Error generating membership PDF:', error);
    throw error;
  }
}

module.exports = { generateMembershipPdf };