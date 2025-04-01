let scene, camera, renderer;
let handGroup;
let handPlane;
let boardGroup;
let boardPlane;
let bagPlane;
let raycaster, mouse;
let zoomValue = 0, camPos = { x: 0, y: 10, z: 6 };
let selectedBlockObject = null;
let selectedInState = null;
let isRendering = true;
let endGameTimeout;

function startQwirkle() {

const SHAPES = ['circle', 'square', 'diamond', 'leaf', 'star', 'cross'];
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const remainingCardsIndicator = document.getElementById('remaining-cards-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const undoButton = document.getElementById('undo-button');
const endTurnButton = document.getElementById('end-turn-button');

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

    handPlane = new THREE.Mesh(new THREE.PlaneGeometry(7, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    handPlane.name = 'handPlane';
    handPlane.position.set(0, -3, -6);
    camera.add(handPlane);

    const loader = new THREE.TextureLoader();

    const bagTexture = loader.load('qwirkleShapes/bag.png');
    const bagMaterial = new THREE.MeshBasicMaterial({ map: bagTexture, transparent: true });
    bagPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bagMaterial);
    bagPlane.name = 'bagPlane';
    bagPlane.position.set(5, -3, -6);
    camera.add(bagPlane);

    scene.add(camera);
    camera.rotation.set(-Math.PI / 3, 0, 0);

    boardGroup = new THREE.Group();
    boardGroup.name = 'boardGroup';

    const boardGeometry = new THREE.PlaneGeometry(3, 3);

    const boardTexture = loader.load('qwirkleShapes/board.png', function (texture) {
        texture.wrapS = THREE.RepeatWrapping; // Enable horizontal tiling
        texture.wrapT = THREE.RepeatWrapping; // Enable vertical tiling
        texture.repeat.set(3, 3); // Tile the texture 6x6 times
    });

    const boardMaterial = new THREE.MeshBasicMaterial({ map: boardTexture, side: THREE.DoubleSide });
    boardPlane = new THREE.Mesh(boardGeometry, boardMaterial);
    boardPlane.name = 'boardPlane';
    boardGroup.add(boardPlane);
    boardPlane.rotation.x = -Math.PI / 2; // Rotate the board to be horizontal

    const highlightTexture = loader.load('qwirkleShapes/boardHighlight.png');
    const highlightMaterial = new THREE.MeshBasicMaterial({ map: highlightTexture, transparent: true });
    highlightPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), highlightMaterial);
    highlightPlane.rotation.x = -Math.PI / 2; // Align with the board
    highlightPlane.visible = false; // Initially hidden
    boardGroup.add(highlightPlane);

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

            if (intersects.length > 0) {
                selectedBlockObject = intersects[0].object;
                onMouseMove(event);
                return;
            }
        } else if(selectedInState === 'hand') {
            selectedBlockObject = null;
            selectedInState = null;
        } else if(selectedInState === 'board') {
            blockPos = [selectedBlockObject.position.clone().x, selectedBlockObject.position.clone().z];
            if(checkValidMove(selectedBlockObject, blockPos)) {
                let blockID = GAME_STATE.hand.findIndex(b => b.id === selectedBlockObject.userData.id);
                if(blockID >= 0) {
                    GAME_STATE.hand.splice(blockID, 1);
                    GAME_STATE.board[blockPos] = selectedBlockObject.userData;
                    GAME_STATE.movesThisTurn.push({place: 'board', block: selectedBlockObject.userData, pos: blockPos});
                    console.log(GAME_STATE.movesThisTurn);
                }
                selectedBlockObject.position.y = 0.1; // Set the block on the board
                selectedBlockObject = null;
                selectedInState = null;

                refreshHandPositions();
                updateBoardSize();
                highlightPlane.visible = false;

                endTurnButton.style.display = 'block';
                undoButton.style.display = 'block';
            }
        } else if(selectedInState === 'bag') {
            const block = GAME_STATE.hand.find(b => b.id === selectedBlockObject.userData.id);
            if(block) {
                GAME_STATE.hand.splice(GAME_STATE.hand.findIndex(b => b.id === block.id), 1);
                GAME_STATE.bagCache.push(block);
                GAME_STATE.movesThisTurn.push({place: 'bag', block: block, pos: null});
                console.log(GAME_STATE.movesThisTurn);
                handGroup.remove(selectedBlockObject);
                selectedBlockObject = null;
                selectedInState = null;
                refreshHandPositions();
            }
            endTurnButton.style.display = 'block';
            undoButton.style.display = 'block';
        }
    } 
    isPanning = true;
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
}

