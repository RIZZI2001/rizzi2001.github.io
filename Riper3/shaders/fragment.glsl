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
uniform vec3 uCameraPos;
uniform float uSpecularStrength;

void main() {
    vec3 norm = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPos - vFragPos);
    vec3 ambient = uAmbientColor;
    vec3 diffuse = vec3(0.0);
    vec3 specular = vec3(0.0);
    
    // Directional lights
    for(int i = 0; i < MAX_LIGHTS; i++) {
        if(i >= uDirLightCount) break;
        vec3 lightDir = normalize(uDirLightDirections[i]);
        float diff = max(dot(norm, -lightDir), 0.0);
        diff = mix(0.0, diff, uRoughness);
        diffuse += diff * uDirLightColors[i];
        
        // Specular lighting
        vec3 reflectDir = reflect(lightDir, norm);
        float shininess = mix(256.0, 4.0, uRoughness);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
        specular += spec * uSpecularStrength * uDirLightColors[i];
    }
    
    // Point lights
    for(int i = 0; i < MAX_LIGHTS; i++) {
        if(i >= uPointLightCount) break;
        vec3 lightDir = uPointLightPositions[i] - vFragPos;
        float dist = length(lightDir);
        if(dist > uPointLightRanges[i]) continue;
        lightDir = lightDir / dist;
        float attenuation = 1.0 / (1.0 + dist * dist / (uPointLightRanges[i] * uPointLightRanges[i]));
        float diff = max(dot(norm, lightDir), 0.0);
        diff = mix(0.0, diff, uRoughness) * attenuation;
        diffuse += diff * uPointLightColors[i];
        
        // Specular lighting
        vec3 reflectDir = reflect(-lightDir, norm);
        float shininess = mix(256.0, 4.0, uRoughness);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
        spec *= attenuation;
        specular += spec * uSpecularStrength * uPointLightColors[i];
    }
    
    vec3 result = (ambient + diffuse + specular);
    gl_FragColor = vec4(result, 1.0);
}
