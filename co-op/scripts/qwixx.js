function startQwixx() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const qwixxContainer = document.getElementById('qwixx-container');

const colors = ['#d73f4c', '#fee44a', '#419f5b', '#394a8b', '#e3e3e3', '#bdbdbd'];

//VALUES
let diceValues = [0, 0, 0, 0, 0, 0]; // Values of the dice

let scene = {};

window.back2Selection = function() {
    conn.send(packageData('BACK2SELECT', {}));
    cleanupScene();
    switch2('selection');
}

window.communication = function(command, args) {
    switch(command) {
        case 'INIT_GAME':
            GAME_STATE = args.GAME_STATE;
            init();
            break;
        case 'BACK2SELECT':
            cleanupScene();
            switch2('selection');
            break;
    }
}

function cleanupScene() {
    qwixxContainer.innerHTML = '';
    scene = {};
}

function generateQwixxUI() {
    scene = {
        dice: [],
        boards: {
            myBoard: null,
            otherBoard: null
        },
    };
    function newBoard(buttons = true) {
        let sceneBoard = {};

        const board = document.createElement('div');
        const boardHeight = window.innerHeight/2 - 20;
        const boardWidth = boardHeight * 1.72;

        board.style.height = `${boardHeight}px`;
        board.style.width = `${boardWidth}px`;

        board.className = 'qwixx-board';
        board.innerHTML = '';
        const rows = ['red-row', 'yellow-row', 'green-row', 'blue-row', 'info&miss', 'score_row'];
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
                    const numberDiv = document.createElement('div');
                    numberDiv.className = 'qwixx-number-div';
                    numberDiv.style.width = `${rowHeight - 10}px`;
                    numberDiv.style.height = `${rowHeight - 10}px`;
                    numberDiv.style.backgroundColor = lightColors[row_index];
                    numberDiv.style.border = `3px solid ${darkColors[row_index]}`;
                    numberDiv.innerText = i;
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
                            console.log(`Clicked number ${i} in row ${row}`);
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
                            console.log(`Clicked miss box ${i + 1} in row ${row}`);
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
                    scoreDiv.innerText = '0';
                    scoreDiv.id = `score-${i}`;
                    const clone = scoreDiv.cloneNode(true);
                    rowDiv.appendChild(clone);
                    sceneRow.push(clone);
                }
            }
            board.appendChild(rowDiv);
            sceneBoard[rows[row_index]] = sceneRow;
        });
        //console.log(sceneBoard);
        return {board, sceneBoard};
    }

    //dice
    const diceContainer = document.createElement('div');
    diceContainer.className = 'qwixx-dice-container';
    const diceContainerHeight = window.innerHeight / 2 - 20;
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
        die.innerText = '0';
        innerDiceContainer.appendChild(die);
        scene.dice.push(die);
    }

    diceContainer.appendChild(innerDiceContainer);

    const rollButton = document.createElement('button');
    rollButton.className = 'qwixx-roll-button';
    rollButton.innerText = 'Roll Dice';
    rollButton.addEventListener('click', function() {
        for(let i = 0; i < 6; i++) {
            diceValues[i] = Math.floor(Math.random() * 6) + 1;
        }
        animateDice();
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
    otherboardContainer.style.width = `${(window.innerHeight / 2) * 1.72 + 100}px`;
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
    myBoard.id = 'your-board';
    myboardContainer.appendChild(myBoard);
    boardsContainer.appendChild(myboardContainer);

    console.log(scene);
}

function animateDice() {
    //Change dice 6 times to random values, then set to the final diceValues
    let count = 0;
    const interval = setInterval(() => {
        for(let i = 0; i < 6; i++) {
            const randomValue = Math.floor(Math.random() * 6) + 1;
            scene.dice[i].innerText = randomValue;
        }
        count++;
        if(count === 6) {
            clearInterval(interval);
            for(let i = 0; i < 6; i++) {
                scene.dice[i].innerText = diceValues[i];
            }
        }
    }, 100);
}

generateQwixxUI();

}
startQwixx();