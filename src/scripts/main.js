const CONTENT = document.getElementById('CONTENT');

const peer = new Peer(); // Initialize PeerJS

let conn = null; // Connection variable
let myName = null; // My name
let otherName = null; // Other player's name
let myRole = null; // The actor of the game
let otherRole = null; // The other actor of the game
let initSent = false;

let GAME_STATE = null;

let baseUrl = 'http://localhost:8000/src/';
if(window.location.href.includes('github')) {
    baseUrl = 'https://rizzi2001.github.io/src/';
}

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

function switch2(pageName) {
    fetch(baseUrl + pageName + '.html')
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
            css.href = baseUrl + 'styles/' + pageName + '.css';
            css.setAttribute('data-page', pageName);
            document.head.appendChild(css);

            // Add new page-specific JS
            const js = document.createElement('script');
            js.src = baseUrl + 'scripts/' + pageName + '.js';
            js.setAttribute('data-page', pageName);
            document.body.appendChild(js);
        });
}

function packageData(command, args) {
    return JSON.stringify({ command, args });
}

function unpackageData(data) {
    return JSON.parse(data);
}

function handleData(data) {
    const defaultApp = 'theGame';

    console.log(data);
    const { command, args } = unpackageData(data);
    console.log(args);

    switch(command) {
        case 'MESSAGE':
            displayMessage(args);
            break;
        case 'INIT':
            myRole = 'second';
            otherRole = 'main';
            otherName = args.name;
            conn.send(packageData('INIT_ANS', { name: nameInput.value }));
            switch2(defaultApp);
            break;
        case 'INIT_ANS':
            myRole = 'main';
            otherRole = 'second';
            otherName = args.name;
            switch2(defaultApp);
            break;
        default:
            communication(command, args);
    }
}

// Initialize the peer connection
setupPeerConnection();
//switch2('connection');
switch2('theGame');