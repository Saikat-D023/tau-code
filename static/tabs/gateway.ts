window.Tabs = window.Tabs || {};

window.Tabs.gateway = async (container) => {
    container.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">Unified Gateway Inbox</h2>
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">Placeholder for all messages across cli, web, telegram, voice.</p>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Message</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><span class="pill" style="color: var(--accent-primary); border-color: var(--accent-primary);">dashboard</span></td>
                    <td>How to enable graph workflows?</td>
                    <td>10:42 AM</td>
                </tr>
                <tr>
                    <td><span class="pill" style="color: var(--blue-pill); border-color: var(--blue-pill);">cli</span></td>
                    <td>Run tests</td>
                    <td>09:15 AM</td>
                </tr>
            </tbody>
        </table>
    `;
};
