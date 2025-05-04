function startTheGame() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const scoreEntries = document.getElementById('score-entries');
const scoreHeader = document.getElementById('score-header');

scoreHeader.innerHTML = `<tr><th>Round</th><th>${myName}</th><th>${otherName}</th></tr>`;

let scene, camera, renderer;
let MyCards, OtherCards, CardStack, OpenCardStack;
let raycaster, mouse;
let SelectedCardObject = null;
let selectedCard = null;
let turnState = null;
let otherSum = null;
let roundScores = [];
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
            GAME_STATE = args.GAME_STATE;
            init();
            break;
        case 'OTHERSUM':
            otherSum = args.sum;
            if(turnState == null) {
                const sum = GAME_STATE[myRole].filter(c => c.open).reduce((acc, c) => acc + c.value, 0);
                setTurn(sum);
            }
            break;
        case 'SET_TURN':
            GAME_STATE.currentPlayer = args.currentPlayer;
            updateTurnIndicator();
            break;
        case 'ACTION':
            const type = args.type;
            const pos = args.pos;
            action(type, pos);
            break;
        case 'END_TURN':
            GAME_STATE.currentPlayer = args.currentPlayer;
            updateTurnIndicator();
            break;
        case 'END_ROUND':
            otherSum = args.sum;
            const mySum = GAME_STATE[myRole].reduce((acc, c) => acc + c.value, 0);
            for(let i = 0; i < GAME_STATE[myRole].length; i++) {
                GAME_STATE[myRole][i].open = true;
                const id = GAME_STATE[myRole][i].id;
                if(id == -1) continue;
                const Card = MyCards.children.find(c => c.userData.id == id);
                new TWEEN.Tween(Card.rotation).to({ y: 0 }, 500).start();
            }
            if(otherSum < mySum) {
                winnerName = otherName;
                winnerSum = otherSum;
                loserSum = mySum;
            } else {
                winnerName = myName;
                winnerSum = mySum;
                loserSum = otherSum * 2;
            }
            showRoundWinner(winnerName, winnerSum, loserSum);
            conn.send(packageData('SHOW_ROUND_WINNER', { winner: winnerName, winnerSum: winnerSum, loserSum: loserSum }));
            break;
        case 'SHOW_ROUND_WINNER':
            showRoundWinner(args.winner, args.winnerSum, args.loserSum);
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
    otherSum = null;
    roundScores = [];
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
    camera.position.y = -5;
    camera.rotation.x = 0.3;
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
    window.addEventListener('keydown', (event) => {
        if(event.key == 's') {
            console.log(scene);
        }
    });
}

