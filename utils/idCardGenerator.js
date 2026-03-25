const QRCode = require('qrcode');
const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { getBilingualDesignation } = require('./roleDisplay');
const { formatDOB, toTitleCase } = require('./dateUtils');

async function generateIdCard(member) {
  try {
    console.log('🔍 Generating ID card for:', member.fullName);

    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([153.07, 242.65]); // ID card size in points (54mm x 85.6mm)

    const { width, height } = page.getSize();

    // Generate QR code as buffer
    const baseUrl = process.env.BASE_URL || 'https://rmas.org.in';
    const qrCodeDataURL = await QRCode.toDataURL(`${baseUrl}/v/${member.membershipId}`);
    const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');

    // Load images
    let memberPhotoBuffer = null;
    let logoBuffer = null;
    let stampBuffer = null;

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
            memberPhotoBuffer = fs.readFileSync(p);
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
        logoBuffer = fs.readFileSync(logoPath);
      }
    } catch (err) {
      console.error('Error loading logo:', err.message);
    }

    // Load stamp
    try {
      const stampPath = path.join(__dirname, '..', 'public', 'images', 'stamp.png');
      if (fs.existsSync(stampPath)) {
        stampBuffer = fs.readFileSync(stampPath);
      }
    } catch (err) {
      console.error('Error loading stamp:', err.message);
    }

    // Embed images
    let memberPhotoImage = null;
    let logoImage = null;
    let stampImage = null;
    let qrCodeImage = null;

    if (memberPhotoBuffer) {
      memberPhotoImage = await pdfDoc.embedJpg(memberPhotoBuffer);
    }
    if (logoBuffer) {
      logoImage = await pdfDoc.embedJpg(logoBuffer);
    }
    if (stampBuffer) {
      stampImage = await pdfDoc.embedPng(stampBuffer);
    }
    qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);

    // Prepare data
    const designation = getBilingualDesignation(member);
    const formattedDOB = formatDOB(member.dob);
    const memberName = toTitleCase(member.fullName || '');
    const fatherName = toTitleCase(member.fatherName || member.guardianName || '');

    // Draw front side
    await drawFrontSide(page, {
      member,
      memberName,
      fatherName,
      designation,
      formattedDOB,
      memberPhotoImage,
      logoImage,
      stampImage
    });

    // Add back side
    const backPage = pdfDoc.addPage([153.07, 242.65]);
    await drawBackSide(backPage, {
      member,
      memberName,
      fatherName,
      qrCodeImage
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfFilename = `id_card_${member.membershipId.replace(/\//g, '_')}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBytes);

    console.log('✅ ID card generated:', pdfPath);
    return `/pdfs/${pdfFilename}`;
  } catch (error) {
    console.error('❌ Error generating ID card:', error.message);
    throw new Error(`ID card generation failed: ${error.message}`);
  }
}

async function drawFrontSide(page, data) {
  const { width, height } = page.getSize();

  // Header with gradient background (simplified)
  page.drawRectangle({
    x: 0,
    y: height - 20,
    width: width,
    height: 20,
    color: rgb(0.17, 0.14, 0.37) // Dark blue
  });

  // Slogan strip
  page.drawText('मानव हित सर्वोपरि', {
    x: 5,
    y: height - 8,
    size: 4,
    color: rgb(1, 1, 1)
  });
  page.drawText('सत्यमेव जयते', {
    x: width/2 - 15,
    y: height - 8,
    size: 4,
    color: rgb(1, 1, 1)
  });
  page.drawText('न्याय ही धर्म है', {
    x: width - 25,
    y: height - 8,
    size: 4,
    color: rgb(1, 1, 1)
  });

  // Logo
  if (data.logoImage) {
    page.drawImage(data.logoImage, {
      x: 5,
      y: height - 18,
      width: 10,
      height: 10
    });
  }

  // Title
  page.drawText('राष्ट्रीय मानवाधिकार संगठन', {
    x: 20,
    y: height - 15,
    size: 6,
    color: rgb(1, 1, 1)
  });

  // Registration number
  page.drawText('पंजीकरण संख्या', {
    x: width - 25,
    y: height - 12,
    size: 3,
    color: rgb(1, 1, 1)
  });
  page.drawText('4120/2020', {
    x: width - 25,
    y: height - 16,
    size: 3,
    color: rgb(1, 1, 1)
  });

  // Organization address
  page.drawText('D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara Delhi-94', {
    x: 10,
    y: height - 25,
    size: 3,
    color: rgb(0, 0, 0)
  });

  // Photo
  if (data.memberPhotoImage) {
    page.drawImage(data.memberPhotoImage, {
      x: (width - 50) / 2,
      y: height - 80,
      width: 50,
      height: 50
    });
  }

  // Stamp
  if (data.stampImage) {
    page.drawImage(data.stampImage, {
      x: width - 35,
      y: height - 95,
      width: 25,
      height: 25
    });
  }

  // Details
  let yPos = height - 95;

  // Name
  page.drawText('Name:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText(data.memberName, { x: 20, y: yPos, size: 5, color: rgb(0, 0, 0) });
  yPos -= 8;

  // Father Name
  page.drawText('Father Name:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText(data.fatherName, { x: 30, y: yPos, size: 5, color: rgb(0, 0, 0) });
  yPos -= 8;

  // Designation
  page.drawText('Designation:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText(data.designation || 'सदस्य / Member', { x: 32, y: yPos, size: 4, color: rgb(0, 0, 0) });
  yPos -= 8;

  // DOB
  page.drawText('DOB:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText(data.formattedDOB, { x: 15, y: yPos, size: 5, color: rgb(0, 0, 0) });
  yPos -= 8;

  // Blood Group
  page.drawText('Blood Group:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText(data.member.bloodGroup || 'N/A', { x: 35, y: yPos, size: 5, color: rgb(0, 0, 0) });
  yPos -= 8;

  // Jurisdiction
  page.drawText('Jurisdiction:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText('All India', { x: 32, y: yPos, size: 5, color: rgb(0, 0, 0) });
  yPos -= 8;

  // Issued On
  const today = new Date();
  const issueDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  page.drawText('Issued On:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText(issueDate, { x: 28, y: yPos, size: 5, color: rgb(0, 0, 0) });
  yPos -= 10;

  // Official text
  page.drawText('Official Member Identity Card', {
    x: (width - 80) / 2,
    y: yPos,
    size: 4,
    color: rgb(0, 0, 0)
  });

  // Footer
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 15,
    color: rgb(0.99, 0, 0) // Red
  });
  page.drawText(`ID: ${data.member.membershipId}`, {
    x: 5,
    y: 5,
    size: 5,
    color: rgb(1, 1, 1)
  });
}

async function drawBackSide(page, data) {
  const { width, height } = page.getSize();

  // Header
  page.drawRectangle({
    x: 0,
    y: height - 20,
    width: width,
    height: 20,
    color: rgb(0, 0, 0.4) // Dark blue
  });
  page.drawText('Rashtriya Manav Adhikar Sangathan', {
    x: 10,
    y: height - 12,
    size: 5,
    color: rgb(1, 1, 1)
  });

  // Details
  let yPos = height - 35;

  // Mobile
  page.drawText('Mobile:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText(data.member.mobile || '', { x: 20, y: yPos, size: 5, color: rgb(0, 0, 0) });
  yPos -= 8;

  // Email
  page.drawText('Email:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText(data.member.email || '', { x: 18, y: yPos, size: 5, color: rgb(0, 0, 0) });
  yPos -= 8;

  // Address
  page.drawText('Address:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  const address = `${data.member.houseNo || ''}, ${data.member.village || ''}, ${data.member.block || ''}, ${data.member.district || ''}, ${data.member.state || ''}, ${data.member.pincode || ''}`;
  page.drawText(address, { x: 22, y: yPos, size: 4, color: rgb(0, 0, 0) });
  yPos -= 15;

  // Valid Upto
  const today = new Date();
  const validUpto = new Date(today);
  validUpto.setFullYear(today.getFullYear() + 1);
  const validDate = validUpto.toLocaleDateString('en-GB');
  page.drawText('Valid Upto:', { x: 5, y: yPos, size: 5, color: rgb(0, 0, 0.4) });
  page.drawText(validDate, { x: 28, y: yPos, size: 5, color: rgb(0, 0, 0) });
  yPos -= 20;

  // QR Code
  if (data.qrCodeImage) {
    page.drawImage(data.qrCodeImage, {
      x: (width - 60) / 2,
      y: yPos - 60,
      width: 60,
      height: 60
    });
  }

  page.drawText('Scan QR code to verify card authenticity', {
    x: (width - 80) / 2,
    y: yPos - 75,
    size: 3,
    color: rgb(0, 0, 0)
  });

  // Disclaimer box
  page.drawRectangle({
    x: 5,
    y: 20,
    width: width - 10,
    height: 40,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5
  });

  page.drawText('Issued to the member only.', { x: 8, y: 50, size: 3, color: rgb(0, 0, 0) });
  page.drawText('Misuse of this card may lead to cancellation.', { x: 8, y: 42, size: 3, color: rgb(0, 0, 0) });
  page.drawText('The association is not responsible for any illegal activity of the card holder.', { x: 8, y: 34, size: 3, color: rgb(0, 0, 0) });

  // Footer
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 15,
    color: rgb(0.99, 0, 0) // Red
  });
  page.drawText('Authorized ID Card', {
    x: 5,
    y: 5,
    size: 5,
    color: rgb(1, 1, 1)
  });
}

module.exports = { generateIdCard };