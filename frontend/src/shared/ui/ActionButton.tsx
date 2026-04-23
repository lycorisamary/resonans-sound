import { ElementType } from 'react';

import { Button, ButtonProps } from '@mui/material';

type ActionButtonProps<C extends ElementType = 'button'> = ButtonProps<C, { component?: C }>;

export function ActionButton<C extends ElementType = 'button'>(props: ActionButtonProps<C>) {
  return <Button size="medium" {...props} />;
}
