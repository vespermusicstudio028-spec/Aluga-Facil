import { useState } from 'react';

export const useViaCEP = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchAddress = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) {
            setError('CEP inválido');
            return null;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();

            if (data.erro) {
                setError('CEP não encontrado');
                return null;
            }

            return data;
        } catch (err) {
            setError('Erro ao buscar CEP');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { fetchAddress, loading, error };
};
