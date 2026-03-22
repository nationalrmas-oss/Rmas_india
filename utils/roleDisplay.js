// Role bilingual display mapping for RMAS with fixed format: [Hindi] / [English] ([Location])
// Hindi spellings verified: अध्यक्ष, सचिव, महिला, प्रमंडल, ज़िला, ब्लॉक, पंचायत
const ROLE_DISPLAY_BILINGUAL = {
  MEMBER: 'सदस्य / Member',
  SUPERADMIN: 'सुपर एडमिन / Super Admin',
  
  // NATIONAL LEVEL
  NATIONAL_PRESIDENT: 'राष्ट्रीय अध्यक्ष / National President',
  NATIONAL_ADHYAKSH: 'राष्ट्रीय अध्यक्ष / National President',
  NATIONAL_SECRETARY: 'राष्ट्रीय सचिव / National Secretary',
  NATIONAL_SANCHIV: 'राष्ट्रीय सचिव / National Secretary',
  
  // STATE LEVEL
  STATE_PRESIDENT: 'प्रदेश अध्यक्ष / State President',
  STATE_ADHYAKSH: 'प्रदेश अध्यक्ष / State President',
  STATE_VICE_PRESIDENT: 'प्रदेश उपाध्यक्ष / State Vice President',
  STATE_UPAADHYAKSH: 'प्रदेश उपाध्यक्ष / State Vice President',
  STATE_SECRETARY: 'प्रदेश सचिव / State Secretary',
  STATE_SANCHIV: 'प्रदेश सचिव / State Secretary',
  STATE_TREASURER: 'प्रदेश कोषाध्यक्ष / State Treasurer',
  STATE_MEDIA_INCHARGE: 'प्रदेश मीडिया प्रभारी / State Media Incharge',
  STATE_WOMEN: 'प्रदेश महिला अध्यक्ष / State Women President',
  STATE_YOUTH: 'प्रदेश युवा अध्यक्ष / State Youth President',
  
  // DIVISIONAL LEVEL
  DIVISION_PRESIDENT: 'प्रमंडल अध्यक्ष / Divisional President',
  DIVISION_ADHYAKSH: 'प्रमंडल अध्यक्ष / Divisional President',
  DIVISION_SECRETARY: 'प्रमंडल सचिव / Divisional Secretary',
  DIVISION_SANCHIV: 'प्रमंडल सचिव / Divisional Secretary',
  DIVISION_MEDIA_INCHARGE: 'प्रमंडल मीडिया प्रभारी / Divisional Media Incharge',
  DIVISION_WOMEN: 'प्रमंडल महिला अध्यक्ष / Divisional Women President',
  DIVISION_YOUTH: 'प्रमंडल युवा अध्यक्ष / Divisional Youth President',
  
  // DISTRICT LEVEL
  DISTRICT_PRESIDENT: 'ज़िला अध्यक्ष / District President',
  DISTRICT_ADHYAKSH: 'ज़िला अध्यक्ष / District President',
  DISTRICT_VICE_PRESIDENT: 'ज़िला उपाध्यक्ष / District Vice President',
  DISTRICT_UPAADHYAKSH: 'ज़िला उपाध्यक्ष / District Vice President',
  DISTRICT_SECRETARY: 'ज़िला सचिव / District Secretary',
  DISTRICT_SANCHIV: 'ज़िला सचिव / District Secretary',
  DISTRICT_TREASURER: 'ज़िला कोषाध्यक्ष / District Treasurer',
  DISTRICT_MEDIA_INCHARGE: 'ज़िला मीडिया प्रभारी / District Media Incharge',
  DISTRICT_WOMEN: 'ज़िला महिला अध्यक्ष / District Women President',
  DISTRICT_YOUTH: 'ज़िला युवा अध्यक्ष / District Youth President',
  
  // BLOCK LEVEL
  BLOCK_PRESIDENT: 'ब्लॉक अध्यक्ष / Block President',
  BLOCK_ADHYAKSH: 'ब्लॉक अध्यक्ष / Block President',
  BLOCK_SECRETARY: 'ब्लॉक सचिव / Block Secretary',
  BLOCK_SANCHIV: 'ब्लॉक सचिव / Block Secretary',
  BLOCK_MEDIA_INCHARGE: 'ब्लॉक मीडिया प्रभारी / Block Media Incharge',
  BLOCK_WOMEN: 'ब्लॉक महिला अध्यक्ष / Block Women President',
  BLOCK_YOUTH: 'ब्लॉक युवा अध्यक्ष / Block Youth President',
  
  // PANCHAYAT LEVEL
  PANCHAYAT_PRESIDENT: 'पंचायत अध्यक्ष / Panchayat President',
  PANCHAYAT_ADHYAKSH: 'पंचायत अध्यक्ष / Panchayat President',
  PANCHAYAT_SECRETARY: 'पंचायत सचिव / Panchayat Secretary',
  PANCHAYAT_SANCHIV: 'पंचायत सचिव / Panchayat Secretary',
  PANCHAYAT_WOMEN: 'पंचायत महिला अध्यक्ष / Panchayat Women President',
  PANCHAYAT_YOUTH: 'पंचायत युवा अध्यक्ष / Panchayat Youth President'
};

