import React, { useState } from 'react';
import { Phone, Mail, MapPin, Users, Key, EyeOff, Eye, RefreshCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TenantProfileProps {
    tenant: any;
    property: any;
    setTenant: (t: any) => void;
}

export default function TenantProfile({ tenant, property, setTenant }: TenantProfileProps) {
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');

    const titular = tenant?.residents?.find((r: any) => r.isTitular) || tenant?.residents?.[0];
    const otherResidents = tenant?.residents?.filter((r: any) => !r.isTitular) || [];

    const handleUpdatePassword = async () => {
        if (!newPassword || newPassword.length < 4) {
            setPasswordMessage('A senha deve ter pelo menos 4 caracteres.');
            return;
        }

        setIsSavingPassword(true);
        setPasswordMessage('');

        try {
            const { error } = await supabase.rpc('update_tenant_password', {
                p_tenant_id: tenant.id,
                p_new_password: newPassword
            });

            if (error) throw error;

            setPasswordMessage('Senha alterada com sucesso!');
            const updatedTenant = { ...tenant, password: newPassword };
            localStorage.setItem('tenantSession', JSON.stringify(updatedTenant));
            setTenant(updatedTenant);

            setTimeout(() => {
                setIsChangingPassword(false);
                setPasswordMessage('');
                setNewPassword('');
            }, 3000);
        } catch (err: any) {
            console.error(err);
            setPasswordMessage('Erro ao alterar senha.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-start">
                {titular?.photo ? (
                    <img src={titular.photo} alt={titular.name} className="w-24 h-24 rounded-full object-cover border-4 border-primary/10" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-400">
                        {titular?.name?.charAt(0) || 'U'}
                    </div>
                )}
                <div className="flex-1">
                    <h2 className="text-2xl font-bold">{titular?.name}</h2>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                        {titular?.phone && <span className="flex items-center gap-1"><Phone size={14} /> {titular.phone}</span>}
                        {titular?.email && <span className="flex items-center gap-1"><Mail size={14} /> {titular.email}</span>}
                    </div>
                    {property && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-semibold">
                            <MapPin size={16} />
                            {property.name}
                        </div>
                    )}
                    <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                        {!isChangingPassword ? (
                            <button
                                onClick={() => setIsChangingPassword(true)}
                                className="text-sm font-bold text-slate-500 hover:text-primary flex items-center gap-2 transition-colors"
                            >
                                <Key size={16} /> Mudar Senha de Acesso
                            </button>
                        ) : (
                            <div className="max-w-sm space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nova Senha</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Digite a nova senha..."
                                        className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>

                                {passwordMessage && (
                                    <p className={`text-xs font-bold ${passwordMessage.includes('Erro') || passwordMessage.includes('caracteres') ? 'text-red-500' : 'text-green-500'}`}>
                                        {passwordMessage}
                                    </p>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleUpdatePassword}
                                        disabled={isSavingPassword}
                                        className="flex-1 bg-primary text-white py-2 rounded-xl text-sm font-bold hover:bg-opacity-90 transition-all flex justify-center items-center gap-2"
                                    >
                                        {isSavingPassword ? <RefreshCcw size={16} className="animate-spin" /> : 'Salvar'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsChangingPassword(false);
                                            setPasswordMessage('');
                                            setNewPassword('');
                                        }}
                                        className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 py-2 rounded-xl text-sm font-bold transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Users size={20} className="text-primary" />
                    Moradores ({tenant?.residents?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tenant?.residents?.map((r: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            {r.photo ? (
                                <img src={r.photo} alt={r.name} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                                    {r.name?.charAt(0) || 'M'}
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white">{r.name}</p>
                                <p className="text-xs text-slate-500">{r.isTitular ? 'Titular' : 'Dependente'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
