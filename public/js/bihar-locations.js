(function(){
  console.log('📌 bihar-locations.js loaded');

  const stateSelect = document.getElementById('stateSelect');
  const parmandalSelect = document.getElementById('parmandalSelect');
  const jilaSelect = document.getElementById('jilaSelect');
  const blockSelect = document.getElementById('blockSelect');
  const locationStatus = document.getElementById('locationStatus');

  if (!stateSelect || !parmandalSelect || !jilaSelect || !blockSelect) {
    console.warn('⚠️ One or more location selects not found; aborting locations.js');
    return;
  }

  // State to JSON file mapping
  const stateJsonMap = {
    'Bihar': '/locations/bihar.json',
    'Uttar Pradesh': '/locations/uttar_pradesh.json',
    'Jharkhand': '/locations/jharkhand.json',
    'West Bengal': '/locations/west_bengal.json',
    'Madhya Pradesh': '/locations/madhya_pradesh.json',
    'Delhi': '/locations/delhi.json'
  };

  let divisionsData = null; // divisions -> districts -> blocks
  let loaded = false;
  let currentState = null;

  function populateSelect(selectEl, options) {
    selectEl.innerHTML = '<option value="">-- चुनें / Select --</option>';
    options.forEach(optValue => {
      const opt = document.createElement('option');
      opt.value = optValue;
      opt.textContent = optValue;
      selectEl.appendChild(opt);
    });
  }

  function clearSelect(selectEl) {
    selectEl.innerHTML = '<option value="">-- चुनें / Select --</option>';
  }

  function clearDependent(from) {
    // chains: state -> parmandal -> jila -> block
    if (from === 'state') {
      clearSelect(parmandalSelect);
      clearSelect(jilaSelect);
      clearSelect(blockSelect);
    } else if (from === 'parmandal') {
      clearSelect(jilaSelect);
      clearSelect(blockSelect);
    } else if (from === 'jila') {
      clearSelect(blockSelect);
    }
  }

  async function loadData(state) {
    if (currentState === state && divisionsData) return;
    
    const jsonFile = stateJsonMap[state];
    if (!jsonFile) {
      console.warn('⚠️ No JSON file mapping for state:', state);
      locationStatus.textContent = 'Location data not available for ' + state;
      return;
    }

    try {
      console.log('🔁 Loading location data for', state, 'from', jsonFile);
      const res = await fetch(jsonFile);
      
      if (!res.ok) throw new Error(jsonFile + ' fetch failed');
      
      divisionsData = await res.json();
      currentState = state;
      loaded = true;
      
      console.log('✅ Location data loaded for', state, { divisions: Object.keys(divisionsData).length });
      locationStatus.textContent = '';
    } catch (err) {
      console.error('❌ Failed to load location JSON', err);
      locationStatus.textContent = 'Failed to load location data for ' + state;
      throw err;
    }
  }

  stateSelect.addEventListener('change', async function(){
    const val = this.value;
    console.log('stateSelect changed ->', val);
    
    if (val && stateJsonMap[val]) {
      try {
        await loadData(val);
        // Get divisions (which are the first-level keys in our JSON format)
        populateSelect(parmandalSelect, Object.keys(divisionsData));
        clearSelect(jilaSelect);
        clearSelect(blockSelect);
        locationStatus.textContent = '';
      } catch (err) {
        console.warn('Could not populate divisions', err);
      }
    } else {
      clearDependent('state');
      if (val) {
        locationStatus.textContent = 'Location data not available for ' + val;
      } else {
        locationStatus.textContent = '';
      }
    }
  });

  parmandalSelect.addEventListener('change', function(){
    const par = this.value;
    console.log('parmandalSelect changed ->', par);
    if (par && divisionsData && divisionsData[par]) {
      // Get districts for the selected division
      populateSelect(jilaSelect, Object.keys(divisionsData[par]));
      clearSelect(blockSelect);
      locationStatus.textContent = '';
    } else {
      clearDependent('parmandal');
      locationStatus.textContent = '';
    }
  });

  jilaSelect.addEventListener('change', function(){
    const jila = this.value;
    const division = parmandalSelect.value;
    console.log('jilaSelect changed ->', jila, 'in division', division);
    
    if (jila && division && divisionsData && divisionsData[division] && divisionsData[division][jila]) {
      const blocks = divisionsData[division][jila];
      populateSelect(blockSelect, blocks);
      locationStatus.textContent = `Found ${blocks.length} blocks for ${jila}`;
    } else {
      clearDependent('jila');
      locationStatus.textContent = 'No blocks available for the selected district.';
    }
  });

  // Preselect if server provided values
  async function applyPreselects() {
    const pre = window.__NHRA_LOCATION || {};
    const preState = stateSelect.value;
    const p = pre.parmandal || '';
    const j = pre.jila || '';
    const b = pre.block || '';

    if (preState && stateJsonMap[preState]) {
      try {
        await loadData(preState);
        populateSelect(parmandalSelect, Object.keys(divisionsData));
        
        if (p && divisionsData[p]) {
          parmandalSelect.value = p;
          parmandalSelect.dispatchEvent(new Event('change'));
        }
        if (j) {
          jilaSelect.value = j;
          jilaSelect.dispatchEvent(new Event('change'));
        }
        if (b) {
          blockSelect.value = b;
        }

        console.log('ℹ️ Applied server preselects', { p, j, b });
      } catch (err) {
        console.warn('⚠️ Preselect application failed', err);
      }
    }
  }

  // On page load, if a state is preselected, populate its divisions
  document.addEventListener('DOMContentLoaded', function(){
    const selectedState = stateSelect.value;
    if (selectedState && stateJsonMap[selectedState]) {
      console.log('DOMContentLoaded:', selectedState, 'already selected; populating divisions');
      loadData(selectedState).then(() => {
        populateSelect(parmandalSelect, Object.keys(divisionsData));
      }).catch(() => {});
    }

    // Apply server-side preselects if any
    applyPreselects();
  });

})();
