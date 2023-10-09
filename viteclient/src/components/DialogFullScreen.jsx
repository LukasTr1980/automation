import { Dialog, Box, Grid, Button } from '@mui/material';
import PropTypes from 'prop-types';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

function DialogFullScreen({ open, onClose, children }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog fullScreen={fullScreen} open={open} onClose={onClose}>
      <Box sx={{ flexGrow: 1, padding: theme.spacing(2) }}>
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
