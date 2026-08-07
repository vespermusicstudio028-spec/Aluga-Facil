import React from 'react';
import { ContractStatus, TenantStatus } from '../types';
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    XOctagon,
    RefreshCw,
    Home,
    UserX,
    ShieldOff,
    User,
} from 'lucide-react';

// ─── Contract Status ────────────────────────────────────────────────────────

interface ContractConfig {
    label: string;
    icon: React.ReactNode;
    badgeClass: string;
    tooltip: string;
}

const CONTRACT_CONFIG: Record<string, ContractConfig> = {
    // New professional status
    ativo: {
        label: 'Ativo',
        icon: <CheckCircle2 size={12} />,
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        tooltip: 'Contrato vigente e em andamento',
    },
    encerrado: {
        label: 'Encerrado',
        icon: <XCircle size={12} />,
        badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        tooltip: 'Contrato encerrado normalmente ao fim do prazo',
    },
    rescindido: {
        label: 'Rescindido',
        icon: <XOctagon size={12} />,
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        tooltip: 'Contrato rescindido antes do prazo estipulado',
    },
    cancelado: {
        label: 'Cancelado',
        icon: <AlertTriangle size={12} />,
        badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        tooltip: 'Contrato cancelado antes de iniciar',
    },
    em_renovacao: {
        label: 'Em Renovação',
        icon: <RefreshCw size={12} />,
        badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        tooltip: 'Contrato aguardando renovação',
    },
    // Legacy status mapped to nearest equivalent
    active: {
        label: 'Ativo',
        icon: <CheckCircle2 size={12} />,
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        tooltip: 'Contrato vigente e em andamento',
    },
    closed: {
        label: 'Encerrado',
        icon: <XCircle size={12} />,
        badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        tooltip: 'Contrato encerrado',
    },
    pending: {
        label: 'Pendente',
        icon: <AlertTriangle size={12} />,
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        tooltip: 'Contrato aguardando assinatura',
    },
    signed_tenant: {
        label: 'Assinado (Inquilino)',
        icon: <CheckCircle2 size={12} />,
        badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        tooltip: 'Aguardando assinatura do proprietário',
    },
    signed_all: {
        label: 'Assinado',
        icon: <CheckCircle2 size={12} />,
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        tooltip: 'Assinado por todos os envolvidos',
    },
};

// ─── Tenant Status ───────────────────────────────────────────────────────────

interface TenantConfig {
    label: string;
    icon: React.ReactNode;
    badgeClass: string;
    tooltip: string;
}

const TENANT_CONFIG: Record<TenantStatus, TenantConfig> = {
    ativo: {
        label: 'Locação Ativa',
        icon: <Home size={12} />,
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        tooltip: 'Inquilino está morando em um imóvel',
    },
    sem_imovel: {
        label: 'Sem Imóvel',
        icon: <User size={12} />,
        badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        tooltip: 'Não possui imóvel vinculado no momento',
    },
    ex_inquilino: {
        label: 'Ex-Inquilino',
        icon: <UserX size={12} />,
        badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        tooltip: 'Já alugou imóvel anteriormente',
    },
    bloqueado: {
        label: 'Bloqueado',
        icon: <ShieldOff size={12} />,
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        tooltip: 'Cadastro bloqueado pelo proprietário',
    },
};

// ─── Components ──────────────────────────────────────────────────────────────

interface ContractStatusBadgeProps {
    status: ContractStatus | string;
    size?: 'sm' | 'md';
}

export function ContractStatusBadge({ status, size = 'md' }: ContractStatusBadgeProps) {
    const config = CONTRACT_CONFIG[status] || {
        label: status,
        icon: null,
        badgeClass: 'bg-slate-100 text-slate-600',
        tooltip: '',
    };

    const sizeClass = size === 'sm'
        ? 'text-[10px] px-2 py-0.5 gap-1'
        : 'text-xs px-2.5 py-1 gap-1.5';

    return (
        <span
            title={config.tooltip}
            className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider transition-all cursor-help ${sizeClass} ${config.badgeClass}`}
        >
            {config.icon}
            {config.label}
        </span>
    );
}

interface TenantStatusBadgeProps {
    tenantStatus?: TenantStatus;
    /** Fallback: legacy status field */
    legacyStatus?: string;
    /** Fallback: if property_id is set, assume active */
    hasProperty?: boolean;
    size?: 'sm' | 'md';
}

export function TenantStatusBadge({
    tenantStatus,
    legacyStatus,
    hasProperty,
    size = 'md',
}: TenantStatusBadgeProps) {
    // Resolve effective status
    let resolved: TenantStatus = 'sem_imovel';

    if (tenantStatus) {
        resolved = tenantStatus;
    } else if (legacyStatus === 'inactive') {
        resolved = 'ex_inquilino';
    } else if (legacyStatus === 'active' || hasProperty) {
        resolved = 'ativo';
    } else {
        resolved = 'sem_imovel';
    }

    const config = TENANT_CONFIG[resolved];
    const sizeClass = size === 'sm'
        ? 'text-[10px] px-2 py-0.5 gap-1'
        : 'text-xs px-2.5 py-1 gap-1.5';

    return (
        <span
            title={config.tooltip}
            className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider transition-all cursor-help ${sizeClass} ${config.badgeClass}`}
        >
            {config.icon}
            {config.label}
        </span>
    );
}

export { CONTRACT_CONFIG, TENANT_CONFIG };
