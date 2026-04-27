import { Paper, PaperProps } from '@mui/material';

type SectionTone = 'blue' | 'green' | 'orange' | 'neutral';

const sectionBackgrounds: Record<SectionTone, string> = {
  blue: 'linear-gradient(180deg, rgba(14,14,18,0.92) 0%, rgba(5,5,7,0.96) 100%)',
  green: 'linear-gradient(180deg, rgba(13,12,14,0.92) 0%, rgba(5,5,7,0.96) 100%)',
  orange:
    'radial-gradient(circle at 20% 0%, rgba(255,23,23,0.1), transparent 34%), linear-gradient(180deg, rgba(18,8,10,0.92) 0%, rgba(5,5,7,0.97) 100%)',
  neutral: 'linear-gradient(180deg, rgba(14,14,18,0.94) 0%, rgba(5,5,7,0.98) 100%)',
};

interface SectionCardProps extends PaperProps {
  tone?: SectionTone;
}

export function SectionCard({ tone = 'neutral', sx, ...props }: SectionCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 5,
        background: sectionBackgrounds[tone],
        borderColor: 'rgba(255,38,38,0.13)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.34), inset 0 0 0 1px rgba(255,255,255,0.016)',
        ...sx,
      }}
      {...props}
    />
  );
}
