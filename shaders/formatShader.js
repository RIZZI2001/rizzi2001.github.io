const fs = require('fs');
const lines = fs.readFileSync('shaders\\test.glsl', 'utf8').split(/\r?\n/);

const name = lines[0].replace(/^\/\/\s*/, '').trim();
const date = lines[1].replace(/^\/\/\s*/, '').trim();
const code = lines.slice(2).join('\n')
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/\n/g, '\\n')
  .replace(/\t/g, '\\t');

const jsonObj = `{
      "name": "${name}",
      "date": "${date}",
      "code": "${code}"
    }`;

fs.writeFileSync('shaders\\formated.json', jsonObj, 'utf8');

//node shaders\formatShader.js