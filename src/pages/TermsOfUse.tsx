import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import Logo from '../components/Logo';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export default function TermsOfUse() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <nav className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <Logo className="h-10" />
                <Link to="/" className="text-slate-500 hover:text-primary transition-colors font-medium">
                    Voltar para Home
                </Link>
            </nav>

            <main className="container mx-auto px-6 py-12 max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-800 prose prose-slate dark:prose-invert max-w-none">
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-4">
                            <FileText className="text-primary w-12 h-12" />
                            Termos de Uso
                        </h1>
                        <p className="lead text-xl text-slate-600 dark:text-slate-400">
                            Leia cuidadosamente estes termos antes de utilizar os nossos serviços de Sistema SaaS em Controle Imobiliário. O acesso e o uso indicam conformidade irrevogável às diretrizes desta plataforma.
                        </p>

                        <h2 className="text-2xl font-bold mt-10 mb-4 flex items-center gap-2"><CheckCircle2 className="text-primary" /> 1. Serviços Ofertados e Responsabilidades</h2>
                        <p>O AlugaFácil qualifica-se como um provisor de ambiente e infraestrutura virtual "SaaS" para proprietários (Licenciados) consolidarem dados de imóveis, inquilinos, faturas e contratos próprios. <strong>Aviso Importante: Nenhuma relação locatícia é endossada, assegurada ou gerida em preposto pela empresa AlugaFácil.</strong> Somos apenas uma infraestrutura neutra tecnológica.</p>

                        <h2 className="text-2xl font-bold mt-10 mb-4 flex items-center gap-2"><AlertCircle className="text-amber-500" /> 2. Direitos e Deveres do Usuário</h2>
                        <p>Ao concordar com nossos termos de licença, você declara que:</p>
                        <ul>
                            <li>É responsável legalmente perante o Brasil (Lei das Locações e LGPD) por todas as chaves PIIs de terceiros (inquilinos) subidas artificialmente via nossos forms para seus módulos isolados.</li>
                            <li>Atesta pela veracidade e lícita competência para ofertar os imóveis catalogados sob sua posse.</li>
                            <li>Não engajará com uso fraudulento ou tentativas de estelionato cibernético sob a máscara do portal AlugaFácil, e é inteiramente reponsável com sua credencial de acesso.</li>
                        </ul>

                        <h2 className="text-2xl font-bold mt-10 mb-4">3. Planos e Suspensões de Relacionamento</h2>
                        <p>O AlugaFácil possui uma escala global de planos (TRIAL e Premium Modos). Reservamos o controle absoluto em encerar e/ou pausar operações para inquilinos que descumprirem renovações de assinaturas. Uma fatura pendente expira o acesso da dashboard até reconciliação bancária que reabilite seu período (mantendo, contudo, acesso à Central de Privacidade incondicionalmente).</p>

                        <h2 className="text-2xl font-bold mt-10 mb-4 flex items-center gap-2"><AlertTriangle className="text-red-500" /> 4. Limitação de Responsabilidade Civil</h2>
                        <p>Até a exata medida propiciada e admitida, o provisor da Plataforma declina perdas oriundas de lucros cessantes, acidentes indiretos em locação e estragos estruturais decorrentes de quebras de contrato de outrem. Todos os "Geradores de PDF" de contratos servem como templating customizável. Revisão de advogado do Landlord é recomendada prévia ao aceite digital.</p>

                        <h2 className="text-2xl font-bold mt-10 mb-4">5. Propriedade Intelectual e Foro</h2>
                        <p>A arquitetura front-end, o banco de dados e layout comercial remetem-se à propriedade de investimento do desenvolvedor. A replicação, engenharia reversa sob cópia são enquadradas na regulamentação do código autoral.</p>
                        <p>Ressalvada a convenção que estes termos vigoram pelo Tribunal Central competente de São Paulo-SP, renuncia-se previamente a eventuais demais fóruns.</p>

                        <p className="mt-12 text-sm text-slate-500 font-bold">
                            Última atualização: {new Date().toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
