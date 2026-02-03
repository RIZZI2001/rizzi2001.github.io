class WebGLRenderer {
    static MAX_LIGHTS = 3;

    constructor() {
        this.canvas = document.getElementById('glCanvas');
        this.gl = this.canvas.getContext('webgl2', { antialias: false });
        this.scene = { objects: [], directionalLights: [], pointLights: [] };
        this.camera = null;
        this.startTime = Date.now();
        this.lastFrameTime = this.startTime;
        this.fps = 60;
        this.FOV = 100;
        
        (async () => {
            await this.initialize();
        })();
    }

    async initialize() {
        await this.initShaders();
        this.setupGL();
        await this.setupScene();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.render();
    }
    
    setupGL() {
        this.gl.clearColor(0, 0, 0, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.frontFace(this.gl.CCW);
    }

    async loadShaders() {
        const shaders = {
            vertex: await (await fetch('/TYNT/shaders/vertex.glsl')).text(),
            fragment: await (await fetch('/TYNT/shaders/fragment.glsl')).text(),
            overlayVertex: await (await fetch('/TYNT/shaders/overlay.vert')).text(),
            overlayFragment: await (await fetch('/TYNT/shaders/overlay.frag')).text(),
        };
        return shaders;
    }

    getSkyboxShaders() {
        const skyboxVertex = `#version 300 es
            in vec3 aVertexPosition;
            uniform mat4 uView;
            uniform mat4 uProjection;
            out vec3 vTexCoords;
            void main() {
                vec4 pos = uProjection * mat4(mat3(uView)) * vec4(aVertexPosition, 1.0);
                gl_Position = pos.xyww;
                vTexCoords = aVertexPosition;
            }`;
        
        const skyboxFragment = `#version 300 es
            precision mediump float;
            in vec3 vTexCoords;
            uniform samplerCube uSkybox;
            out vec4 outColor;
            void main() {
                outColor = texture(uSkybox, vTexCoords);
            }`;
        
        return { vertex: skyboxVertex, fragment: skyboxFragment };
    }

    async initShaders() {
        const shaders = await this.loadShaders();
        const skyboxShaders = this.getSkyboxShaders();
        const maxLightsDefine = `#define MAX_LIGHTS ${WebGLRenderer.MAX_LIGHTS}\n`;
        
        // Load skybox
        await this.loadSkybox();

        // Setup main shader program
        this.shaderProgram = this.createProgram(maxLightsDefine + shaders.vertex, maxLightsDefine + shaders.fragment);
        this.setupShaderUniforms(this.shaderProgram);
        
        // Setup skybox shader program
        this.skyboxShaderProgram = this.createProgram(skyboxShaders.vertex, skyboxShaders.fragment);
        this.skyboxShaderVars = {
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.skyboxShaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                uView: this.gl.getUniformLocation(this.skyboxShaderProgram, 'uView'),
                uProjection: this.gl.getUniformLocation(this.skyboxShaderProgram, 'uProjection'),
                uSkybox: this.gl.getUniformLocation(this.skyboxShaderProgram, 'uSkybox')
            }
        };
        
        // Setup overlay shader program
        this.overlayShaderProgram = this.createProgram(shaders.overlayVertex, shaders.overlayFragment);
        this.setupOverlayUniforms(this.overlayShaderProgram);
    }

    createProgram(vertexSource, fragmentSource) {
        const program = this.gl.createProgram();
        const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);
        
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(program));
        }
        return program;
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

    setupShaderUniforms(program) {
        this.shaderVariables = {
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(program, 'aVertexPosition'),
                normal: this.gl.getAttribLocation(program, 'aNormal'),
                texCoord: this.gl.getAttribLocation(program, 'aTexCoord'),
                tangent: this.gl.getAttribLocation(program, 'aTangent'),
            },
            uniformLocations: {
                uModel: this.gl.getUniformLocation(program, 'uModel'),
                uView: this.gl.getUniformLocation(program, 'uView'),
                uProjection: this.gl.getUniformLocation(program, 'uProjection'),
                uNormalMatrix: this.gl.getUniformLocation(program, 'uNormalMatrix'),
                uCameraPos: this.gl.getUniformLocation(program, 'uCameraPos'),
                uAmbientColor: this.gl.getUniformLocation(program, 'uAmbientColor'),
                uRoughness: this.gl.getUniformLocation(program, 'uRoughness'),
                uSpecularStrength: this.gl.getUniformLocation(program, 'uSpecularStrength'),
                uTexture: this.gl.getUniformLocation(program, 'uTexture'),
                uNormalMap: this.gl.getUniformLocation(program, 'uNormalMap'),
                uDirLight: { count: this.gl.getUniformLocation(program, 'uDirLightCount') },
                uPointLight: { count: this.gl.getUniformLocation(program, 'uPointLightCount') }
            }
        };
        
        // Setup light array uniforms
        this.shaderVariables.uniformLocations.uDirLight.directions = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(program, `uDirLightDirections[${i}]`)
        );
        this.shaderVariables.uniformLocations.uDirLight.colors = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(program, `uDirLightColors[${i}]`)
        );
        this.shaderVariables.uniformLocations.uPointLight.positions = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(program, `uPointLightPositions[${i}]`)
        );
        this.shaderVariables.uniformLocations.uPointLight.colors = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(program, `uPointLightColors[${i}]`)
        );
        this.shaderVariables.uniformLocations.uPointLight.ranges = Array.from({ length: WebGLRenderer.MAX_LIGHTS }, (_, i) =>
            this.gl.getUniformLocation(program, `uPointLightRanges[${i}]`)
        );
    }

    setupOverlayUniforms(program) {
        this.overlayShaderVars = {
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(program, 'aVertexPosition'),
            },
            uniformLocations: {
                lights: this.gl.getUniformLocation(program, 'uLights'),
                lightColors: this.gl.getUniformLocation(program, 'uLightColors'),
                lightCount: this.gl.getUniformLocation(program, 'uLightCount'),
                projection: this.gl.getUniformLocation(program, 'uProjection'),
                aspectRatio: this.gl.getUniformLocation(program, 'uAspectRatio'),
                depthTexture: this.gl.getUniformLocation(program, 'uDepthTexture')
            }
        };
    }

    async loadTexture(url, name) {
        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                const texture = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                this.gl.generateMipmap(this.gl.TEXTURE_2D);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                this[name] = texture;
                resolve(texture);
            };
            image.onerror = () => console.error(`Failed to load texture: ${url}`);
            image.src = url;
        });
    }

    async loadSkybox() {
        const faces = ['front', 'back', 'left', 'right', 'top', 'bottom'];
        const cubeMapFaces = [
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, // front
            this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, // back
            this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, // left
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_X, // right
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, // top
            this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y  // bottom
        ];

        this.skyboxTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.skyboxTexture);

        for (let i = 0; i < faces.length; i++) {
            const image = new Image();
            image.onload = () => {
                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.skyboxTexture);
                this.gl.texImage2D(cubeMapFaces[i], 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
            };
            image.src = `/TYNT/textures/skybox/${faces[i]}.png`;
        }

        this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
    }
    
    async setupScene() {
        this.camera = new Camera(this.FOV / 2, this.canvas.width / this.canvas.height, 0.1, 1000, 
            new Vec3(0, 0, 10), new Vec3(0, 0, 0), new Vec3(0, 1, 0));
        
        // Load GLTF model
        const loader = new GLTFLoader(this.gl);
        const meshDataArray = await loader.load('/TYNT/models/racecar.gltf');
        
        if (meshDataArray && meshDataArray.length > 0) {
            // Create a GameObject for each mesh
            for (let meshData of meshDataArray) {
                const modelObject = new GameObject();
                const mesh = new Mesh(meshData.positions, meshData.indices, meshData.normals);
                this.setupMeshBuffers(mesh, 
                    Array.from(meshData.positions), 
                    Array.from(meshData.indices), 
                    meshData.normals ? Array.from(meshData.normals) : null, 
                    meshData.texCoords ? Array.from(meshData.texCoords) : null,
                    null
                );
                modelObject.mesh = mesh;
                
                // Store the element name if available
                if (meshData.name) {
                    modelObject.name = meshData.name;
                }
                
                // Apply the node's transform matrix to the model
                if (meshData.transform) {
                    modelObject.transformMatrix = meshData.transform;
                }
                
                // Load and create GL textures from GLTF model
                if (meshData.textures && meshData.textures.length > 0) {
                    const textureData = meshData.textures[0];
                    if (textureData.url) {
                        const textureImage = new Image();
                        textureImage.onload = () => {
                            try {
                                const texture = this.gl.createTexture();
                                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, textureImage);
                                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
                                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
                                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                                modelObject.texture = texture;
                            } catch (e) {
                                console.error('Failed to load texture:', e);
                            }
                        };
                        textureImage.onerror = () => {
                            console.error('Failed to load image:', textureData.url);
                        };
                        textureImage.src = textureData.url;
                    }
                }
                
                this.scene.objects.push(modelObject);
            }
        } else {
            console.error('Failed to load GLTF model');
        }
        
        this.scene.directionalLights.push(new DirectionalLight(new Vec3(-1, -0.45, -0.24), new Vec3(1.0, 0.9, 0.8).scale(3.0)));
        this.scene.pointLights.push(new PointLight(new Vec3(2, 0, 1), new Vec3(1, 0.1, 0.1), 50));
        this.scene.pointLights.push(new PointLight(new Vec3(2, 0, 1), new Vec3(0.0, 0.8, 0.8), 50));
        
        // Setup framebuffer
        this.setupFramebuffer();
        
        // Setup skybox
        this.setupSkyboxMesh();
    }

    setupFramebuffer() {
        this.sceneFramebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sceneFramebuffer);
        
        // Color texture
        this.colorTexture = this.createTexture2D(this.canvas.width, this.canvas.height, this.gl.RGBA, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.colorTexture, 0);
        
        // Depth texture
        this.depthTexture = this.createTexture2D(this.canvas.width, this.canvas.height, this.gl.DEPTH_COMPONENT24, null, this.gl.DEPTH_COMPONENT);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.depthTexture, 0);
        
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    createTexture2D(width, height, internalFormat, data, format = null, type = null) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format || internalFormat, type || this.gl.UNSIGNED_BYTE, data);
        
        const filter = internalFormat === this.gl.DEPTH_COMPONENT24 ? this.gl.NEAREST : this.gl.LINEAR;
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, filter);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, filter);
        
        return texture;
    }

    setupSkyboxMesh() {
        const vertices = [-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1];
        const indices = [0,1,2,2,3,0,5,4,7,7,6,5,4,0,3,3,7,4,1,5,6,6,2,1,3,2,6,6,7,3,4,5,1,1,0,4];
        
        this.skyboxMesh = new Mesh(vertices, indices);
        this.setupMeshBuffers(this.skyboxMesh, vertices, indices, null, null, null);
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
            this.gl.viewport(0, 0, displayWidth, displayHeight);
            
            if (this.camera) this.camera.aspect = displayWidth / displayHeight;
            if (this.colorTexture && this.depthTexture) this.resizeFramebufferTextures(displayWidth, displayHeight);
        }
    }

    resizeFramebufferTextures(width, height) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
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
    
    renderScene(viewMatrix, projMatrix) {
        const activeDirLights = Math.min(this.scene.directionalLights.length, WebGLRenderer.MAX_LIGHTS);
        const activePointLights = Math.min(this.scene.pointLights.length, WebGLRenderer.MAX_LIGHTS);
        
        // Set material properties
        this.gl.uniform3f(this.shaderVariables.uniformLocations.uCameraPos, this.camera.position.x, this.camera.position.y, this.camera.position.z);
        this.gl.uniform3f(this.shaderVariables.uniformLocations.uAmbientColor, 0.2, 0.2, 0.2);
        this.gl.uniform1f(this.shaderVariables.uniformLocations.uRoughness, 0.5);
        this.gl.uniform1f(this.shaderVariables.uniformLocations.uSpecularStrength, 2.0);
        
        // Set directional lights
        for (let i = 0; i < activeDirLights; i++) {
            const light = this.scene.directionalLights[i];
            this.gl.uniform3f(this.shaderVariables.uniformLocations.uDirLight.directions[i], light.direction.x, light.direction.y, light.direction.z);
            this.gl.uniform3f(this.shaderVariables.uniformLocations.uDirLight.colors[i], light.color.x, light.color.y, light.color.z);
        }
        this.gl.uniform1i(this.shaderVariables.uniformLocations.uDirLight.count, activeDirLights);
        
        // Set point lights
        for (let i = 0; i < activePointLights; i++) {
            const light = this.scene.pointLights[i];
            this.gl.uniform3f(this.shaderVariables.uniformLocations.uPointLight.positions[i], light.position.x, light.position.y, light.position.z);
            this.gl.uniform3f(this.shaderVariables.uniformLocations.uPointLight.colors[i], light.color.x, light.color.y, light.color.z);
            this.gl.uniform1f(this.shaderVariables.uniformLocations.uPointLight.ranges[i], light.range);
        }
        this.gl.uniform1i(this.shaderVariables.uniformLocations.uPointLight.count, activePointLights);
        
        // Don't bind any default textures - let objects bind their own
        // This prevents feedback loops with framebuffer attachments
        
        // Render all objects
        for (let object of this.scene.objects) {
            // Use animated transform if available (for wheels), otherwise use stored transform or world matrix
            const worldMatrix = object.animatedTransform || object.transformMatrix || object.getWorldMatrix();
            this.drawMesh(object, object.mesh, worldMatrix, viewMatrix, projMatrix);
        }
    }

    update() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const radius = 3;
        
        // Animate wheels - rotate objects with "wheel" in their name
        for (let object of this.scene.objects) {
            if (object.name && object.name.toLowerCase().includes('wheel')) {
                // Rotate wheel around its local Y axis
                const wheelSpeed = 4; // radians per second
                let rotation = elapsed * wheelSpeed;
                
                // Reverse rotation direction for left wheels
                if (object.name.toLowerCase().includes('left')) {
                    rotation = -rotation;
                }
                
                // Create rotation matrix around Y axis
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                
                const rotationMatrix = new Float32Array([
                    cos, 0, sin, 0,
                    0, 1, 0, 0,
                    -sin, 0, cos, 0,
                    0, 0, 0, 1
                ]);
                
                // Extract translation from the original transform (last column)
                const originalTransform = object.transformMatrix;
                const translationX = originalTransform[12];
                const translationY = originalTransform[13];
                const translationZ = originalTransform[14];
                
                // Apply rotation in local space, then translate to world position
                const rotatedTransform = this.multiplyMatrices(rotationMatrix, originalTransform);
                
                // Restore the original position (in case scale was lost)
                rotatedTransform[12] = translationX;
                rotatedTransform[13] = translationY;
                rotatedTransform[14] = translationZ;
                
                object.animatedTransform = rotatedTransform;
            }
        }
        
        // Rotate each point light in a circle
        for (let i = 0; i < this.scene.pointLights.length; i++) {
            const angle = elapsed + (i * (Math.PI * 2 / this.scene.pointLights.length));
            const light = this.scene.pointLights[i];
            light.position.x = Math.cos(angle) * radius;
            light.position.z = Math.sin(angle) * radius;
            light.position.y = 0;
        }
    }
    
    render() {
        this.update();
        const viewMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();
        
        // Render scene to offscreen framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sceneFramebuffer);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // Render skybox first (with depth equal to far plane)
        this.gl.useProgram(this.skyboxShaderProgram);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.CULL_FACE);
        this.drawSkybox(viewMatrix, projMatrix);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        
        // Render scene objects
        this.gl.useProgram(this.shaderProgram);
        this.renderScene(viewMatrix, projMatrix);
        
        // Blit color buffer to screen
        this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.sceneFramebuffer);
        this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null);
        this.gl.blitFramebuffer(0, 0, this.canvas.width, this.canvas.height, 0, 0, this.canvas.width, this.canvas.height, this.gl.COLOR_BUFFER_BIT, this.gl.NEAREST);
        
        // Render light overlay to screen
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.renderOverlay(viewMatrix, projMatrix);
        
        // Update debug info
        this.fps = ((1 / ((Date.now() - this.lastFrameTime) / 1000)) + this.fps) / 2;
        this.lastFrameTime = Date.now();
        this.updateDebugInfo();
        
        requestAnimationFrame(() => this.render());
    }

    drawSkybox(viewMatrix, projMatrix) {
        this.gl.uniformMatrix4fv(this.skyboxShaderVars.uniformLocations.uView, false, viewMatrix);
        this.gl.uniformMatrix4fv(this.skyboxShaderVars.uniformLocations.uProjection, false, projMatrix);
        
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.skyboxTexture);
        this.gl.uniform1i(this.skyboxShaderVars.uniformLocations.uSkybox, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.skyboxMesh.positionBuffer);
        this.gl.vertexAttribPointer(this.skyboxShaderVars.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.skyboxShaderVars.attribLocations.vertexPosition);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.skyboxMesh.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.skyboxMesh.vertexCount, this.gl.UNSIGNED_SHORT, 0);
    }

    renderOverlay(viewMatrix, projMatrix) {
        this.gl.useProgram(this.overlayShaderProgram);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
        
        // Setup uniforms
        const aspectRatio = this.canvas.width / this.canvas.height;
        this.gl.uniformMatrix4fv(this.overlayShaderVars.uniformLocations.projection, false, projMatrix);
        this.gl.uniform1f(this.overlayShaderVars.uniformLocations.aspectRatio, aspectRatio);
        
        // Bind depth texture
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthTexture);
        this.gl.uniform1i(this.overlayShaderVars.uniformLocations.depthTexture, 2);
        
        // Collect lights in view space
        const lightData = this.collectLightsViewSpace(viewMatrix);
        
        if (lightData.positions.length > 0) {
            this.gl.uniform3fv(this.overlayShaderVars.uniformLocations.lights, new Float32Array(lightData.positions));
            this.gl.uniform3fv(this.overlayShaderVars.uniformLocations.lightColors, new Float32Array(lightData.colors));
            this.gl.uniform1i(this.overlayShaderVars.uniformLocations.lightCount, lightData.positions.length / 3);
        }
        
        // Draw fullscreen quad
        this.drawFullscreenQuad();
        
        // Reset blend function
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.useProgram(this.shaderProgram);
    }

    collectLightsViewSpace(viewMatrix) {
        const positions = [];
        const colors = [];
        
        // Add directional lights
        for (let light of this.scene.directionalLights) {
            const dist = 100;
            const pos = new Vec3(
                this.camera.position.x - light.direction.x * dist,
                this.camera.position.y - light.direction.y * dist,
                this.camera.position.z - light.direction.z * dist
            );
            const camSpacePos = this.transformToViewSpace(pos, viewMatrix);
            positions.push(camSpacePos.x, camSpacePos.y, camSpacePos.z);
            colors.push(light.color.x, light.color.y, light.color.z);
        }
        
        // Add point lights
        for (let light of this.scene.pointLights) {
            const camSpacePos = this.transformToViewSpace(light.position, viewMatrix);
            positions.push(camSpacePos.x, camSpacePos.y, camSpacePos.z);
            colors.push(light.color.x, light.color.y, light.color.z);
        }
        
        return { positions, colors };
    }

    drawFullscreenQuad() {
        const quadVertices = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
        const quadBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);
        
        this.gl.vertexAttribPointer(this.overlayShaderVars.attribLocations.vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.overlayShaderVars.attribLocations.vertexPosition);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }
    
    drawMesh(object, mesh, worldMatrix, viewMatrix, projMatrix) {
        // Always bind a texture to TEXTURE0 to prevent feedback loops
        // If object has a texture, use it; otherwise ensure we're not binding the framebuffer attachment
        this.gl.activeTexture(this.gl.TEXTURE0);
        if (object.texture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, object.texture);
        } else {
            // Bind a dummy white texture if no texture available
            if (!this.whiteTexture) {
                this.whiteTexture = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.whiteTexture);
                const whitePixel = new Uint8Array([255, 255, 255]);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, 1, 1, 0, this.gl.RGB, this.gl.UNSIGNED_BYTE, whitePixel);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            } else {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.whiteTexture);
            }
        }
        this.gl.uniform1i(this.shaderVariables.uniformLocations.uTexture, 0);
        
        // Bind position
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
        this.gl.vertexAttribPointer(this.shaderVariables.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.shaderVariables.attribLocations.vertexPosition);
        
        // Bind normals
        if (mesh.normalBuffer) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.normalBuffer);
            this.gl.vertexAttribPointer(this.shaderVariables.attribLocations.normal, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.shaderVariables.attribLocations.normal);
        }
        
        // Bind texture coordinates
        if (mesh.texCoordBuffer && this.shaderVariables.attribLocations.texCoord !== -1) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.texCoordBuffer);
            this.gl.vertexAttribPointer(this.shaderVariables.attribLocations.texCoord, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.shaderVariables.attribLocations.texCoord);
        }
        
        // Bind tangents
        if (mesh.tangentBuffer && this.shaderVariables.attribLocations.tangent !== -1) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.tangentBuffer);
            this.gl.vertexAttribPointer(this.shaderVariables.attribLocations.tangent, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.shaderVariables.attribLocations.tangent);
        }
        
        // Bind and draw indices
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        this.gl.uniformMatrix4fv(this.shaderVariables.uniformLocations.uModel, false, worldMatrix);
        this.gl.uniformMatrix4fv(this.shaderVariables.uniformLocations.uView, false, viewMatrix);
        this.gl.uniformMatrix4fv(this.shaderVariables.uniformLocations.uProjection, false, projMatrix);
        
        const normalMatrix = this.computeNormalMatrix(worldMatrix);
        this.gl.uniformMatrix3fv(this.shaderVariables.uniformLocations.uNormalMatrix, false, normalMatrix);
        
        this.gl.drawElements(this.gl.TRIANGLES, mesh.vertexCount, this.gl.UNSIGNED_SHORT, 0);
    }

    transformToViewSpace(position, viewMatrix) {
        const x = position.x, y = position.y, z = position.z;
        return new Vec3(
            viewMatrix[0] * x + viewMatrix[4] * y + viewMatrix[8] * z + viewMatrix[12],
            viewMatrix[1] * x + viewMatrix[5] * y + viewMatrix[9] * z + viewMatrix[13],
            viewMatrix[2] * x + viewMatrix[6] * y + viewMatrix[10] * z + viewMatrix[14]
        );
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

    multiplyMatrices(a, b) {
        const result = new Float32Array(16);
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += a[i * 4 + k] * b[k * 4 + j];
                }
                result[i * 4 + j] = sum;
            }
        }
        
        return result;
    }
}

window.addEventListener('load', () => {
    window.renderer = new WebGLRenderer();
});