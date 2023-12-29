// Button.tsx

import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';

interface CustomButtonProps extends ButtonProps {
  to?: RouterLinkProps['to'];
  error?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({ to, error, variant = "contained", ...props }) => {
  const LinkBehavior = React.forwardRef<HTMLAnchorElement, Omit<RouterLinkProps, 'to'>>((props, ref) => (
    <RouterLink ref={ref} to={to || '#'} {...props} />
  ));

  const isOutlined = variant === 'outlined';
  const errorColor = '#f44336';
  const hoverColor = '#d32f2f';
  const outlinedColor = 'black'; // Color for outlined variant

  const buttonStyles = {
    my: 1,
    width: { xs: '100%', sm: '250px' },
    backgroundColor: isOutlined ? 'transparent' : (error ? errorColor : 'black'),
    color: isOutlined ? outlinedColor : 'white', // Black text for outlined, white for others
    border: isOutlined ? '1px solid' : 'none',
    borderColor: isOutlined ? (error ? errorColor : outlinedColor) : 'transparent', // Black border for outlined, error color if error is true
    '&:hover': {
      backgroundColor: isOutlined ? 'transparent' : (error ? hoverColor : '#202123'),
      borderColor: isOutlined ? (error ? hoverColor : outlinedColor) : 'transparent', // Adjust hover border color for outlined
    },
  };

  return (
    <Button
      component={to ? LinkBehavior : undefined}
      {...props}
      sx={buttonStyles}
      variant={variant}
    >
      {props.children}
    </Button>
  );
};

export default CustomButton;
