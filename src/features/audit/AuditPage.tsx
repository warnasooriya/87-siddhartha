import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import {
  Card,
  CardContent,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'

import { useAppSelector } from '../../store'

const AuditPage = () => {
  const auditLogs = useAppSelector((state) => state.data.auditLogs)
  const [query, setQuery] = useState('')

  const filteredLogs = useMemo(
    () =>
      auditLogs.filter((log) =>
        [log.action, log.entityType, log.description].some((value) =>
          value.toLowerCase().includes(query.toLowerCase()),
        ),
      ),
    [auditLogs, query],
  )

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          විගණන සටහන්
        </Typography>
        <Typography color="text.secondary">
          පිවිසුම්, සුරැකුම්, ඉවත් කිරීම් සහ ලේඛන ක්‍රියාකාරකම් සොයන්න.
        </Typography>
      </Stack>

      <TextField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ක්‍රියාව, විස්තරය හෝ වස්තුව සොයන්න"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>වේලාව</TableCell>
                <TableCell>ක්‍රියාව</TableCell>
                <TableCell>වස්තුව</TableCell>
                <TableCell>විස්තරය</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{new Date(log.createdAt).toLocaleString('si-LK')}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    {log.entityType} / {log.entityId}
                  </TableCell>
                  <TableCell>{log.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default AuditPage
