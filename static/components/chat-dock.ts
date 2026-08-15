document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages');
    
    // Approval modal
    const modal = document.getElementById('approval-modal');
    const modalMsg = document.getElementById('approval-message');
    const btnApprove = document.getElementById('btn-approve');
    const btnDeny = document.getElementById('btn-deny');
    const btnAlways = document.getElementById('btn-always-allow');
    
    let isWaiting = false;
    let approvalResolve = null;

    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = (input.scrollHeight) + 'px';
        updateSendButton();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isWaiting && input.value.trim() !== '') {
                form.dispatchEvent(new Event('submit'));
            }
        }
    });

    function updateSendButton() {
        sendBtn.disabled = isWaiting || input.value.trim() === '';
    }

    function addMessage(content, role) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Simple markdown parsing
        let formattedContent = escapeHtml(content);
        if (role === 'agent') {
            formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, (match, code) => `<pre><code>${code}</code></pre>`);
        }
        formattedContent = formattedContent.replace(/\n/g, '<br>');

        contentDiv.innerHTML = formattedContent;
        div.appendChild(contentDiv);
        
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) {
            messagesContainer.insertBefore(div, indicator);
        } else {
            messagesContainer.appendChild(div);
        }
        
        scrollToBottom();
        return div;
    }

    function addToolPill(messageDiv, toolName, args) {
        let pillContainer = messageDiv.querySelector('.pill-container');
        if (!pillContainer) {
            pillContainer = document.createElement('div');
            pillContainer.className = 'pill-container';
            messageDiv.insertBefore(pillContainer, messageDiv.firstChild);
        }

        const outputId = 'tool-output-' + Math.random().toString(36).substring(7);
        pillContainer.innerHTML += window.Pills.createToolPill(toolName, args, outputId);
        
        const contentDiv = messageDiv.querySelector('.message-content');
        const outputDiv = document.createElement('div');
        outputDiv.id = outputId;
        outputDiv.className = 'tool-output';
        outputDiv.innerHTML = `<strong>Args:</strong> ${JSON.stringify(args, null, 2)}`;
        contentDiv.appendChild(outputDiv);
        
        window.EventBus.dispatchEvent(new CustomEvent('agent:tool-call', { detail: { tool: toolName } }));
        scrollToBottom();
    }

    function addGatePill(messageDiv, decision) {
        let pillContainer = messageDiv.querySelector('.pill-container');
        if (!pillContainer) {
            pillContainer = document.createElement('div');
            pillContainer.className = 'pill-container';
            messageDiv.insertBefore(pillContainer, messageDiv.firstChild);
        }

        pillContainer.innerHTML += window.Pills.createGatePill(decision);
        
        window.EventBus.dispatchEvent(new CustomEvent('agent:gate', { detail: { decision } }));
        scrollToBottom();
    }

    function showTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'typing-indicator';
        div.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
        messagesContainer.appendChild(div);
        scrollToBottom();
        return div;
    }

    function removeTypingIndicator() {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
    
    // Approval Gate logic
    function requestApproval(actionDescription) {
        return new Promise((resolve) => {
            modalMsg.textContent = `Tau-Code wants to execute: ${actionDescription}`;
            modal.classList.remove('hidden');
            approvalResolve = resolve;
        });
    }

    btnApprove.onclick = () => { modal.classList.add('hidden'); if(approvalResolve) approvalResolve('approve'); };
    btnDeny.onclick = () => { modal.classList.add('hidden'); if(approvalResolve) approvalResolve('deny'); };
    btnAlways.onclick = () => { modal.classList.add('hidden'); if(approvalResolve) approvalResolve('always_allow'); };

    // Listen to mock approval request for testing
    window.EventBus.addEventListener('mock:approval', async (e) => {
        const result = await requestApproval(e.detail.action);
        console.log("Approval result:", result);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = input.value.trim();
        if (!message || isWaiting) return;

        input.value = '';
        input.style.height = 'auto';
        isWaiting = true;
        updateSendButton();

        addMessage(message, 'user');
        showTypingIndicator();
        window.EventBus.dispatchEvent(new CustomEvent('agent:turn-start'));

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message,
                    sessionId: 'web-session-1'
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let currentAgentMessageDiv = null;
            let buffer = '';

            // Automatically mock a gate decision for visual effect before real tools come in
            setTimeout(() => {
                if (currentAgentMessageDiv) {
                    addGatePill(currentAgentMessageDiv, Math.random() > 0.5 ? 'retrieve' : 'skip');
                }
            }, 500);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop();

                for (const part of parts) {
                    if (part.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(part.slice(6));
                            
                            if (!currentAgentMessageDiv) {
                                currentAgentMessageDiv = addMessage('', 'agent');
                            }

                            if (data.kind === 'tool') {
                                addToolPill(currentAgentMessageDiv, data.tool, data.args);
                            } else if (data.kind === 'done') {
                                removeTypingIndicator();
                                if (data.reply) {
                                    const contentDiv = currentAgentMessageDiv.querySelector('.message-content');
                                    let formattedContent = escapeHtml(data.reply);
                                    formattedContent = formattedContent.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => `<pre><code>${code}</code></pre>`);
                                    formattedContent = formattedContent.replace(/\n/g, '<br>');
                                    contentDiv.innerHTML = formattedContent;
                                    scrollToBottom();
                                }
                            } else if (data.kind === 'error') {
                                removeTypingIndicator();
                                addMessage(`Error: ${data.message}`, 'system');
                            }
                        } catch (err) {
                            console.error('Error parsing SSE data:', err, part);
                        }
                    }
                }
            }
        } catch (error) {
            removeTypingIndicator();
            addMessage(`Failed to connect to the server: ${error.message}`, 'system');
        } finally {
            isWaiting = false;
            removeTypingIndicator();
            updateSendButton();
            input.focus();
            window.EventBus.dispatchEvent(new CustomEvent('agent:turn-end'));
        }
    });
});
