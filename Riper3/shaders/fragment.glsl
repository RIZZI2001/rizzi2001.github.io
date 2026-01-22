precision mediump float;

varying vec3 vNormal;
varying vec3 vFragPos;

uniform vec3 uAmbientColor;

uniform int uDirLightCount;
uniform vec3 uDirLightDirections[MAX_LIGHTS];
uniform vec3 uDirLightColors[MAX_LIGHTS];

uniform int uPointLightCount;
uniform vec3 uPointLightPositions[MAX_LIGHTS];
uniform vec3 uPointLightColors[MAX_LIGHTS];
uniform float uPointLightRanges[MAX_LIGHTS];

uniform float uRoughness;

void main() {
    vec3 norm = normalize(vNormal);
    vec3 ambient = uAmbientColor;
    vec3 diffuse = vec3(0.0);
    
    // Directional lights
    for(int i = 0; i < MAX_LIGHTS; i++) {
        if(i >= uDirLightCount) break;
        vec3 lightDir = normalize(uDirLightDirections[i]);
        float diff = max(dot(norm, -lightDir), 0.0);
        diff = mix(diff, diff * diff, uRoughness);
        diffuse += diff * uDirLightColors[i];
    }
    
    // Point lights
    for(int i = 0; i < MAX_LIGHTS; i++) {
        if(i >= uPointLightCount) break;
        vec3 lightDir = uPointLightPositions[i] - vFragPos;
        float dist = length(lightDir);
        if(dist > uPointLightRanges[i]) continue;
        lightDir = normalize(lightDir);
        float attenuation = 1.0 / (1.0 + dist * dist / (uPointLightRanges[i] * uPointLightRanges[i]));
        float diff = max(dot(norm, lightDir), 0.0);
        diff = mix(diff, diff * diff, uRoughness);
        diff *= attenuation;
        diffuse += diff * uPointLightColors[i];
    }
    
    vec3 result = (ambient + diffuse);
    gl_FragColor = vec4(result, 1.0);
}
