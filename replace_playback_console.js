const fs = require('fs');
let src = fs.readFileSync('src/screens/Playback.tsx', 'utf8');
const searchStr = `                            const isValid = handle && handle !== '0' && handle !== '-1' && !String(handle).startsWith('-10');`;
const replacement = `                            const isValid = handle && handle !== '0' && handle !== '-1' && !String(handle).startsWith('-10');\n                            console.log('Playback stream handle:', handle);`;
src = src.replace(searchStr, replacement);
fs.writeFileSync('src/screens/Playback.tsx', src);
console.log('Done');
