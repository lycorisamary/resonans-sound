import { Paper, Typography } from '@mui/material';

interface MetricTileProps {
  label: string;
  value: number;
}

export function MetricTile({ label, value }: MetricTileProps) {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 5, minWidth: 130 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4">{value}</Typography>
    </Paper>
  );
}
