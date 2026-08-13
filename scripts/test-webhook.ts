import 'dotenv/config'; // loads .env
import handler from '../api/webhook';
import { createClient } from '@supabase/supabase-js';

async function runTest() {
    console.log('Iniciando Simulação de Webhook...');

    // 1. Instanciar Supabase para pegar um pagamento "pending" e simular que é ele sendo pago
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configure o `.env` (ou ambiente local) com VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Pega uma cobrança pendente (se houver)
    const { data: payments } = await supabase.from('payments').select('id').eq('status', 'pending').limit(1);

    if (!payments || payments.length === 0) {
        console.log('Nenhuma cobrança "pending" encontrada no banco para simular webhook.');
        console.log('Por favor, acesse o painel (Proprietário ou Inquilino) e gere uma fatura primeiro!');
        return;
    }

    const paymentToTest = payments[0];
    console.log(`Encontrado pagamento pendente: [${paymentToTest.id}]`);
    console.log('Simulando envio de payload do Mercado Pago (action: payment.created)...');

    // 2. Mock Vercel Request and Response objects
    const mockReq = {
        method: 'POST',
        body: {
            action: 'payment.created',
            data: {
                id: '123456789_MOCK_PAYMENT',
                external_reference: paymentToTest.id // Our DB ID passed back by MP
            }
        }
    };

    const mockRes = {
        setHeader: (k: string, v: string) => { },
        status: function (code: number) {
            this.statusCode = code;
            return this;
        },
        json: function (data: any) {
            console.log(`[Webhook Output] Status Code: ${this.statusCode}`);
            console.log(`[Webhook Output] Body:`, data);
            return this;
        },
        end: function () { }
    };

    // 3. Invocar a serverless function diretamente
    console.log('- Chamando api/webhook.ts handler...');
    // Force ignoring MP fetch by emptying the token temporarily if we just want to force 'paid'
    // Or in our script, if MP_ACCESS_TOKEN isn't valid, it falls back to Fake Mode / Debug = array of fake data.
    // Wait, I implemented Fake Mode inside webhook.ts if MP_ACCESS_TOKEN is missing! 

    const originalToken = process.env.MP_ACCESS_TOKEN;
    delete process.env.MP_ACCESS_TOKEN; // force fake mode

    await handler(mockReq, mockRes);

    process.env.MP_ACCESS_TOKEN = originalToken; // restore

    console.log('Teste concluído!');
}

runTest();
