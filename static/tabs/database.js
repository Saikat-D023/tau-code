window.Tabs = window.Tabs || {};

window.Tabs.database = async (container) => {
    const schema = await window.API.database.schema();

    container.innerHTML = `
        <h2>State Database (state.db)</h2>

        <div class="db-grid">
            <div class="panel">
                <div class="panel-header"><h3>Schema</h3></div>
                ${schema.map(table => `
                    <div class="schema-item" data-table="${table}">
                        <svg viewBox="0 0 24 24">
                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                        </svg>
                        ${table}
                    </div>`).join('')}
            </div>

            <div class="panel">
                <div class="panel-header"><h3>SQL Console</h3><span class="panel-meta">read-only</span></div>
                <textarea id="sql-input" placeholder="SELECT * FROM facts;"></textarea>
                <button class="btn btn-primary" id="btn-run-query">Run Query</button>
            </div>
        </div>

        <div id="query-results" class="panel" style="display: none;">
            <div class="panel-header"><h3>Results</h3></div>
            <div id="results-table-container"></div>
        </div>
    `;

    const btn = document.getElementById('btn-run-query');
    const input = document.getElementById('sql-input');
    const resultsDiv = document.getElementById('query-results');
    const tableContainer = document.getElementById('results-table-container');

    container.querySelectorAll('.schema-item').forEach(el => {
        el.addEventListener('click', () => {
            input.value = `SELECT * FROM ${el.dataset.table} LIMIT 10;`;
        });
    });

    btn.addEventListener('click', async () => {
        const query = input.value.trim();
        if (!query) return;

        btn.disabled = true;
        btn.textContent = 'Running...';

        try {
            const data = await window.API.database.query(query);
            resultsDiv.style.display = 'block';

            if (data.rows.length === 0) {
                tableContainer.innerHTML = '<p class="empty-note">0 rows returned.</p>';
            } else {
                tableContainer.innerHTML = `
                    <div class="table-wrap" style="margin-bottom: 0;">
                        <table class="data-table">
                            <thead><tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                            <tbody>
                                ${data.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        } catch (error) {
            resultsDiv.style.display = 'block';
            tableContainer.innerHTML = `<div class="err">${error.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Run Query';
        }
    });
};
