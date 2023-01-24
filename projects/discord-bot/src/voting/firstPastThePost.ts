import { Timer } from "../util/timer";
import { RankingResults, RankingMetrics } from "./interfaces";

export function firstPastThePost(votes: string[]): RankingResults | undefined {
  if (votes.length === 0) return;

  const computeTimer = Timer.startTimer();
  const rankings: { [vote: string]: number } = {};

  votes.forEach((v) => {
    if (Object.keys(rankings).includes(v)) rankings[v]++;
    else rankings[v] = 1;
  });

  const finalRankings: [string, number][] = [];

  Object.keys(rankings).forEach((v) => {
    finalRankings.push([v, rankings[v]]);
  });

  const metrics: RankingMetrics = {
    voteCount: votes.length,
    computeDuration: computeTimer.endTimer(),
  };

  return {
    rankingType: "firstPastThePost",
    metrics,
    finalRankings,
  };
}
