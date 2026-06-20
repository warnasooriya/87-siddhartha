import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material'
import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError() {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error boundary caught an error.', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <Alert severity="error" icon={<ReportProblemOutlinedIcon fontSize="inherit" />}>
              <AlertTitle>පද්ධති දෝෂයක් සිදු විය</AlertTitle>
              කරුණාකර පිටුව නැවත පූරණය කර නැවත උත්සාහ කරන්න.
            </Alert>
            <Typography color="text.secondary">
              ගැටලුව දිගටම පවතී නම්, විගණන සටහන් සහ බ්‍රව්සර් කොන්සෝලය පරීක්ෂා කරන්න.
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              නැවත පූරණය කරන්න
            </Button>
          </Stack>
        </Box>
      )
    }

    return this.props.children
  }
}
