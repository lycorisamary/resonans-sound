import { Paper, PaperProps } from '@mui/material';

type SectionTone = 'blue' | 'green' | 'orange' | 'neutral';

const sectionBackgrounds: Record<SectionTone, string> = {
  blue: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.9) 100%)',
  green: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(236,253,245,0.92) 100%)',
  orange: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,247,237,0.92) 100%)',
  neutral: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
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
        borderRadius: 7,
        background: sectionBackgrounds[tone],
        ...sx,
      }}
      {...props}
    />
  );
}
