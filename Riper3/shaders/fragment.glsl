precision mediump float;

varying vec3 vNormal;
varying vec3 vFragPos;

// Ambient light
uniform vec3 uAmbientColor;
uniform float uAmbientStrength;

// Directional lights (supports up to 2 lights)
uniform int uDirLightCount;
uniform vec3 uDirLightPositions[2];
uniform vec3 uDirLightDirections[2];
uniform vec3 uDirLightColors[2];
uniform float uDirLightRanges[2];

// Point lights / Sphere lights (supports up to 2 lights)
uniform int uPointLightCount;
uniform vec3 uPointLightPositions[2];
uniform vec3 uPointLightColors[2];
uniform float uPointLightRanges[2];
uniform float uPointLightIntensities[2];

uniform float uRoughness;

void main() {
    vec3 norm = normalize(vNormal);
    
    // Ambient lighting
    vec3 ambient = uAmbientColor * uAmbientStrength;
    
    // Diffuse (rough) lighting
    vec3 diffuse = vec3(0.0);
    
    // Directional lights
    for(int i = 0; i < 2; i++) {
        if(i >= uDirLightCount) break;
        
        // Light direction (normalized)
        vec3 lightDir = normalize(uDirLightDirections[i]);
        
        // Distance check
        float dist = length(uDirLightPositions[i] - vFragPos);
        if(dist > uDirLightRanges[i]) continue;
        
        // Diffuse strength based on normal and light direction
        float diff = max(dot(norm, -lightDir), 0.0);
        
        // Apply roughness
        diff = mix(diff, diff * diff, uRoughness);
        
        diffuse += diff * uDirLightColors[i];
    }
    
    // Point lights (sphere lights)
    for(int i = 0; i < 2; i++) {
        if(i >= uPointLightCount) break;
        
        // Light direction from fragment to light source
        vec3 lightDir = uPointLightPositions[i] - vFragPos;
        float dist = length(lightDir);
        
        // Range check
        if(dist > uPointLightRanges[i]) continue;
        
        // Normalize light direction
        lightDir = normalize(lightDir);
        
        // Distance attenuation (quadratic falloff)
        float attenuation = 1.0 / (1.0 + dist * dist / (uPointLightRanges[i] * uPointLightRanges[i]));
        
        // Diffuse strength based on normal and light direction
        float diff = max(dot(norm, lightDir), 0.0);
        
        // Apply roughness
        diff = mix(diff, diff * diff, uRoughness);
        
        // Apply attenuation and intensity
        diff *= attenuation * uPointLightIntensities[i];
        
        diffuse += diff * uPointLightColors[i];
    }
    
    vec3 result = (ambient + diffuse);
    gl_FragColor = vec4(result, 1.0);
}
