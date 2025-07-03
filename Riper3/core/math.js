class Mat4 {
    // Create a 4x4 identity matrix
    static identity() {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }

    // Create perspective projection matrix
    static perspective(fov, aspect, near, far) {
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fov * Math.PI / 180);
        const rangeInv = 1.0 / (near - far);

        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ];
    }

    // Create translation matrix
    static translation(tx, ty, tz) {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            tx, ty, tz, 1
        ];
    }

    // Create rotation matrix around X axis
    static rotationX(angleInRadians) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);

        return [
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1
        ];
    }

    // Create rotation matrix around Y axis
    static rotationY(angleInRadians) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);

        return [
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        ];
    }

    // Create rotation matrix around Z axis
    static rotationZ(angleInRadians) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);

        return [
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }

    // Create scaling matrix
    static scaling(sx, sy, sz) {
        return [
            sx, 0, 0, 0,
            0, sy, 0, 0,
            0, 0, sz, 0,
            0, 0, 0, 1
        ];
    }

    // Multiply two 4x4 matrices
    static multiply(a, b) {
        const result = new Array(16);
        
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

    // Create view matrix (camera transform)
    static lookAt(eye, target, up) {
        const zAxis = Vec3.normalize(Vec3.subtract(eye, target));
        const xAxis = Vec3.normalize(Vec3.cross(up, zAxis));
        const yAxis = Vec3.normalize(Vec3.cross(zAxis, xAxis));

        return [
            xAxis[0], yAxis[0], zAxis[0], 0,
            xAxis[1], yAxis[1], zAxis[1], 0,
            xAxis[2], yAxis[2], zAxis[2], 0,
            -Vec3.dot(xAxis, eye), -Vec3.dot(yAxis, eye), -Vec3.dot(zAxis, eye), 1
        ];
    }
}

class Vec3 {
    static subtract(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    static cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    static dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    static normalize(v) {
        const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        if (length > 0.00001) {
            return [v[0] / length, v[1] / length, v[2] / length];
        }
        return [0, 0, 0];
    }
}
