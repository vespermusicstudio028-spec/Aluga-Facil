/**
 * paymentsUtils.ts
 * Funções centralizadas para criação e validação de cobranças.
 * REGRA PRINCIPAL: Criação de locação/contrato NUNCA deve gerar pagamento como 'paid'.
 * Status padrão sempre é 'pending'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Formata uma data para o campo de competência no padrão YYYY-MM
 */
export function formatCompetence(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

export interface CreatePaymentParams {
    supabase: SupabaseClient;
    ownerId: string;
    contractId?: string;
    propertyId: string;
    tenantId: string;
    amount: number;
    dueDate: Date | string;
    /** Nunca passar 'paid' aqui. Status padrão é sempre 'pending'. */
    status?: 'pending' | 'cancelled';
}

export interface EnsureResult {
    created: boolean;
    existing?: boolean;
    existingRecord?: {
        id: string;
        status: string;
        competence: string;
        due_date: string;
        amount: number;
    };
    error?: string;
}

/**
 * Garante que exista APENAS UMA cobrança por competência para o mesmo contrato/imóvel/inquilino.
 * Se já existir, retorna o registro existente sem criar duplicata.
 * Se não existir, cria com status 'pending'.
 *
 * NUNCA cria com status 'paid'. Isso é responsabilidade exclusiva da confirmação de pagamento.
 */
export async function ensureUniqueCharge(params: CreatePaymentParams): Promise<EnsureResult> {
    const { supabase, ownerId, contractId, propertyId, tenantId, amount, dueDate } = params;
    const competence = formatCompetence(dueDate);

    try {
        // 1. Verificar se já existe cobrança para esta competência
        const query = supabase
            .from('payments')
            .select('id, status, competence, due_date, amount')
            .eq('owner_id', ownerId)
            .eq('property_id', propertyId)
            .eq('tenant_id', tenantId)
            .eq('competence', competence)
            .not('status', 'in', '("cancelled","refunded")');

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            // Já existe — não criar duplicata
            return {
                created: false,
                existing: true,
                existingRecord: existing as any,
            };
        }

        // 2. Não existe — criar com status 'pending'
        const dueDateIso = typeof dueDate === 'string' ? dueDate : dueDate.toISOString();

        const insertData: Record<string, any> = {
            owner_id: ownerId,
            property_id: propertyId,
            tenant_id: tenantId,
            amount,
            due_date: dueDateIso,
            competence,
            status: 'pending', // SEMPRE pending. Nunca 'paid'.
            created_at: new Date().toISOString(),
        };

        if (contractId) {
            insertData.contract_id = contractId;
        }

        const { error } = await supabase.from('payments').insert(insertData);

        if (error) {
            // Conflict por constraint UNIQUE do banco — cobrança já existe
            if (error.code === '23505') {
                return { created: false, existing: true };
            }
            return { created: false, error: error.message };
        }

        return { created: true };
    } catch (err: any) {
        return { created: false, error: err.message };
    }
}
