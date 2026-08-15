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

    // Load default tab
    loadTab('overview');
});
