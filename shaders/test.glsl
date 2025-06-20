//Rizzi
//2025-06-18
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform sampler2D rizzi;///min:n;mag:n;s:c;t:c;
uniform float time;

const int octaves = 2;
const float lacunarity = 0.3;
const float persistance = 0.5;

vec3 rotateVec3(vec3 v, float yaw, float pitch) {
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

float layeredNoize3d(vec3 pos) {
	pos = rotateVec3(pos, 2.4, 1.7);
	float layered = 0.0;
	for(int layer = 1; layer <= octaves; layer ++) {
    layered += noize3d(pos) * pow(persistance, float(layer));
    pos = rotateVec3(pos/lacunarity, 2.4, 1.7);
	}
	return layered;
}

vec2 rotateVec(vec2 v, float b) {
	return vec2(cos(b) * v.x + sin(b) * v.y, cos(b) * v.y - sin(b) * v.x);
}

vec4 tex_at(vec2 pos) {
	float size = 0.8;
	pos = (pos - resolution/2.)/resolution.x / size + vec2(0.5);
	return texture2D(rizzi, pos);
}

float depth(vec2 pos) {
	for(float i = 0.; i < 5.; i++) {
		float lv = layeredNoize3d(vec3(pos/40., time));
		pos += rotateVec(vec2((15. * i) + 10.), lv * 10. + time + pos.x / 160. + pos. y / 160.);
		if(tex_at(pos).r > 0.5) {
			return i;
		}
	}
	return 5.;
}

vec4 color(float i) {
	if(i == 0.) {
		return vec4(1.);
	} else if(i == 1.) {
		return vec4(255, 114, 199, 1)/ 255.;
  } else if(i == 2.) {
  	return vec4(228, 0, 240, 1)/ 255.;
  } else if(i == 3.) {
  	return vec4(156, 36, 248, 1)/ 255.;
  } else if(i == 4.) {
  	return vec4(91, 3, 255, 1)/ 255.;
	} else {
		return vec4(0.);
	}
}

void main(void) {
	gl_FragColor = color(depth(gl_FragCoord.xy));
}