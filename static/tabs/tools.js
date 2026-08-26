window.Tabs = window.Tabs || {};

window.Tabs.tools = async (container) => {
    const data = await window.API.tools();
    
    let html = `
        <h2 style="margin-bottom: 1.5rem;">Tool Registry</h2>
        <table class="data-table" style="margin-bottom: 2rem;">
            <thead><tr><th>Name</th><th>Description</th><th>Origin</th><th>Last Used</th></tr></thead>
            <tbody>
                ${data.registry.map(t => `<tr>
                    <td><code>${t.name}</code></td>
                    <td>${t.description}</td>
                    <td><span class="pill" style="border-color:var(--border-color); color:var(--text-secondary);">${t.origin}</span></td>
                    <td>${t.lastUsed}</td>
                </tr>`).join('')}
            </tbody>
        </table>

        <h2 style="margin-bottom: 1.5rem;">MCP Servers</h2>
        <table class="data-table">
            <thead><tr><th>Server Name</th><th>Status</th></tr></thead>
            <tbody>
                ${data.mcpServers.map(s => `<tr>
                    <td>${s.name}</td>
                    <td>
                        <div class="status" style="display:inline-flex;">
                            <span class="status-dot ${s.status === 'connected' ? 'online' : ''}" style="${s.status !== 'connected' ? 'background:var(--danger)' : ''}"></span>
                            <span class="status-text">${s.status}</span>
                        </div>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
};
