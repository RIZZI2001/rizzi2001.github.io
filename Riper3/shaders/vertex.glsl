attribute vec4 aVertexPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
attribute vec3 aTangent;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

varying vec3 vNormal;
varying vec3 vFragPos;
varying vec2 vTexCoord;
varying mat3 vTBN;

void main() {
    gl_Position = uProjection * uView * uModel * aVertexPosition;
    vFragPos = vec3(uModel * aVertexPosition);
    vNormal = normalize(uNormalMatrix * aNormal);
    vTexCoord = aTexCoord;
    
    // Create TBN matrix for normal mapping using provided tangent
    vec3 N = normalize(uNormalMatrix * aNormal);
    vec3 T = normalize(uNormalMatrix * aTangent);
    vec3 B = cross(N, T);
    vTBN = mat3(T, B, N);
}
