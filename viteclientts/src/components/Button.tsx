// Button.tsx
import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';

interface CustomButtonProps extends ButtonProps {
    to?: RouterLinkProps['to'];
}

const CustomButton: React.FC<CustomButtonProps> = ({ to, ...props }) => {
  const LinkBehavior = React.forwardRef<HTMLAnchorElement, Omit<RouterLinkProps, 'to'>>((props, ref) => (
    <RouterLink ref={ref} to={to || '#'} {...props} />
  ));

  return (
    <Button
      component={to ? LinkBehavior : undefined}
      {...props}
      sx={{
        my: 2,
        width: { xs: '100%', sm: '200px' },
        backgroundColor: 'black',
        color: 'white',
        '&:hover': {
          backgroundColor: '#202123',
        },
      }}
    >
      {props.children}
    </Button>
  );
};

export default CustomButton;
