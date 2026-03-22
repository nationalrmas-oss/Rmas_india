/**
 * Text formatting utilities for professional presentation
 */

/**
 * Convert text to Title Case (First letter of each word capitalized)
 * @param {string} text - Text to convert
 * @returns {string} Title cased text
 */
function toTitleCase(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      // Don't capitalize direction words, articles, etc. unless they're first word
      const lowercaseWords = ['of', 'and', 'the', 'in', 'at', 'to', 'by'];
      if (word.length <= 2 && lowercaseWords.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Format name to Title Case
 * @param {string} name - Full name
 * @returns {string} Formatted name
 */
function formatName(name) {
  if (!name) return '';
  return toTitleCase(name);
}

/**
 * Format location name to Title Case
 * @param {string} location - Location name
 * @returns {string} Formatted location
 */
function formatLocation(location) {
  if (!location) return '';
  return toTitleCase(location);
}

/**
 * Capitalize first letter only
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

module.exports = {
  toTitleCase,
  formatName,
  formatLocation,
  capitalize
};
