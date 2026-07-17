const fs = require('fs');
let code = fs.readFileSync('src/pages/NewTenantFlow.tsx', 'utf8');

const createResidentFn = `
  function createEmptyResident(isTitular = false): Resident {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let defaultPassword = '';
    for (let i = 0; i < 7; i++) {
      defaultPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return {
      name: '',
      cpf: '',
      rg: '',
      birthDate: '',
      phone: '',
      email: '',
      profession: '',
      maritalStatus: '',
      isTitular,
      password: defaultPassword,
      documents: {}
    };
  }
`;

// Replace the old createEmptyResident function
const regex = /function createEmptyResident\(isTitular = false\): Resident \{[\s\S]*?documents: \{\}\s*\};\s*\}/;
code = code.replace(regex, createResidentFn.trim());

fs.writeFileSync('src/pages/NewTenantFlow.tsx', code);
