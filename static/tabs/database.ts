window.Tabs = window.Tabs || {};

window.Tabs.database = async (container) => {
    const schema = await window.API.database.schema();
    
    let html = `
        <h2 style="margin-bottom: 1.5rem;">State Database (state.db)</h2>
        
        <div style="display: flex; gap: 2rem; margin-bottom: 2rem;">
            <div style="flex: 1; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px;">
                <h3 style="margin-bottom: 1rem;">Schema</h3>
                <ul style="list-style: none;">
                    ${schema.map(table => `<li style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'" onclick="document.getElementById('sql-input').value='SELECT * FROM ${table} LIMIT 10;'">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2" style="vertical-align: text-bottom; margin-right: 0.5rem;">
                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                        </svg>
                        ${table}
                    </li>`).join('')}
                </ul>
            </div>
            
            <div style="flex: 2;">
                <h3 style="margin-bottom: 1rem;">SQL Console (Read-only)</h3>
                <textarea id="sql-input" style="width: 100%; height: 100px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; font-family: var(--font-mono); font-size: 0.85rem; margin-bottom: 1rem;" placeholder="SELECT * FROM facts;"></textarea>
                <button class="btn btn-primary" id="btn-run-query">Run Query</button>
            </div>
        </div>

        <div id="query-results" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; min-height: 200px; display: none;">
            <h3 style="margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-secondary);">Results</h3>
            <div id="results-table-container"></div>
        </div>
    `;

    container.innerHTML = html;

    const btn = document.getElementById('btn-run-query');
    const input = document.getElementById('sql-input');
    const resultsDiv = document.getElementById('query-results');
    const tableContainer = document.getElementById('results-table-container');

    btn.addEventListener('click', async () => {
        const query = input.value.trim();
        if (!query) return;

        btn.disabled = true;
        btn.textContent = 'Running...';
        
        try {
            const data = await window.API.database.query(query);
            resultsDiv.style.display = 'block';
            
            if (data.rows.length === 0) {
                tableContainer.innerHTML = '<p style="color: var(--text-secondary);">0 rows returned.</p>';
            } else {
                tableContainer.innerHTML = `
                    <table class="data-table">
                        <thead><tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${data.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                        </tbody>
                    </table>
                `;
            }
        } catch (error) {
            resultsDiv.style.display = 'block';
            tableContainer.innerHTML = `<div style="color: var(--danger); background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3);">${error.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Run Query';
        }
    });
};
