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
    const colors = {
        0: '⬜',
        1: '🟥',
        2: '🟨',
        3: '🟩',
        4: '🟦',
        5: '🟪'
    }

    function visualizeBoard(b) {
        let visBoard = '';
        for (let i = 0; i < b.length; i++) {
            for (let j = 0; j < b[i].length; j++) {
                visBoard += colors[b[i][j] ];
            }
            visBoard += '\n';
        }
        console.log(visBoard);
    }

    if (event.key === 't') {
        let res = generateBoard(500);
        let b = res.COLOREDBOARD;
        visualizeBoard(b);
    } else if (event.key === 'y') {
        let sucessfulSeeds = [];
        let SEED = 0;

        while (sucessfulSeeds.length < 100) {
            let res = generateBoard(SEED);
            let sucseed = res.currentSeed;
            let b = res.COLOREDBOARD;
            visualizeBoard(b);
            console.log(sucseed);

            sucessfulSeeds.push(SEED);
            SEED = sucseed + 10;
        }

        console.log(sucessfulSeeds);
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

    function generateBoardGraph(seed) {
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

        while(PLACEDBLOCKS.length < 30 && trys < 100) {
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
            const randIndex = Math.floor(seededRandom(seed + PLACEDBLOCKS.length) * emptyCells.length + PlacementOffsets[BlockID]) % emptyCells.length;
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
                const randIndex = Math.floor(seededRandom(seed + PLACEDBLOCKS.length + newBlock.length) * emptyNeighbours.length);
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

        if (trys >= 100) {
            seed += 1;
            return generateBoardGraph(seed);
        }

        //Create adjacency list
        let adjacencyDict = {};
        for (let i = 1; i <= 30; i++) {
            adjacencyDict[i] = {
                size: (6 - Math.floor((i - 1) / 5)),
                neighbors: []
            };
        }
        for (let i = 0; i < BOARD.length; i++) {
            for (let j = 0; j < BOARD[i].length; j++) {
                const cellValue = BOARD[i][j];
                for (let dir of directions) {
                    const nx = j + dir.x;
                    const ny = i + dir.y;
                    if (nx >= 0 && nx < 15 && ny >= 0 && ny < 7) {
                        const neighborValue = BOARD[ny][nx];
                        if (neighborValue !== cellValue && !adjacencyDict[cellValue].neighbors.includes(neighborValue)) {
                            adjacencyDict[cellValue].neighbors.push(neighborValue);
                        }
                    }
                }
            }
        }
        return { BOARD, adjacencyDict };
    }

    // Function to attempt coloring with size constraints
    function attemptColoring(adjacencyDict) {
        const colors = {};
        const nodes = Object.keys(adjacencyDict).map(Number);
        
        // Group nodes by size
        const nodesBySize = {};
        for (let size = 1; size <= 6; size++) {
            nodesBySize[size] = [];
        }
        for (let node of nodes) {
            const size = adjacencyDict[node].size;
            nodesBySize[size].push(node);
        }
        
        // Sort each size group by degree (number of neighbors) in descending order
        for (let size in nodesBySize) {
            nodesBySize[size].sort((a, b) => adjacencyDict[b].neighbors.length - adjacencyDict[a].neighbors.length);
        }
        
        // Track how many blocks of each size are assigned to each color
        const colorSizeCount = {};
        for (let color = 0; color < 5; color++) {
            colorSizeCount[color] = {};
            for (let size = 1; size <= 6; size++) {
                colorSizeCount[color][size] = 0;
            }
        }
        
        // Assign colors ensuring each color gets exactly one block of each size
        for (let size = 1; size <= 6; size++) {
            for (let node of nodesBySize[size]) {
                const usedColors = new Set();
                
                // Check which colors are used by neighbors
                for (let neighbor of adjacencyDict[node].neighbors) {
                    if (neighbor !== 0 && colors[neighbor] !== undefined) {
                        usedColors.add(colors[neighbor]);
                    }
                }
                
                // Find a color that:
                // 1. Is not used by neighbors
                // 2. Still needs a block of this size
                let assignedColor = -1;
                for (let color = 0; color < 5; color++) {
                    if (!usedColors.has(color) && colorSizeCount[color][size] === 0) {
                        assignedColor = color;
                        break;
                    }
                }
                
                if (assignedColor === -1) {
                    return null;
                }
            
                colors[node] = assignedColor;
                colorSizeCount[assignedColor][size]++;
            }
        }
        
        // Verify the coloring is complete and valid
        for (let color = 0; color < 5; color++) {
            for (let size = 1; size <= 6; size++) {
                if (colorSizeCount[color][size] !== 1) {
                    return null; // Invalid distribution
                }
            }
        }
        
        return { colors, colorSizeCount };
    }

    // Function to check if middle column (x=7) contains all 5 colors
    function checkMiddleColumnColors(BOARD, colors) {
        const middleColumnColors = new Set();
        
        // Check column x=7 for all colors
        for (let y = 0; y < BOARD.length; y++) {
            const cellValue = BOARD[y][7];
            if (cellValue !== 0) {
                const color = colors[cellValue];
                middleColumnColors.add(color);
            }
        }
        
        // Check if all 5 colors (0,1,2,3,4) are present
        return middleColumnColors.size === 5;
    }

    // Try to find a valid coloring by incrementing the seed
    let currentSeed = baseSeed;
    let coloringResult = null;
    let BOARD, adjacencyDict;
    let middleColumnValid = false;
    
    while ((coloringResult === null || !middleColumnValid) && currentSeed < baseSeed + 10000) {
        const boardGraph = generateBoardGraph(currentSeed);
        BOARD = boardGraph.BOARD;
        adjacencyDict = boardGraph.adjacencyDict;
        
        coloringResult = attemptColoring(adjacencyDict);

        if (coloringResult !== null) {
            // Check if middle column has all colors
            middleColumnValid = checkMiddleColumnColors(BOARD, coloringResult.colors);
            
            if (!middleColumnValid) {
                coloringResult = null; // Reset to continue loop
                currentSeed++;
            }
        } else {
            currentSeed++;
        }
    }
    
    if (coloringResult === null || !middleColumnValid) {
        console.error('Failed to find valid coloring with middle column requirement after 1000 attempts');
        return [];
    }
    
    // Verify no adjacent blocks have the same color
    let adjacencyValid = true;
    for (let node in adjacencyDict) {
        const nodeNum = Number(node);
        if (nodeNum === 0) continue;
        
        for (let neighbor of adjacencyDict[node].neighbors) {
            if (neighbor !== 0 && coloringResult.colors[nodeNum] === coloringResult.colors[neighbor]) {
                console.warn(`Invalid coloring: Block ${nodeNum} and ${neighbor} are adjacent but have the same color ${coloringResult.colors[nodeNum]}`);
                adjacencyValid = false;
            }
        }
    }
    
    //Use colors to color the board
    let COLOREDBOARD = [];
    for (let i = 0; i < BOARD.length; i++) {
        let row = [];
        for (let j = 0; j < BOARD[i].length; j++) {
            const cellValue = BOARD[i][j];
            row.push(cellValue !== 0 ? coloringResult.colors[cellValue] + 1 : 0);
        }
        COLOREDBOARD.push(row);
    }

    return { COLOREDBOARD, currentSeed };
}

if(myRole === 'main') {
    initLogic();
}

}
startOMT();