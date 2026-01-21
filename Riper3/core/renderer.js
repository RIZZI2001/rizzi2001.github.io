class WebGLRenderer {
    constructor() {
        this.canvas = document.getElementById('glCanvas');
        this.gl = this.canvas.getContext('webgl');
        this.shaderProgram = null;
        this.scene = { objects: [] };
        this.camera = null;
        this.startTime = Date.now();
        
        (async () => {
            await this.initShaders();
            this.setupScene();
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            this.render();
        })();
    }
    
    async initShaders() {
        const vertexSource = await (await fetch('/Riper3/shaders/vertex.glsl')).text();
        const fragmentSource = await (await fetch('/Riper3/shaders/fragment.glsl')).text();
        
        const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);
        
        this.shaderProgram = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgram, vertexShader);
        this.gl.attachShader(this.shaderProgram, fragmentShader);
        this.gl.linkProgram(this.shaderProgram);
        
        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(this.shaderProgram));
        }
        
        this.programInfo = {
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                uModel: this.gl.getUniformLocation(this.shaderProgram, 'uModel'),
                uView: this.gl.getUniformLocation(this.shaderProgram, 'uView'),
                uProjection: this.gl.getUniformLocation(this.shaderProgram, 'uProjection'),
            }
        };
    }
    
    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
        }
        
        return shader;
    }
    
    setupScene() {
        this.camera = new Camera(45, this.canvas.width / this.canvas.height, 0.1, 1000);
        const cubeMesh = this.createCubeMesh();
        const cubeObject = new GameObject();
        cubeObject.mesh = cubeMesh;
        this.scene.objects.push(cubeObject);
        
        this.gl.clearColor(0.1, 0.1, 0.2, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
    }
    
    createCubeMesh() {
        const vertices = [
            // Front face
            -1, -1,  1,
             1, -1,  1,
             1,  1,  1,
            -1,  1,  1,
            // Back face
            -1, -1, -1,
            -1,  1, -1,
             1,  1, -1,
             1, -1, -1,
            // Top face
            -1,  1, -1,
            -1,  1,  1,
             1,  1,  1,
             1,  1, -1,
            // Bottom face
            -1, -1, -1,
             1, -1, -1,
             1, -1,  1,
            -1, -1,  1,
            // Right face
             1, -1, -1,
             1,  1, -1,
             1,  1,  1,
             1, -1,  1,
            // Left face
            -1, -1, -1,
            -1, -1,  1,
            -1,  1,  1,
            -1,  1, -1,
        ];
        
        const indices = [
            0,  1,  2,    0,  2,  3,    // front
            4,  5,  6,    4,  6,  7,    // back
            8,  9,  10,   8,  10, 11,   // top
            12, 13, 14,   12, 14, 15,   // bottom
            16, 17, 18,   16, 18, 19,   // right
            20, 21, 22,   20, 22, 23    // left
        ];
        
        const mesh = new Mesh(vertices, indices, null);
        this.setupMeshBuffers(mesh, vertices, indices);
        return mesh;
    }
    
    setupMeshBuffers(mesh, vertices, indices) {
        mesh.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        
        mesh.indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        
        mesh.vertexCount = indices.length;
    }
    
    resizeCanvas() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            
            if (this.gl) {
                this.gl.viewport(0, 0, displayWidth, displayHeight);
                if (this.camera) {
                    this.camera.aspect = displayWidth / displayHeight;
                }
            }
        }
    }
    
    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.shaderProgram);
        
        const viewMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();
        const elapsed = (Date.now() - this.startTime) / 1000;
        
        for (let object of this.scene.objects) {
            object.rotation.x = elapsed;
            object.rotation.y = elapsed * 0.7;
            object.rotation.z = elapsed * 0.5;
            
            const worldMatrix = object.getWorldMatrix();
            this.drawMesh(object.mesh, worldMatrix, viewMatrix, projMatrix);
        }
        
        requestAnimationFrame(() => this.render());
    }
    
    drawMesh(mesh, worldMatrix, viewMatrix, projMatrix) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
        this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.uModel, false, worldMatrix);
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.uView, false, viewMatrix);
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.uProjection, false, projMatrix);
        
        this.gl.drawElements(this.gl.TRIANGLES, mesh.vertexCount, this.gl.UNSIGNED_SHORT, 0);
    }
}

window.addEventListener('load', () => {
    new WebGLRenderer();
});