(function() {
    const gridContainer = document.querySelector('.grid-container');

    const gameList = [
        {
            title: 'The Game',
            image: 'theGame.png',
            link: 'theGame'
        },
        {
            title: 'Qwirkle',
            image: 'qwirkle.png',
            link: 'qwirkle'
        },
    ];

    selectedGame = {
        'main': null,
        'other': null
    };

    let gridIsInitialized = false;

    const initializeGrid = () => {
        console.log('initializeGrid');
        if (gridIsInitialized) return;
        gridIsInitialized = true;

        if (!gridContainer) return;

        gameList.forEach(game => {
            const gridItem = document.createElement('div');
            gridItem.classList.add('grid-item');
            gridItem.dataset.title = game.link;

            const img = document.createElement('img');
            img.src = `img/${game.image}`;
            img.alt = game.title;

            const title = document.createElement('div');
            title.classList.add('title');
            title.textContent = game.title;

            gridItem.style.border = '5px solid black';

            gridItem.appendChild(img);
            gridItem.appendChild(title);

            gridContainer.appendChild(gridItem);

            // Add event listener for selection
            gridItem.addEventListener('click', () => {
                selectedGame[myRole] = game.link;

                if(selectedGame[otherRole] == selectedGame[myRole]) {
                    conn.send(packageData('SWITCH2', { page: selectedGame[myRole] }));
                    switch2(selectedGame[myRole]);
                    return;
                }

                setBorder(myColor(), game.link);
                conn.send(packageData('SELECT', { game: game.link }));
            });
        });
    };

    window.setBorder = function(color, game) {
        const myCssColor = hexToCssColor(color);
        document.querySelectorAll('.grid-item').forEach(item => {
            if (item.dataset.title === game) {
                item.style.border = `5px solid ${myCssColor}`;
            } else if (rgbToHex(item.style.borderColor) === myCssColor) {
                item.style.border = '5px solid black';
            }
        });
    };

    const rgbToHex = (rgb) => {
        if (!rgb) return null;
        const rgbValues = rgb.match(/\d+/g);
        if (!rgbValues) return null;
        return `#${((1 << 24) + (parseInt(rgbValues[0]) << 16) + (parseInt(rgbValues[1]) << 8) + parseInt(rgbValues[2])).toString(16).slice(1)}`;
    };

    initializeGrid();
})();