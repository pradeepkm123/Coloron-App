const fs = require('fs');
let src = fs.readFileSync('src/screens/Playback.tsx', 'utf8');

src = src.replace(/const handle = typeof res === 'object' \? res\.handle : res;\r?\n.*realChannel.*\r?\n.*isValid.*/g, match => {
    return match + '\n                            console.log("Playback stream handle:", handle);';
});

fs.writeFileSync('src/screens/Playback.tsx', src);
console.log('Done replacement');
