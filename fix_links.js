const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    let original = content;

    // Replace page links with parameters
    content = content.replace(/semesters\.php\?/g, 'semesters.html?');
    content = content.replace(/chapters\.php\?/g, 'chapters.html?');
    content = content.replace(/year-selection\.php\?/g, 'year-selection.html?');
    content = content.replace(/topic_details\.php\?/g, 'topic_details.html?');

    // Replace API links
    content = content.replace(/api_subjects\.php\?/g, '/api/subjects?');
    content = content.replace(/api_content\.php\?/g, '/api/content?');

    if (content !== original) {
        fs.writeFileSync(path.join(dir, file), content);
        console.log(`Fixed links in ${file}`);
    }
});