function action(type, pos) {
    console.log(type, pos);
    if(type != 'flip' && type != 'removeColumn') {
        turnState = 'blocked';
    }
    switch(type) {
        case 'flip':
            GAME_STATE[otherRole][pos].open = true;
            //console.log(GAME_STATE[otherRole][pos], OtherCards.children);
            const Card = OtherCards.children.find(c => c.userData.id == GAME_STATE[otherRole][pos].id);
            new TWEEN.Tween(Card.rotation).to({ y: 0 }, 500).start();
            break;
        case 'putDown':
            const card = GAME_STATE.cardStack.pop();
            card.open = true;
            GAME_STATE.openCardStack.push(card);
            const Card2 = createCard(card.value, card.id);
            Card2.position.set(3, 0, 0.01);
            Card2.rotation.y = Math.PI;
            OpenCardStack.add(Card2);
            new TWEEN.Tween(Card2.position).to({ x: 3, y: 0, z: 1 }, 200)
                .onComplete(() => {
                    new TWEEN.Tween(Card2.rotation).to({ x: 0, y: 0, z: 0 }, 400).start();
                    new TWEEN.Tween(Card2.position).to({ x: 0, y: 0, z: 0.01 }, 500)
                        .onComplete(() => {
                            shiftOpenCardStack();
                            turnState = null;
                        })
                        .start();
                })
                .start();
            break;
        case 'swapStack':
            const drawnCard = GAME_STATE.cardStack.pop();
            drawnCard.open = true;
            const otherCard = GAME_STATE[otherRole][pos];
            GAME_STATE[otherRole][pos] = drawnCard;
            GAME_STATE.openCardStack.push(otherCard);
            const Card3 = createCard(drawnCard.value, drawnCard.id);
            //Find relative position of the cardStack to the otherCards
            const globalPos = CardStack.getWorldPosition(new THREE.Vector3());
            const relativePos = OtherCards.worldToLocal(globalPos);
            Card3.position.set(relativePos.x, relativePos.y, 0.01);
            Card3.rotation.y = Math.PI;
            Card3.rotation.z = - Math.PI / 2;
            OtherCards.add(Card3);
            const targetPos = [pos % 4 * 2 - 3, Math.floor(pos / 4) * 3 - 5];
            new TWEEN.Tween(Card3.position).to({ x: relativePos.x, y: relativePos.y, z: 1.5 }, 200)
                .onComplete(() => {
                    new TWEEN.Tween(Card3.rotation).to({ x: 0, y: 0, z: 0 }, 600).start();
                    new TWEEN.Tween(Card3.position).to({ x: targetPos[0], y: targetPos[1], z: 0.01 }, 1000)
                        .onComplete(() => {
                            const Card4 = OtherCards.children.find(c => c.userData.id == otherCard.id);
                            new TWEEN.Tween(Card4.position).to({ x: Card4.position.x, y: Card4.position.y + 3, z: 1 }, 500)
                                .onComplete(() => {
                                    if(!otherCard.open) {
                                        otherCard.open = true;
                                        new TWEEN.Tween(Card4.rotation).to({ y: 0 }, 500)
                                            .onComplete(() => {
                                                setTimeout(() => {
                                                    moveCardToOpenStack(Card4, true);
                                                }, 1000);
                                            })
                                            .start();
                                    } else {
                                        moveCardToOpenStack(Card4, true);
                                    }
                                })
                                .start();
                        })
                        .start();
                })
                .start();
            break;
        case 'swapOpen':
            const drawnCard2 = GAME_STATE.openCardStack.pop();
            const otherCard2 = GAME_STATE[otherRole][pos];
            GAME_STATE[otherRole][pos] = drawnCard2;
            GAME_STATE.openCardStack.push(otherCard2);
            const Card5 = OpenCardStack.children[1];
            OpenCardStack.remove(Card5);
            Card5.rotation.y = 0;
            Card5.rotation.z = - Math.PI / 2;
            const globalPos2 = OpenCardStack.getWorldPosition(new THREE.Vector3());
            const relativePos2 = OtherCards.worldToLocal(globalPos2);
            Card5.position.set(relativePos2.x, relativePos2.y, 0.01);
            OtherCards.add(Card5);
            const targetPos2 = [pos % 4 * 2 - 3, Math.floor(pos / 4) * 3 - 5];
            new TWEEN.Tween(Card5.position).to({ x: relativePos2.x, y: relativePos2.y, z: 1.5 }, 200)
                .onComplete(() => {
                    new TWEEN.Tween(Card5.rotation).to({ x: 0, y: 0, z: 0 }, 600).start();
                    new TWEEN.Tween(Card5.position).to({ x: targetPos2[0], y: targetPos2[1], z: 0.01 }, 1000)
                        .onComplete(() => {
                            const Card6 = OtherCards.children.find(c => c.userData.id == otherCard2.id);
                            new TWEEN.Tween(Card6.position).to({ x: Card6.position.x, y: Card6.position.y + 3, z: 1 }, 500)
                                .onComplete(() => {
                                    if(!otherCard2.open) {
                                        otherCard2.open = true;
                                        new TWEEN.Tween(Card6.rotation).to({ y: 0 }, 500)
                                            .onComplete(() => {
                                                setTimeout(() => {
                                                    moveCardToOpenStack(Card6, true);
                                                }, 1000);
                                            })
                                            .start();
                                    } else {
                                        moveCardToOpenStack(Card6, true);
                                    }
                                })
                                .start();
                        })
                        .start();
                })
                .start();
            break;
        case 'removeColumn':
            const cards = [GAME_STATE[otherRole][pos], GAME_STATE[otherRole][pos + 4], GAME_STATE[otherRole][pos + 8]];
            for(let i = 0; i < cards.length; i++) {
                const Card = OtherCards.children.find(c => c.userData.id == cards[i].id);
                if(Card) {
                    OtherCards.remove(Card);
                    const index = GAME_STATE[otherRole].indexOf(cards[i]);
                    GAME_STATE[otherRole][index] = { id: -1, value: 0, open: true };
                }
            }
            break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - windowSubtract, window.innerHeight - windowSubtract);
}