function checkValidMove(block, position) {
    if(!block || !position) return false;
    if(GAME_STATE.board[position]) return false; //Occupied position
    return true; // Placeholder for actual game logic
}

function onMouseMove(event) {
    event.preventDefault();

    if (selectedBlockObject) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        let intersects = raycaster.intersectObjects([handPlane, boardPlane, bagPlane]); //

        if (intersects.length > 0) {
            if(intersects[0].object.name === 'handPlane' || intersects[0].object.name === 'bagPlane') {
                highlightPlane.visible = false;

                if(intersects[0].object.name === 'handPlane') {
                    selectedInState = 'hand';
                } else {
                    selectedInState = 'bag';
                }
                const intersect = intersects[0];

                if(selectedBlockObject.parent !== handGroup) {
                    handGroup.add(selectedBlockObject);
                }

                const localPoint = handGroup.worldToLocal(intersect.point.clone());
                selectedBlockObject.position.set(localPoint.x, localPoint.y, localPoint.z);
                selectedBlockObject.rotation.set(0, 0, 0); // Reset rotation
            } else if(intersects[0].object.name === 'boardPlane') {
                selectedInState = 'board';
                const intersect = intersects[0];
                const localPoint = boardGroup.worldToLocal(intersect.point.clone());
                const tileX = Math.round(localPoint.x);
                const tileZ = Math.round(localPoint.z);

                highlightPlane.position.set(tileX, 0.01, tileZ); // Slightly above the board
                highlightPlane.visible = true;

                if (selectedBlockObject.parent !== boardGroup) {
                    boardGroup.add(selectedBlockObject);
                }

                selectedBlockObject.position.set(tileX, localPoint.y + 1.0, tileZ);
                selectedBlockObject.rotation.set(-Math.PI / 2, 0, 0); // Rotate to face up
            }
        }
        return;
    } else {
        selectedInState = null;
    }

    if (isPanning) {
        const deltaX = (event.clientX - lastMousePosition.x) * 0.01; // Adjust sensitivity
        const deltaY = (event.clientY - lastMousePosition.y) * 0.01;

        camPos.x -= deltaX * 3;
        camPos.z -= deltaY * 3;
        lastMousePosition.x = event.clientX;
        lastMousePosition.y = event.clientY;
        return;
    }
}

function onMouseUp(event) {
    event.preventDefault();
    isPanning = false;  
}

function onMousewheel(event) {
    //change camera position based on mouse wheel movement
    zoomValue += event.deltaY * 0.01;
    zoomValue = clamp(zoomValue, -2.5, 10); // Clamp the zoom value to a range
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function updateBoardSize() {
    let minX = -1, minZ = -1, maxX = 1, maxZ = 1;
    for (let block in GAME_STATE.board) {
        let pos = block.split(',');
        let x = parseInt(pos[0]);
        let z = parseInt(pos[1]);

        if (x-1 < minX) minX = x-1;
        if (z-1 < minZ) minZ = z-1;
        if (x+1 > maxX) maxX = x+1;
        if (z+1 > maxZ) maxZ = z+1;
    }
    const width = maxX - minX + 1;
    const height = maxZ - minZ + 1;
    console.log('Board size:', width, height);
    const boardGeometry = new THREE.PlaneGeometry(width, height);
    const boardTexture = new THREE.TextureLoader().load('qwirkleShapes/board.png', function (texture) {
        texture.wrapS = THREE.RepeatWrapping; // Enable horizontal tiling
        texture.wrapT = THREE.RepeatWrapping; // Enable vertical tiling
        texture.repeat.set(width, height); // Tile the texture based on the board size
    });
    boardPlane.geometry.dispose(); // Dispose of the old geometry
    boardPlane.geometry = boardGeometry;
    boardPlane.material.map.dispose(); // Dispose of the old texture
    boardPlane.material.map = boardTexture; // Set the new texture

    boardPlane.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2); // Center the board
}

