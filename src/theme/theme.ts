import { createTheme, responsiveFontSizes } from '@mui/material/styles'

export const createAppTheme = (mode: 'light' | 'dark') =>
  responsiveFontSizes(
    createTheme({
      palette: {
        mode,
        primary: {
          main: '#00695c',
        },
        secondary: {
          main: '#6d4c41',
        },
        background: {
          default: mode === 'light' ? '#f4f7f8' : '#121212',
          paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
        },
      },
      shape: {
        borderRadius: 14,
      },
      typography: {
        fontFamily: '"Noto Sans Sinhala", "Inter", "Roboto", sans-serif',
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            },
          },
        },
      },
    }),
  )
