function startOMT() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const omtContainer = document.getElementById('omt-container');

let utilsScript = null;

let scene = {};

let colors = ['#000000', '#20b327ff', '#ffc919ff', '#69bbffff', '#ec305fff', '#f0721eff'];
let columnValues = [
    [5, 3, 3, 3, 2, 2, 2, 1, 2, 2, 2, 3, 3, 3, 5], 
    [3, 2, 2, 2, 1, 1, 1, 0, 1, 1, 1, 2, 2, 2, 3]
];
let numberDiceImgs = ['dice_1', 'dice_2', 'dice_3', 'dice_4', 'dice_5', 'questionmark'];

let GAME_STATE = {};

document.addEventListener('keydown', async (event) => {
    if(event.key === 'u') {
        console.log('scene: ',scene, 'game state: ', GAME_STATE);
    } else if(event.key === 'r') {
        scene.setScore('myBoard', 1, '+ 23');
    }
});

window.back2Selection = function() {
    if (utilsScript) {
        document.body.removeChild(utilsScript);
        utilsScript = null;
    }
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
        scene.dice[dieIndex].style.backgroundImage = `url('img/${numberDiceImgs[value - 1]}.png')`;
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
        utilsScript = document.createElement('script');
        utilsScript.src = 'scripts/omtUtils.js';
        utilsScript.onload = () => {
            // Once omtUtils.js is loaded, call generateUI with all necessary parameters
            const gameData = {
                scene: scene,
                colors: colors,
                columnValues: columnValues,
                numberDiceImgs: numberDiceImgs,
                boardClickHandler: boardClickHandler,
            };
            
            generateUI(gameData).then((result) => {
                // Update scene reference and store generated board
                scene = result.scene;
                GAME_STATE.generatedBoard = result.generatedBoard;
                resolve(result);
            }).catch(reject);
        };
        utilsScript.onerror = reject;
        document.body.appendChild(utilsScript);
    });
}

function initLogic(turn = null) {
    function setBoardValues() {
        let b = {
            grid: Array(7).fill().map(() => Array(15).fill(false)),
            columns: Array(2).fill().map(() => Array(15).fill(false)),
            jokers: 0,
            colors: Array(5).fill().map(() => Array(2).fill(false)),
            points: Array(5).fill(0)
        };
        return b;
    }

    GAME_STATE = {
        diceValues: [0, 1, 2, 3, 4, 5],
        diceRolls: 0,
        myState: 'default',
        currentPlayer: Math.random() < 0.5 ? 'main' : 'second',
        actionsStack: [],
        boards: {
            myBoard: setBoardValues(),
            opponentBoard: setBoardValues()
        }
    };
    updateTurnIndicator();
    loadUtilsAndGenerateUI();
}

function boardClickHandler(area, x, y) {
    console.log(`Board clicked at area: ${area}, x: ${x}, y: ${y}`);

    if(area === 'grid') {
        if(GAME_STATE.boards.myBoard.grid[y][x]) {
            GAME_STATE.boards.myBoard.grid[y][x] = false;
            scene.unCross.grid('myBoard', y, x);
        } else {
            GAME_STATE.boards.myBoard.grid[y][x] = true;
            scene.crossOut.grid('myBoard', y, x);
        }
    } else if(area === 'column') {
        if(GAME_STATE.boards.myBoard.columns[y][x]) {
            GAME_STATE.boards.myBoard.columns[y][x] = false;
            scene.unCross.column('myBoard', y, x);
        } else {
            GAME_STATE.boards.myBoard.columns[y][x] = true;
            scene.crossOut.column('myBoard', y, x);
        }
    } else if(area === 'joker') {
        if(GAME_STATE.boards.myBoard.jokers > x) {
            GAME_STATE.boards.myBoard.jokers--;
            scene.unCross.joker('myBoard', GAME_STATE.boards.myBoard.jokers);
        } else {
            GAME_STATE.boards.myBoard.jokers++;
            scene.crossOut.joker('myBoard', GAME_STATE.boards.myBoard.jokers - 1);
        }
    } else if(area === 'color') {
        if(GAME_STATE.boards.myBoard.colors[y][x]) {
            GAME_STATE.boards.myBoard.colors[y][x] = false;
            scene.unCross.color('myBoard', y, x);
        } else {
            GAME_STATE.boards.myBoard.colors[y][x] = true;
            scene.crossOut.color('myBoard', y, x);
        }
    }
}

if(myRole === 'main') {
    initLogic();
}

}
startOMT();