import React, { useState } from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-8" }: LogoProps) {
  const [error, setError] = useState(false);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!error ? (
        <img 
          src="/logocanvas%20AlugaFacil.png" 
          alt="AlugaFácil Logo" 
          className="h-full w-auto object-contain"
          onError={() => setError(true)}
        />
      ) : (
        <span className="text-xl font-bold text-primary dark:text-white">AlugaFácil</span>
      )}
    </div>
  );
}
