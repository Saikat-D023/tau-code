window.Tabs = window.Tabs || {};

window.Tabs.graph = async (container) => {
    container.innerHTML = `
        <h2>Graph Topology</h2>
        <div class="panel placeholder-box">
            <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <p>Graph Workflows are currently disabled or not fully implemented.</p>
            <button class="btn btn-primary">Enable in Settings</button>
        </div>
    `;
};
