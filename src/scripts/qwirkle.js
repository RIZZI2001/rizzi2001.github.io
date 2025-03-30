let scene, camera, renderer;

function startQwirkle() {

const SHAPES = ['circle', 'square', 'diamond', 'leaf', 'star', 'cross'];
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const remainingCardsIndicator = document.getElementById('remaining-cards-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const undoButton = document.getElementById('undo-button');
const endTurnButton = document.getElementById('end-turn-button');

let handGroup;
let handPlane;
let boardGroup;
let board;
let raycaster, mouse;
let zoomValue = 0, camPos = { x: 0, y: 10, z: 0 };
let selectedBlockObject = null;
let selectedInHand = null;
let isRendering = true;
let endGameTimeout;

const windowSubtract = 0.5;

let isPanning = false;
let lastMousePosition = { x: 0, y: 0 };

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
        case 'PLACE_BLOCK':
            placeBlock(args);
            break;
        case 'GET_BLOCKS':
            let blocks = [];
            for (let i = 0; i < args.amount; i++) {
                blocks.push(GAME_STATE.bag.pop());
            }
            conn.send(packageData('SEND_BLOCKS', {blocks: blocks}));
            break;
        case 'SEND_BLOCKS':
            GAME_STATE.hand = GAME_STATE.hand.concat(args.blocks);
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

function cleanupScene(){
    isRendering = false;

    if(endGameTimeout) {
        clearTimeout(endGameTimeout);
        endGameTimeout = null;
    }

    window.removeEventListener('resize', onWindowResize, false);
    window.removeEventListener('mousedown', onMouseDown, false);
    window.removeEventListener('mousemove', onMouseMove, false);
    window.removeEventListener('mouseup', onMouseUp, false);

    // Remove the renderer's DOM element
    if (renderer && renderer.domElement) {
        document.body.removeChild(renderer.domElement);
    }

    if (scene) {
        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (object.material.map) object.material.map.dispose();
                object.material.dispose();
            }
        });
    }

    scene = null;
    camera = null;
    renderer = null;
    handGroup = null;
    selectedBlockObject = null;
    raycaster = null;
    mouse = null;
    offset = null;
}

function createBlock(shape, color, id) {
    const geometry = new THREE.BoxGeometry(1, 1, 0.2);

    // Load the shape texture
    const loader = new THREE.TextureLoader();
    const texture = loader.load(`qwirkleShapes/${shape}.png`, function (texture) {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
    });

    // Create materials for each face of the block
    const materials = [
        new THREE.MeshBasicMaterial({ color: 0x000000 }), // right
        new THREE.MeshBasicMaterial({ color: 0x000000 }), // left
        new THREE.MeshBasicMaterial({ color: 0x000000 }), // top
        new THREE.MeshBasicMaterial({ color: 0x000000 }), // bottom
        new THREE.MeshBasicMaterial({ map: texture, color: color}), // back
        new THREE.MeshBasicMaterial({ color: 0x000000 }) // front
    ];

    const block = new THREE.Mesh(geometry, materials);
    block.userData = { shape, color, id };
    block.name = shape + ' ' + color + ' ' + id;

    return block;
}

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - windowSubtract, window.innerHeight - windowSubtract);
    document.body.appendChild(renderer.domElement);

    handGroup = new THREE.Group();
    handGroup.name = 'handGroup';
    handGroup.position.set(0, -3, -6); // Center the handGroup in front of the camera
    camera.add(handGroup);

    //Add invisible plane to the handGroup
    handPlane = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ transparent: false, opacity: 0 }));
    handPlane.name = 'handPlane';
    handGroup.add(handPlane);

    scene.add(camera);
    camera.rotation.set(-Math.PI / 4, 0, 0); // Set the camera rotation looking down at the board

    boardGroup = new THREE.Group();
    boardGroup.name = 'boardGroup';

    const boardGeometry = new THREE.PlaneGeometry(6, 6);
    const boardMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000, side: THREE.DoubleSide });
    board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.name = 'board';
    boardGroup.add(board);
    board.rotation.x = -Math.PI / 2; // Rotate the board to be horizontal

    scene.add(boardGroup);
    
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousedown', onMouseDown, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mouseup', onMouseUp, false);
    window.addEventListener('mousewheel', onMousewheel, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - windowSubtract, window.innerHeight - windowSubtract);
}

function onMouseDown(event) {
    event.preventDefault();
    if(GAME_STATE.currentPlayer == myRole) {
        if(selectedBlockObject == null) {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            let intersects = raycaster.intersectObjects(handGroup.children);
            intersects = intersects.filter(intersect => intersect.object.name !== 'handPlane');

            if (intersects.length > 0) {
                selectedBlockObject = intersects[0].object;
                onMouseMove(event);
                return;
            }
        } else {
            if(selectedInHand) {
                selectedBlockObject = null;
                selectedInHand = false;
            }
        }
    } 
    isPanning = true;
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
}

