export const KPI_COLORS = {
  calls: { primary: 'hsl(217, 91%, 60%)', light: 'hsl(214, 95%, 93%)', dark: 'hsl(217, 91%, 40%)' },
  appraisals: { primary: 'hsl(142, 76%, 36%)', light: 'hsl(138, 76%, 90%)', dark: 'hsl(142, 76%, 26%)' },
  openHomes: { primary: 'hsl(38, 92%, 50%)', light: 'hsl(38, 92%, 90%)', dark: 'hsl(38, 92%, 35%)' },
  cch: { primary: 'hsl(258, 90%, 66%)', light: 'hsl(258, 90%, 94%)', dark: 'hsl(258, 90%, 48%)' },
  onTrack: 'hsl(142, 71%, 45%)',
  behind: 'hsl(25, 95%, 53%)',
  atRisk: 'hsl(0, 72%, 51%)',
};

export const getStatusColor = (percentage: number) => {
  if (percentage >= 90) return KPI_COLORS.onTrack;
  if (percentage >= 60) return KPI_COLORS.behind;
  return KPI_COLORS.atRisk;
};

export const getMotivationalText = (percentage: number, remaining: number): string => {
  if (percentage >= 100) {
    const excess = ((percentage - 100) / 100 * 10).toFixed(1);
    return `Target crushed! 🎉 You're ${excess} hrs ahead!`;
  }
  if (percentage >= 90) {
    return `Almost there! Just ${remaining.toFixed(1)} hrs to go! 🎯`;
  }
  if (percentage >= 70) {
    return `Nice work! You're ${percentage.toFixed(0)}% to your daily goal 💪`;
  }
  return `Keep going! ${remaining.toFixed(1)} hrs remaining today`;
};
