import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white shadow-sm hover:opacity-90 active:opacity-80',
        secondary: 'bg-surface-raised text-foreground border border-separator hover:bg-surface active:bg-surface',
        ghost: 'bg-transparent text-foreground hover:bg-surface-raised active:bg-surface-raised',
        destructive: 'bg-danger text-white shadow-sm hover:opacity-90 active:opacity-80',
      },
      size: {
        default: 'h-12 min-h-[44px] px-5 text-headline rounded-md',
        sm: 'h-11 min-h-[44px] px-4 text-body rounded-md',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px] p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
