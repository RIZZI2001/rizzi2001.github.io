function start4wins() {

let scene, camera, renderer, boardMesh, chipGroup, boardGroup;
let raycaster, mouse;
let camPos = { x: 0, y: 6.5, z: 8 };
let camRotation = { yaw: 0, pitch: -0.3 }; // Camera rotation angles
let isRendering = true, allowedToPlace = false;
let endGameTimeout;

const currentPlayerIndicator = document.getElementById('current-player-indicator');
const winnerIndicator = document.getElementById('winner-indicator');

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
            initLogic(args.currentPlayer);
            break;
        case 'END_GAME':
            showWinner(otherName);
            break;
        case 'BACK2SELECT':
            cleanupScene();
            switch2('selection');
            break;
        case 'MOVE':
            GAME_STATE.columns[args.x + 3][args.y] = args.color;
            placeChip(args.color, args.x, args.y, () => {
                // Change turn after opponent's animation completes
                GAME_STATE.currentPlayer = myRole;
                updateTurnIndicator();
            });
            allowedToPlace = true;
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
    window.removeEventListener('mouseup', onMouseUp, false);

    // Remove the renderer's DOM element
    if (renderer && renderer.domElement) {
        document.body.removeChild(renderer.domElement);
    }

    scene = null;
    camera = null;
    renderer = null;
    camPos = { x: 0, y: 6.5, z: 8 };
    camRotation = { yaw: 0, pitch: -0.3 };
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

    // Add lighting for better shading
    const ambientLight = new THREE.AmbientLight(0xffd4a3, 0.6); // Warm ambient light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfff2e6, 1.2); // Warm white light, brighter
    directionalLight.position.set(5, 20, 5);
    directionalLight.castShadow = true;
    
    // Fix shadow acne/self-shadowing
    directionalLight.shadow.bias = -0.0005;
    directionalLight.shadow.normalBias = 0.02;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffb366, 0.5); // Warm orange fill light
    fillLight.position.set(-8, 12, -8);
    scene.add(fillLight);

    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    boardGroup = new THREE.Group();

    // Create the game board with texture
    const boardTexture = loader.load('img/4winsBoard.png');
    // Improve texture filtering for better quality
    boardTexture.minFilter = THREE.LinearFilter;
    boardTexture.magFilter = THREE.LinearFilter;
    boardTexture.generateMipmaps = false;
    
    const boardGeometry = new THREE.BoxGeometry(7, 6, 0.3);
    
    // Create materials array for different faces
    const texturedMaterial = new THREE.MeshLambertMaterial({ 
        map: boardTexture,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide
    });
    const colorMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x363636,
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
        colorMaterial,      // Right side
        colorMaterial,      // Left side  
        invisibleMaterial,// Top (invisible)
        colorMaterial,      // Bottom
        texturedMaterial, // Front face
        texturedMaterial  // Back face
    ];
    
    boardMesh = new THREE.Mesh(boardGeometry, boardMaterials);
    boardMesh.position.set(0, 2.5, 0);
    boardMesh.castShadow = true;
    boardMesh.receiveShadow = true;
    boardGroup.add(boardMesh);

    //Put stands on the left and right side of the board
    const standGeometry = new THREE.BoxGeometry(0.4, 0.5, 2);
    const leftStand = new THREE.Mesh(standGeometry, colorMaterial);
    leftStand.position.set(-3.7, -0.25, 0);
    leftStand.castShadow = true;
    leftStand.receiveShadow = true;
    boardGroup.add(leftStand);

    const rightStand = new THREE.Mesh(standGeometry, colorMaterial);
    rightStand.position.set(3.7, -0.25, 0);
    rightStand.castShadow = true;
    rightStand.receiveShadow = true;
    boardGroup.add(rightStand);

    // Add floor under the board
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x1b2b3c });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.5;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    chipGroup = new THREE.Group();
    boardGroup.add(chipGroup);

    scene.add(boardGroup);

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousedown', onMouseDown, false);
    window.addEventListener('mouseup', onMouseUp, false);
}

