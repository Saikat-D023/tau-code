window.Tabs = window.Tabs || {};

window.Tabs.ops = async (container) => {
    const data = await window.API.ops();
    const pass = (v) => String(v).toLowerCase() === 'pass';

    container.innerHTML = `
        <h2>LLM Ops & Evals</h2>

        <div class="panel card-row">
            <div>
                <h3>Release Gate</h3>
                <p class="sub-inline">Run <code>make gate</code> to re-evaluate the agent against the test suite.</p>
            </div>
            <span class="verdict">${data.releaseGate}</span>
        </div>

        <div class="panel-header"><h3>Eval History</h3></div>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Date</th><th>Deterministic</th><th>LLM-as-Judge</th><th>Verdict</th></tr></thead>
                <tbody>
                    ${data.evalHistory.length ? data.evalHistory.map(e => `<tr>
                        <td class="mono">${e.date}</td>
                        <td class="mono">${e.deterministic}%</td>
                        <td class="mono">${e.judge}%</td>
                        <td><span class="pill ${pass(e.verdict) ? 'ok' : 'gate'}">${String(e.verdict).toUpperCase()}</span></td>
                    </tr>`).join('') : '<tr><td class="empty" colspan="4">No evals recorded yet.</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="panel-header"><h3>Slowest Turns</h3></div>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Turn ID</th><th>Latency</th></tr></thead>
                <tbody>
                    ${data.slowestTurns.length ? data.slowestTurns.map(t => `<tr>
                        <td><code>${t.id}</code></td>
                        <td class="mono">${t.latency}</td>
                    </tr>`).join('') : '<tr><td class="empty" colspan="2">No turns recorded yet.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
};
