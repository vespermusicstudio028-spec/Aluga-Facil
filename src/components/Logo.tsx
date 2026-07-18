import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  /** 'auto' adapta ao fundo (padrão), 'light' força versão clara (para fundos escuros), 'dark' força versão escura */
  variant?: 'auto' | 'light' | 'dark';
}

export default function Logo({ className = "h-8", variant = 'auto' }: LogoProps) {
  const [error, setError] = useState(false);

  // Filtros CSS para tornar o fundo da imagem transparente e adaptar as cores
  const filterStyle: React.CSSProperties = variant === 'light'
    ? {
        // Em fundos escuros: inverte e ajusta saturação para ficar branca/clara
        filter: 'brightness(0) invert(1)',
        mixBlendMode: 'normal',
      }
    : variant === 'dark'
    ? {
        // Em fundos claros: usa a imagem original com blend para remover o fundo branco
        mixBlendMode: 'multiply',
      }
    : {
        // Auto: remove o fundo branco com multiply (funciona bem em fundos claros)
        // Em fundos escuros funciona via dark: class no CSS
        mixBlendMode: 'multiply',
      };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!error ? (
        <img
          src="/logocanvas%20AlugaFacil.png"
          alt="AlugaFácil Logo"
          className={`h-full w-auto object-contain ${
            variant === 'light' ? 'brightness-0 invert' : ''
          }`}
          style={filterStyle}
          onError={() => setError(true)}
        />
      ) : (
        <span className={`text-xl font-bold ${
          variant === 'light'
            ? 'text-white'
            : 'text-primary dark:text-white'
        }`}>
          AlugaFácil
        </span>
      )}
    </div>
  );
}
