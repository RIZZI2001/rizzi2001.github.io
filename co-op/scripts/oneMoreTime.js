function startOMT() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const omtContainer = document.getElementById('omt-container');

let utilsScript = null;

let scene = {};
let keydownHandler = null;

let colors = ['#000000', '#20b327ff', '#ffc919ff', '#69bbffff', '#ec305fff', '#f0721eff'];
let columnValues = [
    [5, 3, 3, 3, 2, 2, 2, 1, 2, 2, 2, 3, 3, 3, 5], 
    [3, 2, 2, 2, 1, 1, 1, 0, 1, 1, 1, 2, 2, 2, 3]
];
let numberDiceImgs = ['questionmark', 'dice_1', 'dice_2', 'dice_3', 'dice_4', 'dice_5'];

let GAME_STATE = {};

keydownHandler = async (event) => {
    if(event.key === 'u') {
        console.log('scene: ',scene, 'game state: ', GAME_STATE);
    }
};
document.addEventListener('keydown', keydownHandler);

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
}

function setDie(dieIndex, value) {
    if(dieIndex % 2 === 0) {
        scene.dice[dieIndex][0].style.backgroundImage = `url('img/${numberDiceImgs[value]}.png')`;
    } else {
        scene.dice[dieIndex][0].style.backgroundColor = colors[value];
    }
}

function animateDice() {
    let count = 0;
    const interval = setInterval(() => {
        for(let i = 0; i < 6; i++) {
            const randomValue = Math.floor(Math.random() * 6);
            setDie(i, randomValue);
        }
        count++;
        if(count === 6) {
            clearInterval(interval);
            for(let i = 0; i < 6; i++) {
                setDie(i, GAME_STATE.diceValues[i][0]);
            }
        }
    }, 100);
}

window.rollDice = function() {
    if(GAME_STATE.myState !== 'newTurn' || GAME_STATE.currentPlayer !== myRole) {
        return;
    }
    for(let i = 0; i < 6; i++) {
        GAME_STATE.diceValues[i][0] = Math.floor(Math.random() * 6);
    }
    console.log('Rolled dice values:', GAME_STATE.diceValues);
    conn.send(packageData('ROLL_DICE', { diceValues: GAME_STATE.diceValues }));
    GAME_STATE.diceRolls++;
    GAME_STATE.myState = 'diceSelection';
    animateDice();
}

