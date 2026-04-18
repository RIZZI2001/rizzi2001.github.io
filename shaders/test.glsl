// Pillars
// 2026-04-17
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
uniform vec2 touch;
uniform sampler2D backbuffer;

const float PI = 3.1415926;

float rand(vec2 n) {return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);}

vec3 rotateVec(vec3 v, float yaw, float pitch) {
  float cy = cos(yaw);
  float sy = sin(yaw);
  float cp = cos(pitch);
  float sp = sin(pitch);

  vec3 pR = vec3(
    v.x,
    cp * v.y - sp * v.z,
    sp * v.y + cp * v.z
  );

  vec3 yR = vec3(
    cy * pR.x - sy * pR.z,
    pR.y,
    sy * pR.x + cy * pR.z
  );

  return yR;
}

float sdBox( vec3 p, vec3 b ) {
	vec3 q = abs(p) - b;
	return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float obj(vec3 p) {
	vec2 globe = p.xz - vec2(0., time);
	p.y += dot(globe, globe) * 0.04;
	vec3 seed = vec3(rand(floor(p.xz)), rand(floor(p.xz)), rand(floor(p.zx)));
	p.xz = fract(p.xz);
	p.xz -= 0.5;
	return min(
		sdBox(p, (seed*0.5+0.5) * vec3(0.2, 6., 0.2)),
		p.y
	);
}

vec3 getNormal(vec3 p)
{
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0.0);
    vec3 n = vec3(
        obj(p + h.xyy) - obj(p - h.xyy),
        obj(p + h.yxy) - obj(p - h.yxy),
        obj(p + h.yyx) - obj(p - h.yyx)
    );
    return normalize(n);
}

vec3 background(vec3 rd) {
	return vec3(0.3, 0.3, 0.7) * (1. - rd.y);
}

vec3 rayMarch(vec3 ro, vec3 rd, int _i, vec3 light) {
    float tg = 0.0;
    int i = 0;
    vec3 p;
    vec3 hitPoint;
    bool hit = false;
    float lightIntensity;
    float shadow = -1.;
    vec3 nv;

    for (int a = 0; a < 1000; a++) {
        if(i >= _i) break;
        p = ro + rd * tg;
        float d = obj(p);
        if (abs(d) < 0.001) {
      	if(!hit) {
      		//First hit.
      		hit = true;
          hitPoint = p;
          nv = getNormal(p);
          rd = normalize(light - p);
          lightIntensity = max(0., dot(nv, rd));
          ro = p;
          tg = 0.01;
          d = 0.;
      	} else {
          //Second hit. Calculate shadow
          shadow = 1. / (1. + distance(p, hitPoint));
          break;
        }
      }
      tg += min(max(0.001, d * 0.8), 0.3);
      if (tg > 50.0) break;
      i++;
    }
    if(hit) {
    	nv = abs(nv);
    	if(shadow == -1.) {
    		return vec3(1.) * lightIntensity;
    	} else {
    		return vec3(1.) * (lightIntensity - shadow);
    	}
    } else {
    	return background(rd);
    }
}

vec2 normCoord(vec2 c) {
	return (c - resolution / 2.)/ min(resolution.x, resolution.y) * 2.;
}

void main(void){
    vec2 uv = normCoord(gl_FragCoord.xy);
    float t = 0.1 * time;
    vec3 light = 30. * vec3(sin(t), 1., cos(t));

    // Camera
    vec2 to = normCoord(touch) * 3.;
    vec3 ro = vec3(0., 5. + sin(t) * 4., time);//rotateVec(vec3(0.0, 0.0, -2.5), -to.x, -to.y);

    mat3 rotY = mat3(
        cos(-to.x), 0.0, sin(-to.x),
        0.0, 1.0, 0.0,
       -sin(-to.x), 0.0, cos(-to.x)
    );
    mat3 rotX = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(to.y), -sin(to.y),
        0.0, sin(to.y), cos(to.y)
    );

    // Combine rotations
    mat3 rot = rotY * rotX;

    // Ray
    vec3 rd = normalize(vec3(uv, 1.5));
    rd = rot * rd;
    gl_FragColor = vec4(rayMarch(ro, rd, 200, light), 1.0);
}