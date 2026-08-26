// api.js
window.API = {
    overview: () => fetch('/api/overview').then(r => r.json()),
    memory: {
        semantic: () => fetch('/api/memory/semantic').then(r => r.json()),
        episodic: () => fetch('/api/memory/episodic').then(r => r.json()),
        procedural: () => fetch('/api/memory/procedural').then(r => r.json()),
    },
    loop: () => fetch('/api/loop').then(r => r.json()),
    tools: () => fetch('/api/tools').then(r => r.json()),
    ops: () => fetch('/api/ops').then(r => r.json()),
    database: {
        schema: () => fetch('/api/database/schema').then(r => r.json()),
        query: (queryStr) => fetch('/api/database/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: queryStr })
        }).then(async r => {
            if (!r.ok) {
                const err = await r.json();
                throw new Error(err.error || 'Query failed');
            }
            return r.json();
        })
    }
};
