function startQwirkle() {

let scene, camera, renderer;
let handGroup;
let handPlane;
let boardGroup;
let boardPlane;
let halos = [];
let oldBoardSize = {width: 3, height: 3};
let bagPlane;
let raycaster, mouse;
let zoomValue = 0, camPos = { x: 0, y: 10, z: 6 };
let selectedBlockObject = null;
let selectedInState = null;
let isRendering = true;
let endGameTimeout;

const SHAPES = ['circle', 'square', 'diamond', 'leaf', 'star', 'cross'];
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
const hexDefenitions = {'red': '#C92121','orange': '#E27E25','yellow': '#ECDF4B','green': '#4FB543','blue': '#2D6ACC','purple': '#6D2B9A'};

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const remainingBlocksIndicator = document.getElementById('remaining-blocks-indicator');
const scoreIndicator = document.getElementById('score-indicator');
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
            console.log('Game initialized:', args);
            initLogic(args.bag, args.maxPlacableBlocks);
            break;
        case 'UPDATE_BAG':
            GAME_STATE.bag = args.bag;
            remainingBlocksIndicator.innerText = GAME_STATE.bag.length + ' Blocks left';
            break;
        case 'SET_TURN':
            GAME_STATE.currentPlayer = args.currentPlayer;
            updateTurnIndicator();
            break;
        case 'PLACE_BLOCK':
            OtherPlacedBlock(args.block, args.pos);
            break;
        case 'REMOVE_BLOCK':
            RemoveBlock(args.block, args.pos);
            break;
        case 'END_TURN':
            GAME_STATE.currentPlayer = args.currentPlayer;
            GAME_STATE[otherRole] = args.score;
            GAME_STATE.bag = args.bag;
            remainingBlocksIndicator.innerText = GAME_STATE.bag.length + ' Blocks left';
            updateTurnIndicator();
            updateScore();
            break;
        case 'END_GAME':
            updateScore();
            showWinner(args.winner);
            break;
        case 'BACK2SELECT':
            cleanupScene();
            switch2('selection');
            break;
    }
}

function OtherPlacedBlock(block, pos) {
    GAME_STATE.board[pos] = block;
    let newBlock = createBlock(block.shape, block.color, block.id);
    newBlock.position.set(pos[0], 22, pos[1]-10); // Start above the board
    newBlock.rotation.set(-Math.PI / 2, 0, 0); // Rotate to face up
    new TWEEN.Tween(newBlock.position).to({ x: pos[0], y: 0.1, z: pos[1] }, 1000).easing(TWEEN.Easing.Quadratic.Out).onComplete(() => {
        updateBoardSize();
        placeHalo(pos);
    }).start();
    boardGroup.add(newBlock);
}

function RemoveBlock(block, pos) {
    const blockToRemove = boardGroup.children.find(b => b.userData.id == block.id);
    if (blockToRemove) {
        delete GAME_STATE.board[pos];
        const haloToRemove = halos.find(h => h.position.x == pos[0] && h.position.z == pos[1]);
        if (haloToRemove) {
            boardGroup.remove(haloToRemove);
            halos.splice(halos.indexOf(haloToRemove), 1);
        }
        new TWEEN.Tween(blockToRemove.position).to({ x: pos[0], y: 22, z: pos[1]-10 }, 1000).easing(TWEEN.Easing.Quadratic.Out).onComplete(() => {
            boardGroup.remove(blockToRemove);
            updateBoardSize();
        }).start();
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
            try {
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            } catch (e) {
                //ignore errors related to material disposal
            }
        });
    }

    scene = null;
    camera = null;
    renderer = null;
    handGroup = null;
    handPlane = null;
    boardGroup = null;
    boardPlane = null;
    halos = null;
    oldBoardSize = null;
    bagPlane = null;
    zoomValue = 0;
    camPos = { x: 0, y: 10, z: 6 };
    isPanning = false;
    lastMousePosition = { x: 0, y: 0 };
    selectedInState = null;
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

    const hexColor = hexDefenitions[color] || color;
    // Create materials for each face of the block
    const materials = [
        new THREE.MeshBasicMaterial({ color: 0x000000 }), // right
        new THREE.MeshBasicMaterial({ color: 0x000000 }), // left
        new THREE.MeshBasicMaterial({ color: 0x000000 }), // top
        new THREE.MeshBasicMaterial({ color: 0x000000 }), // bottom
        new THREE.MeshBasicMaterial({ map: texture, color: hexColor }), // back
        new THREE.MeshBasicMaterial({ color: 0x000000 }) // front
    ];

    const block = new THREE.Mesh(geometry, materials);
    block.userData = { shape, color, id };
    block.name = shape + ' ' + color + ' ' + id;

    return block;
}