function onMouseMove(event) {
    event.preventDefault();

    if (selectedBlockObject) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Use raycaster to find intersection with handPlane
        raycaster.setFromCamera(mouse, camera);
        let intersects = raycaster.intersectObjects([handPlane]);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            selectedInHand = true;

            if(selectedBlockObject.parent !== handGroup) {
                handGroup.add(selectedBlockObject);
            }

            const localPoint = handGroup.worldToLocal(intersect.point.clone());
            selectedBlockObject.position.set(localPoint.x, localPoint.y, localPoint.z);
            selectedBlockObject.rotation.set(0, 0, 0); // Reset rotation

        } else {
            selectedInHand = false;
            intersects = raycaster.intersectObjects([board]);
            if (intersects.length > 0) {
                const intersect = intersects[0];
                const localPoint = boardGroup.worldToLocal(intersect.point.clone());

                if(selectedBlockObject.parent !== boardGroup) {
                    boardGroup.add(selectedBlockObject);
                }
                
                selectedBlockObject.position.set(localPoint.x, localPoint.y, localPoint.z);
                selectedBlockObject.rotation.set(-Math.PI / 2, 0, 0); // Rotate to face up
            }
        }

        return;
    }

    if (isPanning) {
        const deltaX = (event.clientX - lastMousePosition.x) * 0.01; // Adjust sensitivity
        const deltaY = (event.clientY - lastMousePosition.y) * 0.01;

        panCamera(deltaX, -deltaY); // Pan the boardGroup
        lastMousePosition.x = event.clientX;
        lastMousePosition.y = event.clientY;
        return;
    }
}

function panCamera(deltaX, deltaY) {
    camPos.x -= deltaX * 3;
    camPos.z += deltaY * 3;
}

function onMouseUp(event) {
    event.preventDefault();
    isPanning = false;  
}

function onMousewheel(event) {
    //change camera position based on mouse wheel movement
    zoomValue += event.deltaY * 0.01;
    zoomValue = clamp(zoomValue, -3, 10); // Clamp the zoom value to a range
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function refreshHandPositions() {
    let blockCount = GAME_STATE.hand.length;
    if(selectedBlockObject != null && !selectedInHand) {
        // Selected block is hovering over the board
        blockCount--;
    }
    const offset = -blockCount * 1.3 / 2 + 0.65; // Center the blocks

    let newSelectedPosId = -1;
    if(selectedBlockObject != null && selectedInHand) {
        // Calculate the closest id depending on the position of the block
        newSelectedPosId = Math.round((selectedBlockObject.position.x - offset) / 1.3);
        if(newSelectedPosId < 0) newSelectedPosId = 0;
        if(newSelectedPosId >= blockCount) newSelectedPosId = blockCount;

        let oldSelectedPosId = GAME_STATE.hand.findIndex(b => b.id === selectedBlockObject.userData.id);
        while(oldSelectedPosId !== newSelectedPosId) {
            if(oldSelectedPosId < newSelectedPosId) {
                GAME_STATE.hand.splice(newSelectedPosId, 0, GAME_STATE.hand.splice(oldSelectedPosId, 1)[0]);
            } else {
                GAME_STATE.hand.splice(oldSelectedPosId, 1);
                GAME_STATE.hand.splice(newSelectedPosId, 0, selectedBlockObject.userData);
            }
            oldSelectedPosId = GAME_STATE.hand.findIndex(b => b.id === selectedBlockObject.userData.id);
        }
    }
    
    for(let i = 0; i < blockCount; i++) {
        const block = handGroup.children.find(b => b.userData.id === GAME_STATE.hand[i].id);
        if (block == selectedBlockObject) { // Skip the selected block
            continue;
        }

        if (block) {
            block.position.set(offset + i * 1.3, 0, 0);
        }
    }
}

function drawBlocks() {
    const blockAmount = 6 - GAME_STATE.hand.length;

    if(myRole == 'main') {
        for (let i = 0; i < blockAmount; i++) {
            GAME_STATE.hand.push(GAME_STATE.bag.pop());
            let block = createBlock(GAME_STATE.hand[i].shape, GAME_STATE.hand[i].color, GAME_STATE.hand[i].id);
            handGroup.add(block);
        }
    } else {
        conn.send(packageData('GET_BLOCKS', {amount: blockAmount}));
    }
}

function initLogic() {
    const blockArray = [];
    let blockID = 0;
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            for (let k = 0; k < 3; k++) {
                blockArray.push({ shape: SHAPES[i], color: COLORS[j], id: blockID++ });
                blockID++;
            }
        }
    }
    blockArray.sort(() => Math.random() - 0.5);

    GAME_STATE = {
        currentPlayer: myRole, //Math.random() < 0.5 ? myRole : otherRole,
        main: 0,
        second: 0,
        hand: [],
        bag: blockArray
    };

    drawBlocks();
    console.log(GAME_STATE.hand);

    initGameUI();

    if(myRole == 'main') {
        //conn.send(packageData('INIT_GAME', {currentPlayer: GAME_STATE.currentPlayer, bag: GAME_STATE.bag}));
    }
}

function initGameUI() {
    render();

    updateTurnIndicator();
    endTurnButton.style.display = 'none';
    undoButton.style.display = 'none';
}

function render() {
    if(!isRendering) return;
    camera.position.set(camPos.x, camPos.y + zoomValue, camPos.z + zoomValue);
    refreshHandPositions();
    requestAnimationFrame(render);
    TWEEN.update();
    renderer.render(scene, camera);
}

function showWinner(winnerName) {
    winnerIndicator.innerText = winnerName + ' Wins!';
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
    if(GAME_STATE.currentPlayer !== myRole) {
        return;
    }

    GAME_STATE.currentPlayer = GAME_STATE.currentPlayer == 'main' ? 'second' : 'main';
    updateTurnIndicator();
    endTurnButton.style.display = 'none';
    undoButton.style.display = 'none';

    drawBlocks();

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

startQwirkle();