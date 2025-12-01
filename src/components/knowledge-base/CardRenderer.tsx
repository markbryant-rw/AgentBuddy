import { UniversalCard } from './card-types/UniversalCard';

interface Card {
  id: string;
  content: any;
  template?: string | null;
}

interface CardRendererProps {
  card: Card;
}

export function CardRenderer({ card }: CardRendererProps) {
  if (!card.content) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No content available
      </div>
    );
  }

  return <UniversalCard content={card.content} />;
}
