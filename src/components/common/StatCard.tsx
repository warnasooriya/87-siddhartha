import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import { Card, CardContent, Stack, Typography } from '@mui/material'

type StatCardProps = {
  title: string
  value: string | number
  caption: string
}

export const StatCard = ({ title, value, caption }: StatCardProps) => (
  <Card>
    <CardContent>
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <TrendingUpOutlinedIcon color="primary" fontSize="small" />
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {caption}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
)
