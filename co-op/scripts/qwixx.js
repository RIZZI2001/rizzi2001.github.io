function startQwixx() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');

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

function generateBoards() {
    function newBoard() {
        const board = document.createElement('div');
        const boardHeight = window.innerHeight/2 - 20;
        const boardWidth = boardHeight * 1.72;

        board.style.height = `${boardHeight}px`;
        board.style.width = `${boardWidth}px`;

        board.className = 'qwixx-board';
        board.innerHTML = '';
        const rows = ['red-row', 'yellow-row', 'green-row', 'blue-row', 'info&miss', 'score_row'];
        const colors = ['#d73f4c', '#fee44a', '#419f5b', '#394a8b', '#e3e3e3', '#bdbdbd'];
        const lightColors = ['#f9e0e5', '#fdf9f1', '#ebf3f1', '#e4e0f2', '#ffffff', '#ffffff'];
        const darkColors = ['#943037', '#d8a352', '#3f7c52', '#2d2e4b', '#999999', '#000000'];

        rows.forEach(row => {
            const index = rows.indexOf(row);
            const rowDiv = document.createElement('div');
            rowDiv.className = 'qwixx-row';
            rowDiv.style.backgroundColor = colors[index];
            const rowHeight = (boardHeight - 70) / rows.length;
            rowDiv.style.height = `${rowHeight}px`;

            if(index < 4) {
                for(let i = 2; i <= 13; i++) {
                    const numberDiv = document.createElement('div');
                    numberDiv.className = 'qwixx-number-div';
                    numberDiv.style.width = `${rowHeight - 10}px`;
                    numberDiv.style.height = `${rowHeight - 10}px`;
                    numberDiv.style.backgroundColor = lightColors[index];
                    numberDiv.style.border = `3px solid ${darkColors[index]}`;

                    const numberButton = document.createElement('button');
                    numberButton.className = 'qwixx-number-button';
                    numberButton.style.width = `${rowHeight - 10}px`;
                    numberButton.style.height = `${rowHeight - 10}px`;
                    numberButton.innerText = i;
                    numberButton.style.color = darkColors[index];
                    numberButton.onclick = function() {
                        //conn.send(packageData('SELECT_NUMBER', { row: row, number: i }));
                    };
                    if (i === 13) {
                        numberButton.innerText = '🔒';
                        numberDiv.style.borderRadius = '50%';
                    }

                    numberDiv.appendChild(numberButton);

                    rowDiv.appendChild(numberDiv);
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
                    infoDiv.style.backgroundColor = lightColors[index];
                    infoDiv.style.border = `3px solid ${darkColors[index]}`;
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
                
                const missBox = document.createElement('div');
                missBox.className = 'qwixx-miss-box';
                missBox.style.width = `${(rowHeight - 10) / 2}px`;
                missBox.style.height = `${(rowHeight - 10) / 2}px`;
                missBox.style.backgroundColor = lightColors[index];
                missBox.style.border = `3px solid ${darkColors[index]}`;

                // add 4 miss boxes to the inner div
                for(let i = 0; i < 4; i++) {
                    const missBoxClone = missBox.cloneNode();
                    missDivInner.appendChild(missBoxClone);
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
                    rowDiv.appendChild(scoreDiv.cloneNode(true));
                }
            }
            board.appendChild(rowDiv);
        });
        return board;
    }
    const qwixx_container = document.getElementById('qwixx-boards-container');
    const otherboardContainer = document.createElement('div');
    otherboardContainer.className = 'qwixx-board-container';
    otherboardContainer.innerText = otherName;
    otherboardContainer.style.backgroundColor = hexToCssColor(otherColor('semi-dark'));
    otherboardContainer.style.width = `${(window.innerHeight / 2) * 1.72 + 100}px`;
    const otherBoard = newBoard();
    otherBoard.id = 'other-board';
    otherboardContainer.appendChild(otherBoard);
    qwixx_container.appendChild(otherboardContainer);

    const myboardContainer = document.createElement('div');
    myboardContainer.className = 'qwixx-board-container';
    myboardContainer.innerText = myName;
    myboardContainer.style.backgroundColor = hexToCssColor(myColor('semi-dark'));
    myboardContainer.style.width = `${otherboardContainer.offsetWidth}px`;
    const myBoard = newBoard();
    myBoard.id = 'your-board';
    myboardContainer.appendChild(myBoard);
    qwixx_container.appendChild(myboardContainer);
}
generateBoards();

}
startQwixx();