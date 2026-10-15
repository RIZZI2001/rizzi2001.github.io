//Night Drive
//2026-10-14
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
uniform int frame;
uniform sampler2D backbuffer;///min:n;mag:n;s:r;t:r;

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

#define bokehRadius .15
#define reflectiveness 1.6

vec3 addLight(vec3 pos, vec3 color, vec2 uv) {
	if(pos.z <= 0.) return vec3(0.);
	pos.x -= pow(1.04, pos.z);
	vec2 lightUv = pos.xy / pos.z;
	float glow = step(distance(pos.xy / pos.z, uv), bokehRadius);
	glow += 1. - smoothstep(0., bokehRadius * 2., distance(lightUv, uv));
	return glow * color / pow(pos.z, 1.2) * 2.;
}

vec3 nightDrive(vec3 rd) {
	vec2 uv = rd.xy / rd.z;
	vec3 ro = vec3(2., 1.5, time * 10.);
	vec3 r = vec3(.6, .3, 0.) * smoothstep(0., 1., .5 - uv.y) * smoothstep(1., 0., abs(uv.x) / 3.);
	r += vec3(.2, .3, .4) * smoothstep(0., 1., uv.y);
	//Lanterns
	vec3 col = vec3(6., 3., 0.);
	for(float i = 10.; i < 100.; i += 20.) {
	  vec3 l = vec3(-4., 8., mod(i - ro.z, 100.) + ro.z);
	  vec3 c = col;
	  for(int i = 0; i < 2; i ++) {
	    r += addLight(l - ro, c, uv);
	    r += addLight(l - ro + vec3(8., 0., 0.), c, uv);
	    l.y *= -1.; c /= reflectiveness;
	  }
	}
	//Headlights
	col = vec3(4.5, 4.5, 5.);
	for(float i = 0.; i < 100.; i += 30.) {
		if(N1(i) < .5) continue;
	  vec3 l = vec3(-2., .5, mod(i - ro.z - 10. * time, 100.) + ro.z);
	  vec3 c = col;
	  for(int i = 0; i < 2; i++) {
	    r += addLight(l - ro, c, uv);
	    r += addLight(l - ro + vec3(-2.5, 0., 0.), c, uv);
	    l.y *= -1.; c /= reflectiveness;
	  }
	}
	//Taillights
	col = vec3(3., .3, .3);
	vec3 l = vec3(sin(time) * sin(time / 2.3) * .4 + 1., -1., 10.);
	vec3 c = col;
	for(int i = 0; i < 2; i++) {
	  r += addLight(l, col, uv);
	  r += addLight(l + vec3(2., 0., 0.), col, uv);
	  l.y -= 1.; c /= reflectiveness;
	}
	//TrafficLights
	float z = mod(-ro.z, 200.); float y = 7.;
	if(z > 40.) {
		col = vec3(10., 0., 1.);
		y += .4;
	} else if(z > 20.) {
		col = vec3(7., 4., 0.);
		y += .2;
	} else {
	  col = vec3(0., 7., 2.);
	}
	l = vec3(0., y, z + ro.z);
	c = col;
	for(int i = 0; i < 2; i++) {
	  r += addLight(l - ro, c, uv);
	  r += addLight(l - ro + vec3(4., -3. * sign(l.y), 0.), c, uv);
	  l.y *= -1.; c /= reflectiveness;
	}
	//Random lights
	for(float i = 0.; i < 100.; i += 5.) {
		vec3 pos = N3(i);
		pos.y = pos.y * 4. + .5;
		pos.x = (pos.x * 2. + 5.) * sign(pos.z - .5);
	  vec3 l = vec3(pos.xy, mod(i - ro.z, 100.) + ro.z);
	  col = N3(-i + ceil(ro.z / 100.) * 100.);
	  vec3 c = col;
	  for(int i = 0; i < 2; i ++) {
	    r += addLight(l - ro, c, uv);
	    l.y *= -1.; c /= reflectiveness;
	  }
	}
	return r;
}

#define flowPercent .9
#define runExp .1
#define gridSize 6.
#define tld .9

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

void main(void) {
	vec2 uv = normCoord(gl_FragCoord.xy);

	vec2 pos = floor(gl_FragCoord.xy) / gridSize;
	if(pos.y + 2. > resolution.y) {gl_FragColor = vec4(0.); return;}
	if(frame < 1) {gl_FragColor = vec4(vec3(0), pow(N1(gl_FragCoord.xy), 40.)); return;}
  float v;

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

    //Rain
    vec2 rndRain = N2((pos + 100.) * time);
    if(rndRain.x > .9998) v += rndRain.y;
  }
  float h = getHeight(pos, vec2(0., 0.));
  float hu = getHeight(pos, vec2(0., 1.));
  float hr = getHeight(pos, vec2(1., 0.));

  vec3 nv = normalize(vec3(vec2(h - hr, h - hu) * 3., 1.));

  vec3 rd = normalize(vec3(-uv / 1.5, 1.));
  rd = refract(rd, -nv, .7);
  rd = refract(rd, vec3(0., 0., 1.), 1. / .7);
  //rd = rotateVec(rd, -normCoord(touch) * 5.);
  gl_FragColor = vec4(nightDrive(rd).xyz, v);
}



