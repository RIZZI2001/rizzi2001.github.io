class WebGLRenderer {
    constructor() {
        this.canvas = document.getElementById('glCanvas');
        this.gl = this.canvas.getContext('webgl');
        this.shaderProgram = null;
        this.scene = { objects: [], lights: [] };
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
                normal: this.gl.getAttribLocation(this.shaderProgram, 'aNormal'),
            },
            uniformLocations: {
                uModel: this.gl.getUniformLocation(this.shaderProgram, 'uModel'),
                uView: this.gl.getUniformLocation(this.shaderProgram, 'uView'),
                uProjection: this.gl.getUniformLocation(this.shaderProgram, 'uProjection'),
                uNormalMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uNormalMatrix'),
                uAmbientColor: this.gl.getUniformLocation(this.shaderProgram, 'uAmbientColor'),
                uAmbientStrength: this.gl.getUniformLocation(this.shaderProgram, 'uAmbientStrength'),
                uLightCount: this.gl.getUniformLocation(this.shaderProgram, 'uLightCount'),
                uLightDirections: [
                    this.gl.getUniformLocation(this.shaderProgram, 'uLightDirections[0]'),
                    this.gl.getUniformLocation(this.shaderProgram, 'uLightDirections[1]'),
                    this.gl.getUniformLocation(this.shaderProgram, 'uLightDirections[2]'),
                    this.gl.getUniformLocation(this.shaderProgram, 'uLightDirections[3]'),
                ],
                uLightColors: [
                    this.gl.getUniformLocation(this.shaderProgram, 'uLightColors[0]'),
                    this.gl.getUniformLocation(this.shaderProgram, 'uLightColors[1]'),
                    this.gl.getUniformLocation(this.shaderProgram, 'uLightColors[2]'),
                    this.gl.getUniformLocation(this.shaderProgram, 'uLightColors[3]'),
                ],
                uRoughness: this.gl.getUniformLocation(this.shaderProgram, 'uRoughness'),
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
        this.camera = new Camera(45, this.canvas.width / this.canvas.height, 0.1, 1000, new Vec3(0, 0, 5), new Vec3(0, 0, 0), new Vec3(0, 1, 0));
        const light = new DirectionalLight(new Vec3(0, 0, 5), new Vec3(0, 0, -1), new Vec3(1, 1, 1), 45);
        const cubeMesh = this.createCubeMesh();
        const cubeObject = new GameObject();
        cubeObject.mesh = cubeMesh;
        this.scene.lights.push(light);
        this.scene.objects.push(cubeObject);
        
        this.gl.clearColor(0, 0, 0, 1.0);
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
        
        const normals = [
            // Front face (z = 1)
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
            // Back face (z = -1)
            0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
            // Top face (y = 1)
            0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
            // Bottom face (y = -1)
            0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
            // Right face (x = 1)
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            // Left face (x = -1)
            -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
        ];
        
        const indices = [
            0,  1,  2,    0,  2,  3,    // front
            4,  5,  6,    4,  6,  7,    // back
            8,  9,  10,   8,  10, 11,   // top
            12, 13, 14,   12, 14, 15,   // bottom
            16, 17, 18,   16, 18, 19,   // right
            20, 21, 22,   20, 22, 23    // left
        ];
        
        const mesh = new Mesh(vertices, indices, normals);
        this.setupMeshBuffers(mesh, vertices, indices, normals);
        return mesh;
    }
    
    setupMeshBuffers(mesh, vertices, indices, normals) {
        mesh.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        
        if (normals) {
            mesh.normalBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.normalBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
        }
        
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
    
    computeNormalMatrix(modelMatrix) {
        // For normal transformation: transpose(inverse(M))
        // For rotation matrices, inverse = transpose, so result = identity
        // For general matrices, we need proper inverse-transpose
        
        const m = modelMatrix;
        const n = new Float32Array(9);
        
        // Extract upper-left 3x3
        n[0] = m[0]; n[1] = m[4]; n[2] = m[8];
        n[3] = m[1]; n[4] = m[5]; n[5] = m[9];
        n[6] = m[2]; n[7] = m[6]; n[8] = m[10];
        
        // Calculate determinant
        const det = n[0] * (n[4] * n[8] - n[5] * n[7])
                  - n[1] * (n[3] * n[8] - n[5] * n[6])
                  + n[2] * (n[3] * n[7] - n[4] * n[6]);
        
        if (Math.abs(det) < 0.0001) {
            // Matrix is singular or nearly singular, return identity
            const identity = new Float32Array(9);
            identity[0] = identity[4] = identity[8] = 1;
            return identity;
        }
        
        const invDet = 1 / det;
        
        // Compute inverse, then transpose
        const inv = new Float32Array(9);
        inv[0] = (n[4] * n[8] - n[5] * n[7]) * invDet;
        inv[1] = (n[2] * n[7] - n[1] * n[8]) * invDet;
        inv[2] = (n[1] * n[5] - n[2] * n[4]) * invDet;
        inv[3] = (n[5] * n[6] - n[3] * n[8]) * invDet;
        inv[4] = (n[0] * n[8] - n[2] * n[6]) * invDet;
        inv[5] = (n[2] * n[3] - n[0] * n[5]) * invDet;
        inv[6] = (n[3] * n[7] - n[4] * n[6]) * invDet;
        inv[7] = (n[1] * n[6] - n[0] * n[7]) * invDet;
        inv[8] = (n[0] * n[4] - n[1] * n[3]) * invDet;
        
        // Return the inverse directly (it's already transposed in the computation)
        return inv;
    }
    
    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.shaderProgram);
        
        const viewMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();
        const elapsed = (Date.now() - this.startTime) / 1000;
        
        // Set ambient light
        this.gl.uniform3f(this.programInfo.uniformLocations.uAmbientColor, 0.3, 0.3, 0.3);
        this.gl.uniform1f(this.programInfo.uniformLocations.uAmbientStrength, 0.4);
        
        // Set roughness
        this.gl.uniform1f(this.programInfo.uniformLocations.uRoughness, 0.5);
        
        // Set light count and data
        this.gl.uniform1i(this.programInfo.uniformLocations.uLightCount, this.scene.lights.length);
        
        for (let i = 0; i < this.scene.lights.length && i < 4; i++) {
            const light = this.scene.lights[i];
            this.gl.uniform3f(
                this.programInfo.uniformLocations.uLightDirections[i],
                light.direction.x,
                light.direction.y,
                light.direction.z
            );
            this.gl.uniform3f(
                this.programInfo.uniformLocations.uLightColors[i],
                light.color.x,
                light.color.y,
                light.color.z
            );
        }
        
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
        
        if (mesh.normalBuffer) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.normalBuffer);
            this.gl.vertexAttribPointer(this.programInfo.attribLocations.normal, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.programInfo.attribLocations.normal);
        }
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.uModel, false, worldMatrix);
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.uView, false, viewMatrix);
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.uProjection, false, projMatrix);
        
        const normalMatrix = this.computeNormalMatrix(worldMatrix);
        this.gl.uniformMatrix3fv(this.programInfo.uniformLocations.uNormalMatrix, false, normalMatrix);
        
        this.gl.drawElements(this.gl.TRIANGLES, mesh.vertexCount, this.gl.UNSIGNED_SHORT, 0);
    }
}

window.addEventListener('load', () => {
    new WebGLRenderer();
});