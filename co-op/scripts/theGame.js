function startTheGame() {

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const remainingCardsIndicator = document.getElementById('remaining-cards-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const undoButton = document.getElementById('undo-button');
const endTurnButton = document.getElementById('end-turn-button');

let scene, camera, renderer;
let handGroup, myDownStack, myUpStack, otherDownStack, otherUpStack;
let raycaster, mouse;
let selectedCard = null;
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
    handGroup = null;
    myDownStack = null;
    myUpStack = null;
    otherDownStack = null;
    otherUpStack = null;
    raycaster = null;
    mouse = null;
    selectedCard = null;
    offset = new THREE.Vector3();
}

function createCard(number, color) {
    // Create Card Geometry
    const cardWidth = 2, cardHeight = 3;
    const cardGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);

    // Create Card Texture using Canvas
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

    const c = new THREE.Color().setHex( color ).getStyle();
    ctx.fillStyle = c
    drawRoundedRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 30);

    //Draw Number
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if(number == 60) {
        ctx.font = '60px Arial';
        ctx.fillText('60', canvas.width / 2, canvas.height / 2 - 140);
        ctx.font = '40px Arial';
        ctx.fillText('DOWN', canvas.width / 2, canvas.height / 2 - 100);
    } else if(number == 1) {
        ctx.font = '60px Arial';
        ctx.fillText('1', canvas.width / 2, canvas.height / 2 - 140);
        ctx.font = '40px Arial';
        ctx.fillText('UP', canvas.width / 2, canvas.height / 2 - 100);
    } else {
        ctx.font = '140px Arial';
        ctx.fillText(String(number), canvas.width / 2, canvas.height / 2);
    }

    // Create Texture
    const texture = new THREE.CanvasTexture(canvas);
    const cardMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });

    // Create Card Mesh
    const card = new THREE.Mesh(cardGeometry, cardMaterial);
    // name as number
    card.name = number;
    return card;
}

function initStack(x, y, angle, name) {
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
    camera.position.z = 10;
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - windowSubtract, window.innerHeight - windowSubtract);
    document.body.appendChild(renderer.domElement);

    myDownStack = initStack(2, 0, 0, 'myDownStack');
    myUpStack = initStack(-2, 0, 0, 'myUpStack');
    otherDownStack = initStack(2, 5, Math.PI, 'otherDownStack');
    otherUpStack = initStack(-2, 5, Math.PI, 'otherUpStack');

    handGroup = new THREE.Group();
    handGroup.name = 'handGroup';
    handGroup.position.y = -5;
    scene.add(handGroup);

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

    if (selectedCard) {
        // Check for intersection with stacks
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([myDownStack.children[myDownStack.children.length-1], myUpStack.children[myUpStack.children.length-1], otherDownStack.children[otherDownStack.children.length-1], otherUpStack.children[otherUpStack.children.length-1]]);
        if (intersects.length > 0) {
            const stack = intersects[0].object.parent;
            console.log(stack);
            if (stack == myDownStack && (selectedCard.name < GAME_STATE[myRole].downStack.value || selectedCard.name == GAME_STATE[myRole].downStack.value + 10)) {
                placeCard(selectedCard.name, 'downStack', myRole, myRole);
            } else if (stack == myUpStack && (selectedCard.name > GAME_STATE[myRole].upStack.value || selectedCard.name == GAME_STATE[myRole].upStack.value - 10)) {
                placeCard(selectedCard.name, 'upStack', myRole, myRole);
            } else if (stack == otherDownStack && selectedCard.name > GAME_STATE[otherRole].downStack.value && !GAME_STATE.unlockedRefill ) {
                placeCard(selectedCard.name, 'downStack', otherRole, myRole);
                GAME_STATE.unlockedRefill = true;
            } else if (stack == otherUpStack && selectedCard.name < GAME_STATE[otherRole].upStack.value && !GAME_STATE.unlockedRefill) {
                placeCard(selectedCard.name, 'upStack', otherRole, myRole);
                GAME_STATE.unlockedRefill = true;
            } else {
                refreshHandPositions();
            }
        } else {
            refreshHandPositions();
        }
        selectedCard = null;
    }   else {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(handGroup.children);

        if (intersects.length > 0) {
            selectedCard = intersects[0].object;
            const intersectsPlane = raycaster.intersectObject(selectedCard);
            if (intersectsPlane.length > 0) {
                offset.copy(intersectsPlane[0].point).sub(selectedCard.position);
            }
        }
    }
}

