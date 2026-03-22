const moment = require('moment');

/**
 * Convert string to Title Case (first letter of each word capital)
 * @param {string} str
 * @returns {string}
 */
function toTitleCase(str) {
  if (!str || typeof str !== 'string') return str || '';
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Format DOB for PDF display (DD/MM/YYYY)
 * Handles Date objects, ISO strings, and DD/MM/YYYY strings already in DB
 * @param {string|Date|null} dob
 * @returns {string} Formatted date or '—'
 */
function formatDOB(dob) {
  try {
    // Handle null/undefined
    if (!dob) {
      return '—';
    }

    // If already in DD/MM/YYYY format (from database), return as is
    if (typeof dob === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      return dob;
    }

    // Try parsing with moment - try ISO format first
    let m;
    if (typeof dob === 'string') {
      // Try ISO format (YYYY-MM-DD)
      m = moment(dob, 'YYYY-MM-DD', true);
      if (!m.isValid()) {
        // Try DD/MM/YYYY format
        m = moment(dob, 'DD/MM/YYYY', true);
      }
    } else {
      // For Date objects
      m = moment(dob);
    }
    
    // Check if valid date
    if (!m.isValid()) {
      console.warn('Invalid DOB format:', dob);
      return '—';
    }

    // Check if date is reasonable (between 1900 and today)
    const year = m.year();
    if (year < 1900 || m.isAfter(moment())) {
      console.warn('DOB out of reasonable range:', dob);
      return '—';
    }

    return m.format('DD/MM/YYYY');
  } catch (error) {
    console.error('Error formatting DOB:', error.message, 'Input:', dob);
    return '—';
  }
}

/**
 * Format date for letter header (long format)
 * @param {Date} date
 * @returns {string}
 */
function formatDateLong(date) {
  try {
    if (!date) return '';
    const m = moment(date);
    if (!m.isValid()) return '';
    return m.format('DD MMMM YYYY');
  } catch (error) {
    console.error('Error formatting long date:', error.message);
    return '';
  }
}

/**
 * Format date in Hindi long format
 * @param {Date} date
 * @returns {string}
 */
function formatDateHindi(date) {
  try {
    if (!date) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('hi-IN', options);
  } catch (error) {
    console.error('Error formatting Hindi date:', error.message);
    return '';
  }
}

module.exports = { formatDOB, formatDateLong, formatDateHindi, toTitleCase };