function startOMT() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const gameContainer = document.getElementById('game-container');

let scene = {};

let GAME_STATE = {};

function seededRandom(seed) {
    let t = (Number(seed) >>> 0);
    t = ((t ^ (t >>> 16)) * 0x45d9f3b) >>> 0;
    t = ((t ^ (t >>> 16)) * 0x45d9f3b) >>> 0;
    t = ((t ^ (t >>> 16)) >>> 0);
    return (t >>> 0) / 4294967296;
}

document.addEventListener('keydown', (event) => {
    if (event.key === 't') {
        /* const colors = {
            0: '⬜',
            1: '🟥',
            2: '🟨',
            3: '🟩',
            4: '🟦',
            5: '🟪'
        } */
        let b = generateBoard();
        let visBoard = '';
        for (let i = 0; i < b.length; i++) {
            for (let j = 0; j < b[i].length; j++) {
                let cell = b[i][j];
                if(('' + cell).length == 1) cell = ' ' + cell;
                visBoard += cell + ',';
            }
            visBoard += '\n';
        }
        console.log(visBoard);
    }
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
    gameContainer.innerHTML = '';
    scene = {};
    GAME_STATE = {};
}

function updateTurnIndicator() {
    currentPlayerIndicator.innerText = GAME_STATE.currentPlayer == myRole ? 'Your Turn' : otherName + "'s Turn";

    if (GAME_STATE.currentPlayer === 'main') {
        gameContainer.style.background = hexToCssColor(mainColorDark);
        currentPlayerIndicator.style.color = hexToCssColor(mainColor);
    } else {
        gameContainer.style.background = hexToCssColor(secondColorDark);
        currentPlayerIndicator.style.color = hexToCssColor(secondColor);
    }
}

function initLogic(turn = null) {
    GAME_STATE = {
    };
    updateTurnIndicator();
    generateUI();
}

function generateUI() {
    scene = {
        dice: [],
        boards: {
            myBoard: null,
            otherBoard: null
        },
    };

    console.log(scene);
}

function generateBoard(baseSeed = 0) {
    const directions = [
        { x: 0, y: -1 }, // Up
        { x: 1, y: 0 },  // Right
        { x: 0, y: 1 },  // Down
        { x: -1, y: 0 }  // Left
    ];

    let BOARD = [];
    let PLACEDBLOCKS = [];
    let PlacementOffsets = [];

    for (let i = 0; i < 7; i++) {
        let row = [];
        for (let j = 0; j < 15; j++) {
            row.push(0);
        }
        BOARD.push(row);
    }

    PlacementOffsets = Array(30).fill(0);

    let trys = 0;

    while(PLACEDBLOCKS.length < 30 && trys < 1000) {
        const BlockID = PLACEDBLOCKS.length;
        const blockSize = 6 - Math.floor(BlockID / 5);

        const emptyCells = [];
        for (let i = 0; i < BOARD.length; i++) {
            for (let j = 0; j < BOARD[i].length; j++) {
                if (BOARD[i][j] === 0) {
                    emptyCells.push({ x: j, y: i });
                }
            }
        }
        const randIndex = Math.floor(seededRandom(baseSeed + PLACEDBLOCKS.length) * emptyCells.length + PlacementOffsets[BlockID]) % emptyCells.length;
        const startCell = emptyCells[randIndex];
        
        // Try to place block
        let newBlock = [];
        newBlock.push( startCell );

        // Get empty neighbours
        let emptyNeighbours = [];
        for (let dir of directions) {
            const nx = startCell.x + dir.x;
            const ny = startCell.y + dir.y;
            if (nx >= 0 && nx < 15 && ny >= 0 && ny < 7 && BOARD[ny][nx] === 0) {
                emptyNeighbours.push({ x: nx, y: ny });
            }
        }

        while (newBlock.length < blockSize && emptyNeighbours.length > 0) {
            const randIndex = Math.floor(seededRandom(baseSeed + PLACEDBLOCKS.length + newBlock.length) * emptyNeighbours.length);
            const nextCell = emptyNeighbours.splice(randIndex, 1)[0];
            newBlock.push(nextCell);

            // Update empty neighbours
            for (let dir of directions) {
                const nx = nextCell.x + dir.x;
                const ny = nextCell.y + dir.y;
                //Add to emptyNeighbours only if on board, empty and not already in newBlock or emptyNeighbours
                if (nx >= 0 && nx < 15 && ny >= 0 && ny < 7 && BOARD[ny][nx] === 0 && !newBlock.some(cell => cell.x === nx && cell.y === ny) && !emptyNeighbours.some(cell => cell.x === nx && cell.y === ny)) {
                    emptyNeighbours.push({ x: nx, y: ny });
                }
            }
        }

        if (newBlock.length === blockSize) {
            // Place block
            for (let cell of newBlock) {
                BOARD[cell.y][cell.x] = BlockID + 1;
            }
            PLACEDBLOCKS.push(newBlock);
        } else {
            // Failed to place block, increase offset and retry
            PlacementOffsets[BlockID]++;
        }
        trys++;
    }
    console.log(`${trys} tries.`);

    //Create adjacency list
    let adjacencyDict = {};
    for (let i = 1; i <= 30; i++) {
        adjacencyDict[i] = [];
    }
    for (let i = 0; i < BOARD.length; i++) {
        for (let j = 0; j < BOARD[i].length; j++) {
            const cellValue = BOARD[i][j];
            for (let dir of directions) {
                const nx = j + dir.x;
                const ny = i + dir.y;
                if (nx >= 0 && nx < 15 && ny >= 0 && ny < 7) {
                    const neighborValue = BOARD[ny][nx];
                    if (neighborValue !== cellValue && !adjacencyDict[cellValue].includes(neighborValue)) {
                        adjacencyDict[cellValue].push(neighborValue);
                    }
                }
            }
        }
    }
    
    console.log(adjacencyDict);

    return BOARD;
}

if(myRole === 'main') {
    initLogic();
}

}
startOMT();