import React from 'react';
import { Dialog, Box, Grid, IconButton, DialogTitle, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import { DialogFullScreenProps } from '../types/types';

const DialogFullScreen: React.FC<DialogFullScreenProps> = ({ open, onClose, children }) => {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Auswählen
        <IconButton edge="end" color='inherit' onClick={onClose} aria-label='close'>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box sx={{ flexGrow: 1, padding: theme.spacing(1), border: '1px solid #ccc' }}>
        <Grid
          container
          direction="column"
          justifyContent="center"
          alignItems="center"
          spacing={2}
        >
          {children}
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={onClose}
            >
              Speichern
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Dialog>
  );
};

export default DialogFullScreen;
