const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { getBilingualDesignation } = require('./roleDisplay');
const { formatDOB, formatDateHindi, toTitleCase } = require('./dateUtils');

async function generateJoiningLetter(member) {
  let browser = null;
  try {
    console.log('🔍 Generating joining letter for:', member.fullName);

    if (!member || member.status !== 'approved') {
      throw new Error('Member not approved');
    }

    // Generate QR code
    const baseUrl = process.env.BASE_URL || 'https://rmas.org.in';
    const verifyUrl = `${baseUrl}/v/${member.membershipId}`;
    const qrCodeDataURL = await QRCode.toDataURL(verifyUrl);

    // Load images as base64
    let logoBase64 = '';
    let memberPhotoBase64 = '';
    let stampBase64 = '';
    let signatureBase64 = '';

    try {
      const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpeg');
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch(e) { console.warn('Logo load failed:', e.message); }

    try {
      const isDataUri = typeof member.photo === 'string' && member.photo.startsWith('data:');
      if (isDataUri) {
        memberPhotoBase64 = member.photo.split(',')[1];
      } else if (member.photo) {
        const photoFilename = member.photo.replace(/^\//, '');
        const pathsToTry = [
          path.join(__dirname, '..', 'public', photoFilename),
          path.join(__dirname, '..', 'public', 'uploads', photoFilename),
          path.join(__dirname, '..', 'uploads', photoFilename),
          path.join(__dirname, '..', photoFilename)
        ];
        for (const p of pathsToTry) {
          if (fs.existsSync(p)) {
            memberPhotoBase64 = fs.readFileSync(p).toString('base64');
            break;
          }
        }
      }
    } catch(e) { console.warn('Member photo load failed:', e.message); }

    try {
      const stampPath = path.join(__dirname, '..', 'public', 'images', 'stamp.png');
      if (fs.existsSync(stampPath)) {
        stampBase64 = fs.readFileSync(stampPath).toString('base64');
      }
    } catch(e) { console.warn('Stamp load failed:', e.message); }

    try {
      const sigPath = path.join(__dirname, '..', 'public', 'images', 'signature.png');
      if (fs.existsSync(sigPath)) {
        signatureBase64 = fs.readFileSync(sigPath).toString('base64');
      }
    } catch(e) { console.warn('Signature load failed:', e.message); }

    // Prepare data
    const designation = getBilingualDesignation(member);
    const formattedDOB = formatDOB(member.dob);
    const memberName = toTitleCase(member.fullName || '');
    const fatherName = toTitleCase(member.fatherName || member.guardianName || '');

    const issueDateHindi = formatDateHindi(new Date());
    const today = new Date();
    const validUpto = new Date(today);
    validUpto.setFullYear(today.getFullYear() + 1);
    const validDate = validUpto.toLocaleDateString('en-GB');
    const dateStr = today.toLocaleDateString('en-IN');

    const address = `${member.houseNo || ''}, ${member.street || ''}, ${member.village || ''}, ${member.district || ''}, ${member.state || ''}, ${member.pincode || ''}`.replace(/^,\s*/, '').trim();

    const htmlContent = `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>RMAS - Joining Letter</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 0; }
        html, body {
          width: 210mm;
          height: 297mm;
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          color: #222;
          -webkit-print-color-adjust: exact;
        }
        .container {
          box-sizing: border-box;
          width: 100%;
          margin: 0;
          padding: 0;
          position: relative;
        }
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120mm;
          height: 120mm;
          opacity: 0.08;
          z-index: 0;
          pointer-events: none;
        }
        .watermark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .letter-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 210mm;
          height: 30mm;
          min-height: 30mm;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          padding-left: 4mm;
          padding-right: 4mm;
          gap: 8px;
          background: transparent;
          color: #fff;
          z-index: 9999;
        }
        .letter-header .bg-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 210mm;
          height: 30mm;
          z-index: 0;
          pointer-events: none;
        }
        .letter-header .header-content { 
          position: relative; 
          z-index: 1; 
          display: flex; 
          flex-direction: column; 
          justify-content: center; 
          width: 100%; 
          height: 100%; 
          color: #fff; 
        }
        .slogan-strip {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: calc(30mm * 0.08);
          line-height: 1;
          margin-bottom: 1mm;
          color: #fff;
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
        }
        .slogan-left, .slogan-center, .slogan-right { 
          flex: 1; 
          text-align: center; 
        }
        .main-header {
          display: grid;
          grid-template-columns: 20mm 1fr 30mm;
          align-items: center;
          gap: 4mm;
          width: 100%;
        }
        .main-header img { 
          height: calc(30mm - 10mm); 
          width: auto;
          object-fit: contain;
        }
        .main-header .title {
          text-align: center;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .title-hin { 
          font-size: calc(30mm * 0.22); 
          font-weight: 700; 
          line-height: 1;
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
        }
        .title-eng { 
          font-size: calc(30mm * 0.12); 
          margin-top: 0.5mm; 
          opacity: 0.95; 
        }
        .registration {
          font-size: calc(30mm * 0.11);
          text-align: right;
          line-height: 1;
          color: #fff;
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
        }
        .logo { 
          flex: 0 0 auto; 
          height: calc(30mm - 10mm); 
          display: flex; 
          align-items: center; 
        }
        .logo img { 
          max-height: 100%; 
          height: 100%; 
          width: auto; 
          object-fit: contain; 
          border-radius: 2px; 
        }
        .body-wrapper { 
          margin-top: calc(30mm + 5mm); 
          margin-left: 25mm; 
          margin-right: 25mm; 
          margin-bottom: 0; 
        }
        .doc-meta { 
          display: flex; 
          justify-content: space-between; 
          margin: 0 0 18px 0; 
          font-size: 12.5px; 
          border-top: none; 
          padding-top: 0; 
        }
        .doc-meta .left, .doc-meta .right { 
          width: 48%; 
        }
        .doc-meta .right { 
          text-align: right; 
        }
        .member-form-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          line-height: 1.8;
          margin: 12px 0;
          table-layout: fixed;
        }
        .member-form-table td {
          padding: 8px 0;
          vertical-align: top;
        }
        .member-form-table .form-label {
          font-weight: 600;
          color: #333;
          white-space: nowrap;
          width: 24%;
          padding-right: 16px;
          text-align: left;
        }
        .member-form-table .form-value {
          border-bottom: 1px solid #000;
          padding: 0 4px 0 20px;
          color: #111;
          width: 22%;
          min-height: 1.2em;
        }
        .member-form-table .form-number {
          width: 4%;
          text-align: right;
          font-weight: 600;
          color: #333;
          padding-right: 5px;
          vertical-align: top;
        }
        .member-form-table .form-value-long {
          border-bottom: 1px solid #000;
          padding: 0 4px 0 12px;
          color: #111;
          width: 70%;
          min-height: 1.2em;
        }
        .member-photo-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 16px;
          margin-bottom: 16px;
        }
        .photo-stamp-container {
          text-align: center;
        }
        .photo-wrapper {
          position: relative;
          display: inline-block;
          width: 90px;
          height: 110px;
        }
        .photo-wrapper img.member-photo {
          width: 90px;
          height: 110px;
          object-fit: cover;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .photo-wrapper img.stamp-overlay {
          position: absolute;
          bottom: -10px;
          right: -10px;
          width: 55px;
          height: 55px;
          object-fit: contain;
          opacity: 0.85;
        }
        .member-name-below {
          margin-top: 8px;
          font-weight: 600;
          font-size: 12px;
          color: #222;
        }
        .subject-center {
          flex: 1;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .subject-center .subject-inline {
          font-weight: 700;
          font-size: 16px;
          text-transform: uppercase;
        }
        .subject-center .subject-inline .hin {
          display: block;
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
          font-weight: 600;
          margin-top: 4px;
          text-transform: none;
        }
        .qr-section {
          text-align: center;
        }
        .qr-section img {
          width: 90px;
          height: 110px;
          object-fit: contain;
          border: 1px solid #e6e6e6;
          border-radius: 4px;
          background: #fff;
          padding: 4px;
        }
        .qr-section .scan-text {
          margin-top: 8px;
          font-size: 11px;
          font-weight: 600;
          color: #333;
        }
        .terms {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.6;
        }
        .terms strong {
          font-weight: 700;
          display: block;
          margin-bottom: 8px;
        }
        .terms ol {
          margin: 6px 0 0 18px;
          padding: 0;
        }
        .terms li {
          margin-bottom: 6px;
          text-align: justify;
        }
        .hindi-terms-first {
          font-size: 13px;
          margin-top: 10px;
          line-height: 1.6;
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
        }
        .hindi-terms-first strong {
          font-weight: 700;
          display: block;
          margin-bottom: 8px;
        }
        .hindi-terms-first ol {
          margin: 6px 0 0 18px;
          padding: 0;
        }
        .hindi-terms-first li {
          margin-bottom: 6px;
          text-align: justify;
        }
        .work-section {
          margin-top: 2mm;
          font-size: 12px;
        }
        .work-area {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3mm;
          align-items: start;
        }
        .work-col h4 {
          margin: 0 0 1px 0;
          font-size: 12px;
          font-weight: 700;
        }
        .work-col h5 {
          margin: 1px 0 0.5px 0;
          font-size: 11px;
          font-weight: 600;
        }
        .work-col ul {
          margin: 0.5px 0 0 12px;
          padding: 0;
          line-height: 1.2;
          font-size: 11px;
        }
        .work-col li {
          margin: 0;
        }
        .work-col section {
          margin: 0.5mm 0;
        }
        .work-col-hi {
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
        }
        .member-signature {
          margin-top: 8mm;
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 6px;
        }
        .member-signature div:first-child {
          height: 20px;
          margin-bottom: 2px;
          font-size: 9px;
          color: #999;
        }
        .member-signature .name {
          font-size: 11px;
          margin-top: 2px;
          font-weight: 600;
        }
        .org-signature {
          margin-top: 8mm;
          text-align: center;
        }
        .org-signature img {
          max-width: 120px;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .org-signature .name {
          font-size: 11px;
          margin-top: 3px;
          font-weight: 700;
        }
        .org-signature .designation {
          font-size: 9px;
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
        }
        .footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          font-size: 11px;
          text-align: center;
          color: #fff;
          border-top: none;
          padding: 4mm;
          margin: 0;
          height: 15mm;
          width: 210mm;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          background: rgb(1,0,102);
          box-sizing: border-box;
          z-index: 1000;
        }
        .footer .hin {
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
          color: #fff;
        }
        .page2 {
          page-break-before: always;
          margin-top: calc(30mm + 5mm);
        }
        @media print {
          .container { margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header class="letter-header">
          <svg class="bg-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 830 50" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <polygon points="0,0 830,0 0,50" fill="#2b235f" />
            <polygon points="0,50 0,49 830,0 830,50" fill="#d92523" />
          </svg>
          <div class="header-content">
            <div class="slogan-strip">
              <span class="slogan-left">मानव हित सर्वोपरि</span>
              <span class="slogan-center">सत्यमेव जयते</span>
              <span class="slogan-right">न्याय ही धर्म है</span>
            </div>
            <div class="main-header">
              <div class="logo">
                ${logoBase64 ? `<img src="data:image/jpeg;base64,${logoBase64}" alt="RMAS Logo">` : ''}
              </div>
              <div class="title">
                <div class="title-hin">राष्ट्रीय मानवाधिकार संगठन</div>
                <div class="title-eng">Rashtriya Manav Adhikar Sangathan</div>
              </div>
              <div class="registration">पंजीकरण संख्या<br>4120/2020</div>
            </div>
          </div>
        </header>

        <div class="watermark">
          ${logoBase64 ? `<img src="data:image/jpeg;base64,${logoBase64}" alt="Watermark">` : ''}
        </div>

        <div class="body-wrapper">
          <div class="doc-meta">
            <div class="left">
              <strong>Date:</strong> ${dateStr}
            </div>
            <div class="right">
              <strong>Membership ID:</strong> ${member.membershipId}
            </div>
          </div>

          <div class="member-photo-section">
            <div class="photo-stamp-container">
              <div class="photo-wrapper">
                ${memberPhotoBase64 ? `<img class="member-photo" src="data:image/jpeg;base64,${memberPhotoBase64}" alt="Member Photo">` : ''}
                ${stampBase64 ? `<img class="stamp-overlay" src="data:image/png;base64,${stampBase64}" alt="Stamp">` : ''}
              </div>
              <div class="member-name-below">${memberName}</div>
            </div>
            
            <div class="subject-center">
              <div class="subject-inline">
                Membership Joining Letter
                <span class="hin">/ सदस्यता स्वीकृति पत्र</span>
              </div>
            </div>
            
            <div class="qr-section">
              <img src="${qrCodeDataURL}" alt="QR Code">
              <div class="scan-text">Scan to Verify</div>
            </div>
          </div>

          <table class="member-form-table">
            <tr>
              <td class="form-number">1.</td>
              <td class="form-label">Member Name:</td>
              <td class="form-value-long" colspan="3"><span>${memberName}</span></td>
            </tr>
            <tr>
              <td class="form-number">2.</td>
              <td class="form-label">Father's / Husband's Name:</td>
              <td class="form-value"><span>${fatherName}</span></td>
              <td class="form-label">Gender:</td>
              <td class="form-value"><span>${member.gender || 'N/A'}</span></td>
            </tr>
            <tr>
              <td class="form-number">3.</td>
              <td class="form-label">Date of Birth:</td>
              <td class="form-value"><span>${formattedDOB}</span></td>
              <td class="form-label">Education:</td>
              <td class="form-value"><span>${member.education || 'N/A'}</span></td>
            </tr>
            <tr>
              <td class="form-number">4.</td>
              <td class="form-label">Designation:</td>
              <td class="form-value-long" colspan="3"><span>${designation || 'Member'}</span></td>
            </tr>
            <tr>
              <td class="form-number">5.</td>
              <td class="form-label">Address:</td>
              <td class="form-value-long" colspan="3"><span>${address}</span></td>
            </tr>
            <tr>
              <td class="form-number">6.</td>
              <td class="form-label">Mobile No.:</td>
              <td class="form-value"><span>${member.mobile}</span></td>
              <td class="form-label">Email:</td>
              <td class="form-value"><span>${member.email}</span></td>
            </tr>
            <tr>
              <td class="form-number">7.</td>
              <td class="form-label">Aadhar ID Number:</td>
              <td class="form-value-long" colspan="3"><span>${member.idNumber || 'N/A'}</span></td>
            </tr>
          </table>

          <div class="terms">
            <strong>Terms & Conditions (English)</strong>
            <ol>
              <li>This appointment is purely honorary and voluntary in nature and does not create any employer–employee relationship with Rashtriya Manav Adhikar Sangathan (RMAS).</li>
              <li>The membership is granted subject to verification of documents, credentials, and background information provided by the member.</li>
              <li>The member shall strictly work in accordance with the objectives, constitution, rules, and code of conduct of RMAS.</li>
              <li>The member shall not misuse the name, logo, identity card, letterhead, or any official platform of RMAS for personal, political, financial, or unlawful purposes.</li>
              <li>Any activity against national integrity, social harmony, human rights principles, or RMAS's reputation will be treated as serious misconduct.</li>
              <li>The membership is valid for the specified period and must be renewed as per RMAS norms and procedures.</li>
              <li>RMAS reserves the right to suspend or terminate the membership at any time without prior notice if rules are violated or conduct is found inappropriate.</li>
              <li>The member shall return the RMAS identity card, documents, and materials upon resignation, termination, or expiry of membership.</li>
              <li>The member agrees that RMAS shall not be responsible for any personal, legal, or financial liabilities arising from individual actions.</li>
            </ol>
          </div>

          <div class="hindi-terms-first">
            <strong>नियम एवं शर्तें (Hindi)</strong>
            <ol>
              <li>यह नियुक्ति पूर्णतः मानद, स्वैच्छिक एवं सेवा भावना पर आधारित है तथा इससे संगठन और सदस्य के बीच नियोक्ता–कर्मचारी संबंध स्थापित नहीं होता।</li>
              <li>सदस्यता, प्रस्तुत किए गए दस्तावेज़ों एवं जानकारी के सत्यापन के पश्चात ही मान्य होगी।</li>
              <li>सदस्य को संगठन के उद्देश्यों, संविधान, नियमों एवं आचार संहिता के अनुसार ही कार्य करना होगा।</li>
              <li>संगठन के नाम, लोगो, पहचान पत्र, लेटरहेड अथवा किसी भी आधिकारिक माध्यम का व्यक्तिगत, राजनीतिक, आर्थिक या अवैध उपयोग प्रतिबंधित है।</li>
              <li>राष्ट्रीय एकता, सामाजिक सौहार्द, मानवाधिकार सिद्धांतों या संगठन की छवि के विरुद्ध कोई भी कार्य गंभीर अनुशासनहीनता माना जाएगा।</li>
              <li>सदस्यता निर्धारित अवधि के लिए वैध होगी एवं नवीनीकरण संगठन के नियमों के अनुसार किया जाएगा।</li>
              <li>नियमों के उल्लंघन या अनुचित आचरण की स्थिति में संगठन को सदस्यता निलंबित अथवा समाप्त करने का पूर्ण अधिकार होगा।</li>
              <li>सदस्यता समाप्त होने या त्यागपत्र देने की स्थिति में संगठन से प्राप्त पहचान पत्र एवं सामग्री वापस करना अनिवार्य होगा।</li>
              <li>सदस्य के व्यक्तिगत कार्यों से उत्पन्न किसी भी कानूनी, वित्तीय अथवा अन्य दायित्व के लिए संगठन उत्तरदायी नहीं होगा।</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- PAGE 2 -->
      <div class="container" style="margin-top:297mm;padding-top:5mm;">
        <header class="letter-header">
          <svg class="bg-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 830 50" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <polygon points="0,0 830,0 0,50" fill="#2b235f" />
            <polygon points="0,50 0,49 830,0 830,50" fill="#d92523" />
          </svg>
          <div class="header-content">
            <div class="slogan-strip">
              <span class="slogan-left">मानव हित सर्वोपरि</span>
              <span class="slogan-center">सत्यमेव जयते</span>
              <span class="slogan-right">न्याय ही धर्म है</span>
            </div>
            <div class="main-header">
              <div class="logo">
                ${logoBase64 ? `<img src="data:image/jpeg;base64,${logoBase64}">` : ''}
              </div>
              <div class="title">
                <div class="title-hin">राष्ट्रीय मानवाधिकार संगठन</div>
                <div class="title-eng">Rashtriya Manav Adhikar Sangathan</div>
              </div>
              <div class="registration">पंजीकरण संख्या<br>4120/2020</div>
            </div>
          </div>
        </header>

        <div class="body-wrapper" style="margin-top:calc(30mm + 10mm);margin-bottom:100mm;padding-top:5mm;">
          <!-- Work area: English (left) / Hindi (right) -->
          <div class="work-section">
            <div class="work-area">
              <!-- English Column -->
              <div class="work-col work-col-en">
                <h4>Rashtriya Manav Adhikar Sangathan Areas of Work</h4>
                
                <section>
                  <h5>Prevention & Justice</h5>
                  <ul>
                    <li>Prevention of human rights violations and ensuring access to justice.</li>
                    <li>File complaints and advocate in cases of police brutality, custody deaths, fake encounters, and unlawful detention.</li>
                    <li>Provide prompt legal aid and help victims obtain justice.</li>
                  </ul>
                </section>

                <section>
                  <h5>Women & Children</h5>
                  <ul>
                    <li>Protect women and children's rights: domestic violence, dowry, sexual harassment, child marriage, child labour.</li>
                    <li>Women empowerment and gender-equality awareness campaigns; dedicated Mahila Team and helpline.</li>
                  </ul>
                </section>

                <section>
                  <h5>Youth Empowerment</h5>
                  <ul>
                    <li>Training in human rights, leadership and social awareness for youth.</li>
                    <li>Youth campaigns, volunteer programmes and social media initiatives.</li>
                  </ul>
                </section>

                <section>
                  <h5>Minorities & SC/ST Upliftment</h5>
                  <ul>
                    <li>Prevent discrimination and atrocities against minorities; targeted programs for upliftment.</li>
                    <li>Support under relevant laws including atrocity-prevention measures.</li>
                  </ul>
                </section>

                <section>
                  <h5>Legal Aid & Awareness</h5>
                  <ul>
                    <li>Provide free legal aid, RTI and PIL support; assist filing complaints for the poor.</li>
                    <li>Conduct rights-awareness camps at schools, colleges and local bodies.</li>
                  </ul>
                </section>

                <section>
                  <h5>Social Justice & Policy</h5>
                  <ul>
                    <li>Promote social justice, peace and equality; community development at block/district level.</li>
                    <li>Policy advocacy, reporting and media engagement to raise issues.</li>
                  </ul>
                </section>

                <section>
                  <h5>Emergency Response</h5>
                  <ul>
                    <li>Respond to natural disasters, riots and violence with relief, legal aid and rehabilitation.</li>
                  </ul>
                </section>
                
                <!-- Member Signature Place (English side) -->
                <div class="member-signature">
                  <div>Member Signature</div>
                  <div class="name">${memberName}</div>
                </div>
              </div>

              <!-- Hindi Column -->
              <div class="work-col work-col-hi">
                <h4>राष्ट्रीय मानवाधिकार संगठन के कार्य क्षेत्र</h4>
                
                <section>
                  <h5>मानवाधिकार उल्लंघनों की रोकथाम और न्याय</h5>
                  <ul>
                    <li>मानवाधिकार उल्लंघनों की रोकथाम और न्याय सुनिश्चित करना।</li>
                    <li>पुलिस अत्याचार, कस्टडी डेथ, फर्जी एनकाउंटर, अवैध हिरासत जैसे मामलों में शिकायत दर्ज करना और पैरवी करना।</li>
                    <li>पीड़ितों को त्वरित कानूनी सहायता और न्याय दिलाना।</li>
                  </ul>
                </section>

                <section>
                  <h5>महिला एवं बाल अधिकारों की रक्षा</h5>
                  <ul>
                    <li>घरेलू हिंसा, दहेज, यौन उत्पीड़न, बाल विवाह, बाल श्रम रोकना।</li>
                    <li>महिला सशक्तिकरण, लिंग समानता जागरूकता अभियान; Mahila Team और महिला हेल्पलाइन/काउंसलिंग।</li>
                  </ul>
                </section>

                <section>
                  <h5>युवा सशक्तिकरण और नेतृत्व विकास</h5>
                  <ul>
                    <li>युवाओं में मानवाधिकार, नेतृत्व, सामाजिक जागरूकता का प्रशिक्षण।</li>
                    <li>युवा अभियान, वॉलंटियर प्रोग्राम, सोशल मीडिया कैंपेन; Yuva Team द्वारा सक्रियता बढ़ाना।</li>
                  </ul>
                </section>

                <section>
                  <h5>अल्पसंख्यक एवं SC/ST समुदायों का उत्थान</h5>
                  <ul>
                    <li>अल्पसंख्यकों के खिलाफ भेदभाव और अत्याचार रोकना; लक्षित कार्यक्रम चलाना।</li>
                    <li>SC/ST (अत्याचार निवारण) अधिनियम के तहत सहायता देना।</li>
                  </ul>
                </section>

                <section>
                  <h5>कानूनी सहायता एवं जागरूकता</h5>
                  <ul>
                    <li>गरीबों को मुफ्त लीगल एड, RTI, PIL और शिकायत दर्ज कराने में मदद।</li>
                    <li>स्कूल, कॉलेज और ग्राम पंचायत स्तर पर मानवाधिकार जागरूकता शिविर आयोजित करना।</li>
                  </ul>
                </section>

                <section>
                  <h5>सामाजिक न्याय, शांति और समानता</h5>
                  <ul>
                    <li>जातीय/धार्मिक तनाव कम करना, शांति समितियाँ बनाना और स्थानीय विकास कार्यक्रम चलाना।</li>
                  </ul>
                </section>

                <section>
                  <h5>नीति प्रभावन और आपातकालीन प्रतिक्रिया</h5>
                  <ul>
                    <li>नीति प्रभावन, रिपोर्टिंग, और आपात स्थिति में राहत, कानूनी सहायता व पुनर्वास करना।</li>
                  </ul>
                </section>
                
                <!-- Signature Stamp -->
                <div class="org-signature">
                  ${stampBase64 ? `<img src="data:image/png;base64,${stampBase64}" alt="Authorized Signature">` : ''}
                  <div class="name">State President</div>
                  <div class="designation">RMAS Bihar</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer - visible on page 2 only -->
          <div class="footer">
            <div style="font-weight:700;">National Human Rights Association - Bihar</div>
            <div class="hin">D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara, Delhi-94</div>
            <div style="margin-top:2px;font-size:10px;">Website: www.rmas-india.org • Contact: +91-11-XXXX-XXXX</div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // Launch browser
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfFilename = member.membershipId.replace(/\//g, '_') + '_joining_letter.pdf';
    const pdfPath = path.join(pdfDir, pdfFilename);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await browser.close();
    console.log('✅ Joining letter generated:', pdfPath);
    return `/pdfs/${pdfFilename}`;

  } catch (error) {
    console.error('❌ Error generating joining letter:', error.message);
    if (browser) {
      await browser.close().catch(() => {});
    }
    throw new Error(`Joining letter generation failed: ${error.message}`);
  }
}

module.exports = { generateJoiningLetter };
