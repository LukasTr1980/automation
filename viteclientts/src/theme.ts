import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Global MUI theme: align with AGENTS.md guidance and index.css font stack.
let baseTheme = createTheme({
  typography: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    // Headings boldness: h1–h4 600; subheads 500
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1: { fontSize: '1rem' }, // 16px
    body2: { fontSize: '0.875rem' }, // 14px for better mobile readability
    caption: { fontSize: '0.875rem' }, // 14px to avoid < 14px on mobile
  },
  components: {
    MuiChip: {
      styleOverrides: {
        label: {
          fontSize: '0.875rem', // Ensure ≥14px for chip labels
          fontWeight: 500,
        },
      },
    },
  },
});

// Make typography responsive across breakpoints
const theme = responsiveFontSizes(baseTheme);

export default theme;
