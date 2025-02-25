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
let raycaster, mouse;
let selectedBlock = null;
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
            refreshHandPositions();
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
    selectedBlock = null;
    raycaster = null;
    mouse = null;
    offset = null;
}

function createBlock(shape, color, id) {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 0.3);

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
    camera.position.z = 10;
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - windowSubtract, window.innerHeight - windowSubtract);
    document.body.appendChild(renderer.domElement);

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

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(handGroup.children);

    if (intersects.length > 0) {
        selectedBlock = intersects[0].object;
        const intersectsPlane = raycaster.intersectObject(selectedCard);
        if (intersectsPlane.length > 0) {
            offset.copy(intersectsPlane[0].point).sub(selectedCard.position);
        }
    }
}

function onMouseMove(event) {
    event.preventDefault();

    if (selectedBlock) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Calculate the new position of the selected card based on the mouse position
        const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = (selectedBlock.position.z - camera.position.z) / dir.z;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));

        selectedBlock.position.copy(pos.sub(offset));
        selectedBlock.position.z = 1;
    }
}

function onMouseUp(event) {
    event.preventDefault();

    if (selectedBlock) {
        //Check where the block is placed on the board
    }       
}

function placeBlock(args) {
    //Place the block on the board
}

function refreshHandPositions() {
    const blockCount = GAME_STATE.hand.length;
    const offset = -blockCount + 1;
    for(let i = 0; i < blockCount; i++) {
        const block = handGroup.children.find(b => b.userData.id === GAME_STATE.hand[i].id);
        if (block) {
            block.position.set(offset + i * 2, 0, 0);
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
        refreshHandPositions();
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