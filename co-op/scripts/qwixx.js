function startQwixx() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const qwixxContainer = document.getElementById('qwixx-container');

const colors = ['#d73f4c', '#fee44a', '#419f5b', '#394a8b', '#e3e3e3', '#bdbdbd'];
const rows = ['red-row', 'yellow-row', 'green-row', 'blue-row', 'info&miss', 'score_row'];

//VALUES


let scene = {};

let GAME_STATE = {};

window.back2Selection = function() {
    conn.send(packageData('BACK2SELECT', {}));
    cleanupScene();
    switch2('selection');
}

window.endTurn = function() {
    if(GAME_STATE.myState !== 'miss' && GAME_STATE.myState !== 'usedWhites' && GAME_STATE.myState !== 'usedColored' && GAME_STATE.myState !== 'usedBoth' && GAME_STATE.myState !== 'usedArbitrary') {
        return;
    }
    GAME_STATE.myState = 'otherTurn';
    GAME_STATE.currentPlayer = (GAME_STATE.currentPlayer === 'main') ? 'second' : 'main';
    updateTurnIndicator();
    conn.send(packageData('END_TURN', {}));
}

window.undo = function() {

}

window.communication = function(command, args) {
    switch(command) {
        case 'INIT_GAME':
            console.log('Received INIT command with args:', args);
            initLogic(args.currentPlayer);
            break;
        case 'ROLL_DICE':
            GAME_STATE.diceValues = args.diceValues;
            animateDice();
            GAME_STATE.myState = 'otherDiceRolled';
            break;
        case 'CLICK_NUMBER':
            const { id, row, number } = args;
            scene.boards.otherBoard[row][id].style.backgroundImage = 'url("img/crossed.png")';
            GAME_STATE.otherBoardValues[row.replace('-row', '')].push(number);
            break;
        case 'CLICK_MISS':
            GAME_STATE.otherBoardValues.misses = args.misses;
            scene.boards.otherBoard['info&miss'][GAME_STATE.otherBoardValues.misses - 1].style.backgroundImage = 'url("img/crossed.png")';
            break;
        case 'END_TURN':
            if(GAME_STATE.myState == 'otherDiceRolled') {
                GAME_STATE.myState = 'myTurnNUO';
            } else if(GAME_STATE.myState == 'usedOther') {
                GAME_STATE.myState = 'myTurn';
            }
            GAME_STATE.currentPlayer = myRole;
            updateTurnIndicator();
            break;
        case 'BACK2SELECT':
            cleanupScene();
            switch2('selection');
            break;
    }
}

function cleanupScene() {
    console.log('Cleaning up Qwixx scene...');
    qwixxContainer.innerHTML = '';
    scene = {};
    GAME_STATE = {};
}

function updateTurnIndicator() {
    currentPlayerIndicator.innerText = GAME_STATE.currentPlayer == myRole ? 'Your Turn' : otherName + "'s Turn";

    if (GAME_STATE.currentPlayer === 'main') {
        qwixxContainer.style.background = hexToCssColor(mainColorDark);
        currentPlayerIndicator.style.color = hexToCssColor(mainColor);
    } else {
        qwixxContainer.style.background = hexToCssColor(secondColorDark);
        currentPlayerIndicator.style.color = hexToCssColor(secondColor);
    }
}

function initLogic(turn = null) {
    GAME_STATE = {
        diceValues: [1, 2, 3, 4, 5, 6],
        myBoardValues: {
            red: [],
            yellow: [],
            green: [],
            blue: [],
            misses: 0,
            score: [0, 0, 0, 0, 0, 0]
        },
        otherBoardValues: {
            red: [],
            yellow: [],
            green: [],
            blue: [],
            misses: 0,
            score: [0, 0, 0, 0, 0, 0]
        },
        currentPlayer: null,
        myState: null
    };
    if(turn == null) {
        GAME_STATE.currentPlayer = (Math.random() < 0.5) ? 'main' : 'second';
        conn.send(packageData('INIT_GAME', { currentPlayer: GAME_STATE.currentPlayer }));
    } else {
        GAME_STATE.currentPlayer = turn;
    }
    if(GAME_STATE.currentPlayer === myRole) {
        GAME_STATE.myState = 'myTurn';
    } else {
        GAME_STATE.myState = 'otherTurn';
    }
    updateTurnIndicator();
    generateQwixxUI();
}