function onMouseMove(event) {
    event.preventDefault();

    if (selectedCard) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Calculate the new position of the selected card based on the mouse position
        const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = (selectedCard.position.z - camera.position.z) / dir.z;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));

        selectedCard.position.copy(pos.sub(offset));
        selectedCard.position.z = 1; // Ensure the card stays in front
    }
}

function onMouseUp(event) {
    event.preventDefault();    
}

function setStackCard(stack, value, color, animate = null, undo = false) {
    let topCard = null;
    if(stack.children.length > 1) {
        topCard = stack.children[stack.children.length - 1];
    }
    const newCard = createCard(value, color);
    newCard.name = value;

    if(!animate) {
        if(topCard) { stack.remove(topCard); }
        stack.add(newCard);
    }else if(animate && !undo) {
        //console.log('animate place');
        stack.add(newCard);
        newCard.position.set(0, animate, 0);
        new TWEEN.Tween(newCard.position).to({ x: 0, y: 0, z: 0 }, 500).easing(TWEEN.Easing.Quadratic.Out).start();        
        setTimeout(() => {
            if(topCard) { stack.remove(topCard); }
        }, 500);
    } else if(animate && undo) {
        //console.log('animate undo');
        stack.add(newCard);
        newCard.position.set(0, 0, 0);
        topCard.position.set(0, 0, 0.01);
        new TWEEN.Tween(topCard.position).to({ x: 0, y: animate, z: 0 }, 500).easing(TWEEN.Easing.Quadratic.Out).start();        
        setTimeout(() => {
            stack.remove(topCard);
        }, 500);
    }
    if(value == 60 || value == 1) {
        newCard.position.y = 1;
    }
}

function placeCard(cardValue, stackType, stackOwnerRole, cardPlayerRole, cardColor = null) {
    console.log('Place Card ', cardValue, stackType, stackOwnerRole, cardPlayerRole, cardColor);
    if(cardPlayerRole == myRole) {
        GAME_STATE.hand.splice(GAME_STATE.hand.indexOf(cardValue), 1);
        handGroup.remove(selectedCard);
        refreshHandPositions();
        
        const newElement = {
            cardValue: cardValue,
            stackType: stackType,
            stackOwnerRole: stackOwnerRole,
            previousValue: GAME_STATE[stackOwnerRole][stackType].value,
            previousColor: GAME_STATE[stackOwnerRole][stackType].color,
        }
        GAME_STATE.cardsPlayed.push(newElement);
        undoButton.style.display = 'block';

        if(GAME_STATE.cardsPlayed.length >= 2) {
            endTurnButton.style.display = 'block';
        }
    }

    let color = cardPlayerRole == 'main' ? mainColor : secondColor;

    //For undos
    if(cardColor) {
        color = cardColor;
    }

    GAME_STATE[stackOwnerRole][stackType].value = cardValue;
    GAME_STATE[stackOwnerRole][stackType].color = color;

    const stack = stackOwnerRole == myRole ? (stackType == 'upStack' ? myUpStack : myDownStack) : (stackType == 'upStack' ? otherUpStack : otherDownStack);
    
    let animate = null;
    let undo = false;

    //console.log(cardPlayerRole, otherRole, cardColor, otherColor());
    if(cardPlayerRole == otherRole) {
        //Animate other turn
        if(stackOwnerRole == myRole) {
            animate = 9;
        } else {
            animate = -5;
        }
        if(cardColor != null) {
            //Undo
            undo = true;
        }
    }

    setStackCard(stack, cardValue, color, animate, undo);
    
    selectedCard = null;

    if(cardPlayerRole == myRole) {
        conn.send(packageData('PLACE_CARD', { cardValue, stackType, stackOwnerRole, cardPlayerRole, cardColor: null }));
    }

    if(GAME_STATE.hand.length == 0 && GAME_STATE.cardStack.length == 0) {
        conn.send(packageData('END_GAME', { winner: myName }));
        showWinner(myName);
        undoButton.style.display = 'none';
        endTurnButton.style.display = 'none';
        // 5 seconds to see the winner
        endGameTimeout = setTimeout(() => {
            back2Selection();
        }, 5000);
    }
}

function refreshHandPositions() {
    const cardCount = GAME_STATE.hand.length;
    const offset = -cardCount + 1;
    for(let i = 0; i < cardCount; i++) {
        const card = handGroup.children.find(c => c.name == GAME_STATE.hand[i]);
        if (card) {
            card.position.set(offset + i * 2, 0, 0);
        }
    }
}

