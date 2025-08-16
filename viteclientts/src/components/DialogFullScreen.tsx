import React from 'react';
import { Dialog, DialogContent, IconButton, DialogTitle, Button, DialogActions } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { DialogFullScreenProps } from '../types/types';

const DialogFullScreen: React.FC<DialogFullScreenProps> = ({ open, onClose, children, title, showButton = true, id }) => {

  // Render dialog within the app root to avoid aria-hidden on #root when modal opens
  const container = typeof document !== 'undefined' ? document.getElementById('root') ?? undefined : undefined;

  const titleId = id ? `${id}-title` : 'dialog-title';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      container={container}
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton edge="end" color='inherit' onClick={onClose} aria-label='close' autoFocus>
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
          Speichern
        </Button>
      </DialogActions>
      }
    </Dialog>
  );
};

export default DialogFullScreen;
