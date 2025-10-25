function startOMT() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const gameContainer = document.getElementById('game-container');

let scene = {};

let GAME_STATE = {};

    // Deterministic pseudo-random function that returns a value in [0,1).
    // It accepts any numeric seed (will be coerced to a 32-bit unsigned int).
    // Same seed -> same output. Lightweight, non-cryptographic.
    function seededRandom(seed) {
        // Coerce seed to 32-bit unsigned integer
        let t = (Number(seed) >>> 0);
        // Simple hash function to scramble the seed
        t = ((t ^ (t >>> 16)) * 0x45d9f3b) >>> 0;
        t = ((t ^ (t >>> 16)) * 0x45d9f3b) >>> 0;
        t = ((t ^ (t >>> 16)) >>> 0);
        // Ensure result is always positive and convert to [0,1)
        return (t >>> 0) / 4294967296;
    }

document.addEventListener('keydown', (event) => {
    if (event.key === 't') {
        generateBoard();
    } else if (event.key === 'b') {
        for (let i = 0; i < 10; i++) {
            console.log(seededRandom(i));
        }
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
    let directions = [
        {x: 0, y: 1},   // Down
        {x: 1, y: 0},   // Right
        {x: 0, y: -1},  // Up
        {x: -1, y: 0}   // Left
    ];

    let boardLayout = [];
    let history = [];
    let attemptHistory = []; // Track which attempts we've tried for each block

    // Initialize board
    for (let x = 0; x < 7; x++) {
        let row = [];
        for (let y = 0; y < 15; y++) {
            row.push(0);
        }
        boardLayout.push(row);
    }

    function bordersColor(newX, newY, color) {
        let borders = false;
        directions.forEach(dir => {
            let borderX = newX + dir.x;
            let borderY = newY + dir.y;
            if (borderX >= 0 && borderX < 7 && borderY >= 0 && borderY < 15 && boardLayout[borderX][borderY] === color) {
                borders = true;
            }
        });
        return borders;
    }

    function shuffleArray(array, seed) {
        // Create a copy to avoid modifying original
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed + i) * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function tryPlaceBlock(blockID) {
        if (blockID >= 30) {
            return true; // Successfully placed all blocks
        }

        // Calculate size: 5 blocks each of sizes 1,2,3,4,5,6 = 30 total blocks
        // blockID 0-4: size 1, blockID 5-9: size 2, ..., blockID 25-29: size 6
        const currentSize = 6 - Math.floor(blockID / 5);
        const currentColor = (blockID % 5) + 1;

        // Initialize attempt tracking for this block if needed
        if (!attemptHistory[blockID]) {
            attemptHistory[blockID] = { startPositionIndex: 0, placementAttempts: [] };
        }

        // Find all valid starting positions
        let emptyPositions = [];
        for (let x = 0; x < 7; x++) {
            for (let y = 0; y < 15; y++) {
                if (boardLayout[x][y] === 0 && !bordersColor(x, y, currentColor)) {
                    emptyPositions.push({x: x, y: y});
                }
            }
        }

        if (emptyPositions.length === 0) {
            return false; // No valid starting positions
        }

        // Shuffle starting positions deterministically
        emptyPositions = shuffleArray(emptyPositions, baseSeed + blockID);

        // Try each starting position from where we left off
        for (let startIdx = attemptHistory[blockID].startPositionIndex; startIdx < emptyPositions.length; startIdx++) {
            const startPos = emptyPositions[startIdx];
            
            // Try to grow block from this position
            if (tryGrowBlock(startPos, currentSize, currentColor, blockID)) {
                // Successfully placed this block, move to next
                attemptHistory[blockID].startPositionIndex = startIdx;
                if (tryPlaceBlock(blockID + 1)) {
                    return true; // Solution found
                }
                // Backtrack: remove the block we just placed
                const lastBlock = history.pop();
                lastBlock.forEach(pos => {
                    boardLayout[pos.x][pos.y] = 0;
                });
            }
        }

        // Exhausted all starting positions for this block
        attemptHistory[blockID].startPositionIndex = 0;
        return false;
    }

    function tryGrowBlock(startPos, targetSize, color, blockID) {
        let currentBlock = [{x: startPos.x, y: startPos.y}];
        let growthAttempts = 0;
        const maxGrowthAttempts = 100;

        while (currentBlock.length < targetSize && growthAttempts < maxGrowthAttempts) {
            let potentialPositions = [];
            
            // Find all potential expansion positions
            currentBlock.forEach(pos => {
                directions.forEach(dir => {
                    let newX = pos.x + dir.x;
                    let newY = pos.y + dir.y;

                    if (newX >= 0 && newX < 7 && newY >= 0 && newY < 15 && 
                        boardLayout[newX][newY] === 0 && 
                        !currentBlock.some(p => p.x === newX && p.y === newY) && 
                        !potentialPositions.some(p => p.x === newX && p.y === newY) &&
                        !bordersColor(newX, newY, color)) {
                        potentialPositions.push({x: newX, y: newY});
                    }
                });
            });

            if (potentialPositions.length === 0) {
                break; // Can't grow further
            }

            // Choose next position deterministically
            const nextIndex = Math.floor(seededRandom(baseSeed + blockID + currentBlock.length + growthAttempts) * potentialPositions.length);
            currentBlock.push(potentialPositions[nextIndex]);
            growthAttempts++;
        }

        if (currentBlock.length === targetSize) {
            // Successfully grown to target size, place on board
            currentBlock.forEach(pos => {
                boardLayout[pos.x][pos.y] = color;
            });
            history.push(currentBlock);
            console.log('Placed block', blockID, 'of size', targetSize, 'color', color);
            return true;
        }

        return false; // Failed to grow to target size
    }

    // Start the recursive backtracking
    console.log('Starting board generation with seed:', baseSeed);
    const success = tryPlaceBlock(0);
    
    if (!success) {
        console.log('Failed to generate complete board');
    } else {
        console.log('Successfully generated board with', history.length, 'blocks');
    }

    //VISUALIZE BOARD
    let colorDict = {
        0: '⬜️',
        1: '🟥',
        2: '🟨',
        3: '🟩',
        4: '🟦',
        5: '🟪'
    }
    let rowStr = '';
    for (let x = 0; x < 7; x++) {
        for (let y = 0; y < 15; y++) {
            rowStr += colorDict[boardLayout[x][y]];
        }
        rowStr += '\n';
    }
    console.log(rowStr);

}

if(myRole === 'main') {
    initLogic();
}

}
startOMT();