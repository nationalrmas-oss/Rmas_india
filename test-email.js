const { sendOtpEmail } = require('./utils/mailer');

async function testOtpEmail() {
  try {
    console.log('Testing OTP email sending...');
    const result = await sendOtpEmail('test@example.com', '123456', 'Test User');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testOtpEmail();