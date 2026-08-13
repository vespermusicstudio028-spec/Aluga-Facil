/**
 * Cria o usuário demo usando a API REST do Supabase Auth diretamente (sem supabase-js).
 * Roda com: node --env-file=.env scripts/create-demo-user.mjs
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const DEMO_EMAIL = 'demo@alugafacil.com';
const DEMO_PASSWORD = 'demo1234';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env');
    process.exit(1);
}

console.log(`📡 Supabase: ${SUPABASE_URL}`);

async function main() {
    // 1. Tenta login primeiro
    console.log('\n🔑 Tentando login com conta demo existente...');
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
    });
    const loginData = await loginRes.json();

    if (loginData.access_token) {
        console.log('✅ Conta demo já existe e login funciona!');
        await upsertProfile(loginData.access_token, loginData.user.id);
        console.log(`\n🎉 Pronto!\n   Email: ${DEMO_EMAIL}\n   Senha: ${DEMO_PASSWORD}`);
        return;
    }

    // 2. Cria via signUp
    console.log('📝 Conta não encontrada. Criando via signUp...');
    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
            data: { name: 'Demo AlugaFácil' }
        })
    });
    const signupData = await signupRes.json();

    const userId = signupData?.user?.id ?? signupData?.id;
    if (!userId) {
        console.error('❌ Falha no signUp:', JSON.stringify(signupData, null, 2));
        console.log('\n💡 SOLUÇÃO MANUAL:');
        console.log('   1. Acesse o painel do Supabase: https://app.supabase.com');
        console.log('   2. Vá em Authentication > Users');
        console.log('   3. Clique em "Invite User" ou "Add User"');
        console.log(`   4. Email: ${DEMO_EMAIL}`);
        console.log(`   5. Senha: ${DEMO_PASSWORD}`);
        process.exit(1);
    }

    console.log(`✅ Usuário criado: ${userId}`);

    // 3. Faz login com o novo usuário para pegar o token
    const loginRes2 = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
    });
    const loginData2 = await loginRes2.json();

    if (loginData2.access_token) {
        await upsertProfile(loginData2.access_token, userId);
    } else {
        console.warn('⚠️  Login pós-criação falhou (email pode precisar de confirmação).');
        console.log('   Acesse o painel Supabase > Authentication > Users > Confirme o email do demo.');
    }

    console.log(`\n🎉 Pronto!\n   Email: ${DEMO_EMAIL}\n   Senha: ${DEMO_PASSWORD}`);
}

async function upsertProfile(token, userId) {
    console.log('🔍 Atualizando perfil na tabela profiles...');
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
            id: userId,
            email: DEMO_EMAIL,
            name: 'Demo AlugaFácil',
            role: 'owner',
            plan: 'professional',
            status: 'active',
            plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
    });

    if (profileRes.ok || profileRes.status === 201) {
        console.log('✅ Perfil configurado (Professional, 30 dias)');
    } else {
        const err = await profileRes.text();
        console.warn('⚠️  Aviso no perfil:', err);
    }
}

main().catch(err => {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
});
