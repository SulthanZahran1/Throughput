import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 clip-path-industrial border-b-4 active:border-b-0 active:translate-y-[2px]';
  
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-800 disabled:bg-blue-800 disabled:text-blue-300',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white border-slate-900 disabled:bg-slate-800 disabled:text-slate-400',
    danger: 'bg-red-600 hover:bg-red-500 text-white border-red-800 disabled:bg-red-800 disabled:text-red-300',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border-transparent border-b-0',
  };
  
  const sizeStyles = {
    sm: 'px-4 py-1 text-xs',
    md: 'px-6 py-2 text-sm',
    lg: 'px-8 py-3 text-base',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
      )}
      {children}
    </button>
  );
}
