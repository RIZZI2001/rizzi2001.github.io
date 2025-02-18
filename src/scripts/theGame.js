const currentPlayerIndicator = document.getElementById('current-player');
const endTurnButton = document.getElementById('end-turn-button');

let scene, camera, renderer; 

let handGroup, myDownStack, myUpStack, otherDownStack, otherUpStack;
let raycaster, mouse;
let selectedCard = null;
let offset = new THREE.Vector3();
let intersectedObject = null;

const mainColor = 0x83d684;
const secondColor = 0xe09c43;

const myColor = myRole == 'main' ? mainColor : secondColor;
const otherColor = myRole == 'main' ? secondColor : mainColor;

function communication(command, args) {
    console.log('Communication', command, args);
    switch(command) {
        case 'INIT_GAME':
            GAME_STATE.currentPlayer = args.currentPlayer;
            break;
        case 'PLACE_CARD':
            placeCard(args.cardValue, args.stackType, args.stackOwnerRole, args.cardPlayerRole);
            break;
        case 'END_TURN':
            GAME_STATE.currentPlayer = args.currentPlayer;
            currentPlayerIndicator.innerText = 'Your Turn';
            break;
    }
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
        ctx.font = '80px Arial';
        ctx.fillText('60', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '40px Arial';
        ctx.fillText('DOWN', canvas.width / 2, canvas.height / 2 + 50);
    } else if(number == 1) {
        ctx.font = '80px Arial';
        ctx.fillText('1', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '40px Arial';
        ctx.fillText('UP', canvas.width / 2, canvas.height / 2 + 50);
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
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    scene.background = new THREE.Color(0x222222);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 0, 1);
    scene.add(light);


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
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(event) {
    event.preventDefault();

    if(GAME_STATE.currentPlayer !== myRole) {
        return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

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

function onMouseMove(event) {
    event.preventDefault();

    if (selectedCard) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(selectedCard);

        if (intersects.length > 0) {
            selectedCard.position.copy(intersects[0].point.sub(offset));
            selectedCard.position.z = 1;
        }
    }
}

function onMouseUp(event) {
    event.preventDefault();

    if (selectedCard) {
        // Check for intersection with stacks
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([myDownStack.children[0], myUpStack.children[0], otherDownStack.children[0], otherUpStack.children[0]]);

        if (intersects.length > 0) {
            const stack = intersects[0].object.parent;
            if (stack == myDownStack && selectedCard.name < GAME_STATE[myRole].downStack.value) {
                placeCard(selectedCard.name, 'downStack', myRole, myRole);
            } else if (stack == myUpStack && selectedCard.name > GAME_STATE[myRole].upStack.value) {
                placeCard(selectedCard.name, 'upStack', myRole, myRole);
            } else if (stack == otherDownStack && selectedCard.name > GAME_STATE[otherRole].downStack.value && !GAME_STATE.unlockedRefill ) {
                placeCard(selectedCard.name, 'downStack', otherRole, myRole);
                GAME_STATE.unlockedRefill = true;
            } else if (stack == otherUpStack && selectedCard.name < GAME_STATE[otherRole].upStack.value && !GAME_STATE.unlockedRefill) {
                placeCard(selectedCard.name, 'upStack', otherRole, myRole);
                GAME_STATE.unlockedRefill = true;
            } else {
                resetCardPosition();
            }
        } else {
            resetCardPosition();
        }
        selectedCard = null;
    }       
}

function resetCardPosition() {
    const handIndex = GAME_STATE.hand.indexOf(selectedCard.name);
    if (handIndex !== -1) {
        selectedCard.position.set(-4 + handIndex * 2, 0, 0);
    }
}

function setStackCard(stack, value, color) {
    if(stack.children.length > 0) {
        stack.remove(stack.children[0]);
    }
    const newCard = createCard(value, color);
    newCard.name = value;
    stack.add(newCard);
}

function placeCard(cardValue, stackType, stackOwnerRole, cardPlayerRole) {
    if(cardPlayerRole == myRole) {
        GAME_STATE.hand.splice(GAME_STATE.hand.indexOf(cardValue), 1);
        handGroup.remove(selectedCard);
        refreshHandPositions();
        GAME_STATE.cardsPlayed++;
        if(GAME_STATE.cardsPlayed >= 2) {
            endTurnButton.style.display = 'block';
        }
    }

    const color = cardPlayerRole == 'main' ? mainColor : secondColor;

    GAME_STATE[stackOwnerRole][stackType].value = cardValue;
    GAME_STATE[stackOwnerRole][stackType].color = color;

    const stack = stackOwnerRole == myRole ? (stackType == 'upStack' ? myUpStack : myDownStack) : (stackType == 'upStack' ? otherUpStack : otherDownStack);
    setStackCard(stack, cardValue, color);
    
    selectedCard = null;

    if(cardPlayerRole == myRole) {
        conn.send(packageData('PLACE_CARD', { cardValue, stackType, stackOwnerRole, cardPlayerRole }));
    }
}

function refreshHandPositions() {
    const cardCount = GAME_STATE.hand.length;
    const offset = -cardCount + 1;
    for(let i = 0; i < cardCount; i++) {
        const card = handGroup.children.find(c => c.name == GAME_STATE.hand[i]);
        card.position.set(offset + i * 2, 0, 0);
    }
}

function drawCard() {
    const cardValue = GAME_STATE.cardStack.pop();
    GAME_STATE.hand.push(cardValue);

    let card = createCard(cardValue, myColor);
    handGroup.add(card);

    refreshHandPositions();
}

function initLogic() {
    GAME_STATE = {
        cardStack: Array.from({ length: 58 }, (_, i) => i + 2).sort(() => Math.random() - 0.5),
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
        cardsPlayed: 0,
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
    let card;

    setStackCard(myUpStack, GAME_STATE[myRole].upStack.value, GAME_STATE[myRole].upStack.color);
    setStackCard(myDownStack, GAME_STATE[myRole].downStack.value, GAME_STATE[myRole].downStack.color);
    setStackCard(otherUpStack, GAME_STATE[otherRole].upStack.value, GAME_STATE[otherRole].upStack.color);
    setStackCard(otherDownStack, GAME_STATE[otherRole].downStack.value, GAME_STATE[otherRole].downStack.color);

    render();

    currentPlayerIndicator.innerText = GAME_STATE.currentPlayer == myRole ? 'Your Turn' : otherName + "'s Turn";
    endTurnButton.style.display = GAME_STATE.currentPlayer == myRole ? 'block' : 'none';
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

function endTurn() {
    if(GAME_STATE.currentPlayer !== myRole || GAME_STATE.cardsPlayed < 2) {
        return;
    }

    GAME_STATE.currentPlayer = GAME_STATE.currentPlayer == 'main' ? 'second' : 'main';
    currentPlayerIndicator.innerText = otherName + "'s Turn";
    endTurnButton.style.display = 'none';

    if(GAME_STATE.unlockedRefill) {
        while(GAME_STATE.hand.length < 5 && GAME_STATE.cardStack.length > 0) {
            drawCard();
        }
    } else {
        drawCard();
        drawCard();
    }

    GAME_STATE.cardsPlayed = 0;
    GAME_STATE.unlockedRefill = false;
    conn.send(packageData('END_TURN', { currentPlayer: GAME_STATE.currentPlayer }));
}

initScene();
initLogic();