function placeHalo(pos) {
    const loader = new THREE.TextureLoader();
    const haloTexture = loader.load('qwirkleShapes/halo.png');
    const haloMaterial = new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true });
    halo = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), haloMaterial);
    halo.rotation.x = -Math.PI / 2; // Align with the board
    halo.position.set(pos[0], 0.21, pos[1]); // Slightly above the block
    halo.name = 'halo';
    boardGroup.add(halo);
    halos.push(halo);
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
            if(GAME_STATE.movesThisTurn.length > 0 && GAME_STATE.movesThisTurn[GAME_STATE.movesThisTurn.length - 1].place == 'bag') {
                putBlockBack2Hand();
                alert('Cannot place block on board after placing in bag');
                return;
            }

            blockPos = [selectedBlockObject.position.clone().x, selectedBlockObject.position.clone().z];
            let blockData = selectedBlockObject.userData;
            if(checkValidMove(blockData, blockPos)) {
                let blockID = GAME_STATE.hand.findIndex(b => b.id === blockData.id);
                if(blockID >= 0) {
                    GAME_STATE.hand.splice(blockID, 1);
                    GAME_STATE.board[blockPos] = blockData;
                    GAME_STATE.movesThisTurn.push({place: 'board', block: blockData, pos: blockPos});
                }
                selectedBlockObject.position.y = 0.1; // Set the block on the board
                selectedBlockObject = null;
                selectedInState = null;

                refreshHandPositions();
                updateBoardSize();
                highlightPlane.visible = false;

                endTurnButton.style.display = 'block';
                undoButton.style.display = 'block';

                conn.send(packageData('PLACE_BLOCK', { block: blockData, pos: blockPos }));
            } else {
                console.log('Invalid move!');
            }
        } else if(selectedInState === 'bag') {
            if((GAME_STATE.movesThisTurn.length > 0 && GAME_STATE.movesThisTurn[GAME_STATE.movesThisTurn.length - 1].place == 'board') || (GAME_STATE.bag.length - GAME_STATE.bagCache.length) <= 0) {
                putBlockBack2Hand();
                return;
            }

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

    //Check in -x direction
    let attribute = null;
    let foundBlocks = [block];
    let placedBlocksThisMove = GAME_STATE.movesThisTurn.map(b => b.block);
    let offset = -1;
    while(true) {
        let checkPos = [position[0] + offset, position[1]];
        let checkBlock = GAME_STATE.board[checkPos];
        if(checkBlock) {
            if(attribute == null) {
                if(checkBlock.shape === block.shape && checkBlock.color === block.color) {
                    return false; // Same block
                } else if(checkBlock.shape === block.shape) {
                    attribute = checkBlock.shape;
                } else if(checkBlock.color === block.color) {
                    attribute = checkBlock.color;
                } else {
                    return false; // Different shape and color
                }
            } else if((checkBlock.shape !== attribute && checkBlock.color !== attribute) || foundBlocks.find(b => b.shape === checkBlock.shape && b.color === checkBlock.color)) {
                return false; // Different shape and color or block of this kind already in this line
            }
            foundBlocks.push(checkBlock);
            if(placedBlocksThisMove.find(b => b.id === checkBlock.id)) {
                placedBlocksThisMove.splice(placedBlocksThisMove.findIndex(b => b.id === checkBlock.id), 1);
            }
            offset--;
        } else {
            break;
        }
    }
    //Check in +x direction
    offset = 1;
    while(true) {
        let checkPos = [position[0] + offset, position[1]];
        let checkBlock = GAME_STATE.board[checkPos];
        if(checkBlock) {
            if(attribute == null) {
                if(checkBlock.shape === block.shape && checkBlock.color === block.color) {
                    return false; // Same block
                } else if(checkBlock.shape === block.shape) {
                    attribute = checkBlock.shape;
                } else if(checkBlock.color === block.color) {
                    attribute = checkBlock.color;
                } else {
                    return false; // Different shape and color
                }
            } else if((checkBlock.shape !== attribute && checkBlock.color !== attribute) || foundBlocks.find(b => b.shape === checkBlock.shape && b.color === checkBlock.color)) {
                return false; // Different shape and color or block of this kind already in this line
            }
            foundBlocks.push(checkBlock);
            if(placedBlocksThisMove.find(b => b.id === checkBlock.id)) {
                placedBlocksThisMove.splice(placedBlocksThisMove.findIndex(b => b.id === checkBlock.id), 1);
            }
            offset++;
        } else {
            break;
        }
    }
    const anyBlockFoundInX = foundBlocks.length > 1 ? true : false;
    if(placedBlocksThisMove.length !== 0 && placedBlocksThisMove.length !== GAME_STATE.movesThisTurn.length) {
        return false; // Not all blocks placed this turn are in the same line
    }

    //Check in -z direction
    attribute = null;
    foundBlocks = [block];
    offset = -1;
    while(true) {
        let checkPos = [position[0], position[1] + offset];
        let checkBlock = GAME_STATE.board[checkPos];
        if(checkBlock) {
            if(attribute == null) {
                if(checkBlock.shape === block.shape && checkBlock.color === block.color) {
                    return false; // Same block
                } else if(checkBlock.shape === block.shape) {
                    attribute = checkBlock.shape;
                } else if(checkBlock.color === block.color) {
                    attribute = checkBlock.color;
                } else {
                    return false; // Different shape and color
                }
            } else if((checkBlock.shape !== attribute && checkBlock.color !== attribute) || foundBlocks.find(b => b.shape === checkBlock.shape && b.color === checkBlock.color)) {
                return false; // Different shape and color or block of this kind already in this line
            }
            foundBlocks.push(checkBlock);
            if(placedBlocksThisMove.find(b => b.id === checkBlock.id)) {
                placedBlocksThisMove.splice(placedBlocksThisMove.findIndex(b => b.id === checkBlock.id), 1);
            }
            offset--;
        } else {
            break;
        }
    }
    //Check in +z direction
    offset = 1;
    while(true) {
        let checkPos = [position[0], position[1] + offset];
        let checkBlock = GAME_STATE.board[checkPos];
        if(checkBlock) {
            if(attribute == null) {
                if(checkBlock.shape === block.shape && checkBlock.color === block.color) {
                    return false; // Same block
                } else if(checkBlock.shape === block.shape) {
                    attribute = checkBlock.shape;
                } else if(checkBlock.color === block.color) {
                    attribute = checkBlock.color;
                } else {
                    return false; // Different shape and color
                }
            } else if((checkBlock.shape !== attribute && checkBlock.color !== attribute) || foundBlocks.find(b => b.shape === checkBlock.shape && b.color === checkBlock.color)) {
                return false; // Different shape and color or block of this kind already in this line
            }
            foundBlocks.push(checkBlock);
            if(placedBlocksThisMove.find(b => b.id === checkBlock.id)) {
                placedBlocksThisMove.splice(placedBlocksThisMove.findIndex(b => b.id === checkBlock.id), 1);
            }
            offset++;
        } else {
            break;
        }
    }

    if(!anyBlockFoundInX && foundBlocks.length == 1 && Object.keys(GAME_STATE.board).length > 0) {
        //No blocks found!
        return false;
    }

    if(placedBlocksThisMove.length !== 0) {
        return false; // Not in the line of the other blocks
    }

    return true;
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

function putBlockBack2Hand() {
    if(selectedBlockObject) {
        highlightPlane.visible = false;
        selectedInState = null;
        handGroup.add(selectedBlockObject);
        selectedBlockObject.rotation.set(0, 0, 0); // Reset rotation
        selectedBlockObject.position.set(0, 0, 0); // Reset position
        selectedBlockObject = null;
        refreshHandPositions();
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

        if (x - 1 < minX) minX = x - 1;
        if (z - 1 < minZ) minZ = z - 1;
        if (x + 1 > maxX) maxX = x + 1;
        if (z + 1 > maxZ) maxZ = z + 1;
    }

    const width = maxX - minX + 1;
    const height = maxZ - minZ + 1;

    if (width === oldBoardSize.width && height === oldBoardSize.height) {
        return; // No change in size
    }

    oldBoardSize.width = width;
    oldBoardSize.height = height;

    // Create new geometry and texture
    const newBoardGeometry = new THREE.PlaneGeometry(width, height);
    const newBoardTexture = new THREE.TextureLoader().load('qwirkleShapes/board.png', function (texture) {
        texture.wrapS = THREE.RepeatWrapping; // Enable horizontal tiling
        texture.wrapT = THREE.RepeatWrapping; // Enable vertical tiling
        texture.repeat.set(width, height); // Tile the texture based on the board size
    });

    // Create a new material with the updated texture
    const newBoardMaterial = new THREE.MeshBasicMaterial({ map: newBoardTexture, side: THREE.DoubleSide });

    // Create a new mesh with the updated geometry and material
    const newBoardPlane = new THREE.Mesh(newBoardGeometry, newBoardMaterial);
    newBoardPlane.name = 'boardPlane';
    newBoardPlane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    newBoardPlane.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2); // Center the board

    // Replace the old boardPlane with the new one
    boardGroup.remove(boardPlane); // Remove the old boardPlane
    boardGroup.add(newBoardPlane); // Add the new boardPlane
    boardPlane = newBoardPlane; // Update the reference
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
    for (let i = GAME_STATE.hand.length; i < 6; i++) {
        let drawnBlock = GAME_STATE.bag.pop();
        if (!drawnBlock) {
            break; // No more blocks to draw
        }

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

        let block = createBlock(drawnBlock.shape, drawnBlock.color, drawnBlock.id);
        handGroup.add(block);
    }
}

