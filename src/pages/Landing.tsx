import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, CheckCircle2, ShieldCheck, Users, BarChart3, Smartphone, ChevronRight } from 'lucide-react';
import Logo from '../components/Logo';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Logo className="h-10" />
        </div>
        <div className="hidden md:flex gap-8 text-slate-600 dark:text-slate-400 font-medium">
          <a href="#features" className="hover:text-primary transition-colors">Recursos</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Planos</a>
          <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="px-6 py-2 rounded-full font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-2">
            <Users size={16} /> Área do Inquilino
          </Link>
          <Link to="/login" className="px-6 py-2 rounded-full font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
            Entrar
          </Link>
          <Link to="/register" className="px-6 py-2 bg-primary text-white rounded-full font-semibold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20">
            Começar Agora
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-bold mb-6 inline-block">
            Gestão Inteligente de Aluguéis
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight">
            Gerencie seus imóveis com <br />
            <span className="text-primary italic">total facilidade</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-12">
            A plataforma SaaS completa para proprietários que buscam profissionalismo no controle de inquilinos, contratos e pagamentos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/register" className="px-10 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-xl shadow-primary/30">
              Criar Conta Grátis <ChevronRight size={20} />
            </Link>
            <Link to="/login?demo=true" className="px-10 py-4 border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              Ver Demonstração
            </Link>
          </div>
        </motion.div>
        
        {/* Mockup Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-20 relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary rounded-3xl blur-3xl opacity-20"></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 md:p-8 max-w-5xl overflow-hidden">
            <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200" alt="Dashboard" className="rounded-2xl shadow-lg" />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50 dark:bg-slate-900 py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Tudo que você precisa em um só lugar</h2>
            <p className="text-slate-600 dark:text-slate-400">Ferramentas poderosas para simplificar sua vida como proprietário.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: <ShieldCheck className="text-primary" />, title: "Contratos Digitais", desc: "Armazene e gerencie contratos com total segurança e validade jurídica." },
              { icon: <Users className="text-primary" />, title: "Gestão de Inquilinos", desc: "Controle completo dos moradores, documentos e histórico de locação." },
              { icon: <BarChart3 className="text-primary" />, title: "Relatórios Financeiros", desc: "Visualize sua receita, pendências e lucros com gráficos intuitivos." },
              { icon: <Building2 className="text-primary" />, title: "Multiusuário", desc: "Ideal para quem possui um ou centenas de imóveis em diferentes locais." },
              { icon: <Smartphone className="text-primary" />, title: "Acesso Mobile", desc: "Aplicativo PWA otimizado para Android e iPhone. Acesse de qualquer lugar." },
              { icon: <CheckCircle2 className="text-primary" />, title: "Cobranças Automáticas", desc: "O sistema gera boletos e lembretes de pagamento automaticamente." },
            ].map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-slate-100 dark:border-slate-700">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Planos que crescem com você</h2>
            <p className="text-slate-600 dark:text-slate-400">Escolha o plano ideal para o tamanho do seu patrimônio.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: "Básico", price: "49", limit: "Até 5 imóveis", features: ["Gestão de Inquilinos", "Relatórios Básicos", "Suporte por E-mail"] },
              { name: "Profissional", price: "99", limit: "Até 20 imóveis", features: ["Gestão Completa", "Relatórios Financeiros", "Exportação PDF/Excel", "Suporte Prioritário"], popular: true },
              { name: "Premium", price: "199", limit: "Imóveis ilimitados", features: ["Tudo do Profissional", "Gestão Multi-Proprietário", "Consultoria Jurídica", "Suporte 24h"] },
            ].map((p, i) => (
              <div key={i} className={`relative p-8 rounded-3xl border ${p.popular ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-900`}>
                {p.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold">Mais Popular</span>
                )}
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">R${p.price}</span>
                  <span className="text-slate-500">/mês</span>
                </div>
                <p className="font-semibold text-primary mb-6">{p.limit}</p>
                <ul className="space-y-4 mb-8">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="text-secondary" size={18} /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className={`w-full py-3 rounded-xl font-bold transition-all ${p.popular ? 'bg-primary text-white hover:bg-opacity-90 shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  Selecionar {p.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-20">
        <div className="container mx-auto px-6 grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Logo className="h-10" variant="light" />
            </div>
            <p className="max-w-md">
              A solução definitiva para proprietários modernos que não abrem mão de uma gestão profissional e descomplicada.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Links Rápidos</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white">Home</a></li>
              <li><a href="#features" className="hover:text-white">Recursos</a></li>
              <li><a href="#pricing" className="hover:text-white">Planos</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-white">Privacidade</a></li>
              <li><a href="#" className="hover:text-white">LGPD</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-6 pt-12 border-t border-slate-800 text-center">
          <p>&copy; 2026 AlugaFácil. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
