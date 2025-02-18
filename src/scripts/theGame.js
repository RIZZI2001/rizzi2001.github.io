let scene, camera, renderer; 
let handGroup, myDownStack, myUpStack, otherDownStack, otherUpStack;
let raycaster, mouse;
let selectedCard = null;
let offset = new THREE.Vector3();
let intersectedObject = null;

function createCard(number) {
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

    ctx.fillStyle = 'white';
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

    myDownStack = initStack(2, 0, 0, 'myDownStack');
    myUpStack = initStack(-2, 0, 0, 'myUpStack');
    otherDownStack = initStack(2, 5, Math.PI, 'otherDownStack');
    otherUpStack = initStack(-2, 5, Math.PI, 'otherUpStack');

    handGroup = new THREE.Group();
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

function updateStack(stack, value) {
    if(stack.children[0].name != value) {
        stack.remove(stack.children[0]);
        const newCard = createCard(value);
        newCard.name = value;
        stack.add(newCard);
    }
}

function updateUI() {
    for(let i = 0; i < 5; i++) {
        if(i >= GAME_STATE[myName].hand.length) {
            if (handGroup.children[i]) {
                handGroup.remove(handGroup.children[i]);
            }
        }
        if (handGroup.children[i] && handGroup.children[i].name != GAME_STATE[myName].hand[i]) {
            handGroup.remove(handGroup.children[i]);
            const newCard = createCard(GAME_STATE[myName].hand[i]);
            newCard.position.set(-4 + i * 2, -5, 0);
            handGroup.add(newCard);
        } else if (!handGroup.children[i]) {
            const newCard = createCard(GAME_STATE[myName].hand[i]);
            newCard.position.set(-4 + i * 2, -5, 0);
            handGroup.add(newCard);
        }
    }

    // Update Up Stack
    updateStack(myUpStack, GAME_STATE[myName].upStack);
    updateStack(myDownStack, GAME_STATE[myName].downStack);
    updateStack(otherUpStack, GAME_STATE[otherName].upStack);
    updateStack(otherDownStack, GAME_STATE[otherName].downStack);
}

function droppedCard(player, card, stackType, stackOwner, send = false) {
    console.log('dropped card', player, card, stackType, stackOwner);
    GAME_STATE[player].hand.splice(GAME_STATE[player].hand.indexOf(card), 1);

    if(stackType == 'up') {
        GAME_STATE[stackOwner].upStack = card;
    } else if(stackType == 'down') {
        GAME_STATE[stackOwner].downStack = card;
    }

    selectedCard = null;

    updateUI();
}

function onMouseUp(event) {
    console.log('mouse up');
    event.preventDefault();

    if (selectedCard) {
        // Check for intersection with stacks
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([myDownStack.children[0], myUpStack.children[0], otherDownStack.children[0], otherUpStack.children[0]]);

        if (intersects.length > 0) {
            console.log('intersection!');
            const stack = intersects[0].object.parent;
            if (stack == myDownStack && selectedCard.name < GAME_STATE[myName].downStack) {
                droppedCard(myName, selectedCard.name, 'down', myName, true);
            } else if (stack == myUpStack && selectedCard.name > GAME_STATE[myName].upStack) {
                droppedCard(myName, selectedCard.name, 'up', myName, true);
            } else if (stack == otherDownStack && selectedCard.name > GAME_STATE[otherName].downStack) {
                droppedCard(myName, selectedCard.name, 'down', otherName, true);
            } else if (stack == otherUpStack && selectedCard.name < GAME_STATE[otherName].upStack) {
                droppedCard(myName, selectedCard.name, 'up', otherName, true);
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
    const handIndex = GAME_STATE[myName].hand.indexOf(selectedCard.name);
    if (handIndex !== -1) {
        selectedCard.position.set(-4 + handIndex * 2, 0, 0);
    }
}

function drawCard(player, send = true) {
    const card = GAME_STATE[player].cardStack.pop();
    GAME_STATE[player].hand.push(card);
    if(send) {
        conn.send(packageData('DRAW_CARD', { player }));
    }
}

function initLogic() {
    //REMOVE THIS
    myName = 'Player1';
    otherName = 'Player2';

    GAME_STATE = {
        [myName]: {
            cardStack: Array.from({ length: 58 }, (_, i) => i + 2).sort(() => Math.random() - 0.5),
            hand: [],
            upStack: 1,
            downStack: 60
        },
        [otherName]: {
            cardStack: Array.from({ length: 58 }, (_, i) => i + 2).sort(() => Math.random() - 0.5),
            hand: [],
            upStack: 1,
            downStack: 60
        },
        currentPlayer: Math.random() < 0.5 ? myName : otherName,
        cardsPlayed: 0,
        unlockedRefill: false
    };

    for(let i = 0; i < 5; i++) {
        drawCard(myName, false);
        drawCard(otherName, false);
    }

    //conn.send(packageData('INIT_GAME', GAME_STATE));
    initGameUI();
}

function initGameUI() {
    let card;

    for(let i = 0; i < 5; i++) {
        card = createCard(GAME_STATE[myName].hand[i]);
        card.position.x = -4 + i * 2;
        handGroup.add(card);
    }
    card = createCard(GAME_STATE[myName].upStack);
    card.name = GAME_STATE[myName].upStack;
    myUpStack.add(card);
    card = createCard(GAME_STATE[myName].downStack);
    card.name = GAME_STATE[myName].downStack;
    myDownStack.add(card);

    card = createCard(GAME_STATE[otherName].upStack);
    card.name = GAME_STATE[otherName].upStack;
    otherUpStack.add(card);
    card = createCard(GAME_STATE[otherName].downStack);
    card.name = GAME_STATE[otherName].downStack;
    otherDownStack.add(card);

    render();
    console.log(scene);
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

/*initScene();
if(isMainActor) {
    initLogic();
}*/
initScene();
initLogic();