window.communication = function(command, args) {
    switch(command) {
        case 'INIT_GAME':
            console.log('Received INIT command with args:', args);
            initLogic(args.currentPlayer, args.generatedBoard);
            break;
        case 'ROLL_DICE':
            GAME_STATE.diceValues = args.diceValues;
            GAME_STATE.diceRolls++;
            animateDice();
            break;
        case 'SET_DIE_SELECT':
            setDieSelect(args.dieIndex, args.status, false);
            break;
        case 'DICE_SELECTED':
            //other selected his dice - now it's my turn
            console.log('Opponent selected dice, it is now your turn');
            GAME_STATE.myState = 'diceSelection';
            break;
        case 'CROSS_GRID':
            console.log('Crossing opponent grid at', args.x, args.y);
            GAME_STATE.boards.opponentBoard.grid[args.y][args.x] = true;
            scene.crossOut.grid('otherBoard', args.y, args.x);
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
    // Remove document-level handlers created by this instance
    if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
    }

    // Remove dynamically added utils script if still present
    if (utilsScript) {
        try {
            if (utilsScript.parentNode) document.body.removeChild(utilsScript);
        } catch (e) {
            console.warn('Failed to remove utilsScript during cleanup', e);
        }
        utilsScript = null;
    }

    // Unregister window-facing functions so old instances are not callable
    try { window.back2Selection = null; } catch(e) {}
    try { window.endTurn = null; } catch(e) {}
    try { window.undo = null; } catch(e) {}
    try { window.rollDice = null; } catch(e) {}
    try { window.communication = null; } catch(e) {}

    // Reset scene and game state objects
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

async function loadUtilsAndGenerateUI(generatedBoard = null) {
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

            generateUI(gameData, generatedBoard).then((result) => {
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

function initLogic(turn = null, generatedBoard = null) {
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
        diceValues: [[0, 'clear'], [1, 'clear'], [2, 'clear'], [3, 'clear'], [4, 'clear'], [5, 'clear']],
        diceRolls: 0,
        myState: 'newTurn',
        selectedColorDieId: null,
        selectedNumberDieId: null,
        selectedBlock: null,
        budgetLeft: 0,
        currentPlayer: turn ? turn : Math.random() < 0.5 ? 'main' : 'second',
        boards: {
            myBoard: setBoardValues(),
            opponentBoard: setBoardValues()
        }
    };
    updateTurnIndicator();
    loadUtilsAndGenerateUI(generatedBoard).then(() => {
        if(myRole === 'main') {
            conn.send(packageData('INIT_GAME', { currentPlayer: GAME_STATE.currentPlayer, generatedBoard: GAME_STATE.generatedBoard }));
        }
    });
}

function setDieSelect(dieIndex, status, sendUpdate = true) {
    console.log(`Setting die ${dieIndex} select status to ${status}`);
    GAME_STATE.diceValues[dieIndex][1] = status;
    scene.setTakenOverlay(dieIndex, status);
    if (sendUpdate) {
        conn.send(packageData('SET_DIE_SELECT', { dieIndex: dieIndex, status: status }));
    }
}

function boardClickHandler(area, x, y) {
    if(area === 'grid') {
        if(GAME_STATE.boards.myBoard.grid[y][x]) {
            //Was already crossed - ignore
            return;
        }
        if(GAME_STATE.budgetLeft <= 0) {
            //No budget left - ignore
            console.log('No budget left - ignoring click');
            return;
        }
        if(x !== 7) {
            //Not the middle column check if at least one adjacent cell is crossed
            const g = GAME_STATE.boards.myBoard.grid;
            if(!((x > 0 && g[y][x - 1]) || (x < 14 && g[y][x + 1]) || (y > 0 && g[y - 1][x]) || (y < 6 && g[y + 1][x]))) {
                //No adjacent crossed cells - ignore
                console.log('No adjacent crossed cells - ignoring click');
                return;
            }
        }
        if(GAME_STATE.myState == 'bothSelected') {
            //First cross this move
            //Check if color matches
            if(GAME_STATE.generatedBoard[y][x].color !== GAME_STATE.diceValues[GAME_STATE.selectedColorDieId][0]) {
                //Color does not match - ignore
                console.log('Color does not match - ignoring click');
                return;
            }
            const blockSize = 6 - Math.floor(GAME_STATE.generatedBoard[y][x].blockID / 5);
            if(blockSize < GAME_STATE.budgetLeft) {
                //Block too small for budget - ignore
                console.log('Block too small for budget - ignoring click', blockSize, GAME_STATE.budgetLeft);
                return;
            }
            GAME_STATE.selectedBlock = GAME_STATE.generatedBoard[y][x].blockID;
            GAME_STATE.myState = 'blockSelected';
        }
        if(GAME_STATE.generatedBoard[y][x].blockID !== GAME_STATE.selectedBlock) {
            //Not the selected block - ignore
            return;
        }
        //Cross it
        GAME_STATE.budgetLeft -= 1;
        GAME_STATE.boards.myBoard.grid[y][x] = true;
        scene.crossOut.grid('myBoard', y, x);
        conn.send(packageData('CROSS_GRID', { x: x, y: y }));
        if(GAME_STATE.budgetLeft <= 0) {
            //No budget left - go into crossedBlock state
            GAME_STATE.myState = 'crossedBlock';
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
    } else if(area === 'die') {
        console.log(`Die ${x} clicked`);
        const state = GAME_STATE.myState;
        if(state !== 'diceSelection' && state != 'numSelected' && state != 'colSelected') {
            return;
        }
        if(GAME_STATE.diceValues[x][1] === otherRole) {
            return;
        }
        if(x % 2 === 0) {
            // Number die
            if(GAME_STATE.selectedNumberDieId != null) {
                setDieSelect(GAME_STATE.selectedNumberDieId, 'clear', true);
                GAME_STATE.selectedNumberDieId = null;
            }
            if(GAME_STATE.selectedNumberDieId !== x) {
                GAME_STATE.selectedNumberDieId = x;
                setDieSelect(x, myRole, true);
                if(state === 'diceSelection') {
                    GAME_STATE.myState = 'numSelected';
                } else if(state === 'colSelected') {
                    GAME_STATE.myState = 'bothSelected';
                    GAME_STATE.budgetLeft = GAME_STATE.diceValues[GAME_STATE.selectedNumberDieId][0];
                    if(GAME_STATE.currentPlayer === myRole) {
                        conn.send(packageData('DICE_SELECTED') );
                    }
                }
            }
        } else {
            // Color die
            if(GAME_STATE.selectedColorDieId != null) {
                setDieSelect(GAME_STATE.selectedColorDieId, 'clear', true);
                GAME_STATE.selectedColorDieId = null;
            }
            if(GAME_STATE.selectedColorDieId !== x) {
                GAME_STATE.selectedColorDieId = x;
                setDieSelect(x, myRole, true);
                if(state === 'diceSelection') {
                    GAME_STATE.myState = 'colSelected';
                } else if(state === 'numSelected') {
                    GAME_STATE.myState = 'bothSelected';
                    GAME_STATE.budgetLeft = GAME_STATE.diceValues[GAME_STATE.selectedNumberDieId][0];
                    if(GAME_STATE.currentPlayer === myRole) {
                        conn.send(packageData('DICE_SELECTED') );
                    }
                }
            }
        }
    }
}

if(myRole === 'main') {
    initLogic();
}

}
startOMT();