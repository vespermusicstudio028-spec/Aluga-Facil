const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("import Settings from './pages/Settings';", "import Settings from './pages/Settings';\nimport TenantDashboard from './pages/TenantDashboard';");
code = code.replace("<Route path=\"/login\" element={<Login />} />", "<Route path=\"/login\" element={<Login />} />\n      <Route path=\"/tenant-dashboard\" element={<TenantDashboard />} />");

fs.writeFileSync('src/App.tsx', code);
