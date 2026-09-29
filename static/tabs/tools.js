window.Tabs = window.Tabs || {};

window.Tabs.tools = async (container) => {
    const data = await window.API.tools();

    container.innerHTML = `
        <h2>Tool Registry</h2>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Name</th><th>Description</th><th>Origin</th><th>Last Used</th></tr></thead>
                <tbody>
                    ${data.registry.length ? data.registry.map(t => `<tr>
                        <td><code>${t.name}</code></td>
                        <td>${t.description}</td>
                        <td><span class="pill">${t.origin}</span></td>
                        <td class="mono">${t.lastUsed}</td>
                    </tr>`).join('') : '<tr><td class="empty" colspan="4">No tools registered.</td></tr>'}
                </tbody>
            </table>
        </div>

        <h2>MCP Servers</h2>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Server Name</th><th>Status</th></tr></thead>
                <tbody>
                    ${data.mcpServers.length ? data.mcpServers.map(s => `<tr>
                        <td>${s.name}</td>
                        <td>
                            <span class="status">
                                <span class="status-dot ${s.status === 'connected' ? 'online' : ''}"></span>
                                <span class="status-text">${s.status}</span>
                            </span>
                        </td>
                    </tr>`).join('') : '<tr><td class="empty" colspan="2">No MCP servers connected.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
};
