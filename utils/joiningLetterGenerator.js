const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { PDFDocument, rgb } = require('pdf-lib');
const { getBilingualDesignation } = require('./roleDisplay');
const { formatDOB, formatDateHindi, toTitleCase } = require('./dateUtils');

async function generateJoiningLetter(member) {
  try {
    console.log('🔍 Generating joining letter for:', member.fullName);

    if (!member || member.status !== 'approved') {
      throw new Error('Member not approved');
    }

    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    const { width, height } = page.getSize();

    // Generate QR code as buffer
    const baseUrl = process.env.BASE_URL || 'https://rmas.org.in';
    const verifyUrl = `${baseUrl}/v/${member.membershipId}`;
    const qrCodeDataURL = await QRCode.toDataURL(verifyUrl);
    const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');

    // Load images
    let logoBuffer = null;
    let memberPhotoBuffer = null;
    let stampBuffer = null;
    let signatureBuffer = null;

    // Load logo
    try {
      const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpeg');
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
      }
    } catch(e) { console.warn('nhra logo load failed', e.message); }

    // Load member photo
    try {
      const isDataUri = typeof member.photo === 'string' && member.photo.startsWith('data:');
      if (isDataUri) {
        const base64Data = member.photo.split(',')[1];
        memberPhotoBuffer = Buffer.from(base64Data, 'base64');
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
            memberPhotoBuffer = fs.readFileSync(p);
            break;
          }
        }
      }
    } catch(e){ console.warn('member photo load failed', e.message); }

    // Load stamp
    try {
      const stampPath = path.join(__dirname, '..', 'public', 'images', 'stamp.png');
      if (fs.existsSync(stampPath)) {
        stampBuffer = fs.readFileSync(stampPath);
      }
    } catch (e) { console.warn('stamp image load failed', e.message); }

    // Load signature
    try {
      const sigPath = path.join(__dirname, '..', 'public', 'images', 'signature.png');
      if (fs.existsSync(sigPath)) {
        signatureBuffer = fs.readFileSync(sigPath);
      }
    } catch (e) { console.warn('signature image load failed', e.message); }

    // Embed images
    let logoImage = null;
    let memberPhotoImage = null;
    let stampImage = null;
    let signatureImage = null;
    let qrCodeImage = null;

    if (logoBuffer) logoImage = await pdfDoc.embedJpg(logoBuffer);
    if (memberPhotoBuffer) memberPhotoImage = await pdfDoc.embedJpg(memberPhotoBuffer);
    if (stampBuffer) stampImage = await pdfDoc.embedPng(stampBuffer);
    if (signatureBuffer) signatureImage = await pdfDoc.embedPng(signatureBuffer);
    qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);

    // Prepare data
    const issueDateHindi = formatDateHindi(new Date());
    const startDate = issueDateHindi;
    const endDate = formatDateHindi(new Date(new Date().setFullYear(new Date().getFullYear()+1)));

    const primaryAssigned = (member.assignedRoles && member.assignedRoles[0]) ? member.assignedRoles[0] : null;
    const memberForTemplate = {
      name: member.fullName || 'N/A',
      email: member.email || 'N/A',
      phone: member.mobile || 'N/A',
      role: primaryAssigned ? (primaryAssigned.roleName || primaryAssigned.role) : (member.jobRole || 'N/A'),
      role_hin: primaryAssigned ? (primaryAssigned.roleName || null) : (member.jobRole || null),
      team: primaryAssigned ? (primaryAssigned.teamType || member.teamType) : (member.teamType || '—'),
      level: primaryAssigned ? (primaryAssigned.level || '—') : '—'
    };

    if (primaryAssigned) {
      member.positionLevel = primaryAssigned.level || member.positionLevel;
      member.assignedPosition = primaryAssigned.role || member.assignedPosition;
      member.teamType = primaryAssigned.teamType || member.teamType || 'Core';
    }

    let locationName = '';
    if (member.positionLevel === 'State') {
      locationName = member.state || 'Bihar';
    } else if (member.positionLevel === 'District') {
      locationName = member.district || 'Bihar';
    } else if (member.positionLevel === 'Block') {
      locationName = member.block || member.district || 'Bihar';
    } else if (member.positionLevel === 'Panchayat') {
      locationName = member.panchayat || member.block || member.district || 'Bihar';
    } else if (member.positionLevel === 'National') {
      locationName = 'India';
    }
    if (!locationName) locationName = 'India';

    const designation = getBilingualDesignation(member);
    const formattedDOB = formatDOB(member.dob);
    const memberName = toTitleCase(member.fullName || '');
    const fatherName = toTitleCase(member.fatherName || member.guardianName || '');
    const districtName = toTitleCase(member.district || '');
    const stateName = toTitleCase(member.state || '');
    const blockName = toTitleCase(member.block || '');
    const villageName = toTitleCase(member.village || '');

    // Draw the joining letter
    await drawJoiningLetter(page, {
      member,
      memberForTemplate,
      issueDateHindi,
      startDate,
      endDate,
      locationName,
      designation,
      formattedDOB,
      memberName,
      fatherName,
      districtName,
      stateName,
      blockName,
      villageName,
      logoImage,
      memberPhotoImage,
      stampImage,
      signatureImage,
      qrCodeImage,
      verifyUrl
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfFilename = member.membershipId.replace(/\//g, '_') + '_joining_letter.pdf';
    const pdfPath = path.join(pdfDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBytes);

    console.log('✅ Joining letter generated:', pdfPath);
    return `/pdfs/${pdfFilename}`;
  } catch (error) {
    console.error('❌ Error generating joining letter:', error.message);
    throw new Error(`Joining letter generation failed: ${error.message}`);
  }
}

async function drawJoiningLetter(page, data) {
  const { width, height } = page.getSize();

  // Header with gradient background
  page.drawRectangle({
    x: 0,
    y: height - 85,
    width: width,
    height: 85,
    color: rgb(0.17, 0.14, 0.37) // Dark blue
  });

  // Triangle overlay for header
  const trianglePath = [
    { x: 0, y: height - 85 },
    { x: width, y: height - 85 },
    { x: 0, y: height }
  ];

  // Slogans
  page.drawText('मानव हित सर्वोपरि', { x: 20, y: height - 25, size: 8, color: rgb(1, 1, 1) });
  page.drawText('सत्यमेव जयते', { x: width/2 - 40, y: height - 25, size: 8, color: rgb(1, 1, 1) });
  page.drawText('न्याय ही धर्म है', { x: width - 80, y: height - 25, size: 8, color: rgb(1, 1, 1) });

  // Logo
  if (data.logoImage) {
    page.drawImage(data.logoImage, {
      x: 20,
      y: height - 70,
      width: 25,
      height: 25
    });
  }

  // Organization name
  page.drawText('राष्ट्रीय मानवाधिकार संगठन', {
    x: 60,
    y: height - 50,
    size: 14,
    color: rgb(1, 1, 1)
  });

  // Address
  page.drawText('D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara, Delhi-94', {
    x: 60,
    y: height - 65,
    size: 8,
    color: rgb(1, 1, 1)
  });

  // Registration
  page.drawText('पंजीकरण संख्या: 4120/2020', {
    x: width - 120,
    y: height - 50,
    size: 8,
    color: rgb(1, 1, 1)
  });

  // Date
  page.drawText(`दिनांक: ${data.issueDateHindi}`, {
    x: width - 120,
    y: height - 65,
    size: 8,
    color: rgb(1, 1, 1)
  });

  // Main content
  let yPos = height - 120;

  // Title
  page.drawText('सम्मानित सदस्य', {
    x: 50,
    y: yPos,
    size: 12,
    color: rgb(0, 0, 0)
  });
  yPos -= 20;

  // Member name
  page.drawText(data.memberName, {
    x: 50,
    y: yPos,
    size: 12,
    color: rgb(0, 0, 0)
  });
  yPos -= 15;

  // Address
  const address = `${data.fatherName}, ${data.villageName}, ${data.blockName}, ${data.districtName}, ${data.stateName}`;
  page.drawText(address, {
    x: 50,
    y: yPos,
    size: 10,
    color: rgb(0, 0, 0)
  });
  yPos -= 25;

  // Subject
  page.drawText('विषय: सदस्यता प्रमाण पत्र', {
    x: 50,
    y: yPos,
    size: 11,
    color: rgb(0, 0, 0)
  });
  yPos -= 25;

  // Letter content
  const content = [
    'माननीय सदस्य,',
    '',
    'यह प्रमाणित किया जाता है कि आप राष्ट्रीय मानवाधिकार संगठन के सक्रिय सदस्य हैं।',
    'आपको निम्नलिखित पद पर नियुक्त किया गया है:',
    '',
    `पद: ${data.designation}`,
    `क्षेत्र: ${data.locationName}`,
    `सदस्यता संख्या: ${data.member.membershipId}`,
    `प्रारंभ तिथि: ${data.startDate}`,
    `समाप्ति तिथि: ${data.endDate}`,
    '',
    'आपके सभी अधिकार और कर्तव्य संगठन के नियमावली के अनुसार हैं।',
    '',
    'भवदीय,'
  ];

  for (const line of content) {
    if (line === '') {
      yPos -= 10;
    } else {
      page.drawText(line, {
        x: 50,
        y: yPos,
        size: 10,
        color: rgb(0, 0, 0)
      });
      yPos -= 12;
    }
  }

  // Signature section
  yPos -= 30;
  page.drawText('राज्य अध्यक्ष', {
    x: width - 150,
    y: yPos,
    size: 10,
    color: rgb(0, 0, 0)
  });

  // Signature image
  if (data.signatureImage) {
    page.drawImage(data.signatureImage, {
      x: width - 120,
      y: yPos - 40,
      width: 80,
      height: 30
    });
  }

  // Stamp
  if (data.stampImage) {
    page.drawImage(data.stampImage, {
      x: width - 120,
      y: yPos - 80,
      width: 60,
      height: 60
    });
  }

  // QR Code
  if (data.qrCodeImage) {
    page.drawImage(data.qrCodeImage, {
      x: 50,
      y: 100,
      width: 80,
      height: 80
    });
  }

  page.drawText('Scan QR to verify membership', {
    x: 50,
    y: 85,
    size: 8,
    color: rgb(0, 0, 0)
  });

  // Footer
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 40,
    color: rgb(0.99, 0, 0)
  });

  page.drawText('राष्ट्रीय मानवाधिकार संगठन - सभी के लिए न्याय और अधिकार', {
    x: 50,
    y: 15,
    size: 8,
    color: rgb(1, 1, 1)
  });

  page.drawText('वेबसाइट: https://rmas.org.in', {
    x: width - 150,
    y: 15,
    size: 8,
    color: rgb(1, 1, 1)
  });
}

module.exports = { generateJoiningLetter };