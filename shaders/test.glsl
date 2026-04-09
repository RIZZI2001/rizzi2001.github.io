// Sea of spheres
// 2026-04-10
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

vec2 obj(vec3 p) {
  p.z += cos(20. + floor(p.x + 0.0001));

  float type = mod(floor(p.z + 0.0001), 2.00001);
  p.xz = mod(p.xz, 1.0001);
  return vec2(length(p - vec3(0.5, -10.0, 0.5)) - 0.5, type);
}

vec3 getNormal(vec3 p)
{
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0.0);
    vec3 n = vec3(
        obj(p + h.xyy).x - obj(p - h.xyy).x,
        obj(p + h.yxy).x - obj(p - h.yxy).x,
        obj(p + h.yyx).x - obj(p - h.yyx).x
    );
    return normalize(n);
}

vec3 refractRay(vec3 ray,vec3 nv,float eta)
{
    float cosTheta = dot(-ray, nv);
    if (cosTheta < 0.0) {
        cosTheta = 0.0;
    }
    float sin2Theta = 1.0 - cosTheta * cosTheta;
    float k = 1.0 - eta * eta * sin2Theta;
    if (k < 0.0) {
        return reflect(ray, nv);
    }
    return normalize(eta * ray + (eta * cosTheta - sqrt(k)) * nv);
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

vec3 background(vec3 rd) {
	if(rd.y < 0.) {
		rd /= rd.y;
    rd *= 10.0;
		vec3 rd2 = fract(rd) - 0.5;
		vec3 col;
		col += vec3(0.6, 0.1, 0.9) * ((1./abs(rd2.x) + 1./abs(rd2.z)) * 0.2) / length(rd.xz);
		col += vec3(0.6, 0.1, 0.9) * max(0., 2.5 - length(rd.xz));
		return col;
	}
  return vec3(1., 0., 0.5) * rd.x + vec3(0., 0.3, 0.5) * rd.z + pow(noize3d(rd * 200.) * 1.05, 20.);
}

vec3 bacekground(vec3 rd) {
  return vec3(0.); //rd;
}

vec3 rayMarch(vec3 ro, vec3 rd, int _i, float eta) {
    float tg = 0.0;
    int i = 0;
    vec3 p;
    bool air = true;
    float innerDist = 0.;
    vec3 entryPoint;
    vec2 info;

    for (int a = 0; a < 1000; a++) {
      if(i >= _i) break;
        for (int b = 0; b < 1000; b++) {
          if(i >= _i) break;
            p = ro + rd * tg;
            info = obj(p);
            float d = info.x;
            if (abs(d) < 0.01) {
                break;
            }
            float stepSize = air ? d : -d;
            tg += max(0.001, stepSize * 0.5);
            if (tg > 50.0) break;
            i++;
        }
        if (tg > 50.0 || i >= _i) break;
        vec3 nv = getNormal(p);
        if(air) {
          eta = 1. / eta;
        } else {
          nv = - nv;
        }
        if(info.y < 1.0 && abs(dot(nv, rd)) > rand(gl_FragCoord.xy * fract(time + eta))) {
          rd = refractRay(rd, nv, eta);
          if (dot(rd, nv) < 0.01) {
            if(air) {
              entryPoint = p;
            } else {
              innerDist += distance(entryPoint, p);
            }
            air = !air;
          }
        } else {
          rd = reflect(rd, nv);
        }
        ro = p;
        tg = 0.1;
    }
    return background(rd) - innerDist * 0.3;
}

vec2 normCoord(vec2 c) {
  return (c - resolution / 2.)/ resolution.x * 1.;
}

void main(void){
    vec2 uv = normCoord(gl_FragCoord.xy);

    // Camera
    vec2 to = normCoord(touch) * 5.;
    vec3 ro = rotateVec(vec3(0.0), -to.x, -to.y);

    // Yaw (left/right)
    mat3 rotY = mat3(
        cos(-to.x), 0.0, sin(-to.x),
        0.0, 1.0, 0.0,
       -sin(-to.x), 0.0, cos(-to.x)
    );

    // Pitch (up/down)
    mat3 rotX = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(to.y), -sin(to.y),
        0.0, sin(to.y), cos(to.y)
    );

    // Combine rotations: Yaw then Pitch
    mat3 rot = rotY * rotX;

    // Ray
    vec3 rd = normalize(vec3(uv, 1.5));
    rd = rot * rd;
    float eta = 1.5;
    gl_FragColor = texture2D(backbuffer, gl_FragCoord.xy / resolution.xy) * 0.95 + 0.05 * vec4(rayMarch(ro, rd, 1000, eta), 1.0);
}