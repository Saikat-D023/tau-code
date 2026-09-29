window.Tabs = window.Tabs || {};

window.Tabs.settings = async (container) => {
    container.innerHTML = `
        <h2>Settings</h2>

        <div class="panel max-600">
            <div class="panel-header"><h3>Model Configuration</h3></div>

            <div class="form-row">
                <label class="field-label">Provider</label>
                <select class="field">
                    <option value="gemini">Google Gemini</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                    <option value="local">Local (Ollama)</option>
                </select>
            </div>

            <div class="form-row">
                <label class="field-label">Model Name</label>
                <input class="field mono" type="text" value="gemini-1.5-pro-latest">
            </div>

            <div class="form-row">
                <label class="field-label">API Key (saved locally)</label>
                <input class="field mono" type="password" value="********">
            </div>

            <div class="modal-actions">
                <button class="btn btn-secondary">Cancel</button>
                <button class="btn btn-primary">Save Configuration</button>
            </div>
        </div>

        <div class="panel max-600">
            <div class="panel-header"><h3>Feature Flags</h3></div>

            <div class="toggle-row">
                <div>
                    <strong>Graph Workflows</strong>
                    <span>Enable finite-state machine routing.</span>
                </div>
                <input type="checkbox">
            </div>

            <div class="toggle-row">
                <div>
                    <strong>Experimental Tools</strong>
                    <span>Allow the agent to use unstable tools.</span>
                </div>
                <input type="checkbox" checked>
            </div>

            <div class="toggle-row">
                <div>
                    <strong>Voice Mode</strong>
                    <span>Enable WebRTC audio input.</span>
                </div>
                <input type="checkbox">
            </div>
        </div>
    `;
};
