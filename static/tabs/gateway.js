window.Tabs = window.Tabs || {};

window.Tabs.gateway = async (container) => {
    container.innerHTML = `
        <h2>Unified Gateway Inbox</h2>
        <p class="sub">Placeholder for all messages across cli, web, telegram, voice.</p>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Source</th><th>Message</th><th>Time</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="pill ok">dashboard</span></td>
                        <td>How to enable graph workflows?</td>
                        <td class="mono">10:42 AM</td>
                    </tr>
                    <tr>
                        <td><span class="pill">cli</span></td>
                        <td>Run tests</td>
                        <td class="mono">09:15 AM</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
};
