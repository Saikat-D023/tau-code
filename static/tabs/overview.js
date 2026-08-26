window.Tabs = window.Tabs || {};

window.Tabs.overview = async (container) => {
    const data = await window.API.overview();
    
    container.innerHTML = `
        <div class="metrics-grid">
            <div class="metric-card">
                <h4>$ spent · all-time</h4>
                <div class="value">$${data.spent}</div>
            </div>
            <div class="metric-card">
                <h4>avg turn</h4>
                <div class="value">${data.avgTurn}s</div>
            </div>
            <div class="metric-card">
                <h4>turns</h4>
                <div class="value">${data.turns}</div>
            </div>
            <div class="metric-card">
                <h4>tool calls</h4>
                <div class="value">${data.toolCalls}</div>
            </div>
            <div class="metric-card">
                <h4>facts</h4>
                <div class="value">${data.facts}</div>
            </div>
            <div class="metric-card">
                <h4>events</h4>
                <div class="value">${data.events}</div>
            </div>
        </div>
        
        <div style="margin-bottom: 2rem;">
            <h3 style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem; text-transform: uppercase;">RETRIEVAL GATE — THE HERO DECISION</h3>
            <div style="display: flex; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;">
                <div style="width: ${data.gateStats.retrieved > 0 ? '100%' : '0%'}; background: var(--accent-primary);"></div>
                <div style="width: ${data.gateStats.skipped > 0 ? '100%' : '0%'}; background: var(--warning);"></div>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">
                ${data.gateStats.retrieved} retrieved, ${data.gateStats.skipped} skipped
            </p>
        </div>

        <div class="arch-diagram-wrapper">
            <div class="arch-diagram">
                <!-- Lines -->
                <div class="line line-h" style="top: 35px; left: 130px; width: 40px;"></div>
                <div class="line line-h" style="top: 35px; left: 320px; width: 40px;"></div>
                <div class="line line-h" style="top: 35px; left: 510px; width: 40px;"></div>
                <div class="line line-v" style="top: 70px; left: 450px; height: 30px;"></div>
                <div class="line line-v" style="top: 170px; left: 450px; height: 30px;"></div>

                <div class="diagram-box" id="box-gateway">
                    <h3>Gateway</h3>
                    <p>cli·web</p>
                </div>
                <div class="diagram-box" id="box-working-memory">
                    <h3>Working Memory</h3>
                    <p>(per turn)</p>
                </div>
                <div class="diagram-box" id="box-llm-agent">
                    <h3>LLM Agent</h3>
                    <p>reason ↕ tools</p>
                </div>
                <div class="diagram-box" id="box-reply">
                    <h3>Reply</h3>
                    <p>back to you</p>
                </div>
                <div class="diagram-box" id="box-tools">
                    <h3>Tools</h3>
                    <p>run_shell, etc</p>
                </div>
                <div class="diagram-box" id="box-gate">
                    <h3>Retrieval Gate</h3>
                    <p>${data.gateStats.skipped} skip · ${data.gateStats.retrieved} ret</p>
                </div>
                <div class="diagram-box" id="box-proc">
                    <h3>Procedural</h3>
                    <p>skills</p>
                </div>
                <div class="diagram-box" id="box-sem">
                    <h3>Semantic</h3>
                    <p>facts</p>
                </div>
                <div class="diagram-box" id="box-epis">
                    <h3>Episodic</h3>
                    <p>episodes</p>
                </div>
            </div>
        </div>
    `;

    // Event bus listeners for pulsing
    const pulseBox = (id, duration = 1500) => {
        const box = document.getElementById(id);
        if (box) {
            box.classList.add('active');
            setTimeout(() => box.classList.remove('active'), duration);
        }
    };

    window.EventBus.addEventListener('agent:turn-start', () => pulseBox('box-gateway'));
    window.EventBus.addEventListener('agent:tool-call', () => { pulseBox('box-llm-agent'); pulseBox('box-tools'); });
    window.EventBus.addEventListener('agent:gate', () => pulseBox('box-gate'));
    window.EventBus.addEventListener('agent:turn-end', () => pulseBox('box-reply'));
};