function initLogic(bag = null, maxPlacableBlocksofOther = 0) {
    GAME_STATE = {
        currentPlayer: null,
        main: 0,
        second: 0,
        hand: [],
        bag: [],
        bagCache: [],
        board: {},
        movesThisTurn: []
    };

    if(myRole == 'main') {
        otherRole = 'second';
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

        GAME_STATE.bag = blockArray;
    } else {
        otherRole = 'main';
        GAME_STATE.bag = bag;
    }

    drawBlocks(false);

    render();

    endTurnButton.style.display = 'none';
    undoButton.style.display = 'none';
    updateScore();

    if(myRole == 'main') {
        const maxPlacableBlocks = getMaxPlacableBlocks(GAME_STATE.hand);
        conn.send(packageData('INIT_GAME', {bag: GAME_STATE.bag, maxPlacableBlocks: maxPlacableBlocks}));
    } else {
        remainingBlocksIndicator.innerText = GAME_STATE.bag.length + ' Blocks left';
        conn.send(packageData('UPDATE_BAG', { bag: GAME_STATE.bag }));
        const maxPlacableBlocks = getMaxPlacableBlocks(GAME_STATE.hand);
        if(maxPlacableBlocks > maxPlacableBlocksofOther) {
            GAME_STATE.currentPlayer = myRole;
        } else if(maxPlacableBlocks < maxPlacableBlocksofOther) {
            GAME_STATE.currentPlayer = otherRole;
        } else {
            GAME_STATE.currentPlayer = Math.random() < 0.5 ? myRole : otherRole;
        }
        updateTurnIndicator();
        conn.send(packageData('SET_TURN', { currentPlayer: GAME_STATE.currentPlayer }));
    }
}

