//Diver
//2026-10-15
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
uniform int frame;
uniform sampler2D backbuffer;
uniform sampler2D sky1;
uniform sampler2D sky2;
uniform sampler2D sky3;
uniform sampler2D sky4;
uniform vec2 touch;

const float PI = 3.1415926;
float tanh(float x) {return 1. - 2./(pow(2.7182818, 2. * x) + 1.);}
vec2  normCoord(vec2 c) {vec2 r = resolution; return (2.*c-r)/min(r.x, r.y);}
vec2  rotateVec(vec2 v, float b) {return vec2(cos(b) * v.x + sin(b) * v.y, cos(b) * v.y - sin(b) * v.x);}
vec3  rotateVec(vec3 v, vec2 r) {float cy = cos(r.x), sy = sin(r.x), cp = cos(r.y), sp = sin(r.y); return v * mat3(cy, -sp * sy, cp * -sy, 0.0, cp, -sp,sy, sp * cy, cp * cy);}
float N1(float p){ p = fract(p * .1031); p *= p + 33.33; return fract(p * (p + p)); }
vec2  N2(float p){ vec3 a = fract(vec3(p) * vec3(.1031,.1030,.0973)); a += dot(a, a.yzx + 33.33); return fract((a.xx + a.yz) * a.zy); }
vec3  N3(float p){ vec3 a = fract(vec3(p) * vec3(.1031,.1030,.0973)); a += dot(a, a.yzx + 33.33); return fract((a.xxy + a.yzz) * a.zyx); }
float N1(vec2  p){ vec3 a = fract(p.xyx * .1031); a += dot(a, a.yzx + 33.33); return fract((a.x + a.y) * a.z); }
vec2  N2(vec2  p){ vec3 a = fract(p.xyx * vec3(.1031,.1030,.0973)); a += dot(a, a.yzx + 33.33); return fract((a.xx + a.yz) * a.zy); }
vec3  N3(vec2  p){ vec3 a = fract(p.xyx * vec3(.1031,.1030,.0973)); a += dot(a, a.yxz + 33.33); return fract((a.xxy + a.yzz) * a.zyx); }
float N1(vec3  p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec2  N2(vec3  p){ p = fract(p * vec3(.1031,.1030,.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xx + p.yz) * p.zy); }
vec3  N3(vec3  p){ p = fract(p * vec3(.1031,.1030,.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
vec4  N4(vec3  p){ vec4 a = fract(p.xyzx * vec4(.1031,.1030,.0973,.1099)); a += dot(a, a.wzxy + 33.33); return fract((a.xxyz + a.yzzw) * a.zywx); }
vec4  N4(vec4  p){ p = fract(p * vec4(.1031,.1030,.0973,.1099)); p += dot(p, p.wzxy + 33.33); return fract((p.xxyz + p.yzzw) * p.zywx); }
vec4  getBBOff(vec2 o) {return texture2D(backbuffer, (gl_FragCoord.xy + o) / resolution);}

#define rm mat2(-.8, .6, -.6, -.8)

float smoothnoise(vec2 pos) {
	vec2 f = fract(pos);
	vec2 u = f * f * (3. - 2. * f);

	float a = N1(floor(pos));
	float b = N1(floor(pos + vec2(1., 0.)));
	float c = N1(floor(pos + vec2(0., 1.)));
	float d = N1(floor(pos + vec2(1., 1.)));

	return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}

float fbm(vec2 pos, float oct) {
	float v;
	float a = .5;
	for(float i = 0.; i < 100.; i ++) {
		if(i >= oct) break;
		v += smoothnoise(pos + time * i / 5.) * a;
		a /= 2.;
		pos = pos * 2. * mat2(.8, -.6, .6, .8);
	}
	return v;
}

vec4 water(vec2 pos, float oct) {
	float f = fbm(pos, oct);
	vec3 nv = vec3(f - fbm(pos + vec2(.01, 0.), oct), 0., f - fbm(pos + vec2(0., .01), oct));
	nv *= 40.;
	nv.y = -sqrt(1. - pow(length(nv.xz), 2.));

	return vec4(f, nv);
}

#define sunDir normalize(vec3(-0.02, 1., .6))
vec4 skybox(vec3 d) {
	if(d.y < 0.) return vec4(0.);
	vec2 c = fract(vec2(atan(d.z, d.x),  asin(d.y)) / PI * 2.);
	vec4 tx;
	if(d.x > 0.) {
		if(d.z > 0.) {
		  tx = texture2D(sky2, c);
	  } else {
	  	tx = texture2D(sky1, c);
	  }
	} else {
		if(d.z > 0.) {
		  tx = texture2D(sky3, c);
	  } else {
	  	tx = texture2D(sky4, c);
	  }
	}
	return tx;
}

vec4 diver(vec3 ro, vec3 rd, vec2 uv) {
  float a = -ro.y / rd.y;
  vec2 sp; vec4 surface; vec3 ref; float b;
  vec4 FC;

  if(a > 0.) {
  	//Surface hit
  	sp = (ro + rd * a).xz;
	surface = water(sp, 10.);

	if(ro.y > 0.) {
		//Reflect on Surface + sun glare
	  	rd = reflect(rd, surface.yzw);
	  	if(rd.y < 0.) rd.y = 0.;
	  	rd = normalize(rd);
	  	FC = skybox(rd);
	  	float glare = .01 / (1. - dot(rd, sunDir)) + .5;
	  	return FC * glare;
	}

    //subsurface refraction
	  ref = normalize(refract(rd, surface.yzw, .8));
	  b += max(0., .005 / (1. - dot(ref, sunDir)) / (a * a));
	}

	if(ro.y > 0.) {
		//Sky
	  return skybox(rd);
	}

  //Rays
	for(float i = 0.; i < 1.; i += .02) {
		vec3 p = ro + rd * i * 10.;
		if(p.y > 0.) break;

		a = -p.y / sunDir.y;
		sp = (p + sunDir * a).xz;
		surface = water(sp, 3.);
		ref = refract(sunDir, surface.yzw, .8);

		b += max(0., (dot(ref, sunDir) - .99) * 10.) / (a + 1.) * (1. - i);
	}

    return vec4(.3, .6, 1., 1.) * (b + .5) * min(1., 1. + uv.y / 4.) * (1. + ro.y / 2.);
}

#define flowPercent .99
#define runExp .2
#define gridSize 9.
#define tld 1.

vec2 gPI(vec2 off) {
	return vec2(
		getBBOff(off).w,
    N1(floor(floor(gl_FragCoord.xy + off) * time))
  );
}

float incoming(float v, float s, vec2 u, float l, float r) {
	if(u.x * tld >= pow(u.y, runExp)) {
  	if(s > max(l, r)) return v + u.x * flowPercent + l + r;
    else return 0.;
  }
  return v;
}

float nf(float x) {
  return exp(-1. * x * x);
}

float getHeight(vec2 pos, vec2 offs) {
	float v;
	vec2 offset = -fract(pos + offs / gridSize);
  for(float x = -3.; x <= 3.; x ++) {
  	for(float y = -3.; y <= 3.; y ++) {
  	  vec2 dv = offset + vec2(x, y);
  	  float dropM = getBBOff((dv) * gridSize + offs).w;
  	  float dropD = length(dv + vec2(.5));
  	  float dropInf = max(0., nf(dropD * 1.3) * dropM);
  	  v += dropInf;
  	}
  }
  return max(0., v - .1);
}

float bubbles(vec2 uv, float t) {
	float r;
	for(float l = 4.; l < 9.; l ++) {
	  vec2 uvx = uv * l * 3. - vec2(0., t) / pow(l, 1.5) * 500.;
	  vec2 inner = fract(uvx);
	  vec3 rnd = N3(floor(uvx + l) * l);
	  vec2 node = sin(20. * (t + 100.) * rnd.xy) * .3 + .5;
	  vec2 v = (node - inner) / max(rnd.z * .2, .03);
	  float d = length(v);
	  float b = step(d, 1.) * max(0., dot(v, vec2(0., -1.)) + 1.) * .5;
	  r += b * clamp(5. + uv.y - (t / l * 20.), 0., 1.);
	}
	return r;
}

void main(void) {
	vec2 uv = normCoord(gl_FragCoord.xy);
	float t = time;
    vec3 ro = vec3(0., -sin(t / 2.), t);
	float yDir = -cos(t / 2.);
	vec3 rd = normalize(vec3(uv / 1.5, 1.));

	float v;
	if(ro.y < 0.01 && yDir > 0.) {v = pow(N1(gl_FragCoord.xy), 2.);}

	if(ro.y > 0.) {
		vec2 pos = floor(gl_FragCoord.xy) / gridSize;
		if(pos.y + 5. > resolution.y) {gl_FragColor = vec4(0.); return;}

		if(fract(pos) == vec2(0.)) {
			vec2 u = gPI(vec2(0., 1.) * gridSize);
			vec2 lu = gPI(vec2(-1., 1.) * gridSize);
			vec2 ru = gPI(vec2(1., 1.) * gridSize);
			vec2 s = gPI(vec2(0., 0.) * gridSize);
			float l = getBBOff(vec2(-1., 0.) * gridSize).w;
			float r = getBBOff(vec2(1., 0.) * gridSize).w;
			float ll = getBBOff(vec2(-2., 0.) * gridSize).w;
			float rr = getBBOff(vec2(2., 0.) * gridSize).w;

			// Running head
			if(s.x * tld < pow(s.y, runExp)) {
				v += s.x;
			}
			else v += s.x * (1. - flowPercent);
			v = incoming(v, s.x + .001, u, l, r);
			v = incoming(v, s.x, lu, l, ll);
			v = incoming(v, s.x, ru, r, rr);
		}
		float h = getHeight(pos, vec2(0., 0.));
		float hu = getHeight(pos, vec2(0., 1.));
		float hr = getHeight(pos, vec2(1., 0.));

		vec3 nv = normalize(vec3(vec2(h - hr, h - hu) * -3., 1.));

		rd = refract(rd, -nv, .7);
		rd = refract(rd, vec3(0., 0., -1.), 1. / .7);
	}

	float b = bubbles(uv, mod(t, PI * 4.)) + 1.;
	rd = rotateVec(rd, vec2(0., -yDir * .5));
	gl_FragColor = vec4(diver(ro, rd, uv).xyz * b, v);
}



