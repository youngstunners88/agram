const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern) {
  const results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(file)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

const issues = [];
const components = findFiles('./components', /\.tsx$/);
const pages = findFiles('./app', /\.tsx$/);
const allFiles = [...components, ...pages];

console.log(`Checking ${allFiles.length} files...`);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  
  // Check for useEffect without dependency array
  const badEffect = content.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*\)/);
  if (badEffect) {
    issues.push(`${file}: useEffect without dependency array`);
  }
  
  // Check for async in useEffect
  const asyncEffect = content.match(/useEffect\s*\(\s*async/);
  if (asyncEffect) {
    issues.push(`${file}: async function directly in useEffect`);
  }
  
  // Check for any types
  const anyTypes = content.match(/:\s*any\b/g);
  if (anyTypes) {
    issues.push(`${file}: ${anyTypes.length} 'any' type(s)`);
  }
  
  // Check for console.log in production code
  const consoleLogs = content.match(/console\.(log|warn|error)\(/g);
  if (consoleLogs && !file.includes('page.tsx')) {
    issues.push(`${file}: ${consoleLogs.length} console statement(s)`);
  }
}

console.log('\n=== FRONTEND AUDIT RESULTS ===');
console.log(`Files checked: ${allFiles.length}`);
console.log(`Issues found: ${issues.length}`);
issues.forEach(i => console.log(`- ${i}`));
