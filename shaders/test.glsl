// Labyrinth of Cubes
// 2026-06-08
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
uniform vec2 touch;

const float PI = 3.1415926;
const float FOV = 0.7;

float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
float rand(vec3 n) { return fract(sin(dot(n, vec3(12.9898, 4.1414, 7.8931))) * 43758.5453); }

vec2 normCoord(vec2 c) {
    return (c - resolution / 2.) / resolution.x * 2.;
}

float obj(vec3 p) {
    p = floor(p);
    return max(max(mod(p.x, 2.), mod(p.y, 2.)), mod(p.z, 2.)) - 0.1;
}

vec3 refractRay(vec3 ray, vec3 nv, float eta) {
    float cosTheta = dot(-ray, nv);
    if (cosTheta < 0.0) cosTheta = 0.0;
    float sin2Theta = 1.0 - cosTheta * cosTheta;
    float k = 1.0 - eta * eta * sin2Theta;
    if (k < 0.0) return reflect(ray, nv);
    return normalize(eta * ray + (eta * cosTheta - sqrt(k)) * nv);
}

vec3 getNv(vec3 p, vec3 rd) {
    vec3 d = abs(p - floor(p + 0.5));
    float m = min(d.x, min(d.y, d.z));
    return vec3(m == d.x, m == d.y, m == d.z) * sign(rd);
}

vec3 p2(float v) {
	v *= 6.283185307179;
	return 0.5 + 0.5 * vec3(cos(v - 1.7), cos(v - 3.), cos(v + 1.7));
}

vec3 gridMarch(vec3 ro, vec3 rd, int maxSteps, float eta) {
    float s = 0.001;
    vec3 p = ro;

    bool air = true;
    vec3 lastPoint = ro;
    float dist = 0.;

    for (int i = 0; i < 1000; i++) {
        if(i >= maxSteps) break;

        // Nächste Gitterebenen in jeder Achse
        vec3 nx_planes = floor(p) + max(vec3(0.0), sign(rd));
        vec3 ta = (nx_planes - p) / rd;
        float m = min(ta.x, min(ta.y, ta.z));
        s += m + 0.001;

        p = ro + s * rd;

        vec3 mp = floor(p) + 0.5;
        float od = obj(mp);

        if (od < 0.0) {
            // Oberflächentreffer
            vec3 nv = getNv(p, rd);
            float r = rand(mp);
            dist += distance(p, lastPoint);
            if (r < 0.1) {
                // Lichtwürfel
                return p2(r * 10.) / (dist + 1.) * 5.;
            }

            float theta = air ? eta : (1.0 / eta);
            float dt = abs(dot(nv, rd));

            float rng = rand(gl_FragCoord.xy * eta * time);
            if (abs(dt) > rng) {
            	//return vec3(0., 1., 0.);
              // Brechung
              rd = refractRay(rd, nv, theta);
              lastPoint = p;
              air = !air;
            } else {
            	//return vec3(1., 0., 0.);
                // Reflexion
                rd = reflect(rd, nv);
            }

            ro = p + nv * 0.01;
            s = 0.001;
            p = ro;
        }

        if (s > 1000.0) { return vec3(0.0); }
    }
    return vec3(0.0);
}

const float eta = 1.8;
const float aberation = 0.05;

void main(void) {
    vec2 uv = normCoord(gl_FragCoord.xy);
    float t = 0.1 * time;

    // Kamera-Rotation per Touch
    vec2 to = normCoord(touch) * 2.0;

    mat3 rotY = mat3(
         cos(-to.x), 0.0, sin(-to.x),
         0.0,        1.0, 0.0,
        -sin(-to.x), 0.0, cos(-to.x)
    );
    mat3 rotX = mat3(
        1.0, 0.0,       0.0,
        0.0, cos(to.y), -sin(to.y),
        0.0, sin(to.y),  cos(to.y)
    );
    mat3 rot = rotX * rotY;

    vec3 ro = vec3(sin(time) - 0.5, -0.5, time);
    vec3 rd = normalize(vec3(uv, 1.0) * rot);

    int steps = 30;

    // Chromatische Aberration: gleicher Pfad, nur eta variiert
    vec3 gm = vec3(
        gridMarch(ro, rd, steps, eta - aberation).r,
        gridMarch(ro, rd, steps, eta).g,
        gridMarch(ro, rd, steps, eta + aberation).b
    );

    gl_FragColor = vec4(gm, 1.0);
}