function getMaxPlacableBlocks(hand) {
    let maxBlocks = 0;
    for(let shape of SHAPES) {
        let shapeCount = hand.filter(b => b.shape === shape).length;
        if(shapeCount > maxBlocks) {
            maxBlocks = shapeCount;
        }
    }
    for(let color of COLORS) {
        let colorCount = hand.filter(b => b.color === color).length;
        if(colorCount > maxBlocks) {
            maxBlocks = colorCount;
        }
    }
    return maxBlocks;
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
    winnerIndicator.innerText = winnerName + ' wins!';
    winnerIndicator.style.color = hexToCssColor(GAME_STATE.currentPlayer == myRole ? mainColor : secondColor);
    winnerIndicator.style.display = 'block';
}

function updateScore() {
    scoreIndicator.innerHTML = `<span style="color: ${hexToCssColor(myColor())}">${myName}: ${GAME_STATE[myRole]}</span> | <span style="color: ${hexToCssColor(otherColor())}">${otherName}: ${GAME_STATE[otherRole]}</span>`;
}

function updateTurnIndicator() {
    currentPlayerIndicator.innerText = GAME_STATE.currentPlayer == myRole ? 'Your Turn' : otherName + "'s Turn";

    if (GAME_STATE.currentPlayer === 'main') {
        scene.background = new THREE.Color(mainColorSemiDark);
        currentPlayerIndicator.style.color = hexToCssColor(mainColor);
    } else {
        scene.background = new THREE.Color(secondColorSemiDark);
        currentPlayerIndicator.style.color = hexToCssColor(secondColor);
    }
}

