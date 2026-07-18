import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  /** 'auto' = fundo claro (padrão), 'light' = fundo escuro */
  variant?: 'auto' | 'light';
}

export default function Logo({ className = "h-8", variant = 'auto' }: LogoProps) {
  const [error, setError] = useState(false);

  // mix-blend-mode: multiply → remove fundo BRANCO em fundos CLAROS
  // mix-blend-mode: screen   → remove fundo BRANCO em fundos ESCUROS
  const blendMode = variant === 'light' ? 'screen' : 'multiply';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!error ? (
        <img
          src="/logocanvas%20AlugaFacil.png"
          alt="AlugaFácil Logo"
          className="h-full w-auto object-contain"
          style={{ mixBlendMode: blendMode }}
          onError={() => setError(true)}
        />
      ) : (
        <span className={`text-xl font-bold ${variant === 'light' ? 'text-white' : 'text-primary dark:text-white'}`}>
          AlugaFácil
        </span>
      )}
    </div>
  );
}
