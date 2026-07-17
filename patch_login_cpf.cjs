const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const replacement = `
      for (const doc of snap.docs) {
        const tenantData = doc.data();
        const residents = tenantData.residents || [];
        const match = residents.find((r: any) => {
          const rCpf = (r.cpf || '').replace(/\\D/g, '');
          const inputCpf = (tenantCpf || '').replace(/\\D/g, '');
          return rCpf === inputCpf && r.password === tenantPassword;
        });
        if (match) {
          foundTenant = { id: doc.id, ...tenantData };
          break;
        }
      }
`;

code = code.replace(/for \(const doc of snap\.docs\) \{[\s\S]*?break;\s*\}\s*\}/, replacement.trim());

fs.writeFileSync('src/pages/Login.tsx', code);