window.endTurn = function() {
    putBlockBack2Hand();
    if(GAME_STATE.currentPlayer !== myRole) {
        return;
    }

    //remove all halos
    for(let halo of halos) {
        boardGroup.remove(halo);
    }
    halos = [];

    GAME_STATE.currentPlayer = GAME_STATE.currentPlayer == 'main' ? 'second' : 'main';
    updateTurnIndicator();
    endTurnButton.style.display = 'none';
    undoButton.style.display = 'none';

    drawBlocks();
    remainingBlocksIndicator.innerText = GAME_STATE.bag.length + ' Blocks left';
    if(GAME_STATE.hand.length == 0) {
        GAME_STATE[myRole] += 6;
        updateScore();

        const winnerName = GAME_STATE[myRole] > GAME_STATE[otherRole] ? myName : otherName;
        conn.send(packageData('END_GAME', { winner: winnerName }));

        showWinner(winnerName);
        undoButton.style.display = 'none';
        endTurnButton.style.display = 'none';
        endGameTimeout = setTimeout(() => {
            back2Selection();
        }, 5000);
    }

    if(GAME_STATE.bagCache.length > 0) {
        for(let i = 0; i < GAME_STATE.bagCache.length; i++) {
            const randomIndex = Math.floor(Math.random() * GAME_STATE.bag.length);
            GAME_STATE.bag.splice(randomIndex, 0, GAME_STATE.bagCache[i]);
        }
        GAME_STATE.bagCache = [];
    } else {
        //Placed blocks on board -> Calculate score
        let score = 0;
        // Get main line direction
        let lineDirection = [1, 0];
        const startPos = GAME_STATE.movesThisTurn[0].pos;
        for(let move of GAME_STATE.movesThisTurn) {
            if(move.pos[1] !== startPos[1]) {
                lineDirection = [0, 1];
                break;
            }
        }
        // Calculate length of main line
        let lineScore = getLineScore(startPos, lineDirection);
        score += lineScore;
        //Calculate score for other lines
        lineDirection = [lineDirection[1], lineDirection[0]]; // Rotate 90 degrees
        for(let move of GAME_STATE.movesThisTurn) {
            lineScore = getLineScore(move.pos, lineDirection);
            score += lineScore;
        }
        console.log('Score this turn: ', score);
        GAME_STATE[myRole] += score;
        updateScore();
    }

    GAME_STATE.movesThisTurn = [];
    conn.send(packageData('END_TURN', { currentPlayer: GAME_STATE.currentPlayer, bag: GAME_STATE.bag, score: GAME_STATE[myRole] }));
}

function getLineScore(startpos, direction) {
    let lineLength = 1;
    let i = 1;
    while(true) {
        const checkPos = [startpos[0] - direction[0] * i, startpos[1] - direction[1] * i];
        if(GAME_STATE.board[checkPos]) {
            lineLength++;
        } else {
            break;
        }
        i++;
    }
    i = 1;
    while(true) {
        const checkPos = [startpos[0] + direction[0] * i, startpos[1] + direction[1] * i];
        if(GAME_STATE.board[checkPos]) {
            lineLength++;
        } else {
            break;
        }
        i++;
    }
    if(lineLength == 1) {
        return 0; // No score for single block
    } else if(lineLength == 6) {
        return 12; // Qwirkle!
    }
    return lineLength;
}

window.undo = function() {
    putBlockBack2Hand();
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
            conn.send(packageData('REMOVE_BLOCK', { block: lastMove.block, pos: lastMove.pos }));
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
if(myRole == 'main') {initLogic();}

}

startQwirkle();