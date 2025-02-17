function sendMessage() {
    const messageInput = document.getElementById('message-input');
    if (conn && messageInput.value !== '') {
        const message = { author: myName, content: messageInput.value };
        conn.send(packageData('MESSAGE', message));
        displayMessage(message);
        messageInput.value = '';
    }
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerText = message.author + ': ' + message.content;
    messagesContainer.appendChild(messageElement);
}