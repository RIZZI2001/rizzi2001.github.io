const nameContainer = document.getElementById('name-container');
const nameInput = document.getElementById('name-input');
const nameButton = document.getElementById('name-button');
const copyIdContainer = document.getElementById('copy-id-container');
const idDisplay = document.getElementById('id-display');
const enterIdContainer = document.getElementById('enter-id-container');
const peerIdInput = document.getElementById('peer-id-input');

function submitName() {
    if(nameInput.value !== '') {
        copyIdContainer.style.display = 'flex';
        enterIdContainer.style.display = 'flex';
        idDisplay.innerText = "Your ID: " + peer.id;
        myName = nameInput.value;
    } else {
        copyIdContainer.style.display = 'none';
        enterIdContainer.style.display = 'none';
        alert('Please enter a name');
    }
}

function copyOwnId() {
    const el = document.createElement('textarea');
    el.value = peer.id;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert('ID copied to clipboard');
}

function connect2peer() {
    if(peerIdInput.value === '') {
        alert('Please enter a peer ID');
        return;
    }
    if(initSent) {
        return;
    }
    conn = peer.connect(peerIdInput.value);
    conn.on('open', () => {
        console.log('Connected');

        conn.send(packageData('INIT', { name: myName }));
        initSent = true;

        conn.on('data', (data) => {
            handleData(data);
        });
    });
}