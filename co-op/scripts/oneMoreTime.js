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

function setDie(dieIndex, value) {
    if(dieIndex % 2 === 0) {
        scene.dice[dieIndex].style.backgroundImage = `url('img/dice_${value}.png')`;
    } else {
        scene.dice[dieIndex].style.backgroundColor = colors[value - 1];
    }
}

function animateDice() {
    let count = 0;
    const interval = setInterval(() => {
        for(let i = 0; i < 6; i++) {
            const randomValue = Math.floor(Math.random() * 6) + 1;
            setDie(i, randomValue);
        }
        count++;
        if(count === 6) {
            clearInterval(interval);
            for(let i = 0; i < 6; i++) {
                setDie(i, GAME_STATE.diceValues[i]);
            }
        }
    }, 100);
}

window.rollDice = function() {
    for(let i = 0; i < 6; i++) {
        GAME_STATE.diceValues[i] = Math.floor(Math.random() * 6) + 1;
    }
    console.log('Rolled dice values:', GAME_STATE.diceValues);
    //conn.send(packageData('ROLL_DICE', { diceValues: GAME_STATE.diceValues }));
    animateDice();
    GAME_STATE.diceRolls++;
    GAME_STATE.myState = 'myDiceRolled';
    GAME_STATE.actionsStack = [];
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
        diceValues: [0, 1, 2, 3, 4, 5],
        diceRolls: 0,
        myState: 'default',
        currentPlayer: Math.random() < 0.5 ? 'main' : 'second',
        actionsStack: [],
    };
    updateTurnIndicator();
    loadUtilsAndGenerateUI();
}

if(myRole === 'main') {
    initLogic();
}

}
startOMT();