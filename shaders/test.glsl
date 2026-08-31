// Marching CubeLights
// 2026-08-30
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
uniform vec2 touch;
uniform sampler2D Stone;
uniform int frame;
uniform sampler2D backbuffer;

const float PI = 3.1415926;
const float FOV = 0.8;
const float camDist = 30.;
const vec3 cube = vec3(15.);
const float lightCount = 10.;
const float spd = 5.;
const float brightnessLvls = 100.;

float rand(vec2 n) {return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);}
float rand(vec3 n) {return fract(sin(dot(n, vec3(12.9898, 4.1414, 7.8931))) * 43758.5453);}

vec4 gradient(float x) {
	x = 1. - x;
	float r = cos(x * 1.7);
	float g = cos(x * 3. + 0.5);
	float b = sin(x - 0.4);
	return vec4(r, g, b, 0.);
}

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
  ) * 2. - 1.;
}

const int octaves = 3;
const float persistance = 0.5;
const float lacunarity = 0.5;

float layeredNoize3d(vec3 pos) {
	pos = rotateVec(pos, 2.4, 1.7);
	float layered = 0.0;
	for(int layer = 1; layer <= octaves; layer ++) {
    layered += noize3d(pos) * pow(persistance, float(layer));
    pos = rotateVec(pos/lacunarity, 2.4, 1.7);
	}
	return layered;
}

vec2 normCoord(vec2 c) {
	return (c - resolution / 2.)/ min(resolution.x, resolution.y) * 2.;
}

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

vec3 hash31(float p) {
	vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec4 BB(vec2 screen) {
	return texture2D(backbuffer, (screen + 0.1) / resolution);
}

vec3 readPos(vec2 screen) {
	return floor(BB(screen).xyz * 256. - 128.);
}

void writePos(vec3 pos) {
	gl_FragColor = vec4((pos + 128.5) / 256., 0.);
}

float rnd(float a) {
	return floor(a + 0.5);
}

vec2 posToMatrix(vec3 pos) {
	pos += cube;
	return vec2(pos.x, pos.y + (pos.z * cube.y * 2.) + 1.);
}

vec3 matrixToPos(vec2 matrix) {
	float y = matrix.y -1.;
	return vec3(matrix.x, mod(y, cube.y * 2.), floor(y / (cube.y * 2.))) - cube;
}

float hitCubeZ(vec3 ro, vec3 rd, vec3 c) {
	float a = (c.z - ro.z) / rd.z;
	vec3 p = ro + rd * a;
	if(abs(p.x) < c.x && abs(p.y) < c.y) {
		return a;
	}
  return -1.;
}

vec2 updateS(vec3 ro, vec3 rd, vec2 c, float z, vec2 s) {
	float a = hitCubeZ(ro, rd, vec3(c, z));
  if(a > s.x) {s.y = s.x; s.x = a;}
  else if(a > s.y) {s.y = a;}
  return s;
}

vec2 getCubeInOut(vec3 ro, vec3 rd, vec3 c) {
  vec2 s = vec2(-1.);
  s = updateS(ro.xyz, rd.xyz, c.xy, c.z, s);
  s = updateS(ro.xyz, rd.xyz, c.xy, -c.z, s);
  s = updateS(ro.yzx, rd.yzx, c.yz, c.x, s);
  s = updateS(ro.yzx, rd.yzx, c.yz, -c.x, s);
  s = updateS(ro.zxy, rd.zxy, c.zx, c.y, s);
  s = updateS(ro.zxy, rd.zxy, c.zx, -c.y, s);
  return s;
}

float obj(vec3 p, vec3 rd) {
	vec3 p2 = ceil(abs(floor(p) + 0.5)) - cube.xyz;
	float maxiDist = max(p2.x, max(p2.y, p2.z));
	if(maxiDist > 0.) {
		return maxiDist;
	}
	float b = BB(posToMatrix(floor(p))).w;
	if(b > 0.) {
		vec2 s = getCubeInOut(p - (floor(p) + 0.5), rd, vec3(0.5 * b));
		if(s.x > -1.) {
			gl_FragColor = gradient(b);
			return -1.;
		}
	}
	return 0.;
}

float gridMarch(vec3 ro, vec3 rd) {
	vec3 ta;
	float m;
	float s = 0.001;
	vec3 p = ro;

	for(int i = 0; i < 80; i ++) {
		// find next planes in xyz
		vec3 nx_planes = floor(p) + max(vec3(0.), sign(rd));
		// find additional vector lengths to reach them
		ta = (nx_planes - p) / rd;
        // get minimum
        m = min(ta.x, min(ta.y, ta.z));
        // march by minimum
		s += m + 0.001;
		p = (ro + s * rd);
		// get min distance to obj
		float od = obj(p, rd);
		// inside check
		if(od < 0.) break;
		// infinity break
		if(s > 1. || i + 1 == 80) {return -1.;}
	}
	return s;
}

vec3 getNv(vec3 p, vec3 rd) {
	vec3 d = abs(p - floor(p + 0.5));
	float m = min(d.x, min(d.y, d.z));
	return vec3(m == d.x, m == d.y, m == d.z) * sign(rd);
}

bool anyGreater(vec3 a, vec3 b) {
    bvec3 m = greaterThan(a, b);
    return m.x || m.y || m.z;
}

void main(void) {
	vec2 pos = floor(gl_FragCoord.xy);
	float f = float(frame);
	bool actionFrame = (f / spd - floor(f / spd)) * spd < 0.1;
	if(pos.y < 1. && pos.x <= lightCount) {
		// light repr pixels
		if(frame == 0) {
			//init position
			writePos(floor((hash31(-pos.x) * cube * 2.) - cube));
			return;
		}
		vec3 oldPos = readPos(pos);
		vec3 newPos = oldPos;
		if(actionFrame) {
		  float dirS = floor(hash11(float(frame) + pos.x) * 6.);
		  float axis = mod(dirS, 3.);
		  vec3 dir = vec3(axis == 0., axis == 1., axis == 2.) * (step(dirS, 2.5) * 2. - 1.);
		  newPos = oldPos + dir;
		  if(anyGreater(newPos, cube - 1.) || anyGreater(-newPos, cube)) {
			  dir = -dir;
			  newPos = oldPos + dir;
		  }
		}
		writePos(newPos);
		return;
	}
	if(pos.x < cube.x * 2. && pos.y >= 1. && pos.y <= cube.y * cube.z * 4.) {
		// matrix representation pixels
		if(frame == 0) return;
		bool fresh = false;
		for(float i = 0.; i < lightCount; i ++) {
			if(readPos(vec2(i, 0.)) == matrixToPos(pos)) {
				gl_FragColor = vec4(0., 0., 0., 1.);
				fresh = true;
			}
		}
		if(!fresh) {
			vec4 bb = BB(gl_FragCoord.xy);
			if(actionFrame) {
				bb -= 1. / brightnessLvls;
			}
			gl_FragColor = bb;
		}
		return;
	}

	float t = time * 0.3;
	vec3 ro = normalize(vec3(sin(t), cos(t * 2.) * 0.7, cos(t))) * camDist;
  vec3 rd = normalize(vec3(normCoord(pos) * FOV, 1.));
  rd = rotateVec(rd, -t + PI, cos(t * 2.) * 0.5);

  vec2 s = getCubeInOut(ro, rd, cube);

  if(s.x > -1.) {
  	vec3 p2 = ro + rd * (s.x - 0.0001);
    ro = ro + rd * (s.y - 0.0001);
    rd = p2 - ro;
    //gl_FragColor = vec4(fract(ro), 0.);
    float gm = gridMarch(ro, rd);
  }
}