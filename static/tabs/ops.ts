window.Tabs = window.Tabs || {};

window.Tabs.ops = async (container) => {
    const data = await window.API.ops();
    
    container.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">LLM Ops & Evals</h2>
        
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
                <h3 style="margin-bottom: 0.5rem;">Release Gate Verdict</h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">Run \`make gate\` to re-evaluate the agent against the test suite.</p>
            </div>
            <div style="font-size: 2rem; font-weight: bold; color: ${data.releaseGate === 'pass' ? 'var(--accent-primary)' : 'var(--danger)'}; text-transform: uppercase;">
                ${data.releaseGate}
            </div>
        </div>

        <h3 style="margin-bottom: 1rem;">Eval History</h3>
        <table class="data-table" style="margin-bottom: 2rem;">
            <thead><tr><th>Date</th><th>Deterministic</th><th>LLM-as-Judge</th><th>Verdict</th></tr></thead>
            <tbody>
                ${data.evalHistory.map(e => `<tr>
                    <td>${e.date}</td>
                    <td>${e.deterministic}%</td>
                    <td>${e.judge}%</td>
                    <td style="color: ${e.verdict === 'pass' ? 'var(--accent-primary)' : 'var(--danger)'}; font-weight: bold;">${e.verdict.toUpperCase()}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        
        <h3 style="margin-bottom: 1rem;">Slowest Turns</h3>
        <table class="data-table" style="margin-bottom: 2rem;">
            <thead><tr><th>Turn ID</th><th>Latency</th></tr></thead>
            <tbody>
                ${data.slowestTurns.map(t => `<tr>
                    <td><code>${t.id}</code></td>
                    <td style="color: var(--warning);">${t.latency}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
};
