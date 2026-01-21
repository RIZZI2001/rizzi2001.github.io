precision mediump float;

varying vec3 vNormal;
varying vec3 vFragPos;

// Ambient light
uniform vec3 uAmbientColor;
uniform float uAmbientStrength;

// Directional lights (supports up to 4 lights)
uniform int uLightCount;
uniform vec3 uLightPositions[4];
uniform vec3 uLightDirections[4];
uniform vec3 uLightColors[4];
uniform float uRoughness;

void main() {
    vec3 norm = normalize(vNormal);
    
    // Ambient lighting
    vec3 ambient = uAmbientColor * uAmbientStrength;
    
    // Diffuse (rough) lighting
    vec3 diffuse = vec3(0.0);
    
    for(int i = 0; i < 4; i++) {
        if(i >= uLightCount) break;
        
        // Light direction (normalized)
        vec3 lightDir = normalize(uLightDirections[i]);
        
        // Diffuse strength based on normal and light direction
        float diff = max(dot(norm, -lightDir), 0.0);
        
        // Apply roughness (roughness reduces the sharpness of highlights)
        diff = mix(diff, diff * diff, uRoughness);
        
        diffuse += diff * uLightColors[i];
    }
    
    vec3 result = (ambient + diffuse);
    gl_FragColor = vec4(result, 1.0);
}
