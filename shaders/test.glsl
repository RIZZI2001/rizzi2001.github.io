//Eternal Flame
//2025-08-14
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;

vec3 rotateVec3(vec3 v, float yaw, float pitch) {
  float cy = cos(yaw);
  float sy = sin(yaw);
  vec3 yawRotated = vec3(
    cy * v.x - sy * v.z,
    v.y,
    sy * v.x + cy * v.z
  );

  float cp = cos(pitch);
  float sp = sin(pitch);
  vec3 pitchRotated = vec3(
    yawRotated.x,
    cp * yawRotated.y - sp * yawRotated.z,
    sp * yawRotated.y + cp * yawRotated.z
  );

  return pitchRotated;
}

vec2 rotateVec(vec2 v, float b) {
    return vec2(cos(b) * v.x + sin(b) * v.y, cos(b) * v.y - sin(b) * v.x);
}

void main(void) {
    vec3 color = vec3(0.0);
    
    for(float c = 0.; c < 3.; c += 1.) {
      vec3 uv = vec3((gl_FragCoord.xy - resolution.xy/2.) / 300., 1.);
      float t = time / 10. + 1.;
      float ci = ((c+10.)/20.);
      for(float i = 0.; i < 5.; i += 1.) {
          vec3 v = rotateVec3(uv, t, -t*2.634 + c/10.);
      	uv = rotateVec3(vec3(dot(v, uv), cross(v, uv)), t, i * 10.);
      }
      
      // Use conditional assignment instead of array indexing
      float intensity = 1. / length(uv);
      if (c < 0.5) {
      	color.r = intensity;
      } else if (c < 1.5) {
      	color.g = intensity;
      } else {
      	color.b = intensity;
      }
    }
    
    gl_FragColor = vec4(color, 1.0);
}