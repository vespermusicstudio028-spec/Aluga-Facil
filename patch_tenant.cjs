const fs = require('fs');
let code = fs.readFileSync('src/pages/TenantDashboard.tsx', 'utf8');

code = code.replace("payList.sort((a, b) => b.dueDate.toDate().getTime() - a.dueDate.toDate().getTime());", "payList.sort((a: any, b: any) => b.dueDate.toDate().getTime() - a.dueDate.toDate().getTime());");

fs.writeFileSync('src/pages/TenantDashboard.tsx', code);
