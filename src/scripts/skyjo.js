function startTheGame() {

    const currentPlayerIndicator = document.getElementById('current-player-indicator');
    const winnerIndicator = document.getElementById('winner-indicator');
    const undoButton = document.getElementById('undo-button');
    const endTurnButton = document.getElementById('end-turn-button');
    
    let scene, camera, renderer;
    let MyCards, OtherCards, CardStack, OpenCardStack;
    let raycaster, mouse;
    let SelectedCardObject = null;
    let selectedCard = null;
    let turnState = null;
    let offset = new THREE.Vector3();
    let isRendering = true;
    let endGameTimeout;
    
    const windowSubtract = 0.5;
    
    window.back2Selection = function() {
        conn.send(packageData('BACK2SELECT', {}));
        cleanupScene();
        switch2('selection');
    }
    
    window.communication = function(command, args) {
        switch(command) {
            case 'INIT_GAME':
                GAME_STATE.currentPlayer = args.currentPlayer;
                updateTurnIndicator();
                break;
            case 'PLACE_CARD':
                placeCard(args.cardValue, args.stackType, args.stackOwnerRole, args.cardPlayerRole, args.cardColor);
                break;
            case 'END_TURN':
                GAME_STATE.currentPlayer = args.currentPlayer;
                updateTurnIndicator();
                break;
            case 'END_GAME':
                showWinner(args.winner);
                break;
            case 'BACK2SELECT':
                cleanupScene();
                switch2('selection');
                break;
        }
    }
    
    function cleanupScene() {
        isRendering = false;
    
        if(endGameTimeout) {
            clearTimeout(endGameTimeout);
            endGameTimeout = null;
        }
    
        // Remove all event listeners
        window.removeEventListener('resize', onWindowResize, false);
        window.removeEventListener('mousedown', onMouseDown, false);
        window.removeEventListener('mousemove', onMouseMove, false);
        window.removeEventListener('mouseup', onMouseUp, false);
    
        // Remove the renderer's DOM element
        if (renderer && renderer.domElement) {
            document.body.removeChild(renderer.domElement);
        }
    
        // Dispose of the scene and its objects
        if (scene) {
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (object.material.map) object.material.map.dispose();
                    object.material.dispose();
                }
            });
        }
    
        // Reset variables
        scene = null;
        camera = null;
        renderer = null;
        raycaster = null;
        MyCards = null;
        OtherCards = null;
        CardStack = null;
        OpenCardStack = null;
        mouse = null;
        SelectedCardObject = null;
        selectedCard = null;
        turnState = null;
        offset = new THREE.Vector3();
    }
    
    function createCard(number, ID) {
        let frontPlane;
        const cardGroup = new THREE.Group();
        if(number == 'dummy') {
            const frontTexture = new THREE.TextureLoader().load('img/cardsDummy.png');
            const frontMaterial = new THREE.MeshBasicMaterial({ map: frontTexture, transparent: true });
            frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), frontMaterial);
        } else {

            const colors = [0x5ccee7, 0xffc6df, 0xffcf60, 0x61c6b0]; // Blue, Pink, Yellow, Green
            const color = colors[Math.ceil(number / 4)];
        
            // Create Front Plane
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 384;
            const ctx = canvas.getContext('2d');
        
            // Draw Card Background with Rounded Corners
            function drawRoundedRect(ctx, x, y, width, height, radius) {
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + width - radius, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                ctx.lineTo(x + width, y + height - radius);
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                ctx.lineTo(x + radius, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.fill();
            }
        
            const c = new THREE.Color().setHex(color).getStyle();
            ctx.fillStyle = c;
            drawRoundedRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 30);
        
            // Draw Number
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '140px Arial';
            ctx.fillText(String(number), canvas.width / 2, canvas.height / 2);
        
            const frontTexture = new THREE.CanvasTexture(canvas);
            const frontMaterial = new THREE.MeshBasicMaterial({ map: frontTexture, transparent: true });
            frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), frontMaterial);
        }
    
        // Create Back Plane
        const backTexture = new THREE.TextureLoader().load('img/cardsBack.png');
        const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture, transparent: true });
        const backPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), backMaterial);
    
        // Rotate Back Plane to Face Backwards
        backPlane.rotation.y = Math.PI;
    
        // Add Front and Back Planes to the Group
        cardGroup.add(frontPlane);
        cardGroup.add(backPlane);
    
        cardGroup.name = number;
        cardGroup.userData = { id: ID };
    
        return cardGroup;
    }
    
    function createPlace(x, y, angle, name) {
        const stack = new THREE.Group();
        stack.name = name;
        stack.position.x = x;
        stack.position.y = y;
        stack.rotation.z = angle;
        scene.add(stack);
        return stack;
    }
    
    function initScene() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 15;
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth - windowSubtract, window.innerHeight - windowSubtract);
        document.body.appendChild(renderer.domElement);
    
        MyCards = createPlace(0, -3, 0, 'myCards');
        OtherCards = createPlace(0, 4, Math.PI, 'otherCards');
        CardStack = createPlace(-6, 2, Math.PI / 2, 'cardStack');
        OpenCardStack = createPlace(-6, -1, Math.PI / 2, 'openCardStack');
    
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
    
        window.addEventListener('resize', onWindowResize, false);
        window.addEventListener('mousedown', onMouseDown, false);
        window.addEventListener('mousemove', onMouseMove, false);
        window.addEventListener('mouseup', onMouseUp, false);
    }
    
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth - windowSubtract, window.innerHeight - windowSubtract);
    }
    
    function onMouseDown(event) {
        event.preventDefault();
        if(GAME_STATE.currentPlayer !== myRole) {
            return;
        }
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        if(turnState == null) {
            const intersects = raycaster.intersectObjects([CardStack.children[0], OpenCardStack.children[0]], true);
            turnState = intersects[0] ? intersects[0].object.parent.parent.name : null;
            if(turnState == 'cardStack') {
                //DRAW
                selectedCard = GAME_STATE.cardStack.pop();
                selectedCard.open = true;
                SelectedCardObject = createCard(selectedCard.value, selectedCard.id);
                scene.add(SelectedCardObject);
                onMouseMove(event);
            } else if(turnState == 'openCardStack') {
                //TAKE
                selectedCard = GAME_STATE.openCardStack.pop();
                SelectedCardObject = OpenCardStack.children[1];
                OpenCardStack.remove(SelectedCardObject);
                SelectedCardObject.rotation.y = 0;
                scene.add(SelectedCardObject);
                onMouseMove(event);
            }
        } else if(turnState == 'openCardStack') {
            const intersects = raycaster.intersectObjects(MyCards.children.concat(OpenCardStack.children[0]), true);
            const intersect = intersects[0] ? intersects[0].object.parent.parent.name : null;
            if(intersect == 'openCardStack') {
                //PUT BACK
                OpenCardStack.add(SelectedCardObject);
                SelectedCardObject.position.set(0, 0, 0.01);
                SelectedCardObject = null;
                turnState = null;
            } else if(intersect == 'myCards') {
                //SWAP
                swap(intersects);
            }
        } else if(turnState == 'cardStack') {
            const intersects = raycaster.intersectObjects(MyCards.children.concat(OpenCardStack.children[0]), true);
            const intersect = intersects[0] ? intersects[0].object.parent.parent.name : null;
            if(intersect == 'openCardStack') {
                //PUT DOWN
                clearOpenCardStack();
                OpenCardStack.add(SelectedCardObject);
                SelectedCardObject.position.set(0, 0, 0.01);
                SelectedCardObject = null;
                GAME_STATE.openCardStack.push(selectedCard);
                selectedCard = null;
                turnState = 'putDown';
            } else if(intersect == 'myCards') {
                //SWAP
                swap(intersects);
            }
        } else if(turnState == 'putDown') {
            const intersects = raycaster.intersectObjects(MyCards.children, true);
            if(intersects[0]) {
                //FLIP
                const Card = intersects[0].object.parent;
                const card = GAME_STATE[myRole].find(c => c.id == Card.userData.id);
                const index = GAME_STATE[myRole].indexOf(card);
                if(index >= 0 && !GAME_STATE[myRole][index].open) {
                    GAME_STATE[myRole][index].open = true;
                    new TWEEN.Tween(Card.rotation).to({ y: 0 }, 500).start();
                    turnState = null; // 'end'
                }
            }
        }
        console.log(GAME_STATE[myRole], GAME_STATE.openCardStack, scene);
    }

    function clearOpenCardStack() {
        const cardsToRemove = OpenCardStack.children.filter(c => c.name != 'dummy');
        for(let i = 0; i < cardsToRemove.length; i++) {
            const card = cardsToRemove[i];
            OpenCardStack.remove(card);
            const index = GAME_STATE.openCardStack.findIndex(c => c.id == card.userData.id);
            if(index >= 0) {
                GAME_STATE.openCardStack.splice(index, 1);
            }
        }
        console.log(GAME_STATE.openCardStack);
    }
    
    function swap(intersects) {
        if(!intersects[0]) return;
        const Card = intersects[0].object.parent;
        const card = GAME_STATE[myRole].find(c => c.id == Card.userData.id);

        const index = GAME_STATE[myRole].indexOf(card);
        GAME_STATE[myRole][index] = selectedCard;
        GAME_STATE.openCardStack.push(card);
        selectedCard = null;

        MyCards.add(SelectedCardObject);
        SelectedCardObject.position.set(Card.position.x, Card.position.y, 0);
        SelectedCardObject = null;

        Card.position.z = 1;
        new TWEEN.Tween(Card.position).to({ x: Card.position.x, y: Card.position.y + 3, z: 1 }, 500)
            .onComplete(() => {
                if(!card.open) {
                    card.open = true;
                    new TWEEN.Tween(Card.rotation).to({ y: 0 }, 500)
                        .onComplete(() => {
                            setTimeout(() => {
                                moveCardToOpenStack(Card);
                            }, 1000);
                            
                        })
                        .start();
                } else {
                    moveCardToOpenStack(Card);
                }
            })
            .start();
        
        turnState = null;
        checkColumn(index % 4);
        console.log(GAME_STATE.openCardStack, GAME_STATE[myRole]);
    }

    function checkColumn(column) {
        const cards = [GAME_STATE[myRole][column], GAME_STATE[myRole][column + 4], GAME_STATE[myRole][column + 8]];
        console.log(cards);
        if(cards.every(c => c.open && c.value == cards[0].value)) {
            //Remove column
            for(let i = 0; i < cards.length; i++) {
                const Card = MyCards.children.find(c => c.userData.id == cards[i].id);
                if(Card) {
                    MyCards.remove(Card);
                    const index = GAME_STATE[myRole].indexOf(cards[i]);
                    GAME_STATE[myRole][index] = { id: -1, value: 0, open: true };
                }
            }
            console.log(GAME_STATE[myRole], MyCards);
        }
    }

    function moveCardToOpenStack(Card) {
        const globalPos = Card.getWorldPosition(new THREE.Vector3());
        const relativePos = OpenCardStack.worldToLocal(globalPos);
        Card.position.set(relativePos.x, relativePos.y, 1);
        Card.rotation.z = - Math.PI / 2;
        OpenCardStack.add(Card);

        new TWEEN.Tween(Card.position).to({ x: 0, y: 0, z: 0.01 }, 500).start();
        new TWEEN.Tween(Card.rotation).to({ x: 0, y: 0, z: 0 }, 500)
            .onComplete(() => {
                if(GAME_STATE.openCardStack.length > 1) {
                    //Remove the first card from the stack
                    const firstCard = GAME_STATE.openCardStack.shift();
                    const cardToRemove = OpenCardStack.children.find(c => c.userData.id == firstCard.id);
                    if (cardToRemove) {
                        OpenCardStack.remove(cardToRemove);
                    }
                    GAME_STATE.openCardStack = GAME_STATE.openCardStack.filter(card => card.id !== firstCard.id);
                }
            })
            .start();
    }

    function onMouseMove(event) {
        event.preventDefault();
    
        if (SelectedCardObject) {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
            raycaster.setFromCamera(mouse, camera);
    
            // Calculate the new position of the selected card based on the mouse position
            const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
            const dir = vector.sub(camera.position).normalize();
            const distance = (SelectedCardObject.position.z - camera.position.z) / dir.z;
            const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
            SelectedCardObject.position.copy(pos.sub(offset));
            SelectedCardObject.position.z = 1; // Ensure the card stays in front
        }
    }
    
    function onMouseUp(event) {
        event.preventDefault();    
    }
    
    function initLogic() {
        let cardStack = [];
        let cardID = 0;
        for(let i = -2; i <= 12; i++) {
            for(let j = 0; j < 10; j++) {
                cardStack.push({
                    id: cardID,
                    value: i,
                    open: false,
                });
                cardID++;
            }
        }
        cardStack = cardStack.sort(() => Math.random() - 0.5);

        GAME_STATE = {
            cardStack: cardStack,
            openCardStack: [],
            main: [],
            second: [],
            currentPlayer: myRole //Math.random() < 0.5 ? myRole : otherRole,
        };
    
        function giveCardsToPlayer(playerRole) {
            for(let i = 0; i < 12; i++) {
                const card = cardStack.pop();
                GAME_STATE[playerRole].push(card);
            }
        }

        const card = cardStack.pop();
        card.open = true;
        GAME_STATE.openCardStack.push(card);

        giveCardsToPlayer(myRole);
        giveCardsToPlayer(otherRole);
    
        if(myRole == 'main') {
            //conn.send(packageData('INIT_GAME', {currentPlayer: GAME_STATE.currentPlayer}));
        }
        initUI();

        render();
    }

    function initUI() {
        winnerIndicator.style.display = 'none';
    
        updateTurnIndicator();
    
        function createCards(place) {
            for(let i = 0; i < GAME_STATE[myRole].length; i++) {
                const card = createCard(GAME_STATE[myRole][i].value, GAME_STATE[myRole][i].id);
                card.position.x = i % 4 * 2 - 3;
                card.position.y = Math.floor(i / 4) * 3 - 5;
                card.rotation.y = Math.PI;
                place.add(card);
            }
        }

        createCards(MyCards);
        createCards(OtherCards);

        // Put the open card on the table
        OpenCardStack.add(createCard('dummy', -1));
        const OpenCard = createCard(GAME_STATE.openCardStack[0].value, GAME_STATE.openCardStack[0].id)
        OpenCardStack.add(OpenCard);
        OpenCard.position.set(0, 0, 0.01);
        CardStack.add(createCard(0, -1));
        CardStack.children[0].rotation.y = Math.PI;
    }
    
    function render() {
        if(!isRendering) return;
        requestAnimationFrame(render);
        TWEEN.update();
        renderer.render(scene, camera);
    }
    
    function showWinner(winnerName) {
        winnerIndicator.innerText = winnerName + ' Wins!';
        winnerIndicator.style.color = hexToCssColor(GAME_STATE.currentPlayer == myRole ? mainColor : secondColor);
        winnerIndicator.style.display = 'block';
    }
    
    function updateTurnIndicator() {
        currentPlayerIndicator.innerText = GAME_STATE.currentPlayer == myRole ? 'Your Turn' : otherName + "'s Turn";
    
        if (GAME_STATE.currentPlayer === 'main') {
            scene.background = new THREE.Color(mainColorDark);
            currentPlayerIndicator.style.color = hexToCssColor(mainColor);
        } else {
            scene.background = new THREE.Color(secondColorDark);
            currentPlayerIndicator.style.color = hexToCssColor(secondColor);
        }
    }
    
    window.endTurn = function() {    
        GAME_STATE.currentPlayer = GAME_STATE.currentPlayer == 'main' ? 'second' : 'main';
        updateTurnIndicator();
        endTurnButton.style.display = 'none';
        undoButton.style.display = 'none';
    
        conn.send(packageData('END_TURN', { currentPlayer: GAME_STATE.currentPlayer }));
    }
    
    window.undo = function() {
        if(GAME_STATE.currentPlayer !== myRole) {
            return;
        }
    }
    
    initScene();
    initLogic();
    
    }
    
    startTheGame();