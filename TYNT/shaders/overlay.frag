precision mediump float;

uniform vec3 uLights[10];
uniform vec3 uLightColors[10];
uniform int uLightCount;
uniform mat4 uProjection;
uniform float uAspectRatio;
uniform sampler2D uDepthTexture;

varying vec2 vUv;

void main() {
    vec3 color = vec3(0.0);
    
    for (int i = 0; i < 10; i++) {
        if (i >= uLightCount) break;
        
        vec3 lightPos = uLights[i];
        vec3 lightCol = uLightColors[i];
        float lightDist = length(lightPos);
        
        if (lightPos.z >= 0.0) continue;
        
        // Project to screen space
        vec4 projected = uProjection * vec4(lightPos, 1.0);
        projected.xy /= projected.w;
        vec2 screenPos = projected.xy * 0.5 + 0.5;

        if (screenPos.x < 0.0 || screenPos.x > 1.0 || screenPos.y < 0.0 || screenPos.y > 1.0) continue;
        
        // Sample scene depth at light position
        float sceneDepth = texture2D(uDepthTexture, screenPos).r;
        
        // Calculate light depth
        vec4 lightClip = uProjection * vec4(lightPos, 1.0);
        float lightDepth = lightClip.z / lightClip.w * 0.5 + 0.5;
        
        if (lightDepth > sceneDepth) continue;
        
        // Distance from fragment to light on screen
        vec2 uvDiff = vUv - screenPos;
        uvDiff.x *= uAspectRatio;
        float screenDist = length(uvDiff);
        
        float radius = 0.3 / lightDist;
        
        if (screenDist < radius) {
            float brightness = (1.0 - screenDist / radius);
            color += lightCol * brightness;
        }
    }
    
    gl_FragColor = vec4(color, 1.0);
}
