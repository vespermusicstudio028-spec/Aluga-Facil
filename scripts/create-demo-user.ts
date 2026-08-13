/**
 * Script para criar o usuário de demonstração.
 * Roda com: npx tsx scripts/create-demo-user.ts
 * 
 * Usa as variáveis de ambiente do .env do projeto (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const DEMO_EMAIL = 'demo@alugafacil.com';
const DEMO_PASSWORD = 'demo1234';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env');
    process.exit(1);
}

console.log(`📡 Conectando ao Supabase: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createDemoUser() {
    console.log(`\n🔧 Criando conta de demonstração: ${DEMO_EMAIL}`);

    // Tenta primeiro fazer login (se já existe)
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
    });

    if (!signInError) {
        console.log('✅ Conta de demonstração já existe e o login funciona!');
        console.log(`   Email: ${DEMO_EMAIL}`);
        console.log(`   Senha: ${DEMO_PASSWORD}`);

        // Garante que o perfil existe
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await ensureProfile(user.id);
        }
        return;
    }

    console.log('📝 Conta não encontrada, criando via signUp...');

    // Cria a conta
    const { data, error: signUpError } = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: {
            data: { name: 'Demo AlugaFácil' }
        }
    });

    if (signUpError) {
        console.error('❌ Erro ao criar conta:', signUpError.message);
        process.exit(1);
    }

    const userId = data.user?.id;
    if (!userId) {
        console.error('❌ Usuário criado mas sem ID retornado.');
        process.exit(1);
    }

    console.log(`✅ Conta criada com ID: ${userId}`);
    await ensureProfile(userId);

    console.log('\n🎉 Tudo pronto! Usuário demo configurado:');
    console.log(`   Email: ${DEMO_EMAIL}`);
    console.log(`   Senha: ${DEMO_PASSWORD}`);
    console.log(`\n⚠️  Se o Supabase exigir confirmação de e-mail, acesse o painel`);
    console.log('   Authentication > Users e confirme manualmente o e-mail do usuário demo.');
}

async function ensureProfile(userId: string) {
    console.log('🔍 Verificando perfil na tabela profiles...');

    // Tenta inserir o perfil (ON CONFLICT não faz nada se já existir)
    const { error } = await supabase.from('profiles').upsert({
        id: userId,
        email: DEMO_EMAIL,
        name: 'Demo AlugaFácil',
        role: 'owner',
        plan: 'professional',
        status: 'active',
        plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
    }, { onConflict: 'id' });

    if (error) {
        console.warn('⚠️  Aviso ao criar perfil (pode já existir):', error.message);
    } else {
        console.log('✅ Perfil configurado com plano Professional por 30 dias');
    }
}

createDemoUser().catch(console.error);
