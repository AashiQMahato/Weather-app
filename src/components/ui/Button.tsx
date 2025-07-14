'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'glass' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md', 
    loading = false,
    loadingText,
    disabled,
    children, 
    ...props 
  }, ref) => {
    // Ensure consistent boolean handling
    const isDisabled = Boolean(disabled) || Boolean(loading);

    const baseStyles = cn(
      // Base styles - consistent between server and client
      'inline-flex items-center justify-center rounded-lg font-medium',
      'focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2',
      'disabled:opacity-60 disabled:cursor-not-allowed',
      
      // Size variants
      {
        'px-3 py-1.5 text-sm gap-1.5': size === 'sm',
        'px-4 py-2 text-sm gap-2': size === 'md',
        'px-6 py-2.5 text-base gap-2': size === 'lg',
      },
      
      // Variant styles
      {
        'bg-sky-600 text-white shadow-sm hover:bg-sky-700 active:bg-sky-800': 
          variant === 'default',
        'bg-sky-500/20 text-white border border-sky-300/30 backdrop-blur-sm hover:bg-sky-500/30 hover:border-sky-300/50': 
          variant === 'glass',
        'border border-sky-300/60 text-sky-100 bg-transparent hover:bg-sky-500/10 hover:border-sky-300/80 hover:text-white': 
          variant === 'outline',
        'text-sky-100 bg-transparent hover:bg-sky-500/15 hover:text-white': 
          variant === 'ghost',
      },
      
      className
    );

    return (
      <button
        className={baseStyles}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };