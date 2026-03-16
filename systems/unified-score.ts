/**
 * Unified Health Score - Cross-vertical intelligence
 *
 * Combines financial, wellness, and physical health metrics
 * into a single holistic life score with correlations.
 */

import { calculateFinancialHealthScore } from "@/lib/financial/db-budget";
import { calculateWellnessScore } from "@/lib/wellness/db-wellness";
import { calculatePhysicalHealthScore } from "@/lib/health/db-health";

type UnifiedScore = {
  financial: number;
  wellness: number;
  physical: number;
  overall: number;
  strengths: string[];
  improvements: string[];
  correlations: string[];
  breakdown: {
    financial: Record<string, number>;
    wellness: Record<string, number>;
    physical: Record<string, number>;
  };
};

/** Calculate the unified health score across all verticals */
export function calculateUnifiedScore(agentId: string): UnifiedScore {
  const financial = calculateFinancialHealthScore(agentId);
  const wellness = calculateWellnessScore(agentId);
  const physical = calculatePhysicalHealthScore(agentId);

  // Weighted average: financial 30%, wellness 35%, physical 35%
  const overall = Math.round(
    financial.score * 0.30 + wellness.score * 0.35 + physical.score * 0.35
  );

  const strengths: string[] = [];
  const improvements: string[] = [];
  const correlations: string[] = [];

  // Identify strengths (>70 in any area)
  if (financial.score >= 70) strengths.push("Strong financial health");
  if (wellness.score >= 70) strengths.push("Excellent wellness habits");
  if (physical.score >= 70) strengths.push("Good physical health");

  // Collect all improvement suggestions
  improvements.push(...financial.insights.slice(0, 2));
  improvements.push(...wellness.insights.slice(0, 2));
  improvements.push(...physical.insights.slice(0, 2));

  // Cross-vertical correlations
  if (wellness.breakdown.sleep < 15 && financial.breakdown.activity < 5) {
    correlations.push("Poor sleep may be affecting financial decision-making");
  }
  if (physical.breakdown.fitness < 15 && wellness.breakdown.focus < 12) {
    correlations.push("Low physical activity correlates with reduced focus");
  }
  if (financial.breakdown.budget < 15 && wellness.breakdown.mindfulness < 12) {
    correlations.push("Budget stress may be impacting mental wellness - try mindfulness");
  }
  if (physical.breakdown.nutrition >= 20 && wellness.breakdown.sleep >= 20) {
    correlations.push("Good nutrition and sleep are reinforcing each other positively");
  }

  return {
    financial: financial.score,
    wellness: wellness.score,
    physical: physical.score,
    overall,
    strengths,
    improvements,
    correlations,
    breakdown: {
      financial: financial.breakdown,
      wellness: wellness.breakdown,
      physical: physical.breakdown,
    },
  };
}

/** Get a text summary of the unified score */
export function getScoreSummary(agentId: string): string {
  const score = calculateUnifiedScore(agentId);
  const grade = score.overall >= 80 ? "A" : score.overall >= 60 ? "B" : score.overall >= 40 ? "C" : "D";

  let summary = `Life Score: ${score.overall}/100 (Grade: ${grade})\n`;
  summary += `  Financial: ${score.financial}/100\n`;
  summary += `  Wellness: ${score.wellness}/100\n`;
  summary += `  Physical: ${score.physical}/100\n`;

  if (score.strengths.length > 0) {
    summary += `\nStrengths: ${score.strengths.join(", ")}`;
  }
  if (score.correlations.length > 0) {
    summary += `\nInsights: ${score.correlations[0]}`;
  }

  return summary;
}
