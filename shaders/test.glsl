//Earth
//2024-10-11
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
uniform sampler2D world1;
uniform sampler2D world2;

const float pi = 3.14159;
const float radius = 500.0;
const float sun = -100.0;
const float fov = 0.0;
const vec4 atmosphere = vec4(0.2, 0.5, 1.0, 1.0) * 0.4;
const float sunSpeed = 1.0;
const float earthSpeed = 0.1;

vec2 rotateVec(vec2 v, float a) {
	float b = -a / 180.0 * 3.1415926;
	return vec2(cos(b) * v.x + sin(b) * v.y, cos(b) * v.y - sin(b) * v.x);
}

float getAngle(vec2 c) {
	float angle = atan(c.y / c.x) + pi/2.0;
  if(c.x < 0.0) angle += + pi;
	return angle;
}

void main(void) {
	vec2 center = resolution/2.0;
	vec2 coord = (gl_FragCoord.xy - center) / radius;
	vec2 rotatedCoord = rotateVec(coord, -23.5);

	float dist = length(coord);
	float f = getAngle(coord);
	float sunRadian = mod(sun / 180.0 * pi + time * sunSpeed + pi, 2.0 * pi) - pi;


	if(dist > 1.0) {
		//is atmosphere or space
		float sunFactor = sin(f) * -sin(sunRadian) + cos(sunRadian) * 0.4;
	  gl_FragColor = atmosphere * 3.0 * sunFactor * clamp(1.0 - (dist - 1.0) * 18.0, 0.0, 1.0);
	} else {
		float d = asin(dist) * (180.0 - fov) / 180.0;
		float e = getAngle(rotatedCoord);

		float latitude = asin(sin(d) * cos(e));
		float longitude = mod(atan(tan(d) * sin(e)) + time * earthSpeed, 2.0 * pi);

		float sunLat = asin(sin(d) * cos(f));
		float sunLong = atan(tan(d) * sin(f)) + sunRadian;
		sunLong = mod(sunLong + pi, 2.0 * pi) - pi;

		vec3 sampleVec;
		float x = longitude/pi;
		float y = -sin(latitude) / 2.3 + 0.5;
    if (longitude <= pi) sampleVec = texture2D(world1, vec2(x, y)).rgb;
    else sampleVec = texture2D(world2, vec2(x - 1.0, y)).rgb;

    float diffuse = cos(sunLong) * cos(sunLat) * 1.5;

    vec2 specCenter = vec2(sunRadian / 2.0, 0.0);
    float specDist = distance(specCenter, vec2(sunLong, sunLat));
    vec4 specular = vec4(0.0);

    float blueThresh = sampleVec.z - (sampleVec.x + sampleVec.y) * 0.5;

    if(blueThresh > 0.0) specular = vec4(1.0, 0.9, 0.5, 1.0) * 0.7 * clamp(0.035 / specDist - 0.1, 0.0, 1.0);

		gl_FragColor = (vec4(sampleVec, 1.0) + atmosphere) * diffuse + specular;
	}
}



