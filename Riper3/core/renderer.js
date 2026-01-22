class WebGLRenderer {
    static MAX_LIGHTS = 3;

    constructor() {
        this.canvas = document.getElementById('glCanvas');
        this.gl = this.canvas.getContext('webgl2');
        this.shaderProgram = null;
        this.scene = { objects: [], directionalLights: [], pointLights: [] };
        this.camera = null;
        this.startTime = Date.now();
        this.lastFrameTime = this.startTime;
        this.fps = 0;
        
        (async () => {
            await this.initShaders();
            this.setupScene();
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            this.render();
        })();
    }
    
    async initShaders() {
        let vertexSource = await (await fetch('/Riper3/shaders/vertex.glsl')).text();
        let fragmentSource = await (await fetch('/Riper3/shaders/fragment.glsl')).text();
        
        // Inject MAX_LIGHTS define
        const maxLightsDefine = `#define MAX_LIGHTS ${WebGLRenderer.MAX_LIGHTS}\n`;
        vertexSource = maxLightsDefine + vertexSource;
        fragmentSource = maxLightsDefine + fragmentSource;
        
        // Load textures
        await this.loadTexture('/Riper3/textures/stone.png');
        await this.loadNormalMap('/Riper3/textures/normalMaps/stone.png');

        const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);
        
        this.shaderProgram = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgram, vertexShader);
        this.gl.attachShader(this.shaderProgram, fragmentShader);
        this.gl.linkProgram(this.shaderProgram);
        
        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(this.shaderProgram));
        }
        
        this.shaderVariables = {
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
                normal: this.gl.getAttribLocation(this.shaderProgram, 'aNormal'),
                texCoord: this.gl.getAttribLocation(this.shaderProgram, 'aTexCoord'),
                tangent: this.gl.getAttribLocation(this.shaderProgram, 'aTangent'),
            },
            uniformLocations: {
                uModel: this.gl.getUniformLocation(this.shaderProgram, 'uModel'),
                uView: this.gl.getUniformLocation(this.shaderProgram, 'uView'),
                uProjection: this.gl.getUniformLocation(this.shaderProgram, 'uProjection'),
                uNormalMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uNormalMatrix'),
                uCameraPos: this.gl.getUniformLocation(this.shaderProgram, 'uCameraPos'),
                uAmbientColor: this.gl.getUniformLocation(this.shaderProgram, 'uAmbientColor'),
                uDirLight: {
                    count: this.gl.getUniformLocation(this.shaderProgram, 'uDirLightCount'),
                },
                uPointLight: {
                    count: this.gl.getUniformLocation(this.shaderProgram, 'uPointLightCount'),
                },
                uRoughness: this.gl.getUniformLocation(this.shaderProgram, 'uRoughness'),
                uSpecularStrength: this.gl.getUniformLocation(this.shaderProgram, 'uSpecularStrength'),
                uTexture: this.gl.getUniformLocation(this.shaderProgram, 'uTexture'),
                uNormalMap: this.gl.getUniformLocation(this.shaderProgram, 'uNormalMap'),
            }
        };
        // Setup array uniform locations for lights
        this.shaderVariables.uniformLocations.uDirLight.directions = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(this.shaderProgram, `uDirLightDirections[${i}]`)
        );
        this.shaderVariables.uniformLocations.uDirLight.colors = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(this.shaderProgram, `uDirLightColors[${i}]`)
        );
        this.shaderVariables.uniformLocations.uPointLight.positions = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(this.shaderProgram, `uPointLightPositions[${i}]`)
        );
        this.shaderVariables.uniformLocations.uPointLight.colors = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(this.shaderProgram, `uPointLightColors[${i}]`)
        );
        this.shaderVariables.uniformLocations.uPointLight.ranges = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(this.shaderProgram, `uPointLightRanges[${i}]`)
        );
    }
    
    async loadTexture(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                this.texture = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                this.gl.generateMipmap(this.gl.TEXTURE_2D);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                resolve(this.texture);
            };
            image.onerror = () => reject(new Error(`Failed to load texture: ${url}`));
            image.src = url;
        });
    }
    
    async loadNormalMap(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                this.normalMap = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.normalMap);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                this.gl.generateMipmap(this.gl.TEXTURE_2D);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                resolve(this.normalMap);
            };
            image.onerror = () => reject(new Error(`Failed to load normal map: ${url}`));
            image.src = url;
        });
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
        const cubeObject = new GameObject();
        cubeObject.mesh = this.createCubeMesh();
        this.scene.objects.push(cubeObject);
        const dirLight = new DirectionalLight(new Vec3(2, 0, -1), new Vec3(0.1, 0.6, 0.6));
        this.scene.directionalLights.push(dirLight);
        const pointLight = new PointLight(new Vec3(2, 0, 1), new Vec3(1, 0.1, 0.1), 50);
        this.scene.pointLights.push(pointLight);
        
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
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
            0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
            0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
            0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
        ];
        
        const texCoords = [
            0, 0,  1, 0,  1, 1,  0, 1,
            1, 0,  1, 1,  0, 1,  0, 0,
            0, 1,  0, 0,  1, 0,  1, 1,
            0, 0,  1, 0,  1, 1,  0, 1,
            1, 0,  1, 1,  0, 1,  0, 0,
            0, 0,  1, 0,  1, 1,  0, 1,
        ];
        
        const tangents = [
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
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
        this.setupMeshBuffers(mesh, vertices, indices, normals, texCoords, tangents);
        return mesh;
    }
    
    setupMeshBuffers(mesh, vertices, indices, normals, texCoords, tangents) {
        mesh.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        
        if (normals) {
            mesh.normalBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.normalBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
        }
        
        if (texCoords) {
            mesh.texCoordBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.texCoordBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);
        }
        
        if (tangents) {
            mesh.tangentBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.tangentBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(tangents), this.gl.STATIC_DRAW);
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

        this.gl.uniform3f(this.shaderVariables.uniformLocations.uCameraPos, this.camera.position.x, this.camera.position.y, this.camera.position.z);
        this.gl.uniform3f(this.shaderVariables.uniformLocations.uAmbientColor, 0.1, 0.1, 0.1);

        this.gl.uniform1f(this.shaderVariables.uniformLocations.uRoughness, 0.5);
        this.gl.uniform1f(this.shaderVariables.uniformLocations.uSpecularStrength, 1);
        
        //Setup lights on GPU
        const activeDirLights = Math.min(this.scene.directionalLights.length, WebGLRenderer.MAX_LIGHTS);
        const activePointLights = Math.min(this.scene.pointLights.length, WebGLRenderer.MAX_LIGHTS);
        
        for (let i = 0; i < activeDirLights; i++) {
            const light = this.scene.directionalLights[i];
            this.gl.uniform3f(
                this.shaderVariables.uniformLocations.uDirLight.directions[i],
                light.direction.x,
                light.direction.y,
                light.direction.z
            );
            this.gl.uniform3f(
                this.shaderVariables.uniformLocations.uDirLight.colors[i],
                light.color.x,
                light.color.y,
                light.color.z
            );
        }
        
        for (let i = 0; i < activePointLights; i++) {
            const light = this.scene.pointLights[i];
            this.gl.uniform3f(
                this.shaderVariables.uniformLocations.uPointLight.positions[i],
                light.position.x,
                light.position.y,
                light.position.z
            );
            this.gl.uniform3f(
                this.shaderVariables.uniformLocations.uPointLight.colors[i],
                light.color.x,
                light.color.y,
                light.color.z
            );
            this.gl.uniform1f(
                this.shaderVariables.uniformLocations.uPointLight.ranges[i],
                light.range
            );
        }
        
        this.gl.uniform1i(this.shaderVariables.uniformLocations.uDirLight.count, activeDirLights);
        this.gl.uniform1i(this.shaderVariables.uniformLocations.uPointLight.count, activePointLights);
        
        // Bind texture
        if (this.texture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.uniform1i(this.shaderVariables.uniformLocations.uTexture, 0);
        }
        
        // Bind normal map
        if (this.normalMap) {
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.normalMap);
            this.gl.uniform1i(this.shaderVariables.uniformLocations.uNormalMap, 1);
        }
        
        for (let object of this.scene.objects) {
            object.rotation.x = elapsed * 0.5;
            object.rotation.y = elapsed * 0.3;
            object.rotation.z = 0;
            
            const worldMatrix = object.getWorldMatrix();
            this.drawMesh(object.mesh, worldMatrix, viewMatrix, projMatrix);
        }

        this.fps = 1 / ((Date.now() - this.lastFrameTime) / 1000);
        this.lastFrameTime = Date.now();
        this.updateDebugInfo();
        
        requestAnimationFrame(() => this.render());
    }
    
    drawMesh(mesh, worldMatrix, viewMatrix, projMatrix) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
        this.gl.vertexAttribPointer(this.shaderVariables.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.shaderVariables.attribLocations.vertexPosition);
        
        if (mesh.normalBuffer) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.normalBuffer);
            this.gl.vertexAttribPointer(this.shaderVariables.attribLocations.normal, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.shaderVariables.attribLocations.normal);
        }
        
        if (mesh.texCoordBuffer && this.shaderVariables.attribLocations.texCoord !== -1) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.texCoordBuffer);
            this.gl.vertexAttribPointer(this.shaderVariables.attribLocations.texCoord, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.shaderVariables.attribLocations.texCoord);
        }
        
        if (mesh.tangentBuffer && this.shaderVariables.attribLocations.tangent !== -1) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.tangentBuffer);
            this.gl.vertexAttribPointer(this.shaderVariables.attribLocations.tangent, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.shaderVariables.attribLocations.tangent);
        }
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        
        this.gl.uniformMatrix4fv(this.shaderVariables.uniformLocations.uModel, false, worldMatrix);
        this.gl.uniformMatrix4fv(this.shaderVariables.uniformLocations.uView, false, viewMatrix);
        this.gl.uniformMatrix4fv(this.shaderVariables.uniformLocations.uProjection, false, projMatrix);
        
        const normalMatrix = this.computeNormalMatrix(worldMatrix);
        this.gl.uniformMatrix3fv(this.shaderVariables.uniformLocations.uNormalMatrix, false, normalMatrix);
        
        this.gl.drawElements(this.gl.TRIANGLES, mesh.vertexCount, this.gl.UNSIGNED_SHORT, 0);
    }
    
    updateDebugInfo() {
        const debugBox = document.getElementById('debugInfo');
        if (debugBox) {
            const info = [
                `FPS: ${this.fps.toFixed(1)}`,
                `Objects: ${this.scene.objects.length}`,
                `Dir Lights: ${this.scene.directionalLights.length}`,
                `Point Lights: ${this.scene.pointLights.length}`,
                `Canvas: ${this.canvas.width}x${this.canvas.height}`,
                `Elapsed: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`
            ].join('\n');
            debugBox.textContent = info;
        }
    }
}

window.addEventListener('load', () => {
    new WebGLRenderer();
});