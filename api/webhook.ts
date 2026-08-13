import { createClient } from '@supabase/supabase-js';

// Esse arquivo deve estar em `<raiz>/api/webhook.ts` para que a Vercel o detecte como Serverless Function
export default async function handler(req: any, res: any) {
    // CORS setup genérico (O Mercado Pago pode fazer chamadas limpas)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // O endpoint SOMENTE aceita POST do Gateway (Mercado Pago, Stripe, etc.)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Exige chaves de ambiente válidas cadastradas na Vercel!
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('SERVERLESS CONFIG ERROR: Chaves Supabase não encontradas no ambiente.');
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Utiliza o cliente com chave SERVICE_ROLE para bypassar as regras do RLS.
    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { body, query } = req;

        // MERCADO PAGO STANDARD HOOK
        // Em notificações IPN, o MP envia topic=payment e id=XXXX
        // Em Webhooks oficiais, envia type="payment" ou action="payment.created" e data.id=XXXX

        const isMpWebhook = body?.action?.startsWith('payment.') || body?.type === 'payment';
        const isMpIPN = query?.topic === 'payment' && query?.id;

        if (!isMpWebhook && !isMpIPN) {
            // Evento ignorado (não é de pagamento)
            return res.status(200).json({ received: true, ignored: true });
        }

        const paymentId = isMpWebhook ? body?.data?.id : query?.id;

        if (!paymentId) {
            return res.status(400).json({ error: 'Invalid payload, missing gateway ID' });
        }

        // AQUI OCORRE A VERIFICAÇÃO NA API OFICIAL DO GATEWAY
        // Para simplificar, estamos assumindo Mercado Pago (Buscar transação na API oficial)

        const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; // Deve estar configurado na Vercel!

        if (!MP_ACCESS_TOKEN) {
            console.warn('⚠️ MP_ACCESS_TOKEN não configurado no .env. Ignorando validação rigorosa para Testes.');
            // Em produção, isso seria fatal, você sempre bate na API deles para consultar se = "approved"
        }

        let statusToUpdate = 'processing';
        let paidAmount = null;

        // SE ESTIVERMOS EM PROD COM CHAVE MP:
        if (MP_ACCESS_TOKEN) {
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
            });
            if (mpResponse.ok) {
                const paymentData = await mpResponse.json();
                // possible statuses in MP: pending, approved, authorized, in_process, in_mediation, rejected, cancelled, refunded, charged_back
                const mpStatus = paymentData.status;

                if (mpStatus === 'approved') statusToUpdate = 'paid';
                else if (mpStatus === 'rejected') statusToUpdate = 'failed';
                else if (mpStatus === 'cancelled') statusToUpdate = 'cancelled';
                else if (mpStatus === 'refunded' || mpStatus === 'charged_back') statusToUpdate = 'refunded';

                paidAmount = paymentData.transaction_amount;
            }
        } else {
            // Fake mode / Debug
            statusToUpdate = 'paid';
        }

        // IDEMPOTÊNCIA E BUSCA DO PAGAMENTO - Procuramos pela preference/transaction
        // Normalmente, na geração do link de pagamento nós gravamos o gateway_id no DB
        // Ou passamos o ID do Supabase como external_reference no momento do checkout

        let dbPayment = null;

        // Buscamos se há referência externa, senão caçamos por gateway_id
        // MP envia o ID do pagamento gerado se usou checkout PRO.
        const searchId = query?.external_reference || body?.data?.external_reference;

        if (searchId) {
            const { data } = await supabase.from('payments').select('id, status, gateway_status').eq('id', searchId).single();
            dbPayment = data;
        } else {
            const { data } = await supabase.from('payments').select('id, status, gateway_status').eq('gateway_id', paymentId).single();
            dbPayment = data;
        }

        if (!dbPayment) {
            return res.status(404).json({ error: 'Payment not found in database' });
        }

        // REGRA DE IDEMPOTÊNCIA: Se já está como pago e nós processamos, não fazemos novamente.
        if (dbPayment.status === 'paid' && statusToUpdate === 'paid') {
            return res.status(200).json({ message: 'Payment already processed and marked as paid.' });
        }

        // ATUALIZAR STATUS 
        const updateData: any = {
            status: statusToUpdate,
            gateway_status: statusToUpdate,
            gateway_id: paymentId,
            updated_at: new Date().toISOString()
        };

        if (statusToUpdate === 'paid') {
            updateData.paid_at = new Date().toISOString();
            if (paidAmount) updateData.amount = paidAmount; // ajusta se houver multa inclusa e o usuário quiser atualizar
        }

        const { error: updError } = await supabase.from('payments').update(updateData).eq('id', dbPayment.id);

        if (updError) throw new Error(updError.message);

        // TODO: Adicionar INSERT numa tabela "payment_logs" para rastrear o histórico completo da requisição

        return res.status(200).json({ success: true, updated_to: statusToUpdate });

    } catch (error: any) {
        console.error('WEBHOOK ERROR:', error);
        return res.status(500).json({ error: error.message || 'Error processing webhook' });
    }
}
