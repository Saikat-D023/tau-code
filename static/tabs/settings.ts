window.Tabs = window.Tabs || {};

window.Tabs.settings = async (container) => {
    container.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">Settings</h2>
        
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; max-width: 600px;">
            <h3 style="margin-bottom: 1rem;">Model Configuration</h3>
            
            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Provider</label>
                <select style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-family: var(--font-sans);">
                    <option value="gemini">Google Gemini</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                    <option value="local">Local (Ollama)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Model Name</label>
                <input type="text" value="gemini-1.5-pro-latest" style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-family: var(--font-mono); font-size: 0.85rem;">
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">API Key (saved locally)</label>
                <input type="password" value="********" style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-family: var(--font-mono); font-size: 0.85rem;">
            </div>
            
            <button class="btn btn-primary">Save Configuration</button>
        </div>

        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; max-width: 600px;">
            <h3 style="margin-bottom: 1rem;">Feature Flags</h3>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                <div>
                    <strong style="display: block; margin-bottom: 0.25rem;">Graph Workflows</strong>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">Enable finite-state machine routing.</span>
                </div>
                <input type="checkbox" style="width: 20px; height: 20px;">
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                <div>
                    <strong style="display: block; margin-bottom: 0.25rem;">Experimental Tools</strong>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">Allow the agent to use unstable tools.</span>
                </div>
                <input type="checkbox" checked style="width: 20px; height: 20px;">
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <strong style="display: block; margin-bottom: 0.25rem;">Voice Mode</strong>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">Enable WebRTC audio input.</span>
                </div>
                <input type="checkbox" style="width: 20px; height: 20px;">
            </div>
        </div>
    `;
};
