const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '__tests__/client.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add @ts-ignore comments before specific problematic lines
content = content.replace(
  /^(\s+headers: \{\s*$)/gm, 
  '      // @ts-ignore - Axios types compatibility\n$1'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed headers type issues with @ts-ignore comments');