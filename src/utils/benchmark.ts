export interface BenchmarkData {
  pace: number;
  vision: number;
  finishing: number;
  label: string;
}

export const POSITION_BENCHMARKS: Record<string, BenchmarkData> = {
  ST:  { pace: 78, vision: 65, finishing: 76, label: "Striker" },
  CAM: { pace: 72, vision: 78, finishing: 70, label: "Attacking Midfielder" },
  CM:  { pace: 74, vision: 74, finishing: 65, label: "Central Midfielder" },
  LW:  { pace: 80, vision: 72, finishing: 71, label: "Left Winger" },
  RW:  { pace: 80, vision: 72, finishing: 71, label: "Right Winger" },
  LB:  { pace: 76, vision: 68, finishing: 55, label: "Left Back" },
  RB:  { pace: 76, vision: 68, finishing: 55, label: "Right Back" },
  CB:  { pace: 70, vision: 65, finishing: 50, label: "Centre Back" },
  CDM: { pace: 72, vision: 70, finishing: 58, label: "Defensive Midfielder" },
  GK:  { pace: 60, vision: 72, finishing: 40, label: "Goalkeeper" }
};

export interface RankingResult {
  label: string;
  badge: string;
  color: string;
  percentile: string;
}

export const calculateRanking = (playerScore: number, benchmarkScore: number): RankingResult => {
  const ratio = playerScore / benchmarkScore;
  if (ratio >= 1.20) return { label: "ELITE", badge: "ELITE ◆", color: "#f5c518", percentile: "elite" };
  if (ratio >= 1.10) return { label: "ELITE", badge: "ELITE ◆", color: "#f5c518", percentile: "elite" };
  if (ratio >= 1.00) return { label: "ABOVE AVERAGE", badge: "ABOVE STANDARD ▲", color: "#00e56b", percentile: "above standard" };
  if (ratio >= 0.90) return { label: "AVERAGE", badge: "AT STANDARD ●", color: "#4da6ff", percentile: "at standard" };
  return { label: "DEVELOPING", badge: "DEVELOPING ↗", color: "#5a8a6a", percentile: "developing" };
};

export const getOverallRanking = (player: any, position: string): RankingResult | null => {
  const benchmark = POSITION_BENCHMARKS[position as keyof typeof POSITION_BENCHMARKS] || POSITION_BENCHMARKS["ST"];
  if (!benchmark) return null;
  const pPace = player.pace ?? player.paceScore ?? 0;
  const pVision = player.vision ?? player.visionScore ?? 0;
  const pFinishing = player.finishing ?? player.finishingScore ?? 0;
  
  if (pPace === 0 && pVision === 0 && pFinishing === 0) {
    return null;
  }

  const avgPlayerScore = (pPace + pVision + pFinishing) / 3;
  const avgBenchmark = (benchmark.pace + benchmark.vision + benchmark.finishing) / 3;
  return calculateRanking(avgPlayerScore, avgBenchmark);
};
