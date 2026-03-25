const QRCode = require('qrcode');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { getBilingualDesignation } = require('./roleDisplay');
const { formatDOB, toTitleCase } = require('./dateUtils');

async function generateIdCard(member) {
  try {
    console.log('🔍 Generating ID card for:', member.fullName);
    console.log('Member photo field from DB:', member.photo);

    // Generate QR code
    const baseUrl = process.env.BASE_URL || 'https://rmas.org.in';
    const qrCodeDataURL = await QRCode.toDataURL(`${baseUrl}/v/${member.membershipId}`);

    // Read EJS template
    const templatePath = path.join(__dirname, '..', 'views', 'id-card.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');

    // Read and encode images to base64
    let memberPhoto = '';
    let nhraLogo = '';
    let stampImage = '';

    try {
      if (member.photo) {
        // Support various stored formats: "uploads/foo.jpg", "/uploads/foo.jpg", or just "foo.jpg"
        const pathsToTry = [];
        const normalized = member.photo.replace(/^\//, '');
        // Check in both public/uploads and root uploads (where files are actually being saved)
        if (normalized.startsWith('uploads/')) {
          pathsToTry.push(path.join(__dirname, '..', 'public', normalized));
          pathsToTry.push(path.join(__dirname, '..', 'uploads', normalized.replace(/^uploads\//, '')));
          pathsToTry.push(path.join(__dirname, '..', normalized));
        } else {
          pathsToTry.push(path.join(__dirname, '..', 'public', 'uploads', normalized));
          pathsToTry.push(path.join(__dirname, '..', 'public', normalized));
          pathsToTry.push(path.join(__dirname, '..', 'uploads', normalized));
          pathsToTry.push(path.join(__dirname, '..', normalized));
        }

        let found = false;
        let memberPhotoPathUsed = null;
        for (const p of pathsToTry) {
          console.log('Looking for member photo at:', p);
          if (fs.existsSync(p)) {
            memberPhoto = fs.readFileSync(p).toString('base64');
            memberPhotoPathUsed = p;
            console.log('Member photo loaded successfully from', p);
            found = true;
            break;
          }
        }
        if (!found) {
          console.log('Member photo file not found in any expected location');
        }
      } else {
        console.log('No photo field in member record');
      }
    } catch (err) {
      console.error('Error loading member photo:', err.message);
    }

    // Fallback placeholder (transparent pixel) if no photo is available
    if (!memberPhoto) {
      memberPhoto = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/CfHgAGgwJ/lUhYFQAAAABJRU5ErkJggg==';
    }

    // Debug log (short) to ensure we have a valid image base64
    if (memberPhoto) {
      console.log('memberPhoto length:', memberPhoto.length, 'prefix:', memberPhoto.substring(0, 30));
    } else {
      console.log('memberPhoto is empty (should not happen)');
    }

    // Log which path was successful (if any)
    if (typeof memberPhotoPathUsed !== 'undefined' && memberPhotoPathUsed) {
      console.log('Member photo loaded from:', memberPhotoPathUsed);
    }

    try {
      const stampImagePath = path.join(__dirname, '..', 'public', 'images', 'stamp.png');
      if (fs.existsSync(stampImagePath)) {
        stampImage = fs.readFileSync(stampImagePath).toString('base64');
        console.log('Stamp image loaded successfully');
      } else {
        console.log('Stamp image file not found:', stampImagePath);
      }
    } catch (err) {
      console.error('Error loading stamp image:', err.message);
    }

    // Render EJS template
    const designation = getBilingualDesignation(member);
    const formattedDOB = formatDOB(member.dob);
    
    // Apply Title Case formatting to names and locations
    const memberName = toTitleCase(member.fullName || '');
    const fatherName = toTitleCase(member.fatherName || member.guardianName || '');
    const districtName = toTitleCase(member.district || '');
    const stateName = toTitleCase(member.state || '');
    const blockName = toTitleCase(member.block || '');
    const villageName = toTitleCase(member.village || '');
    
    const html = ejs.render(template, {
      member,
      qrCodeDataURL,
      memberPhoto,
      rmasLogo: nhraLogo,
      nhraLogo,
      stampImage,
      designation,
      formattedDOB,
      memberName,
      fatherName,
      districtName,
      stateName,
      blockName,
      villageName
    });

    // Resolve Puppeteer exec path (env override, then common paths)
    let execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '';
    execPath = execPath ? execPath.replace(/^"(.*)"$/, '$1') : '';
    if (!execPath) {
      const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
      ];
      execPath = candidates.find(p => fs.existsSync(p)) || '';
    }
    if (!execPath) console.warn('⚠️ No Chrome/Chromium executable found; Puppeteer may fail to launch');
    console.log('Using Puppeteer executablePath:', execPath || 'default bundled');

    // Launch browser and generate PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: execPath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--enable-font-antialiasing'
      ]
    });

    const page = await browser.newPage();
    // Set extra headers for proper font rendering
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'hi-IN,hi;q=0.9,en-US;q=0.8,en;q=0.7'
    });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    await browser.close();

    // Save PDF
    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfFilename = `id_card_${member.membershipId.replace(/\//g, '_')}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuffer);

    console.log('✅ ID card generated:', pdfPath);

    return `/pdfs/${pdfFilename}`;
  } catch (error) {
    console.error('❌ Error generating ID card:', error.message);
    throw new Error(`ID card generation failed: ${error.message}`);
  }
}

module.exports = { generateIdCard };