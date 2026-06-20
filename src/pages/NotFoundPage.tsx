import { Box, Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

const NotFoundPage = () => (
  <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', p: 3 }}>
    <Stack spacing={2} sx={{ textAlign: 'center', maxWidth: 420 }}>
      <Typography variant="h2" sx={{ fontWeight: 800 }}>
        404
      </Typography>
      <Typography variant="h5">පිටුව සොයාගත නොහැක</Typography>
      <Typography color="text.secondary">
        ඔබ සොයන පිටුව ඉවත් කර ඇති හෝ ලිපිනය වැරදි විය හැක.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        උපකරණ පුවරුව වෙත
      </Button>
    </Stack>
  </Box>
)

export default NotFoundPage
