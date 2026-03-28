const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { getBilingualDesignation } = require('./roleDisplay');
const { formatDOB, toTitleCase } = require('./dateUtils');

/**
 * Get jurisdiction based on position level
 * @param {Object} member - Member object
 * @returns {string} Jurisdiction string
 */
function getJurisdiction(member) {
  const positionLevel = member.positionLevel || 'Member';
  
  switch(positionLevel) {
    case 'National':
      return 'All India';
    
    case 'State':
      const state = (member.positionLocation?.state || member.state || '').trim();
      return state ? `Over ${state}` : 'All India';
    
    case 'Division':
      const division = (member.positionLocation?.division || member.division || '').trim();
      return division ? `Over ${division}` : 'All India';
    
    case 'District':
      const district = (member.positionLocation?.district || member.district || '').trim();
      return district ? `All over ${district}` : 'All India';
    
    case 'Block':
      const block = (member.positionLocation?.block || member.block || '').trim();
      const blockDist = (member.positionLocation?.district || member.district || '').trim();
      if (block && blockDist) {
        return `${block}, ${blockDist}`;
      } else if (block) {
        return block;
      }
      return 'All India';
    
    case 'Panchayat':
      const panchayat = (member.positionLocation?.panchayat || member.panchayat || '').trim();
      const panchDist = (member.positionLocation?.district || member.district || '').trim();
      if (panchayat && panchDist) {
        return `${panchayat}, ${panchDist}`;
      } else if (panchayat) {
        return panchayat;
      }
      return 'All India';
    
    case 'Member':
    default:
      return 'All India';
  }
}

