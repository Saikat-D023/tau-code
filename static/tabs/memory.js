window.Tabs = window.Tabs || {};

window.Tabs.memory = async (container) => {
    const sem = await window.API.memory.semantic();
    const epis = await window.API.memory.episodic();
    const proc = await window.API.memory.procedural();

    const table = (head, rows, cols) => `
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>
                    ${rows.length
                        ? rows.map(r => `<tr>${cols.map(c => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('')
                        : `<tr><td class="empty" colspan="${head.length}">Nothing stored yet.</td></tr>`}
                </tbody>
            </table>
        </div>`;

    container.innerHTML = `
        <h2>Memory Pillars</h2>

        <div class="seg">
            <button class="btn on" data-mem="sem">Semantic</button>
            <button class="btn" data-mem="epis">Episodic</button>
            <button class="btn" data-mem="proc">Procedural</button>
        </div>

        <div id="mem-sem" class="mem-view">${table(['ID', 'Content', 'Source', 'Created'], sem, ['id', 'content', 'source', 'created_at'])}</div>
        <div id="mem-epis" class="mem-view" style="display:none;">${table(['ID', 'Date', 'Summary'], epis, ['id', 'date', 'summary'])}</div>
        <div id="mem-proc" class="mem-view" style="display:none;">${table(['Name', 'Description', 'Origin'], proc, ['name', 'description', 'origin'])}</div>
    `;

    container.querySelectorAll('.seg .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.seg .btn').forEach(b => b.classList.toggle('on', b === btn));
            container.querySelectorAll('.mem-view').forEach(el => el.style.display = 'none');
            container.querySelector('#mem-' + btn.dataset.mem).style.display = 'block';
        });
    });
};
