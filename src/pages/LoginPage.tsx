import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'

import { buildAuditEntry, setCurrentUser, useAppDispatch, useAppSelector } from '../store'
import { authenticateUserRemote, insertAuditLogRemote } from '../services/supabaseMutations'

const LoginPage = () => {
  const dispatch = useAppDispatch()
  const users = useAppSelector((state) => state.data.users)
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [password, setPassword] = useState('')
  const activeUsers = users
    .filter((user) => user.activeStatus)
    .sort((left, right) => left.fullName.localeCompare(right.fullName, 'si'))
  const selectedUser = activeUsers.find((user) => user.id === selectedUserId) ?? null

  const handleLogin = async () => {
    if (!selectedUser || !password) {
      enqueueSnackbar('සාමාජිකයෙකු තෝරා මුරපදය ඇතුළත් කරන්න', { variant: 'warning' })
      return
    }

    try {
      const user = await authenticateUserRemote(selectedUser.email, password)
      if (!user) {
        enqueueSnackbar('තෝරාගත් පරිශීලකයා සඳහා මුරපදය වැරදියි', { variant: 'error' })
        return
      }

      dispatch(setCurrentUser(user))
      await insertAuditLogRemote(buildAuditEntry(user.id, 'LOGIN', 'AUTH', user.id, 'පද්ධතියට පිවිසියේය'))
      navigate('/')
    } catch {
      enqueueSnackbar('පිවිසුම් සත්‍යාපනය අසාර්ථක විය', { variant: 'error' })
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, rgba(0,105,92,0.08) 0%, rgba(244,247,248,1) 60%, rgba(255,255,255,1) 100%)',
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ maxWidth: 520, mx: 'auto', borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={3} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60 }}>
                <LockOutlinedIcon />
              </Avatar>
              <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center' }}>
                87 සිද්ධාර්ථ තොරතුරු පද්ධතිය
              </Typography>

              <Stack spacing={2} sx={{ width: '100%' }}>
                <TextField
                  select
                  label="ගිණුම"
                  fullWidth
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                >
                  <MenuItem value="">ගිණුම තෝරන්න</MenuItem>
                  {activeUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.fullName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="මුරපදය"
                  type="password"
                  fullWidth
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleLogin()
                    }
                  }}
                />
                <Button variant="contained" size="large" onClick={() => void handleLogin()} disabled={users.length === 0}>
                  පිවිසෙන්න
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default LoginPage
