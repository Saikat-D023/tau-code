window.Tabs = window.Tabs || {};

(() => {
    /** Minimal inline SVG sparkline — no charting library, no invented trend. */
    function sparkline(series, color) {
        const w = 220, h = 28, pad = 2;
        const max = Math.max(1, ...series);
        const step = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
        const points = series.map((v, i) => {
            const x = pad + i * step;
            const y = h - pad - (v / max) * (h - pad * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
            <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }

    function timeAgo(iso) {
        if (!iso) return '—';
        const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
        const diffSec = Math.max(0, (Date.now() - d.getTime()) / 1000);
        if (diffSec < 60) return `${Math.floor(diffSec)}s ago`;
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        return `${Math.floor(diffSec / 86400)}d ago`;
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[c]));
    }

    /**
     * The signature element: a real branch-timeline for one session, drawn as an
     * SVG git-graph. Turns are laid out in a lane per branch, forking wherever a
     * turn has more than one child — a truthful shape for a branching agent loop,
     * not a smoothed line chart standing in for something that isn't a trend.
     */
    function branchChart(nodes) {
        if (!nodes.length) return '<div class="empty-note">No turns recorded for this session yet.</div>';

        const rowH = 26, laneW = 22, padX = 16, padY = 14;
        const laneOf = new Map();
        const childCount = new Map();
        for (const n of nodes) {
            if (n.parentId) childCount.set(n.parentId, (childCount.get(n.parentId) || 0) + 1);
        }

        let maxLane = 0;
        const usedLanes = new Set([0]);
        nodes.forEach((n, i) => {
            if (!n.parentId) { laneOf.set(n.id, 0); return; }
            const parentLane = laneOf.get(n.parentId) ?? 0;
            const siblings = nodes.filter(m => m.parentId === n.parentId);
            const idx = siblings.findIndex(m => m.id === n.id);
            if (idx === 0) {
                laneOf.set(n.id, parentLane);
            } else {
                maxLane += 1;
                usedLanes.add(maxLane);
                laneOf.set(n.id, maxLane);
            }
        });

        const width = padX * 2 + (maxLane + 1) * laneW + 10;
        const height = padY * 2 + nodes.length * rowH;

        const posOf = (n, i) => ({ x: padX + laneOf.get(n.id) * laneW, y: padY + i * rowH });

        let edges = '';
        let dots = '';
        nodes.forEach((n, i) => {
            const p = posOf(n, i);
            if (n.parentId) {
                const parentIdx = nodes.findIndex(m => m.id === n.parentId);
                if (parentIdx !== -1) {
                    const pp = posOf(nodes[parentIdx], parentIdx);
                    edges += `<path class="branch-edge" d="M ${pp.x} ${pp.y} C ${pp.x} ${(pp.y + p.y) / 2}, ${p.x} ${(pp.y + p.y) / 2}, ${p.x} ${p.y}" fill="none"/>`;
                }
            }
            const cls = n.role === 'user' ? 'branch-node-user' : n.role === 'tool' ? 'branch-node-tool' : 'branch-node-assistant';
            const r = n.role === 'user' ? 4.5 : 3.5;
            dots += `<circle class="${cls}" cx="${p.x}" cy="${p.y}" r="${r}"><title>${escapeHtml(n.role)} · ${escapeHtml(n.createdAt)}</title></circle>`;
        });

        return `<div class="branch-chart-wrap"><svg width="${width}" height="${Math.max(height, 60)}" viewBox="0 0 ${width} ${Math.max(height, 60)}">${edges}${dots}</svg></div>`;
    }

    function statCard(label, value, series, color, suffix = '') {
        return `
            <div class="stat-card">
                <div class="stat-label">${label}</div>
                <div class="stat-value">${value}${suffix}</div>
                ${sparkline(series, color)}
            </div>`;
    }

    function renderSessions(sessions, selectedId) {
        if (!sessions.length) return '<div class="empty-note">No sessions yet — start a conversation in the Chat Dock.</div>';
        return `<div class="session-list">${sessions.map(s => `
            <div class="session-row ${s.id === selectedId ? 'active' : ''}" data-session-id="${s.id}">
                <span class="session-id mono">${s.id.slice(0, 8)}</span>
                <span class="session-preview">${escapeHtml(s.preview) || '(no user message yet)'}</span>
                ${s.branchCount > 0 ? `<span class="branch-badge">${s.branchCount} branch${s.branchCount === 1 ? '' : 'es'}</span>` : '<span></span>'}
                <span class="session-time">${timeAgo(s.lastActivity)}</span>
            </div>
        `).join('')}</div>`;
    }

    function renderOps(ops) {
        if (!ops.length) return '<div class="empty-note">No Operations run yet today.</div>';
        return ops.map(op => `
            <div class="op-row">
                <span class="op-badge ${op.gated ? 'gated' : 'exempt'}">${op.gated ? 'confirmed' : 'exempt'}</span>
                <span class="op-detail">${escapeHtml(op.tool)}(${escapeHtml(JSON.stringify(op.args || {}).slice(0, 64))})</span>
                <span class="op-time">${timeAgo(op.ts)}</span>
            </div>
        `).join('');
    }

    function renderProviders(providers) {
        if (!providers.length) return '<div class="empty-note">No provider connected — run <span class="mono">taucode auth</span>.</div>';
        const maxCalls = Math.max(1, ...providers.map(p => p.calls));
        return providers.map(p => `
            <div class="provider-block">
                <div class="provider-block-head">
                    <span class="provider-name"><span class="provider-dot ${p.active ? 'active' : ''}"></span>${p.label}</span>
                    <span class="provider-auth">${p.authMethod}</span>
                </div>
                <div class="provider-bar-track">
                    <div class="provider-bar-fill" style="width:${Math.round((p.calls / maxCalls) * 100)}%"></div>
                </div>
                <div class="provider-stats">
                    <span>${p.calls} turns</span>
                    <span>${p.tokens.toLocaleString()} tok</span>
                    <span>$${p.cost.toFixed(4)}</span>
                </div>
            </div>
        `).join('');
    }

    function renderEpisodes(episodes) {
        if (!episodes.length) return '<div class="empty-note">No Episodes consolidated yet.</div>';
        return `<div class="episode-grid">${episodes.slice(0, 4).map(ep => `
            <div class="episode-tile">
                <div class="episode-icon">τ</div>
                <div class="episode-body">
                    <div class="episode-summary">${escapeHtml(ep.summary)}</div>
                    <div class="episode-meta">${escapeHtml(ep.date)}</div>
                </div>
            </div>
        `).join('')}</div>`;
    }

    window.Tabs.overview = async (container) => {
        const [overview, sessions, ops, providers, episodes] = await Promise.all([
            window.API.overview(),
            window.API.sessions(),
            window.API.operations(),
            window.API.providers(),
            window.API.memory.episodic(),
        ]);

        let selectedSessionId = sessions[0]?.id ?? null;

        container.innerHTML = `
            <div class="ov-stats">
                ${statCard('Active Sessions', overview.stats.activeSessions.value, overview.stats.activeSessions.series, 'var(--accent-primary)')}
                ${statCard('Facts Stored', overview.stats.facts.value, overview.stats.facts.series, 'var(--accent-primary)')}
                ${statCard('Episodes Logged', overview.stats.episodes.value, overview.stats.episodes.series, 'var(--accent-primary)')}
                ${statCard('Retrieval Gate Hit Rate', overview.stats.gateHitRate.value, overview.stats.gateHitRate.series, 'var(--trust)', '%')}
            </div>

            <div class="ov-grid">
                <div class="ov-main">
                    <div class="panel" id="session-panel">
                        <div class="panel-header">
                            <h3>Session Overview</h3>
                            <span class="panel-meta">${sessions.length} recent</span>
                        </div>
                        <div id="branch-chart-slot">${branchChart([])}</div>
                        ${renderSessions(sessions, selectedSessionId)}
                    </div>

                    <div class="panel gate-panel" id="gate-panel">
                        <div class="panel-header">
                            <h3>Permission Gate — recent Operations</h3>
                            <span class="panel-meta">${overview.gateStats.retrieved} retrieved · ${overview.gateStats.skipped} skipped</span>
                        </div>
                        <div id="ops-list">${renderOps(ops)}</div>
                    </div>
                </div>

                <div class="ov-right">
                    <div class="panel">
                        <div class="panel-header">
                            <h3>Providers</h3>
                        </div>
                        ${renderProviders(providers)}
                    </div>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <h3>Recent Episodes</h3>
                    <span class="panel-meta">consolidated from past turns</span>
                </div>
                ${renderEpisodes(episodes)}
            </div>
        `;

        const chartSlot = container.querySelector('#branch-chart-slot');
        async function loadTimeline(sessionId) {
            if (!sessionId) { chartSlot.innerHTML = branchChart([]); return; }
            const nodes = await window.API.sessionTimeline(sessionId);
            chartSlot.innerHTML = branchChart(nodes);
        }
        if (selectedSessionId) loadTimeline(selectedSessionId);

        container.querySelectorAll('.session-row').forEach(row => {
            row.addEventListener('click', () => {
                container.querySelectorAll('.session-row').forEach(r => r.classList.remove('active'));
                row.classList.add('active');
                loadTimeline(row.dataset.sessionId);
            });
        });

        // Live feedback from the Chat Dock — tie the existing turn/tool/gate
        // events to the real panels instead of a decorative pulsing diagram.
        const pulse = (id) => {
            const el = container.querySelector(id);
            if (!el) return;
            el.classList.remove('pulse');
            void el.offsetWidth;
            el.classList.add('pulse');
        };
        window.EventBus.addEventListener('agent:turn-start', () => pulse('#session-panel'));
        window.EventBus.addEventListener('agent:gate', () => pulse('#gate-panel'));
        window.EventBus.addEventListener('agent:tool-call', async () => {
            pulse('#gate-panel');
            const list = container.querySelector('#ops-list');
            if (list) list.innerHTML = renderOps(await window.API.operations());
        });
    };
})();