function generateQwixxUI() {
    scene = {
        dice: [],
        boards: {
            myBoard: null,
            otherBoard: null
        },
    };

    const maxHeight = Math.min(window.innerHeight, window.innerWidth / 1.4);

    function newBoard(buttons = true) {
        let sceneBoard = {};

        const board = document.createElement('div');
        const boardHeight = maxHeight/2 - 20;
        const boardWidth = boardHeight * 1.72;

        board.style.height = `${boardHeight}px`;
        board.style.width = `${boardWidth}px`;

        board.className = 'qwixx-board';
        board.innerHTML = '';
        const lightColors = ['#f9e0e5', '#fdf9f1', '#ebf3f1', '#e4e0f2', '#ffffff', '#ffffff'];
        const darkColors = ['#943037', '#d8a352', '#3f7c52', '#2d2e4b', '#999999', '#000000'];

        rows.forEach(row => {
            const row_index = rows.indexOf(row);
            const rowDiv = document.createElement('div');
            rowDiv.className = 'qwixx-row';
            rowDiv.style.backgroundColor = colors[row_index];
            const rowHeight = (boardHeight - 70) / rows.length;
            rowDiv.style.height = `${rowHeight}px`;

            let sceneRow = [];

            if(row_index < 4) {
                for(let i = 2; i <= 13; i++) {
                    let cellValue = i;
                    if(row_index >= 2) {
                        cellValue = 14 - i;
                    }
                    const numberDiv = document.createElement('div');
                    numberDiv.className = 'qwixx-number-div';
                    numberDiv.style.width = `${rowHeight - 10}px`;
                    numberDiv.style.height = `${rowHeight - 10}px`;
                    numberDiv.style.backgroundColor = lightColors[row_index];
                    numberDiv.style.border = `3px solid ${darkColors[row_index]}`;
                    numberDiv.innerText = cellValue;
                    if(i === 13) {
                        numberDiv.style.borderRadius = '50%';
                        numberDiv.innerText = '🔒';
                    }

                    if(buttons) {
                        const numberButton = document.createElement('button');
                        numberButton.className = 'qwixx-number-button';
                        numberButton.style.width = `${rowHeight - 10}px`;
                        numberButton.style.height = `${rowHeight - 10}px`;
                        numberButton.style.color = darkColors[row_index];
                        numberButton.onclick = function() {
                            clickNumber(cellValue, row);
                        };
                        numberDiv.appendChild(numberButton);
                    }

                    rowDiv.appendChild(numberDiv);
                    sceneRow.push(numberDiv);
                }
            }
            else if(row === 'info&miss') {
                //Info
                let infoDiv = document.createElement('div');
                infoDiv.className = 'qwixx-info-div';
                infoDiv.style.width = `${rowHeight}px`;
                infoDiv.style.height = `${rowHeight - 10}px`;
                infoDiv.style.border = `3px solid #e3e3e3`;
                infoDiv.innerText = `Crosses\nPoints`;
                rowDiv.appendChild(infoDiv);

                value = 1;
                for(let i = 1; i <= 12; i++) {
                    infoDiv = document.createElement('div');
                    infoDiv.className = 'qwixx-info-div';
                    infoDiv.style.width = `${rowHeight - 30}px`;
                    infoDiv.style.height = `${rowHeight - 10}px`;
                    infoDiv.style.backgroundColor = lightColors[row_index];
                    infoDiv.style.border = `3px solid ${darkColors[row_index]}`;
                    infoDiv.innerText = `${i}x \n ${value}`;
                    value += (i+1);
                    rowDiv.appendChild(infoDiv);
                }

                //Miss
                const missDiv = document.createElement('div');
                missDiv.className = 'qwixx-miss-div';
                missDiv.style.width = `${rowHeight * 2.3}px`;
                missDiv.style.height = `${rowHeight - 10}px`;
                missDiv.style.border = `3px solid #e3e3e3`;
                missDiv.innerText = `Misses -5 each`;

                const missDivInner = document.createElement('div');
                missDivInner.className = 'qwixx-miss-inner-div';
                missDivInner.style.width = '100%';
                missDivInner.style.height = `${(rowHeight - 10) / 2}px`;

                // add 4 miss boxes to the inner div
                for(let i = 0; i < 4; i++) {
                    const missBox = document.createElement('div');
                    missBox.className = 'qwixx-miss-box';
                    missBox.style.width = `${(rowHeight - 10) / 2}px`;
                    missBox.style.height = `${(rowHeight - 10) / 2}px`;
                    missBox.style.backgroundColor = lightColors[row_index];
                    missBox.style.border = `3px solid ${darkColors[row_index]}`;

                    if(buttons) {
                        const missButton = document.createElement('button');
                        missButton.className = 'qwixx-miss-button';
                        missButton.addEventListener('click', function() {
                            clickMiss();
                        });
                        missBox.appendChild(missButton);
                    }

                    missDivInner.appendChild(missBox);
                    sceneRow.push(missBox);
                }

                missDiv.appendChild(missDivInner);

                rowDiv.appendChild(missDiv);

            } else if(row === 'score_row') {
                let textDiv = document.createElement('div');
                textDiv.className = 'qwixx-score-text-div';
                let scoreDiv = document.createElement('div');
                scoreDiv.className = 'qwixx-score-div';
                textDiv.innerText = 'Result';
                for(let i = 0; i < 6; i++) {
                    rowDiv.appendChild(textDiv.cloneNode(true));
                    textDiv.innerText = '+';
                    if(i === 3) {
                        textDiv.innerText = '-';
                    } else if(i === 4) {
                        textDiv.innerText = '=';
                    }
                    scoreDiv.style.width = `${rowHeight}px`;
                    scoreDiv.style.height = `${rowHeight - 20}px`;
                    scoreDiv.style.border = `3px solid ${colors[i]}`;
                    if(i === 4) {
                        scoreDiv.style.border = `3px solid #999999`;
                    } else if(i === 5) {
                        scoreDiv.style.border = `3px solid #000000`;
                        scoreDiv.style.width = `${rowHeight + 40}px`;
                    }
                    scoreDiv.innerText = '';
                    scoreDiv.id = `score-${i}`;
                    const clone = scoreDiv.cloneNode(true);
                    rowDiv.appendChild(clone);
                    sceneRow.push(clone);
                }
            }
            board.appendChild(rowDiv);
            sceneBoard[rows[row_index]] = sceneRow;
        });
        return {board, sceneBoard};
    }

    //dice
    const diceContainer = document.createElement('div');
    diceContainer.className = 'qwixx-dice-container';
    const diceContainerHeight = maxHeight / 2 - 20;
    const diceContainerWidth = diceContainerHeight / 2;
    diceContainer.style.height = `${diceContainerHeight}px`;
    diceContainer.style.width = `${diceContainerWidth}px`;

    const innerDiceContainer = document.createElement('div');
    innerDiceContainer.className = 'qwixx-inner-dice-container';
    innerDiceContainer.style.height = `${diceContainerHeight - 95}px`;
    innerDiceContainer.style.width = `${diceContainerWidth - 10}px`;

    for(let i = 0; i < 6; i++) {
        const die = document.createElement('div');
        die.className = 'qwixx-die';
        const size = (diceContainerWidth / 2) - 15;
        die.style.width = `${size}px`;
        die.style.height = `${size}px`;
        die.style.backgroundColor = colors[Math.min(i, 4)];
        die.style.backgroundImage = `url('img/dice_${i + 1}.png')`;
        innerDiceContainer.appendChild(die);
        scene.dice.push(die);
    }

    diceContainer.appendChild(innerDiceContainer);

    const rollButton = document.createElement('button');
    rollButton.className = 'qwixx-roll-button';
    rollButton.innerText = 'Roll Dice';
    rollButton.addEventListener('click', function() {
        rollDice();
    });
    diceContainer.appendChild(rollButton);

    qwixxContainer.appendChild(diceContainer);

    const boardsContainer = document.createElement('div');
    boardsContainer.className = 'qwixx-boards-container';
    qwixxContainer.appendChild(boardsContainer);

    const otherboardContainer = document.createElement('div');
    otherboardContainer.className = 'qwixx-board-container';
    otherboardContainer.innerText = otherName;
    otherboardContainer.style.backgroundColor = hexToCssColor(otherColor('semi-dark'));
    otherboardContainer.style.width = `${(maxHeight / 2) * 1.72 + 100}px`;
    const {board: otherBoard, sceneBoard: otherBoardScene} = newBoard(false);
    scene.boards.otherBoard = otherBoardScene;
    otherBoard.id = 'other-board';
    otherboardContainer.appendChild(otherBoard);
    boardsContainer.appendChild(otherboardContainer);

    const myboardContainer = document.createElement('div');
    myboardContainer.className = 'qwixx-board-container';
    myboardContainer.innerText = myName;
    myboardContainer.style.backgroundColor = hexToCssColor(myColor('semi-dark'));
    myboardContainer.style.width = `${otherboardContainer.offsetWidth}px`;
    const {board: myBoard, sceneBoard: myBoardScene} = newBoard(true);
    scene.boards.myBoard = myBoardScene;
    myBoard.id = 'my-board';
    myboardContainer.appendChild(myBoard);
    boardsContainer.appendChild(myboardContainer);

    console.log(scene);
}

