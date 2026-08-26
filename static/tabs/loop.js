window.Tabs = window.Tabs || {};

window.Tabs.loop = async (container) => {
    const data = await window.API.loop();
    
    let html = `<h2 style="margin-bottom: 1.5rem;">Turn Execution Loop</h2>`;
    
    data.forEach(turn => {
        html += `
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <strong>Turn: ${turn.id}</strong>
                    <span style="color: var(--text-secondary); font-size: 0.85rem;">
                        ${turn.timestamp} · Iter ${turn.iter} · ${turn.tokens} tkns · ${turn.cost}
                    </span>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    ${window.Pills.createGatePill(turn.gate)}
                </div>

                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                    <ul style="list-style: none;">
        `;
        
        turn.steps.forEach(step => {
            let color = 'var(--text-secondary)';
            if (step.type === 'act') color = 'var(--blue-pill)';
            if (step.type === 'observe') color = 'var(--accent-primary)';
            
            html += `
                <li style="margin-bottom: 0.5rem; font-family: var(--font-mono); font-size: 0.85rem;">
                    <span style="display: inline-block; width: 80px; color: ${color};">${step.type}</span>
                    <span style="color: #e2e8f0;">${step.content}</span>
                </li>
            `;
        });

        html += `
                    </ul>
                </div>
                
                <div>
                    <strong>Reply:</strong>
                    <p style="margin-top: 0.5rem; color: var(--text-secondary);">${turn.reply}</p>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
};
