const fs = require('fs');
let code = fs.readFileSync('src/pages/NewTenantFlow.tsx', 'utf8');

const regexSubmit = /const handleSubmit = async \(\) => \{[\s\S]*?setIsLoading\(true\);/;

const replacementSubmit = `
  const handleSubmit = async () => {
    if (!user) {
      alert('Usuário não autenticado.');
      return;
    }
    if (!selectedProperty) {
      alert('Selecione um imóvel antes de finalizar.');
      return;
    }
    if (!contractAccepted) {
      alert('Você precisa aceitar os termos do contrato para finalizar.');
      return;
    }
    setIsLoading(true);
`;

code = code.replace(regexSubmit, replacementSubmit.trim());

const regexButton = /disabled=\{isLoading \|\| !contractAccepted\}/;
code = code.replace(regexButton, "disabled={isLoading}");

fs.writeFileSync('src/pages/NewTenantFlow.tsx', code);
