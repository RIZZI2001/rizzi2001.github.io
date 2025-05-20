//Glitched out Cube
//2025-05-20
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
const float pi = 3.1415926;

const float bloom = 0.05;
const float camZ = 3.;
//const vec4 color = vec4(0.6, 1., 0.3, 1.);

vec3 cube(float i) {
  return floor(vec3(mod(i, 2.), mod(i, 4.)/2., i/4.));
}

vec3 floatToAxis(float value) {
  if (value == 0.) return vec3(1., 0., 0.); // Map 0. to x-axis
  if (value == 1.) return vec3(0., 1., 0.); // Map 1. to y-axis
  if (value == 2.) return vec3(0., 0., 1.); // Map 2. to z-axis
  return vec3(0.); // Default for invalid input
}

float getAngle(vec2 c) {
  float angle = atan(c.y / c.x) / (2.0*pi)+ 0.25;
  if(c.x < 0.0) angle = angle + 0.5;
  return angle * pi * -2. + pi;
}

vec2 rotateVec(vec2 v, float b) {
  return vec2(cos(b) * v.x + sin(b) * v.y, cos(b) * v.y - sin(b) * v.x);
}

float distSegm(vec2 v1, vec2 v2, vec2 pos) {
  vec2 vc = v2-v1;
  vec2 vcp = pos-v1;
  float angle = getAngle(vc);
  vcp = rotateVec(vcp, -angle);
  if(vcp.y > 0. && vcp.y < length(vc)) {
    return abs(vcp.x);
  } else if (vcp.y <= 0.) {
    return distance(v1, pos);
  } else {
    return distance(v2, pos);
  }
  return 1.;
}

vec3 rotateVec3(vec3 v, float yaw, float pitch) {
  //return v;
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

vec2 project(vec3 c) {
  return vec2(c.x/(c.z-camZ), c.y/(c.z-camZ));
}

float rand(float a) {return fract(sin(a * 12.9898) * 43758.5453);}
float rand(vec2 n) {return fract(sin(tan(dot(n, vec2(42.7398, 4.75414))) * 478.5453));}
float rand(vec3 n) {return fract(rand(n.xz) + rand(n.yz) + rand(n.xy));}

float smoothNoise(float a) {return fract(a) * rand(ceil(a)) + (1. - fract(a)) * rand(floor(a));}

vec2 glitchFilter(vec2 pos) {
  float y_h = rand(time) * 100.;
  float r = rand(vec2(floor(time*10.0), floor(pos.y/ y_h)));
  if(r <= 0.1) pos.x += 200.0 * r;
  return pos;
}

void main(void)
{
  float t1 = time * 0.33;
  float t2 = time * 0.77;
  vec2 pos = glitchFilter(gl_FragCoord.xy);
  pos = (pos - resolution/2.)/ 250.;
  float noize = rand(vec3(gl_FragCoord.xy/50., -time));

  vec4 color = vec4(0.1) + 2. * abs(vec4(rotateVec3(vec3(1., 1., 1.), t1, t2), 1.));

  for(float e = 0.; e < 12.; e++) {
    float dir = floor(e/4.);
    float v1 = min(7., pow(2., mod(e, 4.)));

    vec3 v1_3 = cube(v1);
    vec3 v2_3 = mod(v1_3 + floatToAxis(dir), 2.);

    vec2 v1_2 = project(rotateVec3(v1_3*2. - vec3(1.), t1, t2));
    vec2 v2_2 = project(rotateVec3(v2_3*2. - vec3(1.), t1, t2));

    gl_FragColor += color * smoothNoise(t1) * bloom/distSegm(v1_2, v2_2, pos);
  }
gl_FragColor = noize * gl_FragColor;
}