/**
 * Team type bilingual mapping
 * Maps team types to their bilingual names
 */
const TEAM_DISPLAY = {
  'Core': { hindi: '', english: '' }, // Core team shows no team name
  'Mahila': { hindi: 'महिला', english: 'Women' },
  'Yuva': { hindi: 'युवा', english: 'Youth' },
  'Alpsankhyak': { hindi: 'अल्पसंख्यक', english: 'Alpsankhyak' },
  'SC/ST': { hindi: 'एससी/एसटी', english: 'SC/ST' }
};

/**
 * Get bilingual designation for a member with location
 * Format Rules:
 * - Core Team: Level + Role + (Location)
 *   Example: "District President (Purnia) / जिला अध्यक्ष (पूर्णिया)"
 * - Other Teams: Level + Team + Role + (Location)
 *   Example: "Divisional Women President (Bhagalpur) / प्रमंडल महिला अध्यक्ष (भागलपुर)"
 * @param {Object} member - Member object with designation info
 * @returns {string} Bilingual designation with location
 */
function getBilingualDesignation(member) {
  if (!member || !member.assignedPosition) {
    return ROLE_DISPLAY_BILINGUAL.MEMBER || 'सदस्य / Member';
  }

  console.log('[ROLE-DISPLAY] Input:', {
    assignedPosition: member.assignedPosition,
    positionLevel: member.positionLevel,
    teamType: member.teamType,
    division: member.division,
    district: member.district,
    block: member.block
  });

  // Determine location based on position level
  let location = '';
  if (member.positionLevel === 'National') {
    location = 'India';
  } else if (member.positionLevel === 'State') {
    location = member.state || member.location?.state || '';
  } else if (member.positionLevel === 'Division') {
    location = member.division || member.divisionalName || member.location?.division || '';
  } else if (member.positionLevel === 'District') {
    location = member.district || member.location?.district || member.positionLocation?.district || '';
  } else if (member.positionLevel === 'Block') {
    location = member.block || member.location?.block || member.positionLocation?.block || '';
  } else if (member.positionLevel === 'Panchayat') {
    location = member.panchayat || member.location?.panchayat || member.positionLocation?.panchayat || '';
  }

  // Build base designation (without location or team)
  let baseDesignation = '';
  const levelPrefix = member.positionLevel?.toUpperCase() || '';
  const positionSuffix = member.assignedPosition ? member.assignedPosition.replace(/\s+/g, '_').toUpperCase() : '';
  
  if (levelPrefix && positionSuffix && levelPrefix !== 'MEMBER') {
    const roleKey = `${levelPrefix}_${positionSuffix}`;
    baseDesignation = ROLE_DISPLAY_BILINGUAL[roleKey] || 
                     `${member.positionLevel} ${member.assignedPosition}`;
  } else {
    baseDesignation = ROLE_DISPLAY_BILINGUAL.MEMBER || 'सदस्य / Member';
  }

  console.log('[ROLE-DISPLAY] Base designation:', baseDesignation);

  // Handle team type insertion for non-Core teams
  const teamType = member.teamType || 'Core';
  const isNonCoreTeam = teamType !== 'Core' && TEAM_DISPLAY[teamType];

  if (isNonCoreTeam) {
    console.log('[ROLE-DISPLAY] Processing non-Core team:', teamType);
    const teamInfo = TEAM_DISPLAY[teamType];
    
    // Split bilingual designation
    const parts = baseDesignation.split(' / ');
    if (parts.length === 2) {
      const [hindi, english] = parts;
      const hindiWords = hindi.split(' ');
      const englishWords = english.split(' ');
      
      // Insert team after level name, before role (at position 1)
      if (hindiWords.length > 1 && teamInfo.hindi) {
        hindiWords.splice(1, 0, teamInfo.hindi);
      }
      if (englishWords.length > 1 && teamInfo.english) {
        englishWords.splice(1, 0, teamInfo.english);
      }
      
      baseDesignation = hindiWords.join(' ') + ' / ' + englishWords.join(' ');
      console.log('[ROLE-DISPLAY] After team insertion:', baseDesignation);
    }
  } else {
    console.log('[ROLE-DISPLAY] Core team or no team. No team insertion.');
  }

  // Append location in brackets
  if (location) {
    baseDesignation += ` (${location})`;
  }

  console.log('[ROLE-DISPLAY] Final designation:', baseDesignation);
  return baseDesignation;
}

module.exports = { ROLE_DISPLAY_BILINGUAL, getBilingualDesignation };