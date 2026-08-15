document.addEventListener('DOMContentLoaded', () => {
    const resizeSidebar = document.getElementById('resize-sidebar');
    const resizeChat = document.getElementById('resize-chat');
    
    let isResizingSidebar = false;
    let isResizingChat = false;

    resizeSidebar.addEventListener('mousedown', () => {
        isResizingSidebar = true;
        document.body.style.cursor = 'col-resize';
    });

    resizeChat.addEventListener('mousedown', () => {
        isResizingChat = true;
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizingSidebar && !isResizingChat) return;

        if (isResizingSidebar) {
            // Sidebar is on the left
            const newWidth = e.clientX;
            if (newWidth > 150 && newWidth < 400) {
                document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
            }
        } else if (isResizingChat) {
            // Chat dock is on the right
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 250 && newWidth < 600) {
                document.documentElement.style.setProperty('--chat-width', `${newWidth}px`);
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizingSidebar || isResizingChat) {
            isResizingSidebar = false;
            isResizingChat = false;
            document.body.style.cursor = 'default';
        }
    });
});
