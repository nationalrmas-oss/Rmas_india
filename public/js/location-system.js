/**
 * RMAS National - Universal Location System
 * Single function for dynamic dropdown population
 */

function initLocationSystem(stateId, divisionId, districtId, blockId) {
    const stateSelect = document.getElementById(stateId);
    const divisionSelect = document.getElementById(divisionId);
    const districtSelect = document.getElementById(districtId);
    const blockSelect = document.getElementById(blockId);
    
    let stateData = null;

    async function loadStates() {
        try {
            const res = await fetch('/locations/states.json');
            if (!res.ok) throw new Error("states.json not found");
            const data = await res.json();
            
            stateSelect.innerHTML = '<option value="">-- Select State --</option>';
            data.active_states.forEach(s => {
                stateSelect.add(new Option(s.name, s.name));
            });
        } catch (e) {
            console.error("Load States Error:", e);
            alert("Unable to load states data. Please refresh the page.");
        }
    }

    async function loadDivisions() {
        reset(1);
        const stateName = stateSelect.value;
        if (!stateName) return;

        const fileName = stateName.toLowerCase().replace(/ /g, '_') + '.json';

        try {
            const res = await fetch(`/locations/${fileName}`);
            if (!res.ok) throw new Error("State file not found");
            
            stateData = await res.json();

            // Division: data.divisions ke keys uthao
            const rawDivs = stateData.divisions ? Object.keys(stateData.divisions) : [];
            
            // Metadata keys jaise 'state' ya 'divisions' ko filter out kar dena
            const cleanDivs = rawDivs.filter(key => key !== 'state' && key !== 'divisions');

            divisionSelect.innerHTML = '<option value="">-- Select Division --</option>';
            cleanDivs.forEach(div => {
                divisionSelect.add(new Option(div, div));
            });
            divisionSelect.disabled = false;

        } catch (e) {
            alert("Is state ka data jald hi update hoga");
            console.error("Load Division Error:", e);
        }
    }

    function loadDistricts() {
        reset(2);
        const selectedDiv = divisionSelect.value;
        if (!selectedDiv || !stateData || !stateData.divisions[selectedDiv]) return;

        // District: data.divisions[selectedDiv].districts ki keys uthao
        const districts = Object.keys(stateData.divisions[selectedDiv].districts || {});
        
        districtSelect.innerHTML = '<option value="">-- Select District --</option>';
        districts.forEach(dist => {
            districtSelect.add(new Option(dist, dist));
        });
        districtSelect.disabled = false;
    }

    function loadBlocks() {
        reset(3);
        const selectedDiv = divisionSelect.value;
        const selectedDist = districtSelect.value;
        if (!selectedDist || !stateData || !stateData.divisions[selectedDiv] || !stateData.divisions[selectedDiv].districts[selectedDist]) return;

        // Block: data.divisions[selectedDiv].districts[selectedDist] ka array uthao
        const blocks = stateData.divisions[selectedDiv].districts[selectedDist] || [];
        
        blockSelect.innerHTML = '<option value="">-- Select Block --</option>';
        blocks.forEach(block => {
            blockSelect.add(new Option(block, block));
        });
        blockSelect.disabled = false;
    }

    function reset(level) {
        const drops = [divisionSelect, districtSelect, blockSelect];
        const placeholders = ['Division', 'District', 'Block'];
        
        for (let i = level - 1; i < drops.length; i++) {
            drops[i].innerHTML = `<option value="">-- Select ${placeholders[i]} --</option>`;
            drops[i].disabled = true;
        }
    }

    // Initialize states and attach event listeners
    loadStates();
    stateSelect.onchange = loadDivisions;
    divisionSelect.onchange = loadDistricts;
    districtSelect.onchange = loadBlocks;
}