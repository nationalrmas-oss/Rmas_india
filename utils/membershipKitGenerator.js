const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { generateIdCard } = require('./idCardGenerator');
const { generateJoiningLetter } = require('./joiningLetterGenerator');

async function generateMembershipKit(member) {
  try {
    console.log('🔍 Generating Membership Kit for:', member.fullName);

    if (!member || member.status !== 'approved') {
      throw new Error('Member not approved');
    }

    if (!member.isIDCardApproved) {
      throw new Error('ID Card approval pending');
    }

    // Generate individual PDFs
    const idCardUrl = await generateIdCard(member);
    const joiningLetterUrl = await generateJoiningLetter(member);

    // Paths to the generated PDFs
    const idCardPath = path.join(__dirname, '..', 'public', idCardUrl);
    const joiningLetterPath = path.join(__dirname, '..', 'public', joiningLetterUrl);

    // Load PDFs
    const idCardBytes = fs.readFileSync(idCardPath);
    const joiningLetterBytes = fs.readFileSync(joiningLetterPath);

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Load ID Card PDF
    const idCardDoc = await PDFDocument.load(idCardBytes);
    const idCardPages = await mergedPdf.copyPages(idCardDoc, idCardDoc.getPageIndices());
    idCardPages.forEach(page => mergedPdf.addPage(page));

    // Load Joining Letter PDF
    const joiningLetterDoc = await PDFDocument.load(joiningLetterBytes);
    const joiningLetterPages = await mergedPdf.copyPages(joiningLetterDoc, joiningLetterDoc.getPageIndices());
    joiningLetterPages.forEach(page => mergedPdf.addPage(page));

    // Serialize the merged PDF
    const mergedPdfBytes = await mergedPdf.save();

    // Save the merged PDF
    const kitDir = path.join(__dirname, '..', 'public', 'pdfs');
    if (!fs.existsSync(kitDir)) {
      fs.mkdirSync(kitDir, { recursive: true });
    }

    const kitFilename = `RMAS_Membership_Kit_${member.membershipId.replace(/\//g, '_')}.pdf`;
    const kitPath = path.join(kitDir, kitFilename);
    fs.writeFileSync(kitPath, mergedPdfBytes);

    console.log('✅ Membership Kit generated:', kitPath);

    return `/pdfs/${kitFilename}`;
  } catch (error) {
    console.error('❌ Error generating Membership Kit:', error.message);
    throw new Error(`Membership kit generation failed: ${error.message}`);
  }
}

module.exports = { generateMembershipKit };
