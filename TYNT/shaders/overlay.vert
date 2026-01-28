attribute vec2 aVertexPosition;

varying vec2 vUv;

void main() {
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
    vUv = aVertexPosition * 0.5 + 0.5;
}
