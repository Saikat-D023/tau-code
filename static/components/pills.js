window.Pills = {
    createToolPill: (toolName, args, outputId) => {
        return `
            <div class="pill tool" onclick="document.getElementById('${outputId}').classList.toggle('expanded')">
                tool·${toolName}
            </div>
        `;
    },
    createGatePill: (decision) => {
        const cls = decision === 'retrieve' ? 'retrieve' : '';
        return `
            <div class="pill gate ${cls}">
                gate·${decision}
            </div>
        `;
    }
};
