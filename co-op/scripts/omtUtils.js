function seededRandom(seed) {
    let t = (Number(seed) >>> 0);
    t = ((t ^ (t >>> 16)) * 0x45d9f3b) >>> 0;
    t = ((t ^ (t >>> 16)) * 0x45d9f3b) >>> 0;
    t = ((t ^ (t >>> 16)) >>> 0);
    return (t >>> 0) / 4294967296;
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
    for (let node in adjacencyDict) {
        const nodeNum = Number(node);
        if (nodeNum === 0) continue;
        
        for (let neighbor of adjacencyDict[node].neighbors) {
            if (neighbor !== 0 && coloringResult.colors[nodeNum] === coloringResult.colors[neighbor]) {
                console.warn(`Invalid coloring: Block ${nodeNum} and ${neighbor} are adjacent but have the same color ${coloringResult.colors[nodeNum]}`);
            }
        }
    }
    
    //Use colors to color the board
    let COLOREDBOARD = [];
    for (let i = 0; i < BOARD.length; i++) {
        let row = [];
        for (let j = 0; j < BOARD[i].length; j++) {
            const cellValue = BOARD[i][j];
            row.push( { color: cellValue !== 0 ? coloringResult.colors[cellValue] + 1 : 0, star: false });
        }
        COLOREDBOARD.push(row);
    }

    //Place Stars
    function generateStars(BOARD, colors) {
        const starsByColor = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
        const staredBlocks = {};

        let columnBlocks = new Set();

        for (let x = 0; x < 15; x++) {
            columnBlocks.add( {x: x, starPlaced: false, blocks: [] } );
        }

        for (let y = 0; y < 7; y++) {
            for (let x = 0; x < 15; x++) {
                const cellValue = BOARD[y][x];
                const color = colors[cellValue];
                const column = Array.from(columnBlocks).find(c => c.x === x);
                //Add block if not already present
                if (!column.blocks.some(b => b.blockID === cellValue)) {
                    column.blocks.push({ blockID: cellValue, color, y: [y] });
                } else {
                    const block = column.blocks.find(b => b.blockID === cellValue);
                    block.y.push(y);
                }
            }
        }

        let starsPlaced = [];
        let blockOffsets = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        while (starsPlaced.length < 15) {
            //get column with minimum amount of blocks that has no star yet
            const availableColumns = Array.from(columnBlocks).filter(cb => !cb.starPlaced);
            availableColumns.sort((a, b) => a.blocks.length - b.blocks.length);
            const targetColumn = availableColumns[0];

            if (blockOffsets[targetColumn.x] >= targetColumn.blocks.length) {
                //All blocks tried, remove last placed star and retry
                const lastStar = starsPlaced.pop();
                delete staredBlocks[lastStar.blockID];
                starsByColor[colors[lastStar.blockID]]--;
                const lastColumn = Array.from(columnBlocks).find(c => c.x === lastStar.x);
                lastColumn.starPlaced = false;
                blockOffsets[lastStar.x]++;
                blockOffsets[targetColumn.x] = 0;
                continue;
            }

            // nth block in this column
            const blockIDx = Math.floor(seededRandom(currentSeed + starsPlaced.length) * targetColumn.blocks.length + blockOffsets[targetColumn.x]) % targetColumn.blocks.length;
            const selectedBlock = targetColumn.blocks[blockIDx];
            // Sort blocks by amount of y cells decreasing
            /* const sortedBlocks = [...targetColumn.blocks].sort((a, b) => b.y.length - a.y.length);
            const blockIDx = blockOffsets[targetColumn.x] % sortedBlocks.length;
            const selectedBlock = sortedBlocks[blockIDx]; */

            const blockNr = selectedBlock.blockID;
            const blockColor = selectedBlock.color;
            if (staredBlocks[blockNr] === undefined && starsByColor[blockColor] < 3) {
                //Place star on random cell of block in this column
                const cellIDx = Math.floor(seededRandom(currentSeed + starsPlaced.length + 100) * selectedBlock.y.length);
                const starY = selectedBlock.y[cellIDx];
                starsByColor[blockColor]++;
                staredBlocks[blockNr] = true;
                targetColumn.starPlaced = true;
                starsPlaced.push({ x: targetColumn.x, y: starY, blockID: blockNr });
            } else {
                blockOffsets[targetColumn.x]++;
            }
        }
        return starsPlaced; 
    }
    
    // Try to generate valid stars
    let stars = generateStars(BOARD, coloringResult.colors);
    
    for (let star of stars) {
        COLOREDBOARD[star.y][star.x].star = true;
    }

    return COLOREDBOARD;
}