async function generateIdCard(member) {
  let browser = null;
  try {
    console.log('🔍 Generating ID card for:', member.fullName);

    // Generate QR code
    const baseUrl = process.env.BASE_URL || 'https://rmas.org.in';
    const qrCodeDataURL = await QRCode.toDataURL(`${baseUrl}/v/${member.membershipId}`);

    // Prepare data
    const designation = getBilingualDesignation(member);
    const formattedDOB = formatDOB(member.dob);
    const memberName = toTitleCase(member.fullName || '');
    const fatherName = toTitleCase(member.fatherName || member.guardianName || '');
    const jurisdiction = getJurisdiction(member);

    // Get image paths or base64
    let photoBase64 = '';
    let logoBase64 = '';
    let stampBase64 = '';

    // Load member photo
    try {
      if (member.photo) {
        const pathsToTry = [];
        const normalized = member.photo.replace(/^\//, '');
        if (normalized.startsWith('uploads/')) {
          pathsToTry.push(path.join(__dirname, '..', 'public', normalized));
          pathsToTry.push(path.join(__dirname, '..', 'uploads', normalized.replace(/^uploads\//, '')));
        } else {
          pathsToTry.push(path.join(__dirname, '..', 'public', 'uploads', normalized));
          pathsToTry.push(path.join(__dirname, '..', 'uploads', normalized));
        }

        for (const p of pathsToTry) {
          if (fs.existsSync(p)) {
            photoBase64 = fs.readFileSync(p).toString('base64');
            break;
          }
        }
      }
    } catch (err) {
      console.error('Error loading member photo:', err.message);
    }

    // Load logo
    try {
      const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpeg');
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch (err) {
      console.error('Error loading logo:', err.message);
    }

    // Load stamp
    try {
      const stampPath = path.join(__dirname, '..', 'public', 'images', 'stamp.png');
      if (fs.existsSync(stampPath)) {
        stampBase64 = fs.readFileSync(stampPath).toString('base64');
      }
    } catch (err) {
      console.error('Error loading stamp:', err.message);
    }

    // Generate HTML for front side
    const today = new Date();
    const issueDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const validUpto = new Date(today);
    validUpto.setFullYear(today.getFullYear() + 1);
    const validDate = validUpto.toLocaleDateString('en-GB');

    const address = `${member.houseNo || ''}, ${member.village || ''}, ${member.block || ''}, ${member.district || ''}, ${member.state || ''}, ${member.pincode || ''}`.trim();

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
          background: #f5f5f5;
          display: flex;
          gap: 20px;
          padding: 20px;
          margin: 0;
        }
        .card {
          width: 54mm;
          height: 85.6mm;
          border: 1px solid #000;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          background: #fff;
          position: relative;
        }
        .front::before {
          content: '';
          position: absolute;
          top: 60%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 25mm;
          height: 25mm;
          background-image: url('data:image/jpeg;base64,${logoBase64}');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0.1;
          z-index: 0;
          pointer-events: none;
        }
        .front > * {
          position: relative;
          z-index: 1;
        }
        .header {
          position: relative;
          color: #fff;
          padding: 1mm;
          font-size: 2.5mm;
          font-weight: bold;
          display: flex;
          flex-direction: column;
          background: rgb(43, 35, 95);
          overflow: hidden;
          z-index: 10;
        }
        .header svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }
        .slogan-strip {
          display: flex;
          justify-content: space-between;
          font-size: 1.5mm;
          margin-bottom: 0.2mm;
          line-height: 1.1;
          position: relative;
          z-index: 2;
        }
        .main-header {
          display: grid;
          grid-template-columns: 6mm 1fr 10mm;
          align-items: center;
          margin-bottom: 0.2mm;
          position: relative;
          z-index: 2;
        }
        .main-header img {
          height: 4mm;
          margin-right: 1mm;
          position: relative;
          z-index: 2;
        }
        .main-header .title {
          font-size: 2.5mm;
          line-height: 1.1;
          text-align: center;
          flex: 1;
          position: relative;
          z-index: 2;
        }
        .registration {
          font-size: 1.5mm;
          text-align: right;
          line-height: 1.1;
          position: relative;
          z-index: 2;
        }
        .org-address {
          font-size: 2mm;
          text-align: center;
          line-height: 1.1;
          font-weight: normal;
          color: rgb(0, 0, 0);
          margin-top: 0.4mm;
          padding: 0;
          background: #fff;
          width: 100%;
          position: relative;
          z-index: 2;
        }
        .photo-box {
          width: 22mm;
          height: 22mm;
          margin: 1.5mm auto 0;
          position: relative;
          z-index: 2;
        }
        .photo-box img:not(.stamp) {
          width: 100%;
          height: 100%;
          border: 1px solid #000;
          object-fit: cover;
          display: block;
          position: relative;
          z-index: 1;
        }
        .stamp {
          position: absolute;
          bottom: -3mm;
          right: -12mm;
          width: 18mm;
          height: 18mm;
          border-radius: 50%;
          z-index: 40;
          object-fit: cover;
        }
        .details {
          padding: 2mm;
          font-size: 2.6mm;
          flex: 1;
          position: relative;
          z-index: 2;
        }
        .field {
          margin-bottom: 1mm;
          position: relative;
          z-index: 2;
        }
        .label {
          font-weight: bold;
          color: rgb(1, 0, 102);
          display: inline;
          position: relative;
          z-index: 2;
        }
        .value {
          display: inline;
          margin-left: 2mm;
        }
        .official-text {
          text-align: center;
          font-size: 2mm;
          margin-top: 1mm;
          font-weight: bold;
          position: relative;
          z-index: 2;
        }
        .footer {
          background: rgb(254, 0, 0);
          color: #fff;
          text-align: center;
          font-size: 2.4mm;
          padding: 1mm;          position: relative;
          z-index: 2;        }
        .back .header {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgb(1, 0, 102);
          color: #fff;
          font-size: 2.5mm;
          font-weight: bold;
          padding: 2mm 1mm;
          position: relative;
          z-index: 2;
        }
        .back .content {
          padding: 3mm;
          font-size: 2.6mm;
          flex: 1;
          position: relative;
          z-index: 2;
        }
        .back .qr {
          display: flex;
          justify-content: center;
          margin-top: 3.5mm;
          position: relative;
          z-index: 2;
        }
        .back .qr img {
          width: 26mm;
          height: 26mm;
          position: relative;
          z-index: 2;
        }
        .footer {
          background: rgb(254, 0, 0);
          color: #fff;
          text-align: center;
          font-size: 2.4mm;
          padding: 1mm;
          position: relative;
          z-index: 2;
        }
        .back .disclaimer {
          border: 0.5px solid #000;
          padding: 1mm;
          margin: 1mm 0;
          font-size: 1.5mm;
          line-height: 1.2;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        .back .disclaimer div {
          margin-bottom: 0.5mm;
          position: relative;
          z-index: 2;
        }
        .back .disclaimer div:last-child {
          margin-bottom: 0;
        }
      </style>
    </head>
    <body>
      <!-- FRONT SIDE -->
      <div class="card front">
        <div class="header">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 830 50" preserveAspectRatio="none">
            <polygon points="0,0 830,0 0,50" fill="#2b235f" />
            <polygon points="0,50 830,0 830,50" fill="#d92523" />
          </svg>
          <div class="slogan-strip">
            <span>मानव हित सर्वोपरि</span>
            <span>सत्यमेव जयते</span>
            <span>न्याय ही धर्म है</span>
          </div>
          <div class="main-header">
            <img src="data:image/jpeg;base64,${logoBase64}">
            <div class="title">राष्ट्रीय मानवाधिकार संगठन</div>
            <div class="registration">पंजीकरण संख्या<br>4120/2020</div>
          </div>
        </div>

        <div class="org-address">
          D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara Delhi-94
        </div>

        <div class="photo-box">
          <img src="data:image/jpeg;base64,${photoBase64}">
          ${stampBase64 ? `<img src="data:image/png;base64,${stampBase64}" class="stamp">` : ''}
        </div>

        <div class="details">
          <div class="field">
            <span class="label">Name:</span>
            <span class="value">${memberName}</span>
          </div>
          <div class="field">
            <span class="label">Father Name:</span>
            <span class="value">${fatherName}</span>
          </div>
          <div class="field">
            <span class="label">Designation:</span>
            <span class="value">${designation || 'Member'}</span>
          </div>
          <div class="field">
            <span class="label">DOB:</span>
            <span class="value">${formattedDOB}</span>
          </div>
          <div class="field">
            <span class="label">Blood Group:</span>
            <span class="value">${member.bloodGroup || 'N/A'}</span>
          </div>
          <div class="field">
            <span class="label">Jurisdiction:</span>
            <span class="value">${jurisdiction}</span>
          </div>
          <div class="field">
            <span class="label">Issued On:</span>
            <span class="value">${issueDate}</span>
          </div>
          <div class="official-text">
            Official Member Identity Card
          </div>
        </div>

        <div class="footer">
          ID: ${member.membershipId}
        </div>
      </div>

      <!-- BACK SIDE -->
      <div class="card back">
        <div class="header">
          <div class="title">Rashtriya Manav Adhikar Sangathan</div>
        </div>

        <div class="content">
          <div class="field">
            <span class="label">Mobile:</span>
            <span class="value">${member.mobile || 'N/A'}</span>
          </div>
          <div class="field">
            <span class="label">Email:</span>
            <span class="value">${member.email || 'N/A'}</span>
          </div>
          <div class="field">
            <span class="label">Address:</span>
            <span class="value">${address || 'N/A'}</span>
          </div>
          <div class="field">
            <span class="label">Valid Upto:</span>
            <span class="value">${validDate}</span>
          </div>

          <div class="qr">
            <img src="${qrCodeDataURL}">
          </div>
          <div class="qr-text">
            Scan QR code to verify card authenticity
          </div>
          <div class="disclaimer">
            <div>Issued to the member only.</div>
            <div>Misuse of this card may lead to cancellation.</div>
            <div>The association is not responsible for any illegal activity of the card holder.</div>
          </div>
        </div>

        <div class="footer">
          Authorized ID Card
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
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Generate PDF
    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfFilename = `id_card_${member.membershipId.replace(/\//g, '_')}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
    });

    await browser.close();
    console.log('✅ ID card generated:', pdfPath);
    return `/pdfs/${pdfFilename}`;

  } catch (error) {
    console.error('❌ Error generating ID card:', error.message);
    if (browser) {
      await browser.close().catch(() => {});
    }
    throw new Error(`ID card generation failed: ${error.message}`);
  }
}

module.exports = { generateIdCard };
