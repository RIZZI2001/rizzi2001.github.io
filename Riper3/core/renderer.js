
class WebGLRenderer {
    constructor() {
        this.canvas = document.getElementById('glCanvas');
        this.gl = this.canvas.getContext('webgl');
        this.shaderProgram = null;
        this.buffers = {};
        this.vertexShaderSource = null;
        this.fragmentShaderSource = null;
        
        (async () => {
            this.vertexShaderSource = await (await fetch('../shaders/vertex.glsl')).text();
            this.fragmentShaderSource = await (await fetch('../shaders/fragment.glsl')).text();

            this.resizeCanvas();

            function compileShaderSource(t, type) {
                let source, shader;
                if (type === 'vertex') {
                    source = t.vertexShaderSource;
                    shader = t.gl.createShader(t.gl.VERTEX_SHADER);
                } else {
                    source = t.fragmentShaderSource;
                    shader = t.gl.createShader(t.gl.FRAGMENT_SHADER);
                }
                t.gl.shaderSource(shader, source);
                t.gl.compileShader(shader);
                
                t.gl.attachShader(t.shaderProgram, shader);
            }
            
            this.shaderProgram = this.gl.createProgram();
            compileShaderSource(this, 'vertex')
            compileShaderSource(this, 'fragment');
            this.gl.linkProgram(this.shaderProgram);
            
            this.programInfo = {
                attribLocations: {
                    vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
                }
            };
            const positions = [
                0.0,  0.5, 0.0,  // Top vertex
                -0.5, -0.5, 0.0,  // Bottom left vertex
                0.5, -0.5, 0.0   // Bottom right vertex
            ];

            this.buffers.position = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

            this.gl.clearColor(0.1, 0.1, 0.2, 1.0);
            this.gl.enable(this.gl.DEPTH_TEST);
            window.addEventListener('resize', () => {
                this.resizeCanvas();
            });
            this.render();
        })();
    }
    
    resizeCanvas() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            
            if (this.gl) {
                this.gl.viewport(0, 0, displayWidth, displayHeight);
            }
        }
    }
    
    drawTriangle() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
        this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition,3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }
    
    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.shaderProgram);
        this.drawTriangle();
        requestAnimationFrame(() => this.render());
    }
}

window.addEventListener('load', () => {
    new WebGLRenderer();
});