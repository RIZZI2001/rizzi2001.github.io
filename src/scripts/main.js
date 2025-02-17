const CONTENT = document.getElementById('CONTENT');

const peer = new Peer(); // Initialize PeerJS

let conn = null; // Connection variable
let names = []; // Array of both names
let myName = null; // My name
let isMainActor = null;

// Function to set up the peer connection
function setupPeerConnection() {
    peer.on('open', (id) => {
        console.log('My peer ID:');
        console.log(id);
    });

    peer.on('connection', (connection) => {
        conn = connection;
        console.log('Connected');
        conn.on('data', (data) => {
            handleData(data);
        });
    });
}

// filepath: /c:/Users/bruel/Documents/Scripts/peerJS/src/scripts/main.js
function switch2(pageName) {
    fetch('http://localhost:8000/src/' + pageName + '.html')
        .then(response => response.text())
        .then(html => {
            CONTENT.innerHTML = html;

            const existingCss = document.querySelector('link[data-page]');
            if (existingCss) {
                document.head.removeChild(existingCss);
            }
            const existingJs = document.querySelector('script[data-page]');
            if (existingJs) {
                document.body.removeChild(existingJs);
            }

            // Add new page-specific CSS
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'http://localhost:8000/src/styles/' + pageName + '.css';
            css.setAttribute('data-page', pageName);
            document.head.appendChild(css);

            // Add new page-specific JS
            const js = document.createElement('script');
            js.src = 'http://localhost:8000/src/scripts/' + pageName + '.js';
            js.setAttribute('data-page', pageName);
            document.body.appendChild(js);
        });
}

function packageData(command, args) {
    let data = command;
    for (const key in args) {
        data += '#' + key + ':' + args[key];
    }
    return data;
}

function unpackageData(data) {
    const parts = data.split('#');
    const command = parts[0];
    const tmp = parts.slice(1);
    const arguments = tmp.reduce((acc, arg) => {
        const [key, value] = arg.split(':');
        acc[key] = value;
        return acc;
    }, {});
    return { command, arguments };
}

function handleData(data) {
    //'command#arg1:value1#arg2:value2#...'
    console.log(data);
    const { command, arguments } = unpackageData(data);
    switch(command) {
        case 'MESSAGE':
            displayMessage(arguments);
            break;
        case 'INIT':
            isMainActor = false;
            names.push(arguments.name);
            names.push(nameInput.value);
            conn.send("INIT_ANS#name:" + nameInput.value);
            switch2('chat');
            break;
        case 'INIT_ANS':
            isMainActor = true;
            names.push(nameInput.value);
            names.push(arguments);
            switch2('chat');
            break;
    }
}

// Initialize the peer connection
setupPeerConnection();
switch2('connection');