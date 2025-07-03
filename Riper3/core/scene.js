class Scene {
    constructor() {
        this.objects = [];
        this.camera = {
            position: [0, 0, 5],
            rotation: [0, 0, 0],
            fov: 75,
            near: 0.1,
            far: 1000
        };
    }

    addObject(object) {
        this.objects.push(object);
    }

    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }

    getObjects() {
        return this.objects;
    }

    getCamera() {
        return this.camera;
    }
}

// Basic 3D object class
class Object3D {
    constructor(vertices, indices = null) {
        this.vertices = vertices; // Array of vertex data [x,y,z, x,y,z, ...]
        this.indices = indices;   // Optional indices for indexed drawing
        this.position = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.scale = [1, 1, 1];
        this.color = [1, 1, 1, 1]; // RGBA
    }

    setPosition(x, y, z) {
        this.position = [x, y, z];
    }

    setRotation(x, y, z) {
        this.rotation = [x, y, z];
    }

    setScale(x, y, z) {
        this.scale = [x, y, z];
    }

    setColor(r, g, b, a = 1) {
        this.color = [r, g, b, a];
    }
}
