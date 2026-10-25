const fs = require('fs');
const filePath = 'MathQuest/apps/web/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove FloatingDevControls completely
const floatingDevControlsRegex = /function FloatingDevControls\(\) \{[\s\S]*?^}/m;
content = content.replace(floatingDevControlsRegex, '// Floating dev controls removed per UI requirements');

// 2. Remove <FloatingDevControls /> usage in App()
content = content.replace(/<FloatingDevControls \/>\r?\n/, '');

// 3. Ensure both /agent-test and /test/agent routes work for direct URL access
if (!content.includes('path="/test/agent"')) {
  content = content.replace(
    '<Route path="/agent-test" element={<AgentTestPage />} />',
    '<Route path="/agent-test" element={<AgentTestPage />} />\n          <Route path="/test/agent" element={<AgentTestPage />} />'
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx updated successfully!');
