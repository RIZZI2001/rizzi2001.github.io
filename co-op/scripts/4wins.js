function start4wins() {

let scene, camera, renderer;
let raycaster, mouse;
let zoomValue = 0, camPos = { x: 0, y: 6.5, z: 8 };
let isRendering = true;
let endGameTimeout;

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const scoreIndicator = document.getElementById('score-indicator');
const winnerIndicator = document.getElementById('winner-indicator');
const undoButton = document.getElementById('undo-button');
const endTurnButton = document.getElementById('end-turn-button');

const windowSubtract = 0.5;

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

    scene = null;
    camera = null;
    renderer = null;
    zoomValue = 0;
    camPos = { x: 0, y: 6.5, z: 8 };
    isPanning = false;
    lastMousePosition = { x: 0, y: 0 };
    raycaster = null;
    mouse = null;
    offset = null;
}

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - windowSubtract, window.innerHeight - windowSubtract);
    document.body.appendChild(renderer.domElement);

    const loader = new THREE.TextureLoader();

    scene.add(camera);
    camera.position.set(camPos.x, camPos.y, camPos.z);
    camera.rotation.set(-0.3, 0, 0); // Angle the camera down to see the board

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    boardGroup = new THREE.Group();

    // Create the game board with texture
    const boardTexture = loader.load('img/4winsBoard.png');
    // Improve texture filtering for better quality
    boardTexture.minFilter = THREE.LinearFilter;
    boardTexture.magFilter = THREE.LinearFilter;
    boardTexture.generateMipmaps = false;
    
    const boardGeometry = new THREE.BoxGeometry(7, 6, 0.3);
    
    // Create materials array for different faces
    const texturedMaterial = new THREE.MeshBasicMaterial({ 
        map: boardTexture,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide
    });
    const redMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x3e54a3,
        side: THREE.DoubleSide
    });
    const invisibleMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false // Don't write to depth buffer so it doesn't block other surfaces
    });
    
    // Materials for each face: [right, left, top, bottom, front, back]
    const boardMaterials = [
        redMaterial,      // Right side
        redMaterial,      // Left side  
        invisibleMaterial,// Top (invisible)
        redMaterial,      // Bottom
        texturedMaterial, // Front face
        texturedMaterial  // Back face
    ];
    
    const boardMesh = new THREE.Mesh(boardGeometry, boardMaterials);
    boardMesh.position.set(0, 2.5, 0);
    boardGroup.add(boardMesh);
    
    // Create a textured chip
    const chipTexture = loader.load('img/4winsChip.png');
    chipTexture.minFilter = THREE.LinearFilter;
    chipTexture.magFilter = THREE.LinearFilter;
    chipTexture.generateMipmaps = false;
    
    const chipGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.2, 32); // radius, radius, height, segments
    
    // Create materials for chip faces
    const chipTextureMaterial = new THREE.MeshBasicMaterial({ 
        map: chipTexture,
        transparent: true,
        alphaTest: 0.1
    });
    const chipSideMaterial = new THREE.MeshBasicMaterial({ color: 0x912c2c });
    
    // Materials array for cylinder: [side, top, bottom]
    const chipMaterials = [
        chipSideMaterial,    // Side surface
        chipTextureMaterial, // Top circle
        chipTextureMaterial  // Bottom circle
    ];
    
    const chipMesh = new THREE.Mesh(chipGeometry, chipMaterials);
    chipMesh.position.set(0, 0, 0);
    chipMesh.rotation.x = Math.PI / 2; // Rotate the chip to lie flat
    boardGroup.add(chipMesh);
    
    scene.add(boardGroup);

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
}

function onMouseMove(event) {
    event.preventDefault();
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

function initLogic() {
    GAME_STATE = {
    };

    render();

    endTurnButton.style.display = 'none';
    undoButton.style.display = 'none';

    updateScore();
}


function render() {
    if(!isRendering) return;
    camera.position.set(camPos.x, camPos.y + zoomValue, camPos.z + zoomValue * 0.7);
    requestAnimationFrame(render);
    TWEEN.update();
    renderer.render(scene, camera);
}

function showWinner(winnerName) {
    winnerIndicator.innerText = winnerName + ' wins!';
    winnerIndicator.style.color = hexToCssColor(GAME_STATE.currentPlayer == myRole ? myColor() : otherColor());
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

    GAME_STATE.currentPlayer = GAME_STATE.currentPlayer == 'main' ? 'second' : 'main';
    updateTurnIndicator();
    endTurnButton.style.display = 'none';
    undoButton.style.display = 'none';

    GAME_STATE.movesThisTurn = [];
    conn.send(packageData('END_TURN', { currentPlayer: GAME_STATE.currentPlayer, bag: GAME_STATE.bag, score: GAME_STATE[myRole] }));
}

window.undo = function() {
    if(GAME_STATE.currentPlayer !== myRole) {
        return;
    }
}

initScene();
initLogic();

}

start4wins();