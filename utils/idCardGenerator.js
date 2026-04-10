const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const QRCode = require('qrcode');
const { getBilingualDesignation } = require('./roleDisplay');
const { formatDOB, toTitleCase } = require('./dateUtils');

/**
 * Get jurisdiction based on position level
 * @param {Object} member - Member object
 * @returns {string} Jurisdiction string
 */
function getJurisdiction(member) {
  const positionLevel = (member.positionLevel || 'Member').toString().trim().toLowerCase();

  switch (positionLevel) {
    case 'national':
      return 'All India';

    case 'state':
    case 'pradesh': {
      const state = (member.positionLocation?.state || member.state || '').trim();
      return state ? `All ${state}` : 'All India';
    }

    case 'division': {
      const division = (member.positionLocation?.division || member.division || '').trim();
      return division ? `All ${division}` : 'All India';
    }

    case 'district': {
      const district = (member.positionLocation?.district || member.district || '').trim();
      return district ? `All ${district}` : 'All India';
    }

    case 'block':
    case 'panchayat': {
      const district = (member.positionLocation?.district || member.district || '').trim();
      return district ? `All ${district}` : 'All India';
    }

    case 'member':
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
    const villageName = toTitleCase(member.village || '');
    const blockName = toTitleCase(member.block || '');
    const districtName = toTitleCase(member.district || '');
    const stateName = toTitleCase(member.state || '');

    // Get image paths or base64
    let photoBase64 = '';
    let logoBase64 = '';
    let stampBase64 = '';

    // Load member photo
    try {
      if (member.photo) {
        const normalized = member.photo.replace(/^\//, '');
        const possiblePaths = [
          path.join(__dirname, '..', 'public', normalized),
          path.join(__dirname, '..', 'uploads', normalized.replace(/^uploads\//, '')),
          path.join(process.cwd(), 'public', normalized),
          path.join(process.cwd(), 'uploads', normalized.replace(/^uploads\//, '')),
          path.join(process.cwd(), 'public', 'uploads', normalized),
          path.join(process.cwd(), 'uploads', normalized),
          '/app/public/' + normalized,
          '/app/uploads/' + normalized.replace(/^uploads\//, '')
        ];

        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            const ext = path.extname(p).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
            const data = fs.readFileSync(p);
            photoBase64 = data.toString('base64');
            console.log('✅ Member photo loaded from:', p);
            break;
          }
        }
        if (!photoBase64) {
          console.warn('⚠️ Member photo file not found:', member.photo);
        }
      }
    } catch (err) {
      console.error('Error loading member photo:', err.message);
    }

    // Load logo
    try {
      const possiblePaths = [
        path.join(__dirname, '..', 'public', 'images', 'logo.jpeg'),
        path.join(process.cwd(), 'public', 'images', 'logo.jpeg'),
        path.join(process.cwd(), 'images', 'logo.jpeg'),
        '/app/public/images/logo.jpeg'
      ];
      for (const logoPath of possiblePaths) {
        if (fs.existsSync(logoPath)) {
          const data = fs.readFileSync(logoPath);
          logoBase64 = data.toString('base64');
          console.log('✅ Logo loaded from:', logoPath);
          break;
        }
      }
      if (!logoBase64) {
        console.warn('⚠️ Logo file not found in any path');
      }
    } catch (err) {
      console.error('Error loading logo:', err.message);
    }

    // Load stamp
    try {
      const possiblePaths = [
        path.join(__dirname, '..', 'public', 'images', 'stamp.png'),
        path.join(process.cwd(), 'public', 'images', 'stamp.png'),
        path.join(process.cwd(), 'images', 'stamp.png'),
        '/app/public/images/stamp.png'
      ];
      for (const stampPath of possiblePaths) {
        if (fs.existsSync(stampPath)) {
          const data = fs.readFileSync(stampPath);
          stampBase64 = data.toString('base64');
          console.log('✅ Stamp loaded from:', stampPath);
          break;
        }
      }
      if (!stampBase64) {
        console.warn('⚠️ Stamp file not found in any path');
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

    const address = `${member.houseNo || ''}${member.houseNo ? ', ' : ''}${member.street || ''}${member.street ? ', ' : ''}${member.village || ''}${member.village ? ', ' : ''}${member.block || ''}${member.block ? ', ' : ''}${member.district || ''}${member.district ? ', ' : ''}${member.state || ''}${member.pincode ? ' - ' + member.pincode : ''}`.replace(/(^[\s,]+|[\s,]+$)/g, '');

    const templatePath = path.join(__dirname, '..', 'views', 'id-card.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');

    const htmlContent = ejs.render(template, {
      member,
      membership: member,
      memberPhoto: photoBase64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/CfHgAGgwJ/lUhYFQAAAABJRU5ErkJggg==',
      rmasLogo: logoBase64,
      nhraLogo: logoBase64,
      stampImage: stampBase64,
      qrCodeDataURL,
      address,
      memberName,
      fatherName,
      designation,
      formattedDOB,
      jurisdiction,
      villageName,
      blockName,
      districtName,
      stateName
    });

    // Launch browser - optimized for Docker/Render
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    
    // Use 'load' instead of 'networkidle0' to avoid timeout in slow Docker networks
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Generate PDF
    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfFilename = `id_card_${member.membershipId.replace(/\//g, '_')}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);

    // Retry logic for frame detachment issues
    let pdfBuffer;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        pdfBuffer = await page.pdf({
          path: pdfPath,
          format: 'A4',
          printBackground: true,
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
        });
        break;
      } catch (pdfError) {
        attempts++;
        console.warn(`PDF generation attempt ${attempts} failed:`, pdfError.message);
        if (attempts >= maxAttempts) {
          throw pdfError;
        }
        // Wait before retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }

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
