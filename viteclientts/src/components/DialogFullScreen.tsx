import React from 'react';
import { Dialog, DialogContent, IconButton, DialogTitle, Button, DialogActions } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

import { DialogFullScreenProps } from '../types/types';

const DialogFullScreen: React.FC<DialogFullScreenProps> = ({ open, onClose, children, title = 'Auswählen', showButton = true }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton edge="end" color='inherit' onClick={onClose} aria-label='close'>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {children}
      </DialogContent>
      {showButton && <DialogActions>
        <Button
          onClick={onClose}
        >
          {t('save')}
        </Button>
      </DialogActions>
      }
    </Dialog>
  );
};

export default DialogFullScreen;