function onMouseDown(event) {
    event.preventDefault();
    if(GAME_STATE.currentPlayer !== myRole && (turnState != 'flip2' && turnState != 'flip1')) {
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
            GAME_STATE.openCardStack.push(selectedCard);
            OpenCardStack.add(SelectedCardObject);
            SelectedCardObject.position.set(0, 0, 0.01);
            SelectedCardObject = null;
            turnState = null;
        } else if(intersect == 'myCards') {
            //SWAP
            swap(intersects, 'swapOpen');
        }
    } else if(turnState == 'cardStack') {
        const intersects = raycaster.intersectObjects(MyCards.children.concat(OpenCardStack.children[0]), true);
        const intersect = intersects[0] ? intersects[0].object.parent.parent.name : null;
        if(intersect == 'openCardStack') {
            //PUT DOWN
            conn.send(packageData('ACTION', { type: 'putDown', pos: null }));
            GAME_STATE.openCardStack.push(selectedCard);
            SelectedCardObject.position.set(0, 0, 0.02);
            SelectedCardObject.rotation.set(0, 0, -Math.PI / 2);
            OpenCardStack.add(SelectedCardObject);
            const CardToAnimate = SelectedCardObject;
            SelectedCardObject = null;
            new TWEEN.Tween(CardToAnimate.rotation).to({ x: 0, y: 0, z: 0 }, 500)
                .onStart(() => {
                    CardToAnimate.position.set(0, 0, 0.02);
                })    
                .onComplete(() => {
                    CardToAnimate.position.set(0, 0, 0.01);
                    shiftOpenCardStack();
                    selectedCard = null;
                    turnState = 'putDown';
                    console.log('THIS SHOULD PRINT! ', turnState, selectedCard);
                }
            ).start();
        } else if(intersect == 'myCards') {
            //SWAP
            swap(intersects, 'swapStack');
        }
    } else if(turnState == 'putDown') {
        const intersects = raycaster.intersectObjects(MyCards.children, true);
        if(intersects[0]) {
            //FLIP
            const Card = intersects[0].object.parent;
            const card = GAME_STATE[myRole].find(c => c.id == Card.userData.id);
            const index = GAME_STATE[myRole].indexOf(card);
            conn.send(packageData('ACTION', { type: 'flip', pos: index }));
            if(index >= 0 && !GAME_STATE[myRole][index].open) {
                GAME_STATE[myRole][index].open = true;
                new TWEEN.Tween(Card.rotation).to({ y: 0 }, 500).start();
                setTimeout(() => {
                    turnState = null;
                    checkColumn(index % 4);
                    if(!check4RoundEnd()) {
                        GAME_STATE.currentPlayer = GAME_STATE.currentPlayer == 'main' ? 'second' : 'main';
                        updateTurnIndicator();
                        conn.send(packageData('END_TURN', { currentPlayer: GAME_STATE.currentPlayer }));
                    }
                }, 1000);
            }
        }
    } else if(turnState == 'flip2' || turnState == 'flip1') {
        const intersects = raycaster.intersectObjects(MyCards.children, true);
        if(intersects[0]) {
            const Card = intersects[0].object.parent;
            const card = GAME_STATE[myRole].find(c => c.id == Card.userData.id);
            const index = GAME_STATE[myRole].indexOf(card);
            if(index >= 0 && !GAME_STATE[myRole][index].open) {
                GAME_STATE[myRole][index].open = true;
                conn.send(packageData('ACTION', { type: 'flip', pos: index }));
                new TWEEN.Tween(Card.rotation).to({ y: 0 }, 500).start();
                if(turnState == 'flip2') {
                    turnState = 'flip1';
                } else {
                    turnState = null;
                    const sum = GAME_STATE[myRole].filter(c => c.open).reduce((acc, c) => acc + c.value, 0);
                    if(myRole == 'second') {
                        conn.send(packageData('OTHERSUM', { sum: sum }));
                    } else if (otherSum != null) {
                        setTurn(sum);
                    }
                }
            }
        }
    }
    //console.log(GAME_STATE[myRole], GAME_STATE.openCardStack, scene);
}

function setTurn(sum) {
    if(otherSum > sum) {
        GAME_STATE.currentPlayer = otherRole;
    } else if (otherSum < sum) {
        GAME_STATE.currentPlayer = myRole;
    } else {
        GAME_STATE.currentPlayer = Math.random() > 0.5 ? myRole : otherRole;
    }
    //console.log(sum, otherSum, GAME_STATE.currentPlayer);
    conn.send(packageData('SET_TURN', { currentPlayer: GAME_STATE.currentPlayer }));
    updateTurnIndicator();
}