function placeChip(color, x, y, onComplete = null) {
    // Create a textured chip
    const loader = new THREE.TextureLoader();
    const chipTexture = loader.load(`img/4winsChip${color}.png`);
    chipTexture.minFilter = THREE.LinearFilter;
    chipTexture.magFilter = THREE.LinearFilter;
    chipTexture.generateMipmaps = false;
    
    const chipGeometry = new THREE.CylinderGeometry(0.49, 0.49, 0.2, 32); // radius, radius, height, segments
    
    // Create materials for chip faces
    const chipTextureMaterial = new THREE.MeshLambertMaterial({ 
        map: chipTexture,
        transparent: true,
        alphaTest: 0.1
    });

    let sideCol = 0x912c2c;
    if(color === 'Green') sideCol = 0x27803e;

    const chipSideMaterial = new THREE.MeshLambertMaterial({ color: sideCol });
    
    // Materials array for cylinder: [side, top, bottom]
    const chipMaterials = [
        chipSideMaterial,    // Side surface
        chipTextureMaterial, // Top circle
        chipTextureMaterial  // Bottom circle
    ];
    
    const chipMesh = new THREE.Mesh(chipGeometry, chipMaterials);
    chipMesh.position.set(x, y + 10, 0); // Start position (high above target)
    chipMesh.rotation.x = Math.PI / 2; // Rotate the chip to lie flat
    chipMesh.castShadow = true;
    chipMesh.receiveShadow = true;
    chipGroup.add(chipMesh);
    
    // Animate the chip falling and bouncing
    animateChipDrop(chipMesh, y, onComplete);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - windowSubtract, window.innerHeight - windowSubtract);
}

function onMouseDown(event) {
    event.preventDefault();
    //Use raycaster to detect x position of intersection with board

    if(GAME_STATE.currentPlayer != myRole || !allowedToPlace) return; // Not your turn
    if(!boardMesh) return;

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(boardMesh);
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const x = Math.round(intersect.point.x);

        const chipColor = myRole == 'main' ? 'Green' : 'Red';

        const y = GAME_STATE.columns[x + 3].indexOf(null);
        if (y === -1) {
            // Column is full
            return;
        }
        GAME_STATE.columns[x + 3][y] = chipColor;
        allowedToPlace = false;
        placeChip(chipColor, x, y, () => {
            // This callback runs when the animation completes
            GAME_STATE.currentPlayer = GAME_STATE.currentPlayer == 'main' ? 'second' : 'main';
            updateTurnIndicator();

            // Check for win condition
            if (checkWinCondition(x + 3, y, chipColor)) {
                showWinner(myName);
                conn.send(packageData('END_GAME', { winner: myName }));
            }
        });

        // Send move to other player
        conn.send(packageData('MOVE', { x: x, y: y, color: chipColor}));
    }
}

function checkWinCondition(col, row, color) {
    // Check vertical
    let count = 1;
    for (let r = row - 1; r >= 0; r--) {
        if (GAME_STATE.columns[col][r] === color) {
            count++;
            if (count === 4) return true;
        } else {
            break;
        }
    }

    // Check horizontal
    count = 1;
    for (let c = col - 1; c >= 0; c--) {
        if (GAME_STATE.columns[c][row] === color) {
            count++;
            if (count === 4) return true;
        } else {
            break;
        }
    }
    for (let c = col + 1; c < 7; c++) {
        if (GAME_STATE.columns[c][row] === color) {
            count++;
            if (count === 4) return true;
        } else {
            break;
        }
    }

    // Check diagonal (bottom-left to top-right)
    count = 1;
    for (let d = 1; d < 4; d++) {
        const newCol = col - d;
        const newRow = row + d;
        if (newCol >= 0 && newRow < 6 && GAME_STATE.columns[newCol][newRow] === color) {
            count++;
            if (count === 4) return true;
        } else {
            break;
        }
    }
    for (let d = -1; d < 4; d--) {
        const newCol = col - d;
        const newRow = row + d;
        if (newCol < 7 && newRow >= 0 && GAME_STATE.columns[newCol][newRow] === color) {
            count++;
            if (count === 4) return true;
        } else {
            break;
        }
    }

    // Check diagonal (top-left to bottom-right)
    count = 1;
    for (let d = 1; d < 4; d++) {
        const newCol = col + d;
        const newRow = row + d;
        if (newCol < 7 && newRow < 6 && GAME_STATE.columns[newCol][newRow] === color) {
            count++;
            if (count === 4) return true;
        } else {
            break;
        }
    }
    for (let d = -1; d < 4; d--) {
        const newCol = col + d;
        const newRow = row + d;
        if (newCol >= 0 && newRow >= 0 && GAME_STATE.columns[newCol][newRow] === color) {
            count++;
            if (count === 4) return true;
        } else {
            break;
        }
    }

    return false;
}