async function generateUI(gameData) {
    // Extract all necessary data from gameData parameter
    const { 
        scene, colors, columnValues, numberDiceImgs
    } = gameData;

    const omtContainer = document.getElementById('omt-container');

    async function getSeed(i) {
        try {
            const response = await fetch('oneMoreTimeSeeds.txt');
            if (!response.ok) {
                throw new Error('File not found');
            }
            const data = await response.text();
            return data.split('\n')[i];
        } catch (error) {
            console.error('Error fetching the file:', error);
            return null;
        }
    }

    const i = Math.floor(Math.random() * 1000);
    let generatedBoard;

    const seed = await getSeed(i);
    console.log('Using seed:', seed);
    generatedBoard = generateBoard(parseInt(seed));

    //Generate UI
    gameData.scene.dice = [];
    gameData.scene.boards = {
        myBoard: null,
        otherBoard: null
    };

    const maxHeight = Math.min(window.innerHeight, window.innerWidth / 1.4);

    function newBoard(buttons = true, generatedBoard) {
        let sceneBoard = {};

        const board = document.createElement('div');
        const boardHeight = maxHeight/2 - 40;
        const boardWidth = boardHeight * 1.65;

        board.style.height = `${boardHeight}px`;
        console.log(boardHeight, boardWidth);
        board.style.width = `${boardWidth}px`;

        board.className = 'omt-board';
        board.innerHTML = '';

        //grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'omt-board-grid-container';
        board.appendChild(gridContainer);

        const boardHead = document.createElement('div');
        boardHead.className = 'omt-board-grid';
        boardHead.id = 'omt-board-grid-head';

        const boardBody = document.createElement('div');
        boardBody.className = 'omt-board-grid';
        boardBody.id = 'omt-board-grid-body';

        const boardTail = document.createElement('div');
        boardTail.className = 'omt-board-grid';
        boardTail.id = 'omt-board-grid-tail';

        for (let j = 0; j < 15; j++) {
            const cell = document.createElement('button');
            cell.className = 'omt-board-cell';
            cell.style.backgroundColor = 'white';
            //Letters A-O
            cell.innerText = String.fromCharCode(65 + j);
            boardHead.appendChild(cell);
        }

        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 15; j++) {
                const cell = document.createElement('button');
                if(j === 7) {
                    cell.className = 'omt-board-cell-middle';
                } else {
                    cell.className = 'omt-board-cell';
                }
                cell.style.backgroundColor = colors[generatedBoard[i][j].color];
                if(generatedBoard[i][j].star) {
                    cell.style.backgroundImage = 'url("img/star.png")';
                } else {
                    cell.style.backgroundImage = 'url("img/field.png")';
                }
                cell.style.backgroundSize = 'cover';
                cell.style.backgroundRepeat = 'no-repeat';
                cell.style.backgroundPosition = 'center';
                boardBody.appendChild(cell);
            }
        }

        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 15; j++) {
                const cell = document.createElement('button');
                cell.className = 'omt-board-cell';
                cell.style.backgroundColor = 'white';
                cell.innerText = columnValues[i][j];
                boardTail.appendChild(cell);
            }
        }

        gridContainer.appendChild(boardHead);
        gridContainer.appendChild(boardBody);
        gridContainer.appendChild(boardTail);

        const jokerContainer = document.createElement('div');
        jokerContainer.className = 'omt-joker-container';

        const jokerTitle = document.createElement('img');
        jokerTitle.src = 'img/omt-joker-row.png';
        jokerTitle.height = 32;
        //keep aspect ratio
        jokerTitle.width = jokerTitle.height * 3;
        jokerTitle.alt = 'Joker';
        jokerContainer.appendChild(jokerTitle);

        for (let j = 0; j < 8; j++) {
            const cell = document.createElement('button');
            cell.className = 'omt-joker-cell';
            cell.style.backgroundImage = 'url("img/omt-joker.png")';
            cell.style.backgroundSize = 'cover';
            cell.style.backgroundRepeat = 'no-repeat';
            cell.style.backgroundPosition = 'center';
            jokerContainer.appendChild(cell);
        }

        gridContainer.appendChild(jokerContainer);

        //color and points container
        const color_and_points_container = document.createElement('div');
        color_and_points_container.className = 'omt-color-and-points-container';
        board.appendChild(color_and_points_container);

        const colorContainer = document.createElement('div');
        colorContainer.className = 'omt-color-container';
        color_and_points_container.appendChild(colorContainer);

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 2; j++) {
                const cell = document.createElement('button');
                cell.className = 'omt-board-cell';
                cell.style.backgroundColor = colors[i + 1];
                cell.innerText = 5 - j * 2;
                colorContainer.appendChild(cell);
            }
        }

        const pointsContainer = document.createElement('div');
        pointsContainer.className = 'omt-points-container';
        color_and_points_container.appendChild(pointsContainer);

        // Points rows data
        const pointsRows = [
            { label: 'BONUS', textContent: '='},
            { label: 'A-O', textContent: '+'},
            { type: 'joker', textContent: '+'},
            { type: 'star', textContent: '-'},
            { type: 'separator' },
            { label: 'TOTAL', textContent: '='}
        ];

        pointsRows.forEach(rowData => {
            const row = document.createElement('div');
            row.className = 'omt-points-row';

            if (rowData.type === 'separator') {
                // White dotted line separator
                const separator = document.createElement('div');
                separator.className = 'omt-points-separator';
                row.appendChild(separator);
            } else {
                // Label container
                const labelContainer = document.createElement('div');
                labelContainer.className = 'omt-points-label';

                if (rowData.label) {
                    // Text label
                    labelContainer.innerText = rowData.label;
                    // If label is BONUS set each letter a different color (colors array)
                    if (rowData.label === 'BONUS') {
                        labelContainer.innerHTML = '';
                        labelContainer.style.letterSpacing = '-3.5px';
                        for (let i = 0; i < rowData.label.length; i++) {
                            const letter = document.createElement('span');
                            letter.innerText = rowData.label[i];
                            letter.style.color = colors[i + 1 % colors.length];
                            letter.style.display = 'inline-block';
                            labelContainer.appendChild(letter);
                        }
                    }
                } else if (rowData.type === 'joker') {
                    // Joker image and text
                    const jokerImg = document.createElement('img');
                    jokerImg.src = 'img/omt-joker.png';
                    jokerImg.className = 'omt-points-icon';
                    labelContainer.appendChild(jokerImg);
                    
                    const jokerText = document.createElement('span');
                    jokerText.innerText = '(+1)';
                    labelContainer.appendChild(jokerText);
                } else if (rowData.type === 'star') {
                    // Star image and text
                    const starImg = document.createElement('img');
                    starImg.src = 'img/star.png';
                    starImg.className = 'omt-points-icon';
                    labelContainer.appendChild(starImg);
                    
                    const starText = document.createElement('span');
                    starText.innerText = '(-2)';
                    labelContainer.appendChild(starText);
                }

                // Text field
                const textField = document.createElement('div');
                textField.className = 'omt-points-text-field';
                textField.innerText = rowData.textContent;
                if( rowData.textContent == '+' ) {
                    textField.style.color = 'limegreen';
                } else if( rowData.textContent == '-' ) {
                    textField.style.color = 'red';
                }

                row.appendChild(labelContainer);
                row.appendChild(textField);
            }

            pointsContainer.appendChild(row);
        });

        omtContainer.appendChild(board);

        return {board, sceneBoard};
    }

    //dice
    const diceContainer = document.createElement('div');
    diceContainer.className = 'omt-dice-container';
    const diceContainerHeight = maxHeight / 2 - 20;
    const diceContainerWidth = diceContainerHeight / 2;
    diceContainer.style.height = `${diceContainerHeight}px`;
    diceContainer.style.width = `${diceContainerWidth}px`;

    const innerDiceContainer = document.createElement('div');
    innerDiceContainer.className = 'omt-inner-dice-container';
    innerDiceContainer.style.height = `${diceContainerHeight - 95}px`;
    innerDiceContainer.style.width = `${diceContainerWidth - 10}px`;

    for(let i = 0; i < 6; i++) {
        const die = document.createElement('div');
        die.className = 'omt-die';
        const size = (diceContainerWidth / 2) - 15;
        die.style.width = `${size}px`;
        die.style.height = `${size}px`;
        if( i % 2 === 0 ) {
            die.style.backgroundColor = '#d8d8d8ff';
            die.style.backgroundImage = `url('img/${numberDiceImgs[i]}')`;
            die.style.filter = 'invert(1)';

            innerDiceContainer.appendChild(die);
            gameData.scene.dice.push(die);
        } else {
            // Color the cross using the colors array (cycling through colors 1-5)
            const color = colors[i];
            
            // Keep white background and create colored cross overlay
            die.style.backgroundColor = '#ffffff';
            die.style.position = 'relative';
            
            // Create a pseudo-element for the colored cross
            const crossOverlay = document.createElement('div');
            crossOverlay.style.position = 'absolute';
            crossOverlay.style.top = '0';
            crossOverlay.style.left = '0';
            crossOverlay.style.width = '100%';
            crossOverlay.style.height = '100%';
            crossOverlay.style.backgroundColor = color;
            crossOverlay.style.mask = `url('img/dice_cross.png')`;
            crossOverlay.style.maskSize = 'contain';
            crossOverlay.style.maskRepeat = 'no-repeat';
            crossOverlay.style.maskPosition = 'center';
            crossOverlay.style.pointerEvents = 'none';
            
            die.appendChild(crossOverlay);

            innerDiceContainer.appendChild(die);
            gameData.scene.dice.push(crossOverlay);
        }
    }

    diceContainer.appendChild(innerDiceContainer);

    const rollButton = document.createElement('button');
    rollButton.className = 'omt-roll-button';
    rollButton.innerText = 'Roll Dice';
    rollButton.addEventListener('click', function() {
        rollDice();
    });
    diceContainer.appendChild(rollButton);

    omtContainer.appendChild(diceContainer);

    const boardsContainer = document.createElement('div');
    boardsContainer.className = 'omt-boards-container';
    omtContainer.appendChild(boardsContainer);

    const otherboardContainer = document.createElement('div');
    otherboardContainer.className = 'omt-board-container';
    otherboardContainer.innerText = otherName;
    otherboardContainer.style.backgroundColor = hexToCssColor(otherColor('semi-dark'));
    otherboardContainer.style.width = `${(maxHeight / 2) * 1.72 + 100}px`;
    const {board: otherBoard, sceneBoard: otherBoardScene} = newBoard(false, generatedBoard);
    gameData.scene.boards.otherBoard = otherBoardScene;
    otherBoard.id = 'other-board';
    otherboardContainer.appendChild(otherBoard);
    boardsContainer.appendChild(otherboardContainer);

    const myboardContainer = document.createElement('div');
    myboardContainer.className = 'omt-board-container';
    myboardContainer.innerText = myName;
    myboardContainer.style.backgroundColor = hexToCssColor(myColor('semi-dark'));
    myboardContainer.style.width = `${otherboardContainer.offsetWidth}px`;
    const {board: myBoard, sceneBoard: myBoardScene} = newBoard(true, generatedBoard);
    gameData.scene.boards.myBoard = myBoardScene;
    myBoard.id = 'my-board';
    myboardContainer.appendChild(myBoard);
    boardsContainer.appendChild(myboardContainer);

    console.log(gameData.scene);
}