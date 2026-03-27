import fs from 'fs';
import path from 'path';

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            walk(p);
        } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
            let content = fs.readFileSync(p, 'utf8');
            // Replace from './something.js' to from './something'
            let replaced = content.replace(/from\s+['"]([^'"]+)\.js['"]/g, "from '$1'");
            // Also replace import './something.js'
            replaced = replaced.replace(/import\s+['"]([^'"]+)\.js['"]/g, "import '$1'");
            if (content !== replaced) {
                fs.writeFileSync(p, replaced, 'utf8');
            }
        }
    }
}

walk('./src/office2d');
console.log('Imports fixed.');
