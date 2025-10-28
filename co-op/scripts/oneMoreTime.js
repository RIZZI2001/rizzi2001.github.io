function startOMT() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const omtContainer = document.getElementById('omt-container');

let scene = {};

let colors = ['#000000', '#20b327ff', '#ffc919ff', '#69bbffff', '#ec305fff', '#f0721eff'];
let columnValues = [
    [5, 3, 3, 3, 2, 2, 2, 1, 2, 2, 2, 3, 3, 3, 5], 
    [3, 2, 2, 2, 1, 1, 1, 0, 1, 1, 1, 2, 2, 2, 3]
];
let numberDiceImgs = ['dice_1.png', 'dice_2.png', 'dice_3.png', 'dice_4.png', 'dice_5.png', 'questionmark.png'];

let GAME_STATE = {};

document.addEventListener('keydown', async (event) => {
});

window.back2Selection = function() {
    conn.send(packageData('BACK2SELECT', {}));
    cleanupScene();
    switch2('selection');
}

window.endTurn = function() {
    GAME_STATE.currentPlayer = (GAME_STATE.currentPlayer === 'main') ? 'second' : 'main';
    updateTurnIndicator();

    conn.send(packageData('END_TURN', {}));
}

window.undo = function() {
    conn.send(packageData('UNDO_ACTION', { action: lastAction }));
}

window.rollDice = function() {
    // TODO: Implement dice rolling functionality
    console.log('Rolling dice...');
}

window.communication = function(command, args) {
    switch(command) {
        case 'INIT_GAME':
            console.log('Received INIT command with args:', args);
            initLogic(args.currentPlayer);
            break;
        case 'UNDO_ACTION':
            break;
        case 'END_TURN':
            break;
        case 'END_GAME':
            break;
        case 'BACK2SELECT':
            cleanupScene();
            switch2('selection');
            break;
    }
}

function cleanupScene() {
    console.log('Cleaning up scene...');
    omtContainer.innerHTML = '';
    scene = {};
    GAME_STATE = {};
}

function updateTurnIndicator() {
    currentPlayerIndicator.innerText = GAME_STATE.currentPlayer == myRole ? 'Your Turn' : otherName + "'s Turn";

    if (GAME_STATE.currentPlayer === 'main') {
        omtContainer.style.background = hexToCssColor(mainColorDark);
        currentPlayerIndicator.style.color = hexToCssColor(mainColor);
    } else {
        omtContainer.style.background = hexToCssColor(secondColorDark);
        currentPlayerIndicator.style.color = hexToCssColor(secondColor);
    }
}

async function loadUtilsAndGenerateUI() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'scripts/omtUtils.js';
        script.onload = () => {
            // Once omtUtils.js is loaded, call generateUI with all necessary parameters
            const gameData = {
                scene: scene,
                colors: colors,
                columnValues: columnValues,
                numberDiceImgs: numberDiceImgs
            };
            
            generateUI(gameData).then(() => {
                // Update scene reference
                scene = gameData.scene;
                resolve();
            }).catch(reject);
        };
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

function initLogic(turn = null) {
    GAME_STATE = {
    };
    updateTurnIndicator();
    loadUtilsAndGenerateUI();
}

if(myRole === 'main') {
    initLogic();
}

}
startOMT();