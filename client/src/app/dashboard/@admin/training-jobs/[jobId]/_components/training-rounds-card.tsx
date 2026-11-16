import { Card, CardContent } from "@/components/ui/card";
import type { TrainingJobRoundResponseDto } from "@/types";
import { JobRoundsDetailCard } from "./training-rounds-detail-card";

export default function TrainingRoundsCard({
  rounds,
}: {
  rounds: TrainingJobRoundResponseDto[];
}) {
  return rounds.length === 0 ? (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        No rounds have been recorded for this training job yet.
      </CardContent>
    </Card>
  ) : (
    <div className="px-5">
      <JobRoundsDetailCard rounds={rounds} />
    </div>
  );
}
