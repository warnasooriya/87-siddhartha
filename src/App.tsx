import { CssBaseline, ThemeProvider } from '@mui/material'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter } from 'react-router-dom'

import { ErrorBoundary } from './components/feedback/ErrorBoundary'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import AppRouter from './routes/AppRouter'
import { useAppSelector } from './store'
import { createAppTheme } from './theme/theme'

function App() {
  const mode = useAppSelector((state) => state.theme.mode)
  const theme = createAppTheme(mode)
  useSupabaseSync()

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} autoHideDuration={2500} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <ErrorBoundary>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ErrorBoundary>
      </SnackbarProvider>
    </ThemeProvider>
  )
}

export default App
