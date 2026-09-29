window.Tabs = window.Tabs || {};

window.Tabs.loop = async (container) => {
    const data = await window.API.loop();

    let html = `<h2>Turn Execution Loop</h2>`;
    if (!data.length) html += `<div class="panel empty-note">No turns recorded yet.</div>`;

    data.forEach(turn => {
        html += `
            <div class="panel">
                <div class="turn-head">
                    <strong>Turn: <span class="mono">${turn.id}</span></strong>
                    <span class="turn-meta">${turn.timestamp} · Iter ${turn.iter} · ${turn.tokens} tkns · ${turn.cost}</span>
                </div>

                ${window.Pills.createGatePill(turn.gate)}

                <ul class="turn-steps">
                    ${turn.steps.map(step => `
                        <li>
                            <span class="step-type ${step.type}">${step.type}</span>
                            <span>${step.content}</span>
                        </li>`).join('')}
                </ul>

                <strong>Reply</strong>
                <p class="turn-reply">${turn.reply}</p>
            </div>
        `;
    });

    container.innerHTML = html;
};
