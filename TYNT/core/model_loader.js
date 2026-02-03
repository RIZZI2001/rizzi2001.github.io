class GLTFLoader {
    constructor(gl) {
        this.gl = gl;
    }

    async load(url) {
        try {
            const response = await fetch(url);
            const gltfJson = await response.json();
            
            // Get the base URL for relative paths
            const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
            
            // Load all buffers
            const buffers = await this.loadBuffers(gltfJson.buffers, baseUrl);
            
            // Extract all meshes with their node transforms
            const meshes = this.extractAllMeshesWithTransforms(gltfJson, buffers);
            
            return meshes;
        } catch (error) {
            console.error('Failed to load GLTF model:', error);
            return [];
        }
    }

    async loadBuffers(bufferDefs, baseUrl) {
        const buffers = [];
        for (const bufferDef of bufferDefs) {
            let arrayBuffer;
            
            if (bufferDef.uri.startsWith('data:')) {
                // Handle embedded data URI
                arrayBuffer = this.decodeDataUri(bufferDef.uri);
            } else {
                // Handle external file
                const url = baseUrl + bufferDef.uri;
                const response = await fetch(url);
                arrayBuffer = await response.arrayBuffer();
            }
            
            buffers.push(arrayBuffer);
        }
        return buffers;
    }

    decodeDataUri(dataUri) {
        // Parse data URI: data:application/octet-stream;base64,<base64-data>
        const base64Match = dataUri.match(/base64,(.+)/);
        if (!base64Match) {
            throw new Error('Invalid data URI format');
        }
        
        const base64String = base64Match[1];
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes.buffer;
    }

    extractAllMeshesWithTransforms(gltf, buffers) {
        if (!gltf.nodes || gltf.nodes.length === 0) {
            console.error('No nodes found in GLTF file');
            return [];
        }

        const meshes = [];
        
        // Traverse the scene graph to find all nodes with meshes
        const rootNodes = gltf.scenes && gltf.scenes.length > 0 ? gltf.scenes[0].nodes || [] : [];
        
        for (let nodeIndex of rootNodes) {
            this.traverseNode(gltf, buffers, nodeIndex, null, meshes);
        }
        
        return meshes;
    }

    traverseNode(gltf, buffers, nodeIndex, parentTransform, meshes) {
        const node = gltf.nodes[nodeIndex];
        
        // Get node transform (TRS: translation, rotation, scale)
        let nodeMatrix = this.getNodeMatrix(node);
        
        // Apply parent transform if exists
        if (parentTransform) {
            nodeMatrix = this.multiplyMatrices(parentTransform, nodeMatrix);
        }
        
        // If this node has a mesh, extract it
        if (node.mesh !== undefined) {
            const meshData = this.extractMeshData(gltf, buffers, node.mesh);
            if (meshData) {
                meshData.transform = nodeMatrix;
                meshData.name = node.name || `Mesh_${node.mesh}`;
                console.log(`Loaded: ${meshData.name}`);
                meshes.push(meshData);
            }
        }
        
        // Recursively process children
        if (node.children && node.children.length > 0) {
            for (let childIndex of node.children) {
                this.traverseNode(gltf, buffers, childIndex, nodeMatrix, meshes);
            }
        }
    }

    getNodeMatrix(node) {
        // Create a 4x4 identity matrix
        const matrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
        
        // If node has a matrix, use it directly
        if (node.matrix) {
            return new Float32Array(node.matrix);
        }
        
        // Otherwise, compose from translation, rotation, scale
        const translation = node.translation || [0, 0, 0];
        const rotation = node.rotation || [0, 0, 0, 1]; // quat x,y,z,w
        const scale = node.scale || [1, 1, 1];
        
        // Build matrix from TRS
        // For simplicity, this is a basic implementation
        // Convert quaternion to rotation matrix
        const [qx, qy, qz, qw] = rotation;
        const [sx, sy, sz] = scale;
        const [tx, ty, tz] = translation;
        
        // Rotation matrix from quaternion
        const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
        const xx = qx * x2, xy = qx * y2, xz = qx * z2;
        const yy = qy * y2, yz = qy * z2, zz = qz * z2;
        const wx = qw * x2, wy = qw * y2, wz = qw * z2;
        
        const result = new Float32Array(16);
        result[0] = (1 - (yy + zz)) * sx;
        result[1] = (xy + wz) * sx;
        result[2] = (xz - wy) * sx;
        result[3] = 0;
        
        result[4] = (xy - wz) * sy;
        result[5] = (1 - (xx + zz)) * sy;
        result[6] = (yz + wx) * sy;
        result[7] = 0;
        
        result[8] = (xz + wy) * sz;
        result[9] = (yz - wx) * sz;
        result[10] = (1 - (xx + yy)) * sz;
        result[11] = 0;
        
        result[12] = tx;
        result[13] = ty;
        result[14] = tz;
        result[15] = 1;
        
        return result;
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

    extractMeshData(gltf, buffers, meshIndex = 0) {
        if (!gltf.meshes || gltf.meshes.length === 0) {
            console.error('No meshes found in GLTF file');
            return null;
        }

        const mesh = gltf.meshes[meshIndex];
        if (!mesh.primitives || mesh.primitives.length === 0) {
            return null;
        }

        const primitive = mesh.primitives[0];
        
        // Get accessors for position, normal, and texCoord data
        const positions = this.getAccessorData(gltf, buffers, primitive.attributes.POSITION);
        const normals = primitive.attributes.NORMAL ? 
            this.getAccessorData(gltf, buffers, primitive.attributes.NORMAL) : null;
        const texCoords = primitive.attributes.TEXCOORD_0 ? 
            this.getAccessorData(gltf, buffers, primitive.attributes.TEXCOORD_0) : null;
        const indices = this.getAccessorData(gltf, buffers, primitive.indices);

        // Extract embedded textures
        const textures = this.extractTextures(gltf, buffers);

        return {
            positions: positions,
            normals: normals,
            texCoords: texCoords,
            indices: indices,
            material: primitive.material !== undefined ? gltf.materials[primitive.material] : null,
            textures: textures
        };
    }

    extractTextures(gltf, buffers) {
        const textures = [];
        
        if (!gltf.textures || gltf.textures.length === 0) {
            return textures;
        }

        // Extract textures from images
        for (let i = 0; i < gltf.textures.length; i++) {
            const texture = gltf.textures[i];
            const image = gltf.images[texture.source];
            
            if (image.uri && image.uri.startsWith('data:')) {
                // Create texture from embedded image data
                const textureData = this.createTextureFromDataUri(image.uri);
                textures.push(textureData);
            }
        }
        
        return textures;
    }

    createTextureFromDataUri(dataUri) {
        // Parse data URI: data:image/png;base64,<base64-data>
        const base64Match = dataUri.match(/base64,(.+)/);
        if (!base64Match) {
            return null;
        }
        
        const base64String = base64Match[1];
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Convert to blob and create object URL for image loading
        const blob = new Blob([bytes], { type: 'image/png' });
        const objectUrl = URL.createObjectURL(blob);
        
        return {
            url: objectUrl,
            blob: blob
        };
    }

    getAccessorData(gltf, buffers, accessorIndex) {
        const accessor = gltf.accessors[accessorIndex];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const buffer = buffers[bufferView.buffer];
        
        const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
        const componentType = accessor.componentType;
        const count = accessor.count;
        const type = accessor.type;
        
        const typeSize = {
            'SCALAR': 1,
            'VEC2': 2,
            'VEC3': 3,
            'VEC4': 4,
            'MAT2': 4,
            'MAT3': 9,
            'MAT4': 16
        };

        const itemSize = typeSize[type];
        const TypedArray = this.getTypedArray(componentType);
        
        const elementBytes = TypedArray.BYTES_PER_ELEMENT;
        const itemBytes = elementBytes * itemSize;
        const byteStride = bufferView.byteStride || itemBytes;
        
        if (byteStride === itemBytes) {
            // No stride, can read directly
            return new TypedArray(buffer, offset, count * itemSize);
        } else {
            // Has stride, need to copy element by element
            const array = new TypedArray(count * itemSize);
            const view = new DataView(buffer);
            let srcOffset = offset;
            for (let i = 0; i < count; i++) {
                for (let j = 0; j < itemSize; j++) {
                    array[i * itemSize + j] = this.readFromView(view, srcOffset, componentType, elementBytes);
                    srcOffset += elementBytes;
                }
                srcOffset += byteStride - itemBytes;
            }
            return array;
        }
    }

    getTypedArray(componentType) {
        switch (componentType) {
            case 5120: return Int8Array;
            case 5121: return Uint8Array;
            case 5122: return Int16Array;
            case 5123: return Uint16Array;
            case 5125: return Uint32Array;
            case 5126: return Float32Array;
            default: return Float32Array;
        }
    }

    readFromView(view, offset, componentType, elementBytes) {
        switch (componentType) {
            case 5120: return view.getInt8(offset);
            case 5121: return view.getUint8(offset);
            case 5122: return view.getInt16(offset, true);
            case 5123: return view.getUint16(offset, true);
            case 5125: return view.getUint32(offset, true);
            case 5126: return view.getFloat32(offset, true);
            default: return view.getFloat32(offset, true);
        }
    }
}