function drawCard() {
    if(GAME_STATE.cardStack.length == 0) {
        return;
    }
    const cardValue = GAME_STATE.cardStack.pop();
    GAME_STATE.hand.push(cardValue);

    let card = createCard(cardValue, myColor());
    handGroup.add(card);

    refreshHandPositions();
    remainingCardsIndicator.innerText = 'Remaining Cards: ' + GAME_STATE.cardStack.length;
}

function initLogic() {
    // Fisher-Yates shuffle
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    GAME_STATE = {
        cardStack: shuffle(Array.from({ length: 58 }, (_, i) => i + 2)),
        hand: [],
        main: {
            upStack: { value: 1, color: mainColor },
            downStack: { value: 60, color: mainColor },
        },
        second: {
            upStack: { value: 1, color: secondColor },
            downStack: { value: 60, color: secondColor },
        },
        currentPlayer: Math.random() < 0.5 ? myRole : otherRole,
        cardsPlayed: [],
        unlockedRefill: false
    };

    for(let i = 0; i < 5; i++) {
        drawCard();
    }

    initGameUI();

    if(myRole == 'main') {
        conn.send(packageData('INIT_GAME', {currentPlayer: GAME_STATE.currentPlayer}));
    }
}

function initGameUI() {
    setStackCard(myUpStack, GAME_STATE[myRole].upStack.value, GAME_STATE[myRole].upStack.color);
    setStackCard(myDownStack, GAME_STATE[myRole].downStack.value, GAME_STATE[myRole].downStack.color);
    setStackCard(otherUpStack, GAME_STATE[otherRole].upStack.value, GAME_STATE[otherRole].upStack.color);
    setStackCard(otherDownStack, GAME_STATE[otherRole].downStack.value, GAME_STATE[otherRole].downStack.color);

    render();

    updateTurnIndicator();
    endTurnButton.style.display = 'none';
    undoButton.style.display = 'none';
}

function render() {
    if(!isRendering) return;
    requestAnimationFrame(render);
    TWEEN.update();
    renderer.render(scene, camera);
}

function showWinner(winnerName) {
    winnerIndicator.innerText = winnerName + ' wins!';
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
    if(GAME_STATE.currentPlayer !== myRole || GAME_STATE.cardsPlayed.length < 2) {
        return;
    }

    GAME_STATE.currentPlayer = GAME_STATE.currentPlayer == 'main' ? 'second' : 'main';
    updateTurnIndicator();
    endTurnButton.style.display = 'none';
    undoButton.style.display = 'none';

    if(GAME_STATE.unlockedRefill) {
        while(GAME_STATE.hand.length < 5 && GAME_STATE.cardStack.length > 0) {
            drawCard();
        }
    } else {
        drawCard();
        drawCard();
    }

    GAME_STATE.cardsPlayed = [];
    GAME_STATE.unlockedRefill = false;
    conn.send(packageData('END_TURN', { currentPlayer: GAME_STATE.currentPlayer }));
}

window.undo = function() {
    if(GAME_STATE.currentPlayer !== myRole || GAME_STATE.cardsPlayed.length == 0) {
        return;
    }

    const lastCard = GAME_STATE.cardsPlayed.pop();
    GAME_STATE[lastCard.stackOwnerRole][lastCard.stackType].value = lastCard.previousValue;
    GAME_STATE[lastCard.stackOwnerRole][lastCard.stackType].color = lastCard.previousColor;

    const stack = lastCard.stackOwnerRole == myRole ? (lastCard.stackType == 'upStack' ? myUpStack : myDownStack) : (lastCard.stackType == 'upStack' ? otherUpStack : otherDownStack);
    setStackCard(stack, lastCard.previousValue, lastCard.previousColor);

    GAME_STATE.hand.push(lastCard.cardValue);
    if(lastCard.stackOwnerRole !== myRole) {
        GAME_STATE.unlockedRefill = false;
    }
    const card = createCard(lastCard.cardValue, myColor());
    handGroup.add(card);
    refreshHandPositions();

    if(GAME_STATE.cardsPlayed.length < 2) {
        endTurnButton.style.display = 'none';
    }

    if(GAME_STATE.cardsPlayed.length == 0) {
        undoButton.style.display = 'none';
    }

    conn.send(packageData('PLACE_CARD', { cardValue: lastCard.previousValue, stackType: lastCard.stackType, stackOwnerRole: lastCard.stackOwnerRole, cardPlayerRole: myRole, cardColor: lastCard.previousColor }));
}

initScene();
initLogic();

}

startTheGame();