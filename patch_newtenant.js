const fs = require('fs');
let code = fs.readFileSync('src/pages/NewTenantFlow.tsx', 'utf8');

// Add state
code = code.replace("const [isLoading, setIsLoading] = useState(false);", "const [isLoading, setIsLoading] = useState(false);\n  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});");

// Add generate function
const generateFn = `
  const generateRandomPassword = (index: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 7; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleResidentChange(index, 'password', password);
  };
`;
code = code.replace("function createEmptyResident", generateFn + "\n  function createEmptyResident");

fs.writeFileSync('src/pages/NewTenantFlow.tsx', code);
