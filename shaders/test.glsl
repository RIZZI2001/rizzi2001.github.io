//Trip around the black hole
//2026-09-21
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;

uniform sampler2D leftS;
uniform sampler2D frontS;
uniform sampler2D bottomS;
uniform sampler2D backS;
uniform sampler2D rightS;
uniform sampler2D topS;
uniform vec2 touch;

const float PI = 3.1415926;

vec2 normCoord(vec2 c) {
	vec2 r = resolution; return (2.*c-r)/min(r.x, r.y);
}

float tanh(float x) {
  return 1. - 2./(pow(2.7182818, 2. * x) + 1.);
}

vec3 camPos(float x) {
	float s = (cos(x - .5) - sin(2. * x - 2.) / 2. + sin(3. * x + .3) / 3.) / 2. + .3;

  vec3 p = vec3(
		0., // cos(x) / 5. - s,
		(-sin(x - 1.) + sin(2. * x - 1.4) / 2. + sin(x * 3.) / 7.) / 2. + .3,
	  s + sin(x) / 5.
	);
	return p * (5. + sin(x / 3.) * 3.);
}

vec2 camYawPitch(float x) {
	return vec2( //normCoord(touch) * 5.);
	  x - 4.5 + cos(x),
	  .5 + cos(x) / 2.
	);
}

float camRoll(float t) {
	return sin(t * 1.7);
}

vec2 rotateVec(vec2 v, float b) {
	return vec2(cos(b) * v.x + sin(b) * v.y, cos(b) * v.y - sin(b) * v.x);
}

vec3 rotateVec(vec3 v, vec2 r) {
	float cy = cos(r.x), sy = sin(r.x), cp = cos(r.y), sp = sin(r.y);
  return v * mat3(cy, -sp * sy, cp * -sy, 0.0, cp, -sp,sy, sp * cy, cp * cy);
}

float N12(vec2 n) {return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);}

float N13(vec3 n) {return fract(sin(dot(n, vec3(12.9898, 4.1414, 7.8931))) * 43758.5453);}

vec2 sTx(vec2 d) {return (d +1.) / 2.;}

vec4 skyBox(vec3 d) {
	vec3 a = abs(d);
	float m = max(max(a.x, a.y), a.z);
	d /= m;
	if(a.z == m) {
		if(d.z > 0.) {
			return texture2D(frontS, sTx(d.xy));
		} else {
			return texture2D(backS, sTx(d.xy));
		}
	} else if(a.x == m) {
		if(d.x > 0.) {
			return texture2D(rightS, sTx(d.zy));
		} else {
			return texture2D(leftS, sTx(d.zy));
		}
	} else if(a.y == m) {
		if(d.y > 0.) {
			return texture2D(topS, sTx(d.xz));
		} else {
			return texture2D(bottomS, sTx(d.xz));
		}
	}
}

vec3 distort(vec3 p) {
	float t = time;
	p += t;
	float lac = 1.4;
	for(float i = 1.; i < 10.; i++) {
		p += sin(p.zxy * pow(lac, i) + t/PI) / pow(lac, i) + .1;
	}
	return p - t;
}

const float stepSize = .01;
void main(void) {
	float t = time / 10.;

	vec2 uv = normCoord(gl_FragCoord.xy);
	uv = rotateVec(uv, camRoll(t));

	vec3 rd = normalize(vec3(uv, 1.));
  rd = rotateVec(rd, camYawPitch(t));

  vec3 p = camPos(t);
  float rdO = N12(uv) * .5;

  float light;

  for(int i = 0; i < 1000; i++) {
	if(abs(p.y) < .4 && length(p.xz) < 4.) {
  		vec3 pt = p + rd * rdO; 
		pt = rotateVec(pt, vec2(length(p.xz) * 3. - time, 0.));
  	  	pt = distort(pt * 6.) / 6.;
  	  	if(abs(pt.y) < .1) {
  	  		float l = -dot(p.zx, rd.xz) * .1 + .2;
  	  		light += max(0., smoothstep(2., -2., abs(length(pt.xz) - 2.)) * l);
  	  	}
    }

  	float mag = length(p);
  	if(mag < .7) {
  		gl_FragColor = vec4(1., .5, .2, 1.) * light;
  		return;
  	}
	if(mag > 12.) {
  		break;
  	}

  	rd = normalize(mix(rd, -p / pow(mag, 2.), .007));
  	p += rd * mag * stepSize;
  }
  gl_FragColor = vec4(1., .5, .2, 1.) * light;
  gl_FragColor += skyBox(rd) * .9;
}
