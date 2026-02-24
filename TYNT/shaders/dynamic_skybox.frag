#version 100
precision mediump float;

uniform vec2 resolution;
uniform float uFOV;
uniform float uDaytime;
uniform vec3 uViewDir;
uniform float uMoonSize;
uniform float uTilt;
const float PI = 3.1415926;

vec3 rotateVec3(vec3 v, float yaw, float pitch, float roll) {
  float cy = cos(yaw);
  float sy = sin(yaw);
  float cp = cos(pitch);
  float sp = sin(pitch);
  float cr = cos(roll);
  float sr = sin(roll);
  vec3 prv = vec3(
    v.x,
    cp * v.y - sp * v.z,
    sp * v.y + cp * v.z
  );
  vec3 yrv = vec3(
    cy * prv.x - sy * prv.z,
    prv.y,
    sy * prv.x + cy * prv.z
  );
  vec3 rrv = vec3(
    cr * yrv.x + sr * yrv.y,
    -sr * yrv.x + cr * yrv.y,
    yrv.z
  );
  return rrv;
}

float rand(vec3 n) {return fract(sin(dot(n, vec3(12.9898, 4.1414, 7.8931))) * 43758.5453);}
float noize3d(vec3 pos) {
  return
  mix(
    mix(
      mix(rand(floor(pos)),rand(vec3(ceil(pos.x), floor(pos.yz))),fract(pos.x)),
      mix(rand(vec3(floor(pos.x), ceil(pos.y), floor(pos.z))),rand(vec3(ceil(pos.xy), floor(pos.z))),fract(pos.x)),
      fract(pos.y)
    ), mix(
      mix(rand(vec3(floor(pos.xy), ceil(pos.z))),rand(vec3(ceil(pos.x), floor(pos.y), ceil(pos.z))),fract(pos.x)),
      mix(rand(vec3(floor(pos.x), ceil(pos.yz))),rand(vec3(ceil(pos))),fract(pos.x)),
      fract(pos.y)
    ),
    fract(pos.z)
  );
}

const int octaves = 3;
const float lacunarity = 0.5;
const float persistance = 0.5;
float layeredNoize3d(vec3 pos) {
  pos = rotateVec3(pos, 2.4, 1.7, 0.);
  float layered = 0.0;
  for(int layer = 1; layer <= octaves; layer ++) {
    layered += noize3d(pos) * pow(persistance, float(layer));
    pos = rotateVec3(pos/lacunarity, 2.4, 1.7, 0.);
  }
  return layered;
}

vec3 gradient(float t, float y, float x) {
  vec3 baseColor = vec3(0.2, 0.35, 0.6) * max(-cos(t) + 0.6, 0.);
  baseColor += baseColor * pow(y, 2.);
  baseColor += max(0., (-x * 0.5 + 0.5) * sin(t) * 4. -3.) * y * vec3(0.5, 0.1, 0.2);
  baseColor += max(0., (x * 0.5 + 0.5) * sin(t+PI) * 2. -1.) * y * vec3(1., 0.4, 0.1);
  return baseColor;
}

vec3 moon(vec3 camSpDir, float daytime) {
  float moontime = daytime * (32. / 31.);
  vec3 rCSDM = rotateVec3(camSpDir, moontime, uTilt, 0.);
  if(rCSDM.z < 0.99) return vec3(0.);
  float sma = mod(daytime - moontime, 2. * PI) + PI;
  vec3 smv = vec3(-sin(sma), 0., cos(sma));
  vec3 mc = vec3(rCSDM.xy * uMoonSize, sqrt(1. - pow(length(rCSDM.xy * uMoonSize), 2.)));
  float d = length(mc.xy);
  float flare = max(0., 0.6 / d - 0.4) * step(1., d) * max(0., smv.z);
  vec3 moonTexture = vec3(clamp(noize3d(mc * 5.) * 0.5 + 0.3, 0.3, 0.6));
  return max(0., dot(smv, mc)) * moonTexture + flare;
}

void main(void) {
  vec2 r12 = resolution/2.;
  
  // Build orthonormal basis from view direction
  vec3 forward = normalize(uViewDir);
  vec3 right = normalize(cross(forward, vec3(0., 1., 0.)));
  vec3 up = cross(right, forward);
  
  vec2 screenCoord = (gl_FragCoord.xy - r12) / r12.y;
  
  // Apply FOV tangent to get ray direction
  vec3 camSpDir = normalize(forward + right * screenCoord.x * uFOV + up * screenCoord.y * uFOV);

  //Horizon mirror
  bool belowHorizon = false;
  if(camSpDir.y < 0.){
    belowHorizon = true;
    camSpDir.y = -camSpDir.y;
  }
  gl_FragColor = vec4(gradient(uDaytime + PI, 1. -camSpDir.y, camSpDir.x), 1.0);

  //Clouds
  vec3 extended = camSpDir / camSpDir.y + vec3(uDaytime * 0.02, 0, 0);
  float a = clamp((noize3d(extended / 4.) - 0.2) * 5., 0., 1.);
  gl_FragColor.rgb *= mix(1., 0.5 + layeredNoize3d(extended), a);

  //Sun
  vec3 rCSD = rotateVec3(camSpDir, uDaytime, uTilt, 0.);
  float sunAngle = acos(dot(vec3(0., 0., 1.), rCSD));
  gl_FragColor.rgb += vec3(max(0., rCSD.z) * min(1., 0.03 / sunAngle - 0.02));

  //Moon
  gl_FragColor.rgb += moon(camSpDir, uDaytime);

  //Stars
  gl_FragColor.rgb += vec3(1.0) * max(0., (0.5 - cos(uDaytime)) * step(0.95, noize3d(rCSD * 200.)));

  //Horizon darker
  if(belowHorizon){
    gl_FragColor.rgb *= 0.5;
  }
}