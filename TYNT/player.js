class Player {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    
    // Rotation
    this.rotation = { yaw: Math.PI, pitch: 0 };
    
    // Movement
    this.velocity = { x: 0, y: 0, z: 0 };
    this.speed = 0.1;
    
    // Input states
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };
    this.mouseSensitivity = 0.002;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Mouse events
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', () => this.canvas.requestPointerLock());
    
    // Pointer lock events
    document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
  }
  
  handleKeyDown(event) {
    this.keys[event.key.toLowerCase()] = true;
  }
  
  handleKeyUp(event) {
    this.keys[event.key.toLowerCase()] = false;
  }
  
  handleMouseMove(event) {
    if (document.pointerLockElement === this.canvas) {
      this.mouse.dx = event.movementX;
      this.mouse.dy = event.movementY;
      
      // Update rotation based on mouse movement
      this.rotation.yaw -= this.mouse.dx * this.mouseSensitivity;
      this.rotation.pitch -= this.mouse.dy * this.mouseSensitivity;
      
      // Clamp pitch to prevent camera flipping
      const maxPitch = Math.PI / 2 - 0.01;
      this.rotation.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.rotation.pitch));
    }
  }
  
  handlePointerLockChange() {
    if (document.pointerLockElement !== this.canvas) {
      this.keys = {};
    }
  }
  
  update() {
    // Calculate movement direction based on camera rotation
    const forward = {
      x: Math.sin(this.rotation.yaw),
      z: Math.cos(this.rotation.yaw)
    };
    
    const right = {
      x: Math.cos(this.rotation.yaw),
      z: -Math.sin(this.rotation.yaw)
    };
    
    // Reset velocity
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    
    // WASD movement
    if (this.keys['w']) {
      this.velocity.x += forward.x * this.speed;
      this.velocity.z += forward.z * this.speed;
    }
    if (this.keys['s']) {
      this.velocity.x -= forward.x * this.speed;
      this.velocity.z -= forward.z * this.speed;
    }
    if (this.keys['a']) {
      this.velocity.x += right.x * this.speed;
      this.velocity.z += right.z * this.speed;
    }
    if (this.keys['d']) {
      this.velocity.x -= right.x * this.speed;
      this.velocity.z -= right.z * this.speed;
    }
    
    // Space for up, Shift for down
    if (this.keys[' ']) {
      this.velocity.y += this.speed;
    }
    if (this.keys['shift']) {
      this.velocity.y -= this.speed;
    }
    
    // Apply velocity to camera position
    this.camera.position.x += this.velocity.x;
    this.camera.position.y += this.velocity.y;
    this.camera.position.z += this.velocity.z;
    
    // Update camera target based on rotation
    const direction = {
      x: Math.sin(this.rotation.yaw) * Math.cos(this.rotation.pitch),
      y: Math.sin(this.rotation.pitch),
      z: Math.cos(this.rotation.yaw) * Math.cos(this.rotation.pitch)
    };
    
    this.camera.target.x = this.camera.position.x + direction.x;
    this.camera.target.y = this.camera.position.y + direction.y;
    this.camera.target.z = this.camera.position.z + direction.z;
  }
  
  getViewMatrix() {
    // Create a view matrix based on position and rotation
    const eye = this.camera.position;
    
    // Calculate camera direction
    const direction = {
      x: Math.sin(this.rotation.yaw) * Math.cos(this.rotation.pitch),
      y: Math.sin(this.rotation.pitch),
      z: Math.cos(this.rotation.yaw) * Math.cos(this.rotation.pitch)
    };
    
    // Calculate center point
    const center = {
      x: eye.x + direction.x,
      y: eye.y + direction.y,
      z: eye.z + direction.z
    };
    
    // Up vector (usually Y-axis)
    const up = { x: 0, y: 1, z: 0 };
    
    return { eye, center, up };
  }
}

export { Player };
