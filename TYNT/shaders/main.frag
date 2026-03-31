precision mediump float;

varying vec3 vNormal;
varying vec3 vFragPos;
varying vec2 vTexCoord;

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
uniform sampler2D uTexture;
uniform sampler2D uMERTexture;
uniform bool uHasMERTexture;

void main() {
    // Use vertex normal directly (no normal map required)
    vec3 norm = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPos - vFragPos);
    vec3 ambient = uAmbientColor;
    vec3 diffuse = vec3(0.0);
    vec3 specular = vec3(0.0);
    
    // Load material properties from MER texture if available
    float metallicness = 0.0;
    float roughness = uRoughness;
    float emission = 0.0;
    if (uHasMERTexture) {
        vec4 merSample = texture2D(uMERTexture, vTexCoord);
        // R: Metallicness
        // G: Emission
        // B: Roughness
        metallicness = merSample.r;
        emission = merSample.g;
        roughness = merSample.b;
    }
    
    // Directional lights
    for(int i = 0; i < MAX_LIGHTS; i++) {
        if(i >= uDirLightCount) break;
        vec3 lightDir = normalize(uDirLightDirections[i]);
        float diff = max(dot(norm, -lightDir), 0.0);
        
        // Blend between diffuse and metallic based on metallicness
        // Metals have very low diffuse and high specular
        diffuse += diff * (1.0 - metallicness * 0.8) * uDirLightColors[i];
        
        // Specular lighting
        // Roughness reduces specular strength, but shininess controls highlight size
        vec3 reflectDir = reflect(lightDir, norm);
        float shininess = mix(256.0, 4.0, roughness);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
        // Increase specular strength for metals, reduce for rough surfaces
        float specMultiplier = mix(1.0, 2.0, metallicness);
        float roughnessMultiplier = 1.0 - roughness; // Roughness reduces specular
        specular += spec * uSpecularStrength * specMultiplier * roughnessMultiplier * uDirLightColors[i];
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
        
        // Blend between diffuse and metallic based on metallicness
        diffuse += diff * (1.0 - metallicness * 0.8) * uPointLightColors[i] * attenuation;
        
        // Specular lighting
        vec3 reflectDir = reflect(-lightDir, norm);
        float shininess = mix(256.0, 4.0, roughness);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
        float specMultiplier = mix(1.0, 2.0, metallicness);
        float roughnessMultiplier = 1.0 - roughness; // Roughness reduces specular
        spec *= attenuation;
        specular += spec * uSpecularStrength * specMultiplier * roughnessMultiplier * uPointLightColors[i];
    }
    
    vec3 result = (ambient * (1.0 - metallicness * 0.8) + diffuse + specular);
    vec4 texColor = texture2D(uTexture, vTexCoord);
    result *= texColor.rgb;
    
    // Add emission
    result += texColor.rgb * emission;
    
    gl_FragColor = vec4(result, 1.0);
}
