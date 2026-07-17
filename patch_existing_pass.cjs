const fs = require('fs');
let code = fs.readFileSync('src/pages/NewTenantFlow.tsx', 'utf8');

const regex = /const sanitizedResidents = tenantData\.residents\.map\(r => \(\{\s*\.\.\.r,\s*documents: r\.documents \|\| \{[^\}]+\}\s*\}\)\);/g;

const replacement = `
            const sanitizedResidents = tenantData.residents.map(r => {
              let pass = r.password;
              if (!pass) {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
                pass = '';
                for (let i = 0; i < 7; i++) {
                  pass += chars.charAt(Math.floor(Math.random() * chars.length));
                }
              }
              return {
                ...r,
                password: pass,
                documents: r.documents || {
                  rgFront: '',
                  rgBack: '',
                  cpf: '',
                  residenceProof: '',
                  incomeProof: ''
                }
              };
            });
`;

code = code.replace(regex, replacement.trim());
fs.writeFileSync('src/pages/NewTenantFlow.tsx', code);
