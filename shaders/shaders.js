const editor = document.getElementById('editor');
const textArea = document.getElementById('shader-code');

const default_shader =
`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
uniform sampler2D backbuffer;
uniform int frame;
uniform vec2 touch;
        
const float pi = 3.1415926;
        
vec4 getColorAt(vec2 coord) {
 return texture2D(backbuffer, coord/resolution);
}
        
void main(void) {
 gl_FragColor = vec4(1.);
}
`;

const vertShaderSrc = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0, 1);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
  const program = gl.createProgram();
  const vShader = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

let currentShader = 0;
let currentShaderCode = '';
let worldTextures = [null, null];
let rizziTexture;
let touch = [0, 0];
let program, posLoc, resLoc, timeLoc, powerLoc, batteryLoc, backbufferLoc, frameLoc, world1Loc, world2Loc, rizziLoc;
let gl, canvas;
let shaderSources = [];
let frameCount = 0;

// Ping-pong framebuffers and textures
let fbos = [], textures = [], texWidth = 0, texHeight = 0;

function createTexture(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

function createFBO(tex) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return fbo;
}

function resizeBackbuffers(w, h) {
    texWidth = w;
    texHeight = h;
    for (let i = 0; i < 2; ++i) {
        if (textures[i]) gl.deleteTexture(textures[i]);
        if (fbos[i]) gl.deleteFramebuffer(fbos[i]);
        textures[i] = createTexture(w, h);
        fbos[i] = createFBO(textures[i]);
    }
}

function readShader(idx) {
    info = document.getElementById('info');
    info.innerHTML = shaderSources[idx].name + ' [' + shaderSources[idx].date + ']';
    info.style.display = 'block';
    currentShaderCode = shaderSources[idx].code;
    textArea.value = currentShaderCode;
}

function startShader() {
    const errorDiv = document.getElementById('shader-error');
    if (errorDiv) errorDiv.style.display = 'none';
    try {
        if (program) gl.deleteProgram(program);
        program = createProgram(gl, vertShaderSrc, currentShaderCode);
        gl.useProgram(program);

        posLoc = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        resLoc = gl.getUniformLocation(program, 'resolution');
        timeLoc = gl.getUniformLocation(program, 'time');
        powerLoc = gl.getUniformLocation(program, 'powerConnected');
        batteryLoc = gl.getUniformLocation(program, 'battery');
        backbufferLoc = gl.getUniformLocation(program, 'backbuffer');
        frameLoc = gl.getUniformLocation(program, 'frame');
        world1Loc = gl.getUniformLocation(program, 'world1');
        world2Loc = gl.getUniformLocation(program, 'world2');
        rizziLoc = gl.getUniformLocation(program, 'rizzi');

        for (let i = 0; i < 2; ++i) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[i]);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        frameCount = 0;
        return true;
    } catch (e) {
        if (errorDiv) {
            errorDiv.textContent = e.message;
            errorDiv.style.display = 'block';
            return false;
        } else {
            alert(e.message);
        }
    }
}

function loadTexture(gl, url) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
    const img = new window.Image();
    img.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    img.src = url;
    return tex;
}

async function main() {
    canvas = document.getElementById('glcanvas');
    gl = canvas.getContext('webgl');
    if (!gl) {
        alert('WebGL not supported');
        return;
    }

    worldTextures[0] = loadTexture(gl, 'world1.jpg');
    worldTextures[1] = loadTexture(gl, 'world2.jpg');
    rizziTexture = loadTexture(gl, 'rizzi.png');
    

    // Fullscreen quad
    const vertices = new Float32Array([
        -1, -1,  1, -1, -1, 1,
        -1,  1,  1, -1, 1, 1
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Create ping-pong textures and framebuffers
    textures = [null, null];
    fbos = [null, null];
    resizeBackbuffers(canvas.width, canvas.height);

    currentShader = shaderSources.length - 1;
    readShader(currentShader);
    startShader();

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        resizeBackbuffers(canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    let ping = 0, pong = 1;

    function render(now) {
        gl.useProgram(program);
        gl.uniform2f(resLoc, canvas.width, canvas.height);
        if (timeLoc) gl.uniform1f(timeLoc, now * 0.001);
        if (powerLoc) gl.uniform1i(powerLoc, 1);
        if (batteryLoc) gl.uniform1f(batteryLoc, 1.0);
        if (frameLoc) gl.uniform1i(frameLoc, frameCount);
        if (world1Loc) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, worldTextures[0]);
            gl.uniform1i(world1Loc, 1);
        }
        if (world2Loc) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, worldTextures[1]);
            gl.uniform1i(world2Loc, 2);
        }
        if (rizziTexture) {
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, rizziTexture);
            gl.uniform1i(rizziLoc, 3);
        }
        let touchLoc = gl.getUniformLocation(program, 'touch');
        if (touchLoc) {
            gl.uniform2f(touchLoc, touch[0], touch[1]);
        }

        // If shader uses backbuffer, render to FBO and then blit to canvas
        if (backbufferLoc !== null) {
            // Bind FBO for drawing
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[ping]);
            // Set backbuffer uniform to previous texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures[pong]);
            gl.uniform1i(backbufferLoc, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Now draw FBO texture to screen
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.useProgram(program);
            gl.uniform2f(resLoc, canvas.width, canvas.height);
            if (timeLoc) gl.uniform1f(timeLoc, now * 0.001);
            if (powerLoc) gl.uniform1i(powerLoc, 1);
            if (batteryLoc) gl.uniform1f(batteryLoc, 1.0);
            if (frameLoc) gl.uniform1i(frameLoc, frameCount);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures[ping]);
            gl.uniform1i(backbufferLoc, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Swap ping/pong
            let tmp = ping; ping = pong; pong = tmp;
        } else {
            // No backbuffer: draw directly to canvas
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        frameCount++;
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    document.getElementById('left').onclick = () => {
        currentShader = (currentShader + 1 + shaderSources.length) % shaderSources.length;
        readShader(currentShader);
        startShader();
    };
    document.getElementById('right').onclick = () => {
        currentShader = (currentShader - 1 + shaderSources.length) % shaderSources.length;
        readShader(currentShader);
        startShader();
    };
    document.getElementById('edit-button').onclick = () => {
        editor.style.display = 'block';
        textArea.focus();
    }
    document.getElementById('save-button').onclick = () => {
        currentShaderCode = textArea.value;
        compiled = startShader();
        if (compiled) {
            editor.style.display = 'none';
        }
    };
    document.getElementById('cancel-button').onclick = () => {
        editor.style.display = 'none';
    };
    document.getElementById('clear-button').onclick = () => {
        editor.querySelector('textarea').value = default_shader;
        currentShaderCode = textArea.value;
        startShader();
        info.style.display = 'none';
    };
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        touch[0] = (e.clientX - rect.left) * canvas.width / rect.width;
        touch[1] = canvas.height - (e.clientY - rect.top) * canvas.height / rect.height;
    });
}

// Load shaders from JSON, then start main
/* fetch('test.glsl').then(res => res.text())
    .then(data => {
        shaderSources = [
        { name: 'Test Shader', date: '2023-10-01', code: data }
        ];
        main();
    })
    .catch(err => {
        alert('Failed to load shaders: ' + err);
    }); */

fetch('shaderCollection.json')
  .then(res => res.json())
  .then(data => {
    shaderSources = data.shaders;
    main();
  })
  .catch(err => {
    alert('Failed to load shaders: ' + err);
  });