import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface DifficultySelectorProps {
  value: 'easy' | 'medium' | 'hard';
  onChange: (value: 'easy' | 'medium' | 'hard') => void;
}

const difficultyMap = {
  0: 'easy',
  1: 'medium',
  2: 'hard',
} as const;

const difficultyLabels = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const difficultyDescriptions = {
  easy: 'Cooperative prospect who is open to conversation',
  medium: 'Somewhat skeptical, requires good questioning',
  hard: 'Difficult prospect who needs strong persuasion skills',
};

export const DifficultySelector = ({ value, onChange }: DifficultySelectorProps) => {
  const sliderValue = Object.entries(difficultyMap).find(([_, v]) => v === value)?.[0] || '0';

  const handleSliderChange = (values: number[]) => {
    const newValue = difficultyMap[values[0] as keyof typeof difficultyMap];
    onChange(newValue);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Difficulty Level</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className={value === 'easy' ? 'font-semibold text-primary' : 'text-muted-foreground'}>
              Easy
            </span>
            <span className={value === 'medium' ? 'font-semibold text-primary' : 'text-muted-foreground'}>
              Medium
            </span>
            <span className={value === 'hard' ? 'font-semibold text-primary' : 'text-muted-foreground'}>
              Hard
            </span>
          </div>
          <Slider
            value={[parseInt(sliderValue)]}
            onValueChange={handleSliderChange}
            max={2}
            step={1}
            className="w-full"
          />
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <p className="font-semibold mb-1">{difficultyLabels[value]}</p>
          <p className="text-sm text-muted-foreground">{difficultyDescriptions[value]}</p>
        </div>
      </CardContent>
    </Card>
  );
};
