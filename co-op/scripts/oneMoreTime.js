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
    if(GAME_STATE.myState == 'newTurn' || GAME_STATE.myState == 'waiting' || (GAME_STATE.myState == 'blockSelected' && GAME_STATE.diceValues[GAME_STATE.selectedNumberDieId][0] !== 0)) {
        console.log("Cannot end turn before rolling dice or completing actions");
        return;
    }
    GAME_STATE.myState = 'waiting';
    GAME_STATE.selectedColorDieId = null;
    GAME_STATE.selectedNumberDieId = null;
    GAME_STATE.selectedBlock = null;
    GAME_STATE.budgetLeft = 0;
    GAME_STATE.crossedThisTurn = [];
    currentPlayerIndicator.innerText = "Waiting for " + otherName + "...";
    omtContainer.style.background = '#242424ff';
    currentPlayerIndicator.style.color = '#b3b3b3ff';
    conn.send(packageData('WAITING', {}));
}

window.undo = function() {
}

function completeTurn() {
    //Cross out closed columns and colors for both players
    for(let x = 0; x < 15; x++) {
        if(GAME_STATE.boards.otherBoard.columns[0][x] === 'circle' && GAME_STATE.boards.myBoard.columns[0][x] == null) {
            GAME_STATE.boards.myBoard.columns[0][x] = 'cross';
            scene.crossOut.column('myBoard', 0, x, 'cross');
        }
        if(GAME_STATE.boards.myBoard.columns[0][x] === 'circle' && GAME_STATE.boards.otherBoard.columns[0][x] == null) {
            GAME_STATE.boards.otherBoard.columns[0][x] = 'cross';
            scene.crossOut.column('otherBoard', 0, x, 'cross');
        }
    }
    for(let y = 0; y < 5; y++) {
        if(GAME_STATE.boards.otherBoard.colors[y][0] === 'circle' && GAME_STATE.boards.myBoard.colors[y][0] == null) {
            GAME_STATE.boards.myBoard.colors[y][0] = 'cross';
            scene.crossOut.color('myBoard', y, 0, 'cross');
        }
        if(GAME_STATE.boards.myBoard.colors[y][0] === 'circle' && GAME_STATE.boards.otherBoard.colors[y][0] == null) {
            GAME_STATE.boards.otherBoard.colors[y][0] = 'cross';
            scene.crossOut.color('otherBoard', y, 0, 'cross');
        }
    }
    //Free dice selections
    for(let i = 0; i < 6; i++) {
        setDieSelect(i, 'clear', false);
    }

    GAME_STATE.myState = 'newTurn';
    GAME_STATE.otherWaiting = false;
    GAME_STATE.currentPlayer = GAME_STATE.currentPlayer === 'main' ? 'second' : 'main';
    updateTurnIndicator();
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
            GAME_STATE.boards.otherBoard.grid[args.y][args.x] = true;
            scene.crossOut.grid('otherBoard', args.y, args.x, 'cross');
            break;
        case 'CROSS_JOKER':
            console.log('Crossing opponent joker at', args.id);
            GAME_STATE.boards.otherBoard.jokers++;
            scene.crossOut.joker('otherBoard', args.id, 'cross');
            break;
        case 'CLOSE_COLUMN':
            console.log('Closing opponent column at', args.x, args.y);
            GAME_STATE.boards.otherBoard.columns[args.y][args.x] = 'circle';
            scene.crossOut.column('otherBoard', args.y, args.x, 'circle');
            break;
        case 'CLOSE_COLOR':
            console.log('Closing opponent color at', args.x, args.y);
            GAME_STATE.boards.otherBoard.colors[args.y][args.x] = 'circle';
            scene.crossOut.color('otherBoard', args.y, args.x, 'circle');
            break;
        case 'WAITING':
            console.log('Opponent is waiting');
            GAME_STATE.otherWaiting = true;
            if(GAME_STATE.myState === 'waiting') {
                //Both players are waiting - end turn
                console.log('Both players are waiting - ending turn');
                conn.send(packageData('END_TURN', {}));
                completeTurn();
            } else {
                currentPlayerIndicator.innerText = otherName + " is waiting...";
                omtContainer.style.background = '#242424ff';
                currentPlayerIndicator.style.color = '#b3b3b3ff';
            }
            break;
        case 'END_TURN':
            console.log('Turn ended by opponent');
            completeTurn();
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
            columns: Array(2).fill().map(() => Array(15).fill(null)),
            jokers: 0,
            colors: Array(5).fill().map(() => Array(2).fill(null)),
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
        otherWaiting: false,
        crossedThisTurn: [],
        currentPlayer: turn ? turn : Math.random() < 0.5 ? 'main' : 'second',
        boards: {
            myBoard: setBoardValues(),
            otherBoard: setBoardValues()
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

function selectBothDice() {
    GAME_STATE.myState = 'bothDiceSelected';
    //check if number joker has been selected
    if(GAME_STATE.diceValues[GAME_STATE.selectedNumberDieId][0] === 0) {
        GAME_STATE.budgetLeft = 5;
        scene.crossOut.joker('myBoard', GAME_STATE.boards.myBoard.jokers, 'cross');
        conn.send(packageData('CROSS_JOKER', { id: GAME_STATE.boards.myBoard.jokers }));
        GAME_STATE.boards.myBoard.jokers++;
    } else {
        GAME_STATE.budgetLeft = GAME_STATE.diceValues[GAME_STATE.selectedNumberDieId][0];
    }
    // check if color joker has been selected
    if(GAME_STATE.diceValues[GAME_STATE.selectedColorDieId][0] === 0) {
        scene.crossOut.joker('myBoard', GAME_STATE.boards.myBoard.jokers, 'cross');
        conn.send(packageData('CROSS_JOKER', { id: GAME_STATE.boards.myBoard.jokers }));
        GAME_STATE.boards.myBoard.jokers++;
    }
    if(GAME_STATE.currentPlayer === myRole) {
        conn.send(packageData('DICE_SELECTED') );
    }
}

function boardClickHandler(area, x, y) {
    console.log(`Board area ${area} clicked at (${x}, ${y})`);
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
        if(GAME_STATE.myState == 'bothDiceSelected') {
            //First cross this move
            //Check if color matches
            const c = GAME_STATE.diceValues[GAME_STATE.selectedColorDieId][0];
            if(GAME_STATE.generatedBoard[y][x].color !== c && c !== 0) {
                //Color does not match - ignore
                console.log('Color does not match - ignoring click');
                return;
            }
            const blockSize = 6 - Math.floor((GAME_STATE.generatedBoard[y][x].blockID - 1) / 5);
            if(blockSize < GAME_STATE.budgetLeft && GAME_STATE.diceValues[GAME_STATE.selectedNumberDieId][0] !== 0) {
                //Block too small for budget - ignore
                console.log('Block too small for budget - ignoring click', blockSize, GAME_STATE.budgetLeft);
                return;
            }
            GAME_STATE.selectedBlock = GAME_STATE.generatedBoard[y][x].blockID;
            GAME_STATE.myState = 'blockSelected';
        } else {
            let borderingCellFound = false;
            //Not first cross this move -> Has to border at least one other cross from this turn
            for(let i = 0; i < GAME_STATE.crossedThisTurn.length; i++) {
                const cell = GAME_STATE.crossedThisTurn[i];
                if((cell.x === x && (cell.y === y - 1 || cell.y === y + 1)) || (cell.y === y && (cell.x === x - 1 || cell.x === x + 1))) {
                    // Found a bordering cell
                    borderingCellFound = true;
                    break;
                }
            }
            if(!borderingCellFound) {
                console.log('No bordering cell from this turn - ignoring click');
                return;
            }
        }
        if(GAME_STATE.generatedBoard[y][x].blockID !== GAME_STATE.selectedBlock) {
            //Not the selected block - ignore
            return;
        }
        //Cross it
        GAME_STATE.budgetLeft -= 1;
        GAME_STATE.boards.myBoard.grid[y][x] = true;
        GAME_STATE.crossedThisTurn.push({ x: x, y: y });
        scene.crossOut.grid('myBoard', y, x, 'cross');
        conn.send(packageData('CROSS_GRID', { x: x, y: y }));
        if(GAME_STATE.budgetLeft <= 0) {
            //No budget left - go into crossedBlock state
            GAME_STATE.myState = 'crossedBlock';
        }
    } else if(area === 'column') {
        if(!(GAME_STATE.myState == 'crossedBlock' || (GAME_STATE.myState === 'blockSelected' && GAME_STATE.diceValues[GAME_STATE.selectedNumberDieId][0] === 0))) {
            console.log("Neither used all budget nor used any of the joker - ignore");
            return;
        }
        if(GAME_STATE.boards.myBoard.columns[y][x] !== null) {
            console.log("Column already crossed - ignoring click");
            return;
        }
        if(y == 1 && GAME_STATE.boards.myBoard.columns[0][x] !== 'cross') {
            console.log("Cannot cross second row before other clicked the first - ignoring click");
            return;
        }
        //Check if all cells in the column are crossed
        for(let row = 0; row < 7; row++) {
            if(!GAME_STATE.boards.myBoard.grid[row][x]) {
                console.log("Not all cells in column are crossed - ignoring click");
                return;
            }
        }
        GAME_STATE.boards.myBoard.columns[y][x] = 'circle';
        scene.crossOut.column('myBoard', y, x, 'circle');
        conn.send(packageData('CLOSE_COLUMN', { x: x, y: y }));
    } else if(area === 'color') {
        if(!(GAME_STATE.myState == 'crossedBlock' || (GAME_STATE.myState === 'blockSelected' && GAME_STATE.diceValues[GAME_STATE.selectedNumberDieId][0] === 0))) {
            console.log("Neither used all budget nor used any of the joker - ignore");
            return;
        }
        if(GAME_STATE.boards.myBoard.colors[y][x] !== null) {
            console.log("Color already crossed - ignoring click");
            return;
        }
        if(x == 1 && GAME_STATE.boards.myBoard.colors[y][0] !== 'cross') {
            console.log("Cannot cross second column before other clicked the first - ignoring click");
            return;
        }
        //Check if all cells with the selected color are crossed
        for(let row = 0; row < 7; row++) {
            for(let col = 0; col < 15; col++) {
                if(GAME_STATE.generatedBoard[row][col].color === (y+1) && !GAME_STATE.boards.myBoard.grid[row][col]) {
                    console.log("Not all cells with the selected color are crossed - ignoring click");
                    return;
                }
            }
        }
        GAME_STATE.boards.myBoard.colors[y][x] = 'circle';
        scene.crossOut.color('myBoard', y, x, 'circle');
        conn.send(packageData('CLOSE_COLOR', { x: x, y: y }));
    } else if(area === 'die') {
        console.log(`Die ${x} clicked`);
        const state = GAME_STATE.myState;
        if(state !== 'diceSelection' && state != 'numDiceSelected' && state != 'colDiceSelected') {
            return;
        }
        if(GAME_STATE.diceValues[x][1] === otherRole) {
            return;
        }
        if(GAME_STATE.diceValues[x][0] === 0 && GAME_STATE.boards.myBoard.jokers >= 8) {
            console.log('No jokers left to select joker die - ignoring click');
            return;
        }
        if(x % 2 === 0) {
            // Number die
            if(GAME_STATE.selectedNumberDieId != null) {
                setDieSelect(GAME_STATE.selectedNumberDieId, 'clear', GAME_STATE.diceRolls > 3);
                GAME_STATE.selectedNumberDieId = null;
            }
            if(GAME_STATE.selectedNumberDieId !== x) {
                GAME_STATE.selectedNumberDieId = x;
                setDieSelect(x, myRole, GAME_STATE.diceRolls > 3);
                if(state === 'diceSelection') {
                    GAME_STATE.myState = 'numDiceSelected';
                } else if(state === 'colDiceSelected') {
                    selectBothDice();
                }
            }
        } else {
            // Color die
            if(GAME_STATE.selectedColorDieId != null) {
                setDieSelect(GAME_STATE.selectedColorDieId, 'clear', GAME_STATE.diceRolls > 3);
                GAME_STATE.selectedColorDieId = null;
            }
            if(GAME_STATE.selectedColorDieId !== x) {
                GAME_STATE.selectedColorDieId = x;
                setDieSelect(x, myRole, GAME_STATE.diceRolls > 3);
                if(state === 'diceSelection') {
                    GAME_STATE.myState = 'colDiceSelected';
                } else if(state === 'numDiceSelected') {
                    selectBothDice();
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