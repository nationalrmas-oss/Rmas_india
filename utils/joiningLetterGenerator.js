const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const ejs = require('ejs');
const { getBilingualDesignation } = require('./roleDisplay');
const { formatDOB, formatDateHindi, toTitleCase } = require('./dateUtils');

async function generateJoiningLetter(member) {
  try {
    console.log('🔍 Generating joining letter for:', member.fullName);

    if (!member || member.status !== 'approved') {
      throw new Error('Member not approved');
    }

    // Resolve Puppeteer exec path (env override, then common paths)
    let execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '';
    execPath = execPath ? execPath.replace(/^"(.*)"$/, '$1') : '';
    if (!execPath) {
      const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ];
      execPath = candidates.find(p => fs.existsSync(p)) || '';
    }
    if (!execPath) console.warn('⚠️ No Chrome/Chromium executable found; Puppeteer may fail to launch');
    console.log('Using Puppeteer executablePath:', execPath || 'default bundled');
    const browser = await puppeteer.launch({ headless: 'new', executablePath: execPath || undefined, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
    try {
      const page = await browser.newPage();

      const templatePath = path.join(__dirname, '..', 'views', 'joining-letter.ejs');
      const template = fs.readFileSync(templatePath, 'utf8');

      // images
      let nhraLogo = '';
      let memberPhoto = '';
      let stampBase64 = '';
      let digitalSignature = '';

      try {
        const nhraLogoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpeg');
        if (fs.existsSync(nhraLogoPath)) nhraLogo = fs.readFileSync(nhraLogoPath).toString('base64');
      } catch(e){ console.warn('nhra logo load failed', e.message); }

      // Load member photo (supports multiple upload locations)
      try {
        const isDataUri = typeof member.photo === 'string' && member.photo.startsWith('data:');
        if (isDataUri) {
          memberPhoto = member.photo;
        } else if (member.photo) {
          const photoFilename = member.photo.replace(/^\//, '');
          const pathsToTry = [
            path.join(__dirname, '..', 'public', photoFilename),
            path.join(__dirname, '..', 'public', 'uploads', photoFilename),
            path.join(__dirname, '..', 'uploads', photoFilename),
            path.join(__dirname, '..', photoFilename)
          ];
          let found = false;
          for (const p of pathsToTry) {
            if (fs.existsSync(p)) {
              const raw = fs.readFileSync(p).toString('base64');
              const ext = path.extname(p).toLowerCase().replace('.', '') || 'jpeg';
              const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/jpeg';
              memberPhoto = `data:${mime};base64,${raw}`;
              found = true;
              break;
            }
          }
          if (!found) {
            console.warn('member photo file not found in any expected location:', pathsToTry);
          }
        }
      } catch(e){ console.warn('member photo load failed', e.message); }

      // placeholder signature/stamp
      digitalSignature = 'data:image/png;base64,' + Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toString('base64');
      stampBase64 = digitalSignature;

      // Attempt to load a real stamp image if present
      try {
        const stampPath = path.join(__dirname, '..', 'public', 'images', 'stamp.png');
        if (fs.existsSync(stampPath)) {
          const raw = fs.readFileSync(stampPath).toString('base64');
          stampBase64 = `data:image/png;base64,${raw}`;
        }
      } catch (e) {
        console.warn('stamp image load failed', e.message);
      }

      // Load signature image
      try {
        const sigPath = path.join(__dirname, '..', 'public', 'images', 'signature.png');
        if (fs.existsSync(sigPath)) {
          const raw = fs.readFileSync(sigPath).toString('base64');
          digitalSignature = `data:image/png;base64,${raw}`;
        }
      } catch (e) {
        console.warn('signature image load failed', e.message);
      }

      // QR and verify
      const membershipIdFinal = member.membershipId || 'N/A';
      const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/v/${membershipIdFinal}`;
      const qrCodeDataURL = await QRCode.toDataURL(verifyUrl);

      const issueDateHindi = formatDateHindi(new Date());
      const startDate = issueDateHindi;
      const endDate = formatDateHindi(new Date(new Date().setFullYear(new Date().getFullYear()+1)));

      // map primary assigned role
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

      // Set position details from primaryAssigned if available, otherwise use existing member data
      if (primaryAssigned) {
        member.positionLevel = primaryAssigned.level || member.positionLevel;
        member.assignedPosition = primaryAssigned.role || member.assignedPosition;
        member.teamType = primaryAssigned.teamType || member.teamType || 'Core';
      }
      // Don't override with 'Member' - keep existing member data if no primaryAssigned
      member.positionLocation = { district: member.district, state: member.state };
      console.log('[JOINING-LETTER] Member position:', { positionLevel: member.positionLevel, assignedPosition: member.assignedPosition, teamType: member.teamType, dob: member.dob });

      // --- LocationName logic for template ---
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

      // Format designation and DOB using utilities
      const designation = getBilingualDesignation(member);
      const formattedDOB = formatDOB(member.dob);
      
      // Apply Title Case formatting to names and locations
      const memberName = toTitleCase(member.fullName || '');
      const fatherName = toTitleCase(member.fatherName || member.guardianName || '');
      const districtName = toTitleCase(member.district || '');
      const stateName = toTitleCase(member.state || '');
      const blockName = toTitleCase(member.block || '');
      const villageName = toTitleCase(member.village || '');
      
      console.log('[JOINING-LETTER] Formatted values:', { designation, formattedDOB, memberPositionLevel: member.positionLevel, memberAssignedPosition: member.assignedPosition });

      const html = ejs.render(template, {
        membership: member,
        member: memberForTemplate,
        qrDataUrl: qrCodeDataURL,
        qrCodeDataURL,
        rmasLogo: nhraLogo,
        nhraLogo,
        memberPhoto,
        signatureUrl: digitalSignature,
        officialStamp: stampBase64,
        issueDateHindi,
        date: issueDateHindi,
        startDate,
        endDate,
        membershipId: membershipIdFinal,
        refNo: member.refNo || '',
        verifyUrl,
        signerName: process.env.SIGNER_NAME || 'State President',
        signerDesignation: process.env.SIGNER_DESIGNATION || 'RMAS Bihar',
        orgWebsite: process.env.ORG_WEBSITE || 'https://rmas.org.in',
        orgPhone: process.env.ORG_PHONE || 'N/A',
        orgAddress: process.env.ORG_ADDRESS || 'D-2, S/F, Gali No. 9, Best Jyoti Nagar, Shahdara, Delhi-94',
        stampBase64,
        locationName,
        designation,
        formattedDOB,
        memberName,
        fatherName,
        districtName,
        stateName,
        blockName,
        villageName
      });

      await page.setContent(html, { waitUntil: 'networkidle0' });
      // Use 0 page margins so header can sit flush to top; content margins applied via template
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }, preferCSSPageSize: true });

      const pdfDir = path.join(__dirname, '..', 'public', 'pdfs'); if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
      const pdfFilename = membershipIdFinal.replace(/\//g, '_') + '_joining_letter.pdf';
      const pdfPath = path.join(pdfDir, pdfFilename);
      fs.writeFileSync(pdfPath, pdfBuffer);

      // No DB update needed, just return the PDF path
      console.log('✅ Joining letter generated:', pdfPath);
      await browser.close();
      return `/pdfs/${pdfFilename}`;
    } catch (err) {
      console.error('Error generating joining letter:', err);
      if (browser) await browser.close();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error generating joining letter:', error);
    throw error;
  }
}

module.exports = { generateJoiningLetter };