function shiftOpenCardStack() {
    if(GAME_STATE.openCardStack.length > 1) {
        const firstCard = GAME_STATE.openCardStack[0];
        const cardToRemove = OpenCardStack.children.find(c => c.userData.id == firstCard.id);
        if (cardToRemove) {
            OpenCardStack.remove(cardToRemove);
        }
        GAME_STATE.openCardStack = GAME_STATE.openCardStack.filter(card => card.id !== firstCard.id);
    }
    console.log('Length: ', GAME_STATE.openCardStack.length, GAME_STATE.openCardStack[0].id, GAME_STATE.openCardStack[0].value);
}

async function swap(intersects, type) {
    if (!intersects[0]) return;
    const Card = intersects[0].object.parent;
    const card = GAME_STATE[myRole].find(c => c.id == Card.userData.id);

    const index = GAME_STATE[myRole].indexOf(card);
    conn.send(packageData('ACTION', { type: type, pos: index }));
    GAME_STATE[myRole][index] = selectedCard;
    GAME_STATE.openCardStack.push(card);
    selectedCard = null;

    MyCards.add(SelectedCardObject);
    SelectedCardObject.position.set(Card.position.x, Card.position.y, 0);
    SelectedCardObject = null;

    Card.position.z = 1;
    new TWEEN.Tween(Card.position).to({ x: Card.position.x, y: Card.position.y + 3, z: 1 }, 500)
    .onComplete(async () => {
        if (!card.open) {
            card.open = true;
            await new TWEEN.Tween(Card.rotation).to({ y: 0 }, 500).start();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await moveCardToOpenStack(Card);
        } else {
            await moveCardToOpenStack(Card);
        }
        turnState = null;
        checkColumn(index % 4);
        if (!check4RoundEnd()) {
            GAME_STATE.currentPlayer = GAME_STATE.currentPlayer == 'main' ? 'second' : 'main';
            updateTurnIndicator();
            conn.send(packageData('END_TURN', { currentPlayer: GAME_STATE.currentPlayer }));
        }
    })
    .start();
}

function checkColumn(column) {
    const cards = [GAME_STATE[myRole][column], GAME_STATE[myRole][column + 4], GAME_STATE[myRole][column + 8]];
    console.log('CheckColumn', column, cards);
    if(cards.every(c => c.open && c.value == cards[0].value)) {
        conn.send(packageData('ACTION', { type: 'removeColumn', pos: column }));
        for(let i = 0; i < cards.length; i++) {
            const Card = MyCards.children.find(c => c.userData.id == cards[i].id);
            if(Card) {
                MyCards.remove(Card);
                const index = GAME_STATE[myRole].indexOf(cards[i]);
                GAME_STATE[myRole][index] = { id: -1, value: 0, open: true };
            }
        }
        //console.log(GAME_STATE[myRole], MyCards);
    }
}

function check4RoundEnd() {
    if(GAME_STATE[myRole].every(c => c.open)) {
        const sum = GAME_STATE[myRole].reduce((acc, c) => acc + c.value, 0);
        conn.send(packageData('END_ROUND', { sum: sum }));
        for(let i = 0; i < GAME_STATE[otherRole].length; i++) {
            GAME_STATE[otherRole][i].open = true;
            const id = GAME_STATE[otherRole][i].id;
            if(id == -1) continue;
            const Card = OtherCards.children.find(c => c.userData.id == id);
            new TWEEN.Tween(Card.rotation).to({ y: 0 }, 500).start();
        }
        return true;
    }
}

function moveCardToOpenStack(Card, inverted = false) {
    return new Promise((resolve) => {
        const globalPos = Card.getWorldPosition(new THREE.Vector3());
        const relativePos = OpenCardStack.worldToLocal(globalPos);
        Card.position.set(relativePos.x, relativePos.y, 1);
        if(inverted) {
            Card.rotation.z = Math.PI / 2;
        } else {
            Card.rotation.z = - Math.PI / 2;
        }
        OpenCardStack.add(Card);

        new TWEEN.Tween(Card.position).to({ x: 0, y: 0, z: 0.01 }, 500).start();
        new TWEEN.Tween(Card.rotation).to({ x: 0, y: 0, z: 0 }, 500)
            .onComplete(() => {
                shiftOpenCardStack();
                //Unblock
                if(inverted) turnState = null;
                resolve();
            })
            .start();
    });
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

function init() {
    if(myRole == 'main') {
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
            currentPlayer: null
        };

        const card = cardStack.pop();
        card.open = true;
        GAME_STATE.openCardStack.push(card);

        function giveCardsToPlayer(playerRole) {
            for(let i = 0; i < 12; i++) {
                const card = cardStack.pop();
                /* if(i > 2) {card.open = true;} */
                GAME_STATE[playerRole].push(card);
            }
        }

        giveCardsToPlayer(myRole);
        giveCardsToPlayer(otherRole);

        conn.send(packageData('INIT_GAME', {GAME_STATE: GAME_STATE}));
    }

    turnState = 'flip2';

    initUI();

    render();
}

