import { Paper, Typography } from '@mui/material';

interface MetricTileProps {
  label: string;
  value: number;
}

export function MetricTile({ label, value }: MetricTileProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        minWidth: 156,
        px: 2,
        py: 1.75,
        borderRadius: 4,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, fontSize: { xs: '1.6rem', md: '2rem' } }}>
        {value}
      </Typography>
    </Paper>
  );
}