function refreshHandPositions() {
    let blockCount = GAME_STATE.hand.length;

    const offset = -(blockCount - Number(selectedInState === 'board' || selectedInState === 'bag')) * 1.3 / 2 + 0.65; // Center the blocks

    let newSelectedPosId = -1;
    if(selectedInState === 'hand') {
        // Calculate the closest id depending on the position of the block
        newSelectedPosId = Math.round((selectedBlockObject.position.x - offset) / 1.3);
        if(newSelectedPosId < 0) newSelectedPosId = 0;
        if(newSelectedPosId >= blockCount) newSelectedPosId = blockCount - 1;

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
    let moveLeft = 0;
    for(let i = 0; i < blockCount; i++) {
        let blockID = GAME_STATE.hand[i].id;
        if (selectedBlockObject && blockID == selectedBlockObject.userData.id) {
            if(selectedInState === 'board' || selectedInState === 'bag') { 
                moveLeft = -1;
            }
            continue;
        }

        let block = handGroup.children.find(b => b.userData.id == blockID);
        if (block) {
            block.position.set(offset + (i + moveLeft) * 1.3, 0, 0);
        }
    }
}

function drawBlocks(doublesAllowed = true) {
    const blockAmount = 6 - GAME_STATE.hand.length;

    if(myRole == 'main') {
        for (let i = 0; i < blockAmount; i++) {
            let drawnBlock = GAME_STATE.bag.pop();

            if(!doublesAllowed) {
                // Check if the block is already in hand
                const blockInHand = GAME_STATE.hand.find(b => b.shape === drawnBlock.shape && b.color === drawnBlock.color);
                if(blockInHand) {
                    const randomIndex = Math.floor(Math.random() * GAME_STATE.bag.length);
                    GAME_STATE.bag.splice(randomIndex, 0, drawnBlock);
                    i--;
                    continue;
                }
            }
            GAME_STATE.hand.push(drawnBlock);

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
        bag: blockArray,
        bagCache: [],
        board: {},
        movesThisTurn: []
    };

    drawBlocks(false);
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
    camera.position.set(camPos.x, camPos.y + zoomValue, camPos.z + zoomValue * 0.7);
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

    if(GAME_STATE.bagCache.length > 0) {
        GAME_STATE.bag = GAME_STATE.bag.concat(GAME_STATE.bagCache);
        GAME_STATE.bagCache = [];
    }
    GAME_STATE.movesThisTurn = [];

    conn.send(packageData('END_TURN', { currentPlayer: GAME_STATE.currentPlayer }));
}

window.undo = function() {
    if(GAME_STATE.currentPlayer !== myRole) {
        return;
    }
    if(GAME_STATE.movesThisTurn.length > 0) {
        let lastMove = GAME_STATE.movesThisTurn.pop();

        //Add the block back to the hand
        GAME_STATE.hand.push(lastMove.block);
        selectedBlockObject = createBlock(lastMove.block.shape, lastMove.block.color, lastMove.block.id);
        selectedBlockObject.position.set(0, 0, 0);
        selectedBlockObject.rotation.set(0, 0, 0);
        handGroup.add(selectedBlockObject);
        selectedBlockObject = null;
        selectedInState = null;
        refreshHandPositions();

        if(lastMove.place == 'board') {
            //Remove the block from the board
            delete GAME_STATE.board[lastMove.pos];
            boardGroup.remove(boardGroup.children.find(b => b.userData.id == lastMove.block.id));
            highlightPlane.visible = false;
            updateBoardSize();
        }
        if(lastMove.place == 'bag') {
            //Remove the block from the bag
            GAME_STATE.bagCache.splice(GAME_STATE.bagCache.findIndex(b => b.id == lastMove.block.id), 1);
        }
        console.log(GAME_STATE);

        if(GAME_STATE.movesThisTurn.length == 0) {
            endTurnButton.style.display = 'none';
            undoButton.style.display = 'none';
        }
    }
}

initScene();
initLogic();

}

startQwirkle();