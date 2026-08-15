window.Tabs = window.Tabs || {};

window.Tabs.memory = async (container) => {
    const sem = await window.API.memory.semantic();
    const epis = await window.API.memory.episodic();
    const proc = await window.API.memory.procedural();

    let html = `
        <h2 style="margin-bottom: 1.5rem;">Memory Pillars</h2>
        
        <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
            <button class="btn btn-secondary" onclick="showMemTab('sem')">Semantic</button>
            <button class="btn btn-secondary" onclick="showMemTab('epis')">Episodic</button>
            <button class="btn btn-secondary" onclick="showMemTab('proc')">Procedural</button>
        </div>

        <div id="mem-sem" class="mem-view active">
            <h3 style="margin-bottom: 1rem;">Semantic Facts</h3>
            <table class="data-table">
                <thead><tr><th>ID</th><th>Content</th><th>Source</th><th>Created</th></tr></thead>
                <tbody>
                    ${sem.map(f => `<tr><td>${f.id}</td><td>${f.content}</td><td>${f.source}</td><td>${f.created_at}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>

        <div id="mem-epis" class="mem-view" style="display:none;">
            <h3 style="margin-bottom: 1rem;">Episodic Memory</h3>
            <table class="data-table">
                <thead><tr><th>ID</th><th>Date</th><th>Summary</th></tr></thead>
                <tbody>
                    ${epis.map(e => `<tr><td>${e.id}</td><td>${e.date}</td><td>${e.summary}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>

        <div id="mem-proc" class="mem-view" style="display:none;">
            <h3 style="margin-bottom: 1rem;">Procedural Memory (Skills)</h3>
            <table class="data-table">
                <thead><tr><th>Name</th><th>Description</th><th>Origin</th></tr></thead>
                <tbody>
                    ${proc.map(p => `<tr><td>${p.name}</td><td>${p.description}</td><td>${p.origin}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    window.showMemTab = (id) => {
        document.querySelectorAll('.mem-view').forEach(el => el.style.display = 'none');
        document.getElementById('mem-' + id).style.display = 'block';
    };
};
