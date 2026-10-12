import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/lib/utils';

export const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-transparent text-foreground hover:bg-surface-raised data-[state=on]:bg-accent data-[state=on]:text-white',
        outline:
          'border border-separator bg-transparent text-foreground hover:bg-surface-raised data-[state=on]:border-accent data-[state=on]:bg-accent data-[state=on]:text-white',
      },
      size: {
        default: 'h-12 min-h-[44px] px-4 text-headline',
        sm: 'h-11 min-h-[44px] px-3 text-body',
        lg: 'h-12 min-h-[44px] px-6 text-headline',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export const Toggle = React.forwardRef<
  React.ComponentRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));
Toggle.displayName = TogglePrimitive.Root.displayName;
