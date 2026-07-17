const fs = require('fs');
let code = fs.readFileSync('src/pages/NewTenantFlow.tsx', 'utf8');

code = code.replace(
  "maxLength={7}",
  "maxLength={7}\n                            readOnly"
);
code = code.replace(
  "onChange={(e) => handleResidentChange(index, 'password', e.target.value)}",
  "// onChange not needed since it's readOnly"
);

fs.writeFileSync('src/pages/NewTenantFlow.tsx', code);
