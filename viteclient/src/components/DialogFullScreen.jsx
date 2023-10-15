import { Dialog, Box, Grid, Button, IconButton, DialogTitle } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';

function DialogFullScreen({ open, onClose, children }) {
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
              color="secondary"
              onClick={onClose}
            >
              Speichern
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Dialog>
  );
}

DialogFullScreen.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default DialogFullScreen;
