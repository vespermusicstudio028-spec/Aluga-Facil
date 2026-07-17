const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

// Add loginMode state
code = code.replace("const [isLoading, setIsLoading] = useState(false);", "const [isLoading, setIsLoading] = useState(false);\n  const [loginMode, setLoginMode] = useState<'owner' | 'tenant'>('owner');\n  const [tenantCpf, setTenantCpf] = useState('');\n  const [tenantPassword, setTenantPassword] = useState('');");

// Update imports
code = code.replace("import { Building2, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';", "import { Building2, Mail, Lock, Eye, EyeOff, AlertCircle, User } from 'lucide-react';\nimport { collection, query, where, getDocs } from 'firebase/firestore';\nimport { db } from '../firebase/config';");

// Handle tenant login function
const tenantLoginFn = `
  const handleTenantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const q = query(
        collection(db, 'tenants')
      );
      const snap = await getDocs(q);
      let foundTenant = null;
      let foundPropertyId = '';
      
      for (const doc of snap.docs) {
        const tenantData = doc.data();
        const residents = tenantData.residents || [];
        const match = residents.find((r: any) => 
          r.cpf === tenantCpf && r.password === tenantPassword
        );
        if (match) {
          foundTenant = { id: doc.id, ...tenantData };
          break;
        }
      }
      
      if (foundTenant) {
        // Store in localStorage for tenant session
        localStorage.setItem('tenantSession', JSON.stringify(foundTenant));
        navigate('/tenant-dashboard');
      } else {
        setError('CPF ou Senha inválidos.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
`;
code = code.replace("  const onSubmit = async (data: LoginForm) => {", tenantLoginFn + "\n  const onSubmit = async (data: LoginForm) => {");

// Add mode switch tabs
const tabs = `
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-8">
          <button
            onClick={() => setLoginMode('owner')}
            className={\`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all \${loginMode === 'owner' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}\`}
          >
            Sou Proprietário
          </button>
          <button
            onClick={() => setLoginMode('tenant')}
            className={\`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all \${loginMode === 'tenant' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}\`}
          >
            Sou Inquilino
          </button>
        </div>
`;
code = code.replace("        {error && (", tabs + "\n        {error && (");

const formReplacement = `
        {loginMode === 'owner' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  {...register('email')}
                  className={\`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border \${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white\`}
                  placeholder="seu@email.com"
                />
              </div>
              {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  className={\`w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border \${errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white\`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Entrar na Conta'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTenantLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">CPF (Apenas números)</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={tenantCpf}
                  onChange={(e) => setTenantCpf(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                  placeholder="00000000000"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Senha (7 dígitos)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={tenantPassword}
                  onChange={(e) => setTenantPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                  placeholder="•••••••"
                  maxLength={7}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Acessar Painel do Inquilino'}
            </button>
          </form>
        )}
`;

code = code.replace(/<form onSubmit=\{handleSubmit\(onSubmit\)\}.*<\/form>/s, formReplacement);

fs.writeFileSync('src/pages/Login.tsx', code);
