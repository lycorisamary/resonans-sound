import { Paper, PaperProps } from '@mui/material';

type SectionTone = 'blue' | 'green' | 'orange' | 'neutral';

const sectionBackgrounds: Record<SectionTone, string> = {
  blue: 'linear-gradient(180deg, rgba(26,29,40,0.92) 0%, rgba(15,18,28,0.96) 100%)',
  green: 'linear-gradient(180deg, rgba(25,30,34,0.92) 0%, rgba(15,20,23,0.96) 100%)',
  orange: 'linear-gradient(180deg, rgba(33,24,27,0.92) 0%, rgba(21,16,18,0.96) 100%)',
  neutral: 'linear-gradient(180deg, rgba(24,24,34,0.94) 0%, rgba(15,15,22,0.98) 100%)',
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
        borderColor: 'rgba(255,255,255,0.07)',
        boxShadow: '0 20px 48px rgba(0,0,0,0.22)',
        ...sx,
      }}
      {...props}
    />
  );
}
