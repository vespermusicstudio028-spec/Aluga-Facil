const fs = require('fs');
let code = fs.readFileSync('src/pages/NewTenantFlow.tsx', 'utf8');

const replacement = `
  const handleSubmit = async () => {
    if (!user) {
      alert('Usuário não autenticado.');
      return;
    }
    if (!selectedProperty) {
      alert('Selecione um imóvel antes de finalizar.');
      return;
    }
    setIsLoading(true);
`;

code = code.replace("  const handleSubmit = async () => {\n    if (!selectedProperty || !user) return;\n    setIsLoading(true);", replacement.trim());

fs.writeFileSync('src/pages/NewTenantFlow.tsx', code);
