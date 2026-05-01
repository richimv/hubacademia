const fs = require('fs');
const path = require('path');
const filePath = path.join(process.cwd(), 'presentation/public/js/repaso.js');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const fixedLines = [
    '    removeAudio(side) {',
    '        const status = document.getElementById(`audio-status-${side}`);',
    '        if (status) status.style.display = \'none\';',
    '        const deleteInput = document.getElementById(`card-delete-audio-${side}`);',
    '        if (deleteInput) deleteInput.value = \'true\';',
    '    }'
];

// Reemplazamos las líneas por índice (1753-1758 -> índice 1752-1757)
lines.splice(1752, 6, ...fixedLines);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('✅ Líneas restauradas correctamente desde el root.');
