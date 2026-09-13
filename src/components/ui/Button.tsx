import React from 'react';
import { Loader2, Check } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  isSuccess?: boolean;
  successText?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = 'Processing...',
  isSuccess = false,
  successText,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-bold uppercase tracking-wider rounded-[2px] transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

  // Interaction feedback: hover translateY -1px, active scale 0.98
  const interactiveStyles =
    !disabled && !isLoading ? 'hover:-translate-y-[1px] active:scale-[0.98]' : '';

  const variantStyles = {
    primary: 'bg-[#1C1B1A] hover:bg-[#2C2B29] text-[#FAF9F5] border border-[#1C1B1A]',
    secondary: 'bg-[#F2EFE8] hover:bg-[#EAE5DA] text-[#1C1B1A] border border-[#DCD8D0]',
    outline: 'bg-transparent hover:bg-[#FAF9F5] text-[#1C1B1A] border border-[#1C1B1A]',
    ghost: 'bg-transparent hover:bg-[#F2EFE8] text-[#55524B] hover:text-[#1C1B1A] border border-transparent',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-xs px-5 py-2.5 min-h-[44px] gap-2',
    lg: 'text-xs sm:text-sm px-6 py-3.5 min-h-[48px] gap-2.5',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${interactiveStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : isSuccess ? (
        <>
          <Check className="w-3.5 h-3.5 text-[#677663]" />
          <span>{successText || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
