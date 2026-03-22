// ============================================================
// RMAS Multi-Step Form Wizard with Preview
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('membershipForm');
  
  // Step management
  let currentStep = 1;
  const totalSteps = 3;
  
  // Required fields per step
  const stepFields = {
    1: ['fullName', 'fatherName', 'dob', 'gender', 'mobile', 'email'],
    2: ['stateSelect', 'parmandalSelect', 'jilaSelect', 'blockSelect'],
    3: ['photoInput', 'documentsInput', 'reason', 'agreedToTerms']
  };

  // ============================================================
  // HELPER: Get field value (handles different input types)
  // ============================================================
  function getFieldValue(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return false;

    if (field.type === 'checkbox') {
      return field.checked;
    }
    if (field.type === 'file') {
      return field.files.length > 0;
    }
    if (field.tagName === 'SELECT') {
      return field.value.trim() !== '';
    }
    return field.value.trim() !== '';
  }

  // ============================================================
  // VALIDATION: Check all required fields for current step
  // ============================================================
  function validateStep(step) {
    const errors = [];
    const fields = stepFields[step];

    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (!field) return;

      // Get field value
      let isValid = false;
      if (field.type === 'checkbox') {
        isValid = field.checked;
      } else if (field.type === 'file') {
        isValid = field.files.length > 0;
      } else if (field.tagName === 'SELECT') {
        isValid = field.value.trim() !== '';
      } else {
        isValid = field.value.trim() !== '';
      }

      // Custom validations
      if (isValid) {
        // Mobile: must be 10 digits
        if (fieldId === 'mobile' && !/^\d{10}$/.test(field.value)) {
          isValid = false;
          errors.push('📱 मोबाइल नंबर 10 अंकों का होना चाहिए');
        }

        // Email: basic email validation
        if (fieldId === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
          isValid = false;
          errors.push('📧 सही ईमेल एड्रेस दर्ज करें');
        }

        // DOB: dd/mm/yyyy format
        if (fieldId === 'dob' && !/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(field.value)) {
          isValid = false;
          errors.push('📅 जन्म तिथि dd/mm/yyyy में होनी चाहिए');
        }

        // Photo: check file type and size
        if (fieldId === 'photoInput' && field.files.length > 0) {
          const file = field.files[0];
          if (!file.type.startsWith('image/')) {
            isValid = false;
            errors.push('📷 केवल इमेज फाइल चुनें (JPG, PNG)');
          }
          // maximum 100KB
          if (file.size > 100 * 1024) {
            isValid = false;
            errors.push('📷 फोटो 100KB से कम होनी चाहिए');
          }
        }

        // Documents: check PDF and size
        if (fieldId === 'documentsInput' && field.files.length > 0) {
          const file = field.files[0];
          if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
            isValid = false;
            errors.push('📄 केवल PDF फाइल चुनें');
          }
          // maximum 100KB
          if (file.size > 100 * 1024) {
            isValid = false;
            errors.push('📄 दस्तावेज़ 100KB से कम होना चाहिए');
          }
        }
      }

      // If not valid and required, add error
      if (!isValid) {
        const label = field.previousElementSibling ? 
          field.previousElementSibling.textContent.trim() : 
          fieldId;
        if (!errors.includes(`${label} required`)) {
          errors.push(`⚠️ कृपया ${label} भरें`);
        }
      }
    });

    return errors;
  }

  // ============================================================
  // CORE: Show specific step
  // ============================================================
  function showStep(stepNum) {
    console.log(`📍 Showing Step ${stepNum}`);

    // Hide all steps
    document.querySelectorAll('.step-container').forEach(el => {
      el.classList.add('hidden');
    });

    // Show current step
    const activeStep = document.getElementById(`step${stepNum}`);
    if (activeStep) {
      activeStep.classList.remove('hidden');
    }

    // Update current step variable
    currentStep = stepNum;

    // Update progress bar
    const progress = (stepNum / totalSteps) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('currentStep').textContent = stepNum;

    // Update button visibility (use classList since .hidden has !important)
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Previous button - show only on steps 2+
    if (stepNum > 1) {
      prevBtn.classList.remove('hidden');
    } else {
      prevBtn.classList.add('hidden');
    }

    // Next button - show only on steps 1-2
    if (stepNum < totalSteps) {
      nextBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.add('hidden');
    }

    // Submit button - show only on step 3
    if (stepNum === totalSteps) {
      submitBtn.classList.remove('hidden');
    } else {
      submitBtn.classList.add('hidden');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================================
  // GENERATE PREVIEW HTML
  // ============================================================
  function generatePreviewHTML() {
    const html = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- STEP 1 PREVIEW -->
        <div class="border-l-4 border-blue-600 pl-4">
          <h3 class="text-lg font-bold text-blue-900 mb-4">व्यक्तिगत जानकारी</h3>
          <div class="space-y-2 text-sm">
            <p><strong>पूर्ण नाम:</strong> ${form.elements['fullName'].value}</p>
            <p><strong>पिता/पति का नाम:</strong> ${form.elements['fatherName'].value}</p>
            <p><strong>जन्म तिथि:</strong> ${form.elements['dob'].value}</p>
            <p><strong>लिंग:</strong> ${form.elements['gender'].value}</p>
            <p><strong>मोबाइल:</strong> ${form.elements['mobile'].value}</p>
            <p><strong>ईमेल:</strong> ${form.elements['email'].value}</p>
            <p><strong>रक्त समूह:</strong> ${form.elements['bloodGroup'].value || 'Not specified'}</p>
            <p><strong>शिक्षा:</strong> ${form.elements['education'].value || 'Not specified'}</p>
            <p><strong>पेशा:</strong> ${form.elements['occupation'].value || 'Not specified'}</p>
            <p><strong>आधार नंबर:</strong> ${form.elements['idNumber'].value || 'Not specified'}</p>
          </div>
        </div>

        <!-- STEP 2 PREVIEW -->
        <div class="border-l-4 border-green-600 pl-4">
          <h3 class="text-lg font-bold text-green-900 mb-4">स्थान विवरण</h3>
          <div class="space-y-2 text-sm">
            <p><strong>राज्य:</strong> ${form.elements['state'].value}</p>
            <p><strong>प्रमंडल:</strong> ${form.elements['division'].value || '-'}</p>
            <p><strong>जिला:</strong> ${form.elements['district'].value || '-'}</p>
            <p><strong>ब्लॉक:</strong> ${form.elements['block'].value || '-'}</p>
            <p><strong>मकान नंबर:</strong> ${form.elements['houseNo'].value || '-'}</p>
            <p><strong>गली/सड़क:</strong> ${form.elements['street'].value || '-'}</p>
            <p><strong>पंचायत:</strong> ${form.elements['panchayat'].value || '-'}</p>
            <p><strong>गांव:</strong> ${form.elements['village'].value || '-'}</p>
            <p><strong>पिन कोड:</strong> ${form.elements['pincode'].value || '-'}</p>
          </div>
        </div>

        <!-- STEP 3 PREVIEW -->
        <div class="col-span-1 md:col-span-2 border-l-4 border-orange-600 pl-4">
          <h3 class="text-lg font-bold text-orange-900 mb-4">दस्तावेज़ और समझौता</h3>
          <div class="space-y-2 text-sm">
            <p><strong>फोटो:</strong> ${form.elements['photo'].files.length > 0 ? '✓ अपलोड किया गया' : '✗ अपलोड नहीं किया'}</p>
            <p><strong>दस्तावेज़ (PDF):</strong> ${form.elements['documents'].files.length > 0 ? '✓ ' + form.elements['documents'].files[0].name : '✗ अपलोड नहीं किया'}</p>
            <p><strong>संस्था से जुड़ने का उद्देश्य:</strong></p>
            <p class="bg-gray-100 p-3 rounded mt-1 italic">"${form.elements['reason'].value}"</p>
            <p class="mt-2"><strong>नियमों की सहमति:</strong> ${form.elements['agreedToTerms'].checked ? '✓ सहमत' : '✗ सहमत नहीं'}</p>
          </div>
        </div>
      </div>
    `;
    return html;
  }

  // ============================================================
  // SHOW PREVIEW MODAL
  // ============================================================
  window.showPreview = function() {
    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = generatePreviewHTML();
    previewModal.classList.remove('hidden');
  };

  // ============================================================
  // CLOSE PREVIEW MODAL
  // ============================================================
  window.closePreview = function() {
    document.getElementById('previewModal').classList.add('hidden');
  };

  // ============================================================
  // EDIT FORM (CLOSE PREVIEW AND GO TO CURRENT STEP)
  // ============================================================
  window.editForm = function() {
    closePreview();
    showStep(currentStep);
  };

  // ============================================================
  // FINAL SUBMIT (ACTUALLY SUBMIT FORM)
  // ============================================================
  window.finalSubmit = function() {
    console.log('📤 Finally submitting form...');
    form.submit();
  };

  // ============================================================
  // EVENT: Next Button Click
  // ============================================================
  document.getElementById('nextBtn').addEventListener('click', function(e) {
    e.preventDefault();

    console.log(`➡️ Next clicked from Step ${currentStep}`);

    // Validate current step
    const errors = validateStep(currentStep);

    if (errors.length > 0) {
      alert('❌ कृपया सभी आवश्यक फ़ील्ड भरें:\n\n' + errors.join('\n'));
      return;
    }

    // Move to next step
    if (currentStep < totalSteps) {
      showStep(currentStep + 1);
    }
  });

  // ============================================================
  // EVENT: Previous Button Click
  // ============================================================
  document.getElementById('prevBtn').addEventListener('click', function(e) {
    e.preventDefault();

    console.log(`⬅️ Previous clicked from Step ${currentStep}`);

    // Go back without validation
    if (currentStep > 1) {
      showStep(currentStep - 1);
    }
  });

  // ============================================================
  // EVENT: Submit Button Click (Show Preview)
  // ============================================================
  document.getElementById('submitBtn').addEventListener('click', function(e) {
    e.preventDefault();

    console.log('👁️ Submit clicked - showing preview');

    // Validate step 3 before showing preview
    const errors = validateStep(3);

    if (errors.length > 0) {
      alert('❌ कृपया सभी आवश्यक फ़ील्ड भरें:\n\n' + errors.join('\n'));
      return;
    }

    // Show preview modal
    showPreview();
  });

  // ============================================================
  // EVENT: Photo Preview
  // ============================================================
  const photoInput = document.getElementById('photoInput');
  if (photoInput) {
    photoInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const preview = document.getElementById('photoPreviewImg');
        preview.src = evt.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  // ============================================================
  // EVENT: Document File Name Display
  // ============================================================
  const docsInput = document.getElementById('documentsInput');
  if (docsInput) {
    docsInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      const fileName = document.getElementById('docFileName');
      if (file) {
        fileName.textContent = '✓ ' + file.name + ' अपलोड किया जाएगा';
        fileName.classList.remove('hidden');
      } else {
        fileName.classList.add('hidden');
      }
    });
  }

  // ============================================================
  // Initialize date picker (flatpickr) for DOB if available
  // ============================================================
  if (window.flatpickr) {
    flatpickr('#dob', {
      dateFormat: 'd/m/Y',
      maxDate: 'today',
      allowInput: true
    });
  }

  // ============================================================
  // INITIALIZE: Start with Step 1
  // ============================================================
  console.log('🎯 Form Wizard initialized');
  showStep(1);
});