function initUI() {
    console.log(GAME_STATE);
    winnerIndicator.style.display = 'none';
    currentPlayerIndicator.style.display = 'block';
    currentPlayerIndicator.innerText = 'Flip two cards.';

    function createCards(place, role) {
        for(let i = 0; i < GAME_STATE[role].length; i++) {
            const card = createCard(GAME_STATE[role][i].value, GAME_STATE[role][i].id);
            card.position.x = i % 4 * 2 - 3;
            card.position.y = Math.floor(i / 4) * 3 - 5;
            card.rotation.y = GAME_STATE[role][i].open ? 0 : Math.PI;
            place.add(card);
        }
    }

    createCards(MyCards, myRole);
    createCards(OtherCards, otherRole);

    // Put the open card on the table
    OpenCardStack.add(createCard('dummy', -1));
    const OpenCard = createCard(GAME_STATE.openCardStack[0].value, GAME_STATE.openCardStack[0].id)
    OpenCardStack.add(OpenCard);
    OpenCard.position.set(0, 0, 0.01);
    CardStack.add(createCard(0, -1));
    CardStack.children[0].rotation.y = Math.PI;

    scene.background = new THREE.Color(0x333333);
}

function render() {
    if(!isRendering) return;
    requestAnimationFrame(render);
    TWEEN.update();
    renderer.render(scene, camera);
}

function updateScoreTable(myScore, otherScore) {
    // Add the new round scores to the array
    roundScores.push({ player1: myScore, player2: otherScore });

    // Clear the table body
    scoreEntries.innerHTML = '';

    // Add each round's scores to the table
    roundScores.forEach((round, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${round.player1}</td>
            <td>${round.player2}</td>
        `;
        scoreEntries.appendChild(row);
    });

    // Calculate and display the total scores
    const myTotal = roundScores.reduce((acc, round) => acc + round.player1, 0);
    const otherTotal = roundScores.reduce((acc, round) => acc + round.player2, 0);
    const totalRow = document.createElement('tr');
    totalRow.innerHTML = `
        <td>Total</td>
        <td>${myTotal}</td>
        <td>${otherTotal}</td>
    `;
    totalRow.style.fontWeight = 'bold';
    scoreEntries.appendChild(totalRow);

    if(myTotal >= 100 || otherTotal >= 100) {
        let winner;
        if(myTotal < otherTotal) {
            winner = myName;
        } else if(myTotal > otherTotal) {
            winner = otherName;
        } else {
            winner = 'Nobody';
        }

        winnerIndicator.innerText = winner + ' wins the game!';
        winnerIndicator.style.color = hexToCssColor(winner == myName ? myColor() : otherColor());
        winnerIndicator.style.display = 'block';

        endGameTimeout = setTimeout(() => {
            winnerIndicator.style.display = 'none';
            cleanupScene();
            switch2('selection')
        }, 6000);
    }
}

// Example: Call this function at the end of each round
function showRoundWinner(winnerName, winnerScore, loserScore) {
    winnerIndicator.innerText = winnerName + ' wins this round!';
    winnerIndicator.style.color = hexToCssColor(winnerName == myName ? myColor() : otherColor());
    winnerIndicator.style.display = 'block';

    if(winnerName == myName) {
        updateScoreTable(winnerScore, loserScore);
    } else {
        updateScoreTable(loserScore, winnerScore);
    }
    endGameTimeout = setTimeout(() => {
        winnerIndicator.style.display = 'none';
        cleanupRound();
    }, 6000);
}

function cleanupRound() {
    console.log('Cleanup Round');
    // Remove all cards from the scene
    while (MyCards.children.length > 0) {
        MyCards.remove(MyCards.children[0]);
    }
    while (OtherCards.children.length > 0) {
        OtherCards.remove(OtherCards.children[0]);
    }
    while (OpenCardStack.children.length > 0) {
        OpenCardStack.remove(OpenCardStack.children[0]);
    }
    while (CardStack.children.length > 0) {
        CardStack.remove(CardStack.children[0]);
    }

    //set timeout for 1 second
    setTimeout(() => {
        otherSum = null;
        turnState = null;
        currentPlayerIndicator.style.color = 'white';

        if(myRole == 'main') {
            init();
        }
    }, 1000);
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

initScene();
if (myRole == 'main') { init();}

}

startTheGame();