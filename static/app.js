// app.js

// Global Event Bus
window.EventBus = new EventTarget();

document.addEventListener('DOMContentLoaded', () => {
    // Router / Tab Switching
    const tabs = document.querySelectorAll('.nav-item');
    const container = document.getElementById('tab-container');

    async function loadTab(tabName) {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        const activeTab = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');

        // Clear container
        container.innerHTML = '<div class="loading">Loading...</div>';

        // Initialize Tab
        if (window.Tabs && window.Tabs[tabName]) {
            try {
                await window.Tabs[tabName](container);
            } catch (err) {
                container.innerHTML = `<div style="color: var(--danger)">Error loading tab: ${err.message}</div>`;
            }
        } else {
            container.innerHTML = `<div>Tab <code>${tabName}</code> is not implemented yet.</div>`;
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            loadTab(tab.dataset.tab);
        });
    });

    // Theme toggle — follows the OS until the user picks one.
    const root = document.documentElement;
    const toggle = document.getElementById('theme-toggle');
    const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = () => root.dataset.theme || (systemDark() ? 'dark' : 'light');
    const paintToggle = () => { toggle.textContent = currentTheme() === 'dark' ? 'light' : 'dark'; };
    toggle.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch {}
        paintToggle();
    });
    paintToggle();

    // Sidebar footer: version + active provider.
    Promise.all([window.API.ops(), window.API.providers()]).then(([ops, providers]) => {
        const active = providers.find(p => p.active);
        const version = ops.releaseGate === 'vunknown' ? 'tau' : ops.releaseGate;
        document.getElementById('sidebar-meta').textContent =
            `${version}${active ? ' · ' + active.label.toLowerCase() : ''}`;
    }).catch(() => {});

    // Load default tab
    loadTab('overview');
});