function onMouseUp(event) {
    event.preventDefault();
}

function animateChipDrop(chipMesh, targetY, onComplete = null) {
    const bounceHeight1 = 1.5; // First bounce height
    const bounceHeight2 = 0.8; // Second bounce height
    const bounceHeight3 = 0.2; // Third bounce height
    const speedFactor = 1.5; // Speed factor to adjust overall animation speed
    
    // Create a sequence of tweens for the bouncing effect
    const dropTween = new TWEEN.Tween(chipMesh.position)
        .to({ y: targetY }, 600 * speedFactor) // Fall to target position
        .easing(TWEEN.Easing.Quadratic.In); // Simple fall, no built-in bouncing
    
    const bounce1Tween = new TWEEN.Tween(chipMesh.position)
        .to({ y: targetY + bounceHeight1 }, 150 * speedFactor) // First bounce up
        .easing(TWEEN.Easing.Quadratic.Out);
    
    const fall1Tween = new TWEEN.Tween(chipMesh.position)
        .to({ y: targetY }, 150 * speedFactor) // Fall back down
        .easing(TWEEN.Easing.Quadratic.In);
    
    const bounce2Tween = new TWEEN.Tween(chipMesh.position)
        .to({ y: targetY + bounceHeight2 }, 100 * speedFactor) // Second bounce up (smaller)
        .easing(TWEEN.Easing.Quadratic.Out);
    
    const fall2Tween = new TWEEN.Tween(chipMesh.position)
        .to({ y: targetY }, 100 * speedFactor) // Fall back down
        .easing(TWEEN.Easing.Quadratic.In);
    
    const bounce3Tween = new TWEEN.Tween(chipMesh.position)
        .to({ y: targetY + bounceHeight3 }, 50 * speedFactor) // Third bounce up (smallest)
        .easing(TWEEN.Easing.Quadratic.Out);
    
    const finalFallTween = new TWEEN.Tween(chipMesh.position)
        .to({ y: targetY }, 50 * speedFactor) // Final settle
        .easing(TWEEN.Easing.Quadratic.In)
        .onComplete(() => {
            // Call the callback when animation completes
            if (onComplete) onComplete();
        });
    
    // Chain the tweens together
    dropTween.chain(bounce1Tween);
    bounce1Tween.chain(fall1Tween);
    fall1Tween.chain(bounce2Tween);
    bounce2Tween.chain(fall2Tween);
    fall2Tween.chain(bounce3Tween);
    bounce3Tween.chain(finalFallTween);
    
    // Start the animation
    dropTween.start();
}

function initLogic( initialPlayer = null ) {
    console.log('Initializing game logic. Initial player:', initialPlayer);
    GAME_STATE = {
        currentPlayer: initialPlayer !== null ? initialPlayer : (Math.random() < 0.5 ? 'main' : 'second'),
        columns: Array(7).fill(0).map(() => Array(6).fill(null)), // 7 columns, each with 6 rows
    };
    console.log('Current player is', GAME_STATE.currentPlayer);

    render();
    updateTurnIndicator();
    winnerIndicator.style.display = 'none';

    if(myRole == 'main') {
        //Initialize game for other player
        conn.send(packageData('INIT_GAME', { currentPlayer: GAME_STATE.currentPlayer }));
    }

    if(myRole == GAME_STATE.currentPlayer) {
        allowedToPlace = true;
    }
}


function render() {
    if(!isRendering) return;
 
    requestAnimationFrame(render);
    TWEEN.update();
    renderer.render(scene, camera);
}

function showWinner(winnerName) {
    winnerIndicator.innerText = winnerName + ' wins!';
    winnerIndicator.style.color = hexToCssColor(winnerName == myName ? myColor() : otherColor());
    winnerIndicator.style.display = 'block';
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

initScene();
if(myRole == 'main') {initLogic();}

}

start4wins();