function animateDice() {
    let count = 0;
    const interval = setInterval(() => {
        for(let i = 0; i < 6; i++) {
            const randomValue = Math.floor(Math.random() * 6) + 1;
            scene.dice[i].style.backgroundImage = `url('img/dice_${randomValue}.png')`;
        }
        count++;
        if(count === 6) {
            clearInterval(interval);
            for(let i = 0; i < 6; i++) {
                scene.dice[i].style.backgroundImage = `url('img/dice_${GAME_STATE.diceValues[i]}.png')`;
            }
        }
    }, 100);
}

function rollDice() {
    if(GAME_STATE.myState !== 'myTurn' && GAME_STATE.myState !== 'myTurnNUO') {
        return;
    }
    for(let i = 0; i < 6; i++) {
        GAME_STATE.diceValues[i] = Math.floor(Math.random() * 6) + 1;
    }
    conn.send(packageData('ROLL_DICE', { diceValues: GAME_STATE.diceValues }));
    animateDice();
    GAME_STATE.myState = 'myDiceRolled';
}

function clickMiss() {
    if(GAME_STATE.myState !== 'myDiceRolled' || GAME_STATE.myBoardValues.misses >= 4) {
        return;
    }
    GAME_STATE.myBoardValues.misses++;
    GAME_STATE.myState = 'miss';
    scene.boards.myBoard['info&miss'][GAME_STATE.myBoardValues.misses - 1].style.backgroundImage = 'url("img/crossed.png")';
    conn.send(packageData('CLICK_MISS', { misses: GAME_STATE.myBoardValues.misses }));
}

function clickNumber(number, row) {
    let id = number - 2;
    if(row === 'green-row' || row === 'blue-row') {
        id = 12 - number;
    }
    const rowValues = GAME_STATE.myBoardValues[row.replace('-row', '')];
    const lastValue = rowValues[rowValues.length - 1] || 0;

    // Check if the clicked number is valid
    if(rowValues.length > 0 && (lastValue >= number && (row == 'red-row' || row == 'yellow-row') || lastValue <= number && (row == 'green-row' || row == 'blue-row'))) {
        console.warn(`Cannot click number ${number} in row ${row} because it is smaller than the last clicked number.`);
        return;
    }

    const white1 = GAME_STATE.diceValues[4];
    const white2 = GAME_STATE.diceValues[5];
    const coloredDiceValue = GAME_STATE.diceValues[rows.indexOf(row)];

    if(GAME_STATE.myState === 'myTurnNUO' || GAME_STATE.myState === 'otherDiceRolled' || GAME_STATE.myState === 'usedColored') {
        // Possible to use the white dice
        if(white1 + white2 !== number) {
            console.warn(`Cannot click number ${number} in row ${row} because it does not match the rolled dice value.`);
            return;
        }

        // state transition
        if(GAME_STATE.myState === 'myTurnNUO') {
            GAME_STATE.myState = 'myTurn';
        } else if (GAME_STATE.myState === 'otherDiceRolled') {
            GAME_STATE.myState = 'usedOther';
        } else if (GAME_STATE.myState === 'usedColored') {
            GAME_STATE.myState = 'usedBoth';
        }
    } else if(GAME_STATE.myState === 'usedWhites') {
        // Possible to use the colored dice
        if(coloredDiceValue + white1 !== number && coloredDiceValue + white2 !== number) {
            console.warn(`Cannot click number ${number} in row ${row} because it does not match the rolled colored dice value.`);
            return;
        }

        // state transition
        GAME_STATE.myState = 'usedBoth';
    } else if(GAME_STATE.myState === 'myDiceRolled') {
        // Still able to use white and colored dice
        if(coloredDiceValue + white1 == number || coloredDiceValue + white2 == number) {
            // Possible to use the colored dice
            if(white1 + white2 == number) {
                // Also possible to use the white dice
                // state transition
                GAME_STATE.myState = 'usedArbitrary';
            } else {
                // state transition
                GAME_STATE.myState = 'usedColored';
            }
        } else if(white1 + white2 == number) {
            // state transition
            GAME_STATE.myState = 'usedWhites';
        } else {
            console.warn(`Cannot click number ${number} in row ${row} because it does not match the rolled dice value.`);
            return;
        }
    } else if(GAME_STATE.myState === 'usedArbitrary') {
        if(coloredDiceValue + white1 == number || coloredDiceValue + white2 == number || white1 + white2 == number) {
            // Possible to use the colored dice or white dice
            // state transition
            GAME_STATE.myState = 'usedBoth';
        }
    } else {
        return; // Invalid state
    }

    scene.boards.myBoard[row][id].style.backgroundImage = 'url("img/crossed.png")';
    GAME_STATE.myBoardValues[row.replace('-row', '')].push(number);
    conn.send(packageData('CLICK_NUMBER', { id: id, row: row, number: number }));
    console.log(`Number ${number} clicked in row ${row}`);
    console.log('New state:', GAME_STATE.myState);
}

if(myRole === 'main') {
    initLogic();
}

}
startQwixx();