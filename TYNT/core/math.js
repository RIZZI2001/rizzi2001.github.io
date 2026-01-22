class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    add(v) {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }
    
    subtract(v) {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }
    
    cross(v) {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
    
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    
    normalize() {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (len === 0) return this;
        return new Vec3(this.x / len, this.y / len, this.z / len);
    }
    
    scale(s) {
        return new Vec3(this.x * s, this.y * s, this.z * s);
    }
}

class Mat4 {
    constructor(data = null) {
        if (data) {
            this.data = new Float32Array(data);
        } else {
            this.data = new Float32Array(16);
        }
    }
    
    static identity() {
        const m = new Mat4();
        m.data.fill(0);
        m.data[0] = m.data[5] = m.data[10] = m.data[15] = 1;
        return m;
    }
    
    static translate(x, y, z) {
        const m = Mat4.identity();
        m.data[12] = x;
        m.data[13] = y;
        m.data[14] = z;
        return m;
    }
    
    static rotateX(angle) {
        const m = Mat4.identity();
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        m.data[5] = c;
        m.data[6] = s;
        m.data[9] = -s;
        m.data[10] = c;
        return m;
    }
    
    static rotateY(angle) {
        const m = Mat4.identity();
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        m.data[0] = c;
        m.data[2] = -s;
        m.data[8] = s;
        m.data[10] = c;
        return m;
    }
    
    static rotateZ(angle) {
        const m = Mat4.identity();
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        m.data[0] = c;
        m.data[1] = s;
        m.data[4] = -s;
        m.data[5] = c;
        return m;
    }
    
    static scale(x, y, z) {
        const m = Mat4.identity();
        m.data[0] = x;
        m.data[5] = y;
        m.data[10] = z;
        return m;
    }
    
    multiply(other) {
        const a = this.data;
        const b = other.data;
        const result = new Float32Array(16);
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] = 0;
                for (let k = 0; k < 4; k++) {
                    result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
                }
            }
        }
        
        return new Mat4(result);
    }
    
    static perspective(fov, aspect, near, far) {
        const m = new Mat4();
        m.data.fill(0);
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        
        m.data[0] = f / aspect;
        m.data[5] = f;
        m.data[10] = (far + near) * nf;
        m.data[11] = -1;
        m.data[14] = 2 * far * near * nf;
        
        return m;
    }
    
    static lookAt(eye, target, up) {
        const zaxis = eye.subtract(target).normalize();
        const xaxis = up.cross(zaxis).normalize();
        const yaxis = zaxis.cross(xaxis).normalize();
        
        const m = Mat4.identity();
        m.data[0] = xaxis.x;
        m.data[1] = yaxis.x;
        m.data[2] = zaxis.x;
        m.data[4] = xaxis.y;
        m.data[5] = yaxis.y;
        m.data[6] = zaxis.y;
        m.data[8] = xaxis.z;
        m.data[9] = yaxis.z;
        m.data[10] = zaxis.z;
        m.data[12] = -xaxis.dot(eye);
        m.data[13] = -yaxis.dot(eye);
        m.data[14] = -zaxis.dot(eye);
        
        return m;
    }
}

class Mesh {
    constructor(vertices, indices, normals) {
        this.vertices = vertices;
        this.indices = indices;
        this.normals = normals;
        this.positionBuffer = null;
        this.indexBuffer = null;
        this.vertexCount = 0;
    }
}

class GameObject {
    constructor() {
        this.position = new Vec3(0, 0, 0);
        this.rotation = new Vec3(0, 0, 0);
        this.scale = new Vec3(1, 1, 1);
        this.mesh = null;
    }
    
    getWorldMatrix() {
        // Proper matrix composition: Translate * RotateZ * RotateY * RotateX * Scale
        let matrix = Mat4.scale(this.scale.x, this.scale.y, this.scale.z);
        matrix = Mat4.rotateX(this.rotation.x).multiply(matrix);
        matrix = Mat4.rotateY(this.rotation.y).multiply(matrix);
        matrix = Mat4.rotateZ(this.rotation.z).multiply(matrix);
        matrix = Mat4.translate(this.position.x, this.position.y, this.position.z).multiply(matrix);
        
        return matrix.data;
    }
}

class Camera {
    constructor(fov, aspect, near, far, position, target, up) {
        this.fov = fov * Math.PI / 180; // Convert to radians
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.position = position;
        this.target = target;
        this.up = up;
    }
    
    getViewMatrix() {
        const m = Mat4.lookAt(this.position, this.target, this.up);
        return m.data;
    }
    
    getProjectionMatrix() {
        const m = Mat4.perspective(this.fov, this.aspect, this.near, this.far);
        return m.data;
    }
}

class DirectionalLight {
    constructor(direction, color) {
        this.direction = direction.normalize();
        this.color = color;
    }
}

class PointLight {
    constructor(position = new Vec3(0, 0, 0), color = new Vec3(1, 1, 1), range = 100) {
        this.position = position;
        this.color = color;
        this.range = range;
    }
}
