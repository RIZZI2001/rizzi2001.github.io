// Rotating Halos
// 2026-09-22

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
uniform vec2 touch;

const float PI = 3.1415926;

vec3 rotateVec(vec3 v, vec2 r) {
	float cy = cos(r.x), sy = sin(r.x), cp = cos(r.y), sp = sin(r.y);
  return v * mat3(cy, -sp * sy, cp * -sy, 0.0, cp, -sp,sy, sp * cy, cp * cy);
}

vec2 normCoord(vec2 c) {
	vec2 r = resolution; return (2.*c-r)/min(r.x, r.y);
}

vec3 p2(float v) {
	//v *= 6.283185307179;
	return 0.5 + 0.5 * vec3(cos(v - 1.7), cos(v - 3.), cos(v + 1.7));
}

vec2 rayMarch(vec3 ro, vec3 rd, bool sphere) {
  float a = 0.0;

  for(int i = 0; i < 50; i++) {
    vec3 p = ro + rd * a;

    float minD = 1000.;
    // all rings
    for(float ring = 1.; ring < 10.; ring ++) {
      vec3 pr = rotateVec(p, (vec2(0., 1.3) + ring) * time / 10.);
      float dt = length(vec2(length(pr.yz) - 1. - ring / 10., pr.x)) - .03;
      if(dt < 0.01) return vec2(a, ring);
      if(dt < minD) minD = dt;
    }

    if(sphere) {
      float ds = length(p) - 1.;
      if(ds < 0.01) return vec2(a, 0.);
      if(ds < minD) minD = ds;
    }
    a += minD;

    if(a > 100.0) {return vec2(-1.);}
  }
}

const vec3 light = normalize(vec3(1., 5., -3.));

void main(void){
  vec2 uv = normCoord(gl_FragCoord.xy) * .5;

  vec3 ro = vec3(0., 0., -5.);
  vec3 rd = normalize(vec3(uv, 1.));

  vec2 hit = rayMarch(ro, rd, true);

  if(hit.x > 0.0) {
    vec3 p = ro + rd * hit.x;
    if(hit.y < .5) {
      gl_FragColor += vec4(.4) * dot(p, light);
      rd = reflect(rd, p);
      ro = p * 1.;
      hit = rayMarch(ro, rd, false);
      if(hit.y > .5) gl_FragColor.rgb += p2(hit.y) * .3;
    } else {
    	gl_FragColor.rgb += p2(hit.y);
    }
  } else {
  	gl_FragColor += .1 / length(uv);
  }
}