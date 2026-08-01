import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import {
    ShieldCheck, CheckCircle2, Lock,
    RefreshCw, Cookie, Download, UserX, Info
} from 'lucide-react';
import Logo from '../components/Logo';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
                            <ShieldCheck className="text-primary w-12 h-12" />
                            Política de Privacidade
                        </h1>
                        <p className="lead text-xl text-slate-600 dark:text-slate-400">
                            A sua privacidade é importante para nós. Esta Política de Privacidade descreve como o AlugaFácil (operado comercialmente e protegido sob a Lei Geral de Proteção de Dados - Lei n° 13.709/2018) coleta, usa e compartilha seus dados pessoais.
                        </p>

                        <h2 className="text-2xl font-bold mt-10 mb-4 flex items-center gap-2"><Info className="text-primary" /> 1. Dados Coletados</h2>
                        <p>Coletamos os seguintes tipos de informações visando a prestação correta do nosso SaaS de gerenciamento de imóveis:</p>
                        <ul>
                            <li><strong>Dados de Conta:</strong> Nome, E-mail, Senha e URL de imagem de avatar (quando associado a provedores de Login como Google).</li>
                            <li><strong>Dados de Portfólio:</strong> Informações de imóveis cadastrados, endereços, valores financeiros e status.</li>
                            <li><strong>Dados de Inquilinos:</strong> Informações de terceiros cadastradas por proprietários (os quais assumem o papel de Controlador de Dados), incluindo nomes, CPF/RG sob guarda legal justificada de contrato locatício.</li>
                            <li><strong>Cookies e Analytics:</strong> Identificadores não-pessoais de dispositivo, cookies de sessão para funcionamento da aplicação, e dados estatísticos mediante consentimento prévio do usuário.</li>
                        </ul>

                        <h2 className="text-2xl font-bold mt-10 mb-4 flex items-center gap-2"><CheckCircle2 className="text-primary" /> 2. Finalidade da Coleta e Base Legal</h2>
                        <p>A coleta e processamento possuem as bases legais firmadas no Artigo 7º da LGPD:</p>
                        <ul>
                            <li><strong>Execução de Contrato:</strong> Os dados processados pelo AlugaFácil visam entregar a solução de SaaS de gestão patrimonial acordada no ato do registro da conta.</li>
                            <li><strong>Obrigação Legal:</strong> Retenção de faturas e log transacional contábil caso requerido pelo fisco.</li>
                            <li><strong>Consentimento:</strong> Para disparos de campanhas de Marketing ou Cookies não essenciais.</li>
                        </ul>

                        <h2 className="text-2xl font-bold mt-10 mb-4 flex items-center gap-2"><RefreshCw className="text-primary" /> 3. Compartilhamento e Armazenamento no Supabase</h2>
                        <p>Seus dados estão protegidos e não são vendidos ou trocados com terceiros. Nossos servidores utilizam a infraestrutura nativa do <strong>Supabase</strong> (provedor cloud certificado e seguro, hospedado na AWS). Para o processamento da funcionalidade básica, garantimos as seguintes camadas:</p>
                        <ul>
                            <li>Comunicações via protocolo de criptografia TLS em trânsito.</li>
                            <li>Criptografia avançada em modo passivo (at-rest encryption).</li>
                            <li>Filtragem granular Row Level Security (RLS) proibindo acesso intrusivo inter-proprietário.</li>
                        </ul>

                        <h2 className="text-2xl font-bold mt-10 mb-4">4. Tempo de Retenção e Ciclo de Vida</h2>
                        <p>Os dados serão armazenados apenas pelo tempo necessário para prestação do serviço ou mediante requisito legal. Em caso de inativação, mantemos registros até 5 anos para proteção contra contenciosos judiciais.</p>

                        <h2 className="text-2xl font-bold mt-10 mb-4 flex items-center gap-2"><UserX className="text-primary" /> 5. Direitos do Titular</h2>
                        <p>Sob a ótica da LGPD (Art. 18), você, titular de dados, garante possuir direito integral sobre suas PIIs, podendo a qualquer momento:</p>
                        <ul>
                            <li><strong>Acesso e Portabilidade:</strong> Baixar todos os dados em cópia íntegra JSON.</li>
                            <li><strong>Exclusão:</strong> Solicitar o "Direito ao Esquecimento" por meio do nosso botão destrutivo que erradica sua conta em definitivo.</li>
                            <li><strong>Anonimização e Bloqueio:</strong> Limitar cookies estatísticos ou marketing.</li>
                        </ul>

                        <h2 className="text-2xl font-bold mt-10 mb-4">6. Cookies</h2>
                        <p>Nós usamos cookies indispensáveis (para controle seguro da sessão auth) e analíticos, cujo manuseio é controlado dinamicamente por você pela <strong>Central de Privacidade</strong> vinculada ao seu login ou popup global do site.</p>

                        <h2 className="text-2xl font-bold mt-10 mb-4">7. Fale com nosso Encarregado (DPO)</h2>
                        <p>Quaisquer dúvidas para a gestão da privacidade podem ser direcionadas a nossa área de Compliance no momento da interação, através do e-mail: <strong>privacidade@alugafacil.com.br</strong></p>

                        <p className="mt-12 text-sm text-slate-500 font-bold">
                            Última atualização: {new Date().toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
