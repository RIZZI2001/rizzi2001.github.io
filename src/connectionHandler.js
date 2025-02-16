const peer = new Peer(); // Initialize PeerJS

let conn = null; // Connection variable

// Function to set up the peer connection
function setupPeerConnection() {
    peer.on('open', (id) => {
        console.log('My peer ID:');
        console.log(id);
    });

    peer.on('connection', (connection) => {
        conn = connection;
        console.log('Connected to: ' + conn.peer);
        conn.on('data', (data) => {
            displayMessage(data);
        });
    });
}

// Function to send a message
function sendMessage(message) {
    if (conn) {
        conn.send(message);
        displayMessage(message);
    }
}

// Function to display a message in the chat
function displayMessage(message) {
    const messageContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);
}

// Event listener for sending messages
document.getElementById('send-button').addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value;
    sendMessage(message);
    messageInput.value = '';
});

// Event listener for connecting to a peer
document.getElementById('connect-button').addEventListener('click', () => {
    const peerIdInput = document.getElementById('peer-id-input');
    const peerId = peerIdInput.value;
    conn = peer.connect(peerId);
    conn.on('open', () => {
        console.log('Connected to: ' + peerId);
        conn.on('data', (data) => {
            displayMessage(data);
        });
    });
});

// Initialize the peer connection
setupPeerConnection();