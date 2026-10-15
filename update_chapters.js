const fs = require('fs');

function updateChapters() {
    let c = fs.readFileSync('chapters.html', 'utf8');

    // Update userRole
    c = c.replace(/const userRole = '';/, "const userRole = localStorage.getItem('role') || 'user';");

    // Fix GET content fetch
    c = c.replace(
        /fetch\(\`\/api\/content\?subject=\$\{subject\}&branch=\$\{branch\}&year=\$\{year\}&semester=\$\{semester\}\`\)/g,
        "fetch(`/api/content?subject=${subject}&branch=${branch}&year=${year}&semester=${semester}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })"
    );

    // Fix POSTs to api_content.html
    c = c.replace(
        /fetch\('api_content\.html',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\}/g,
        "fetch('/api/content', {\n                            method: 'POST',\n                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }"
    );

    // Fix file upload POST to api_upload.html
    c = c.replace(
        /fetch\('api_upload\.html',\s*\{\s*method:\s*'POST',\s*body:\s*formData\s*\}\)/g,
        "fetch('/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData })"
    );

    fs.writeFileSync('chapters.html', c);
    console.log('Updated chapters.html');
}

function updateTopicDetails() {
    let c = fs.readFileSync('topic_details.html', 'utf8');

    // Update userRole
    c = c.replace(/const userRole = '';/, "const userRole = localStorage.getItem('role') || 'user';");

    // Fix GET topic fetch
    c = c.replace(
        /fetch\(\`\/api\/content\?action=get_topic&topic_id=\$\{topicId\}\`\)/g,
        "fetch(`/api/content?action=get_topic&topic_id=${topicId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })"
    );

    // Fix POSTs to api_content.html
    c = c.replace(
        /fetch\('api_content\.html',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\}/g,
        "fetch('/api/content', {\n                method: 'POST',\n                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }"
    );

    fs.writeFileSync('topic_details.html', c);
    console.log('Updated topic_details.html');
}

updateChapters();
updateTopicDetails();
