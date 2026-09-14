// Green Storm
// 2026-08-30
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;

const float PI = 3.1415926;
const float E = 2.7182818;

float tanh(float x) {
	return 1. - 2./(pow(E, 2. * x) + 1.);
}

vec4 tanh(vec4 x) {
	return vec4(tanh(x.x), tanh(x.y), tanh(x.z), tanh(x.w));
}

vec4 getC(vec3 rd) {
	float rayDistance = 0.0;
  vec4 color = vec4(0.0);
  float t = time * 0.1;

  for (int outerStep = 0; outerStep < 40; outerStep++){
    vec3 samplePoint = rd * rayDistance;
    vec3 warpedPoint = samplePoint;

    float radius = length(samplePoint + vec3(0., 0., 7.));

    for (float innerStep = 1.; innerStep <= 9.; innerStep++){
      vec3 wave = sin(warpedPoint * innerStep - time);
      warpedPoint += wave.yzx / innerStep;
    }

    radius -= 4.0;

    vec3 rotatedWarp = warpedPoint.yzx;
    vec3 modulation = sin(rotatedWarp / 3.0 + vec3(t));
    vec3 fieldXYZ = sin(vec3(2.0 * radius - 10.0 * t) + warpedPoint * modulation) + vec3(0.9);
    float fieldW = min(radius, -10.0 * radius) * 0.4;

    float fieldStrength = length(vec4(fieldXYZ, fieldW)) * 0.1;

    rayDistance += fieldStrength;

    color += vec4(0.2 / fieldStrength , 9., 2., 1.) / fieldStrength;
  }
  return color;
}

void main(void) {
	  vec3 rd = normalize(vec3((gl_FragCoord.xy - resolution * 0.5) / 200., -1.));
    vec4 color = getC(rd);
    gl_FragColor = tanh(color / 8000.0);
}