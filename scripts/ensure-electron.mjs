// Electron downloads its verified runtime lazily. Resolve it before packaging.
import electron from 'electron';
console.log(`Electron runtime ready: ${electron}`);
