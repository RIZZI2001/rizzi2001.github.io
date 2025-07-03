class Renderer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.gl = null;
        this.shaderProgram = null;
        this.scene = null;
    }

    init() {
        // Get WebGL context
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        
        if (!this.gl) {
            console.error('WebGL not supported');
            return false;
        }

        // Set canvas size
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Initialize shaders
        this.initShaders();

        // Enable depth testing
        this.gl.enable(this.gl.DEPTH_TEST);
        
        console.log('Renderer initialized');
        return true;
    }

    initShaders() {
        // Basic vertex shader
        const vertexShaderSource = `
            attribute vec4 a_position;
            attribute vec4 a_color;
            
            uniform mat4 u_mvpMatrix;
            
            varying vec4 v_color;
            
            void main() {
                gl_Position = u_mvpMatrix * a_position;
                v_color = a_color;
            }
        `;

        // Basic fragment shader
        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec4 v_color;
            
            void main() {
                gl_FragColor = v_color;
            }
        `;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.shaderProgram = this.createProgram(vertexShader, fragmentShader);
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }

        return program;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    setScene(scene) {
        this.scene = scene;
    }

    render() {
        // Clear buffers
        this.gl.clearColor(0.1, 0.1, 0.2, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        if (!this.scene || !this.shaderProgram) {
            requestAnimationFrame(() => this.render());
            return;
        }

        // Use shader program
        this.gl.useProgram(this.shaderProgram);

        // Calculate projection matrix
        const aspect = this.canvas.width / this.canvas.height;
        const camera = this.scene.getCamera();
        const projectionMatrix = Mat4.perspective(camera.fov, aspect, camera.near, camera.far);

        // Calculate view matrix
        const viewMatrix = Mat4.translation(-camera.position[0], -camera.position[1], -camera.position[2]);

        // Render all objects
        const objects = this.scene.getObjects();
        for (const object of objects) {
            this.renderObject(object, projectionMatrix, viewMatrix);
        }

        // Continue render loop
        requestAnimationFrame(() => this.render());
    }

    renderObject(object, projectionMatrix, viewMatrix) {
        // Calculate model matrix
        const translationMatrix = Mat4.translation(...object.position);
        const rotationXMatrix = Mat4.rotationX(object.rotation[0]);
        const rotationYMatrix = Mat4.rotationY(object.rotation[1]);
        const rotationZMatrix = Mat4.rotationZ(object.rotation[2]);
        const scaleMatrix = Mat4.scaling(...object.scale);

        // Combine transformations: T * R * S
        let modelMatrix = Mat4.multiply(translationMatrix, rotationZMatrix);
        modelMatrix = Mat4.multiply(modelMatrix, rotationYMatrix);
        modelMatrix = Mat4.multiply(modelMatrix, rotationXMatrix);
        modelMatrix = Mat4.multiply(modelMatrix, scaleMatrix);

        // Calculate MVP matrix
        const mvMatrix = Mat4.multiply(viewMatrix, modelMatrix);
        const mvpMatrix = Mat4.multiply(projectionMatrix, mvMatrix);

        // Create vertex buffer
        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(object.vertices), this.gl.STATIC_DRAW);

        // Set up position attribute
        const positionLocation = this.gl.getAttribLocation(this.shaderProgram, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        // Create color buffer (same color for all vertices for now)
        const colors = [];
        for (let i = 0; i < object.vertices.length / 3; i++) {
            colors.push(...object.color);
        }
        const colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

        // Set up color attribute
        const colorLocation = this.gl.getAttribLocation(this.shaderProgram, 'a_color');
        this.gl.enableVertexAttribArray(colorLocation);
        this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0);

        // Set MVP matrix uniform
        const mvpLocation = this.gl.getUniformLocation(this.shaderProgram, 'u_mvpMatrix');
        this.gl.uniformMatrix4fv(mvpLocation, false, mvpMatrix);

        // Draw the object
        if (object.indices) {
            // Draw with indices
            const indexBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(object.indices), this.gl.STATIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, object.indices.length, this.gl.UNSIGNED_SHORT, 0);
        } else {
            // Draw vertices directly
            this.gl.drawArrays(this.gl.TRIANGLES, 0, object.vertices.length / 3);
        }
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    const renderer = new Renderer();
    renderer.init();
});