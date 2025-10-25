const CONTENT = document.getElementById('CONTENT');

const peer = new Peer(); // Initialize PeerJS

let conn = null; // Connection variable
let myName = null; // My name
let otherName = null; // Other player's name
let myRole = null; // The actor of the game
let otherRole = null; // The other actor of the game
let initSent = false;

let selectedGame = {
    'main': null,
    'other': null
}

const mainColor = 0x83d684;
const secondColor = 0xde6666;

const mainColorSemiDark = 0x4c7a4c;
const secondColorSemiDark = 0x7a3838;

const mainColorDark = 0x1a3a1a;
const secondColorDark = 0x3a1a1a;

function hexToCssColor(hex) {
    return `#${new THREE.Color(hex).getHexString()}`;
}

function myColor(brightness = 'normal') {
    if (brightness === 'dark') {
        return myRole == 'main' ? mainColorDark : secondColorDark;
    } else if (brightness === 'semi-dark') {
        return myRole == 'main' ? mainColorSemiDark : secondColorSemiDark;
    }
    return myRole == 'main' ? mainColor : secondColor;
}
function otherColor(brightness = 'normal') {
    if (brightness === 'dark') {
        return otherRole == 'main' ? mainColorDark : secondColorDark;
    } else if (brightness === 'semi-dark') {
        return otherRole == 'main' ? mainColorSemiDark : secondColorSemiDark;
    }
    return otherRole == 'main' ? mainColor : secondColor;
}

let GAME_STATE = null;

// Function to set up the peer connection
function setupPeerConnection() {
    peer.on('open', (id) => {
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

function rtt() {
    conn.send(packageData('RTT', { time: Date.now() }));
}

function switch2(pageName) {
    console.log('Switching to ' + pageName);
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
                console.log('Removed' + existingJs);
            }

            // Add new page-specific CSS
            const stylesheetUrl = baseUrl + 'styles/' + pageName + '.css';
            fetch(stylesheetUrl, { method: 'HEAD' })
                .then(response => {
                if (response.ok) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = stylesheetUrl;
                    document.head.appendChild(link);
                }
                })
                .catch(() => {
                });

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
    //console.log(data);
    const { command, args } = unpackageData(data);
    //console.log(args);

    switch(command) {
        case 'MESSAGE':
            displayMessage(args);
            break;
        case 'RTT':
            conn.send(packageData('RTT_ANS', { time: args.time }));
            break;
        case 'RTT_ANS':
            const rtt = Date.now() - args.time;
            console.log('RTT: ' + rtt + 'ms');
            break;
        case 'INIT':
            myRole = 'second';
            otherRole = 'main';
            otherName = args.name;
            conn.send(packageData('INIT_ANS', { name: nameInput.value }));
            switch2('selection');
            break;
        case 'INIT_ANS':
            myRole = 'main';
            otherRole = 'second';
            otherName = args.name;
            switch2('selection');
            break;
        case 'SELECT':
            selectedGame[otherRole] = args.game;
            setBorder(otherColor(), args.game);
            break;
        case 'SWITCH2':
            switch2(args.page);
            break;
        default:
            communication(command, args);
    }
}

//setupPeerConnection();

let baseUrl;
if(window.location.href.includes('github')) {
    baseUrl = 'https://rizzi2001.github.io/co-op/';
    switch2('connection');
} else {
    baseUrl = 'http://localhost:8000/co-op/';
    //switch2('connection');
    switch2('oneMoreTime');
    myRole = 'main';
    myName = 'Player 1';
    otherRole = 'second';
    otherName = 'Player 2';
}

//python -m http.server