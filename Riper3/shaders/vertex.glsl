attribute vec4 aVertexPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

varying vec3 vNormal;
varying vec3 vFragPos;

void main() {
    gl_Position = uProjection * uView * uModel * aVertexPosition;
    vFragPos = vec3(uModel * aVertexPosition);
    vNormal = normalize(uNormalMatrix * aNormal);
}
