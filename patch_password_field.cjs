const fs = require('fs');
let code = fs.readFileSync('src/pages/NewTenantFlow.tsx', 'utf8');

const passwordField = `
                    {resident.isTitular && (
                      <div className="mt-6 p-6 bg-primary/5 rounded-2xl border border-primary/20">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <Key size={20} className="text-primary" />
                              Senha de Acesso do Inquilino
                            </h4>
                            <p className="text-sm text-slate-500">Senha para o inquilino acessar o painel com CPF e senha.</p>
                          </div>
                          <button
                            onClick={() => generateRandomPassword(index)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all"
                          >
                            <RefreshCw size={16} />
                            Gerar Senha
                          </button>
                        </div>
                        <div className="relative">
                          <input 
                            type={showPasswords[index] ? "text" : "password"}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white font-mono text-lg tracking-wider"
                            value={resident.password || ''}
                            onChange={(e) => handleResidentChange(index, 'password', e.target.value)}
                            placeholder="Ex: A7!k2P9"
                            maxLength={7}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(index)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            {showPasswords[index] ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                    )}
`;

code = code.replace("                    <div className=\"mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4\">", passwordField + "\n                    <div className=\"mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4\">");

// Need to import RefreshCw
code = code.replace("EyeOff,", "EyeOff,\n  RefreshCw,");

fs.writeFileSync('src/pages/NewTenantFlow.tsx', code);
