const fs = require('fs');

function updateFile(file) {
    let c = fs.readFileSync(file, 'utf8');

    // API subjects base fetch
    c = c.replace(
        /fetch\(\`\/api\/subjects\?branch=\$\{branch\}&year=\$\{year\}&semester=\$\{semester\}\`\)/g,
        "fetch(`/api/subjects?branch=${branch}&year=${year}&semester=${semester}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })"
    );

    // API subjects POST (Adding subject)
    c = c.replace(
        /fetch\('api_subjects\.html',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\}/g,
        "fetch('/api/subjects', {\n                            method: 'POST',\n                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }"
    );

    // API subjects DELETE (Deleting subject)
    c = c.replace(
        /fetch\('api_delete_subject\.html',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},\s*body:\s*JSON\.stringify\(\{ id: subjectId \}\)\s*\}\)/g,
        "fetch(`/api/subjects/${subjectId}`, {\n                            method: 'DELETE',\n                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }\n                        })"
    );

    // API subjects PUT (Editing subject)
    c = c.replace(
        /fetch\('api_edit_subject\.html',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},\s*body:\s*JSON\.stringify\(\{ id: subjectId, new_name: newName\.trim\(\) \}\)\s*\}\)/g,
        "fetch(`/api/subjects/${subjectId}`, {\n                            method: 'PUT',\n                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },\n                            body: JSON.stringify({ new_name: newName.trim() })\n                        })"
    );

    fs.writeFileSync(file, c);
    console.log(`Updated ${file}`);
}

updateFile('subjects.html');
updateFile('user_subjects.html');
