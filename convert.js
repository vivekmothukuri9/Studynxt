const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.php') && f !== 'db.php');

files.forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');

    // Remove PHP blocks
    content = content.replace(/<\?php[\s\S]*?\?>/g, '');

    // Change .php links to .html
    content = content.replace(/\.php"/g, '.html"');
    content = content.replace(/\.php'/g, ".html'");

    // Save as .html
    const newFile = file.replace('.php', '.html');

    // Only save if it actually contains HTML (some api_*.php files will just be empty now)
    if (content.trim().length > 0) {
        fs.writeFileSync(path.join(dir, newFile), content.trim() + '\n');
        console.log(`Converted ${file} to ${newFile}`);

        // Optionally, delete the original PHP file
        fs.unlinkSync(path.join(dir, file));
    } else {
        // It was a pure PHP API file, delete it
        fs.unlinkSync(path.join(dir, file));
        console.log(`Deleted pure API file ${file}`);
    }
});

// Also delete db.php
if (fs.existsSync(path.join(dir, 'db.php'))) {
    fs.unlinkSync(path.join(dir, 'db.php'));
    console.log('Deleted db.php');
}
