/**
 * Signal Sentiment Analysis
 *
 * Lightweight keyword-based sentiment scoring.
 * No external ML dependencies — runs entirely in-process.
 */

const POSITIVE_WORDS = new Set([
  "good", "great", "excellent", "amazing", "awesome", "perfect",
  "success", "successful", "completed", "achieved", "improved",
  "helpful", "useful", "efficient", "fast", "reliable",
  "collaborate", "synergy", "breakthrough", "innovative", "solved",
  "progress", "milestone", "shipped", "deployed", "launched",
  "optimized", "enhanced", "upgraded", "working", "stable",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "error", "fail", "failed", "failure", "broken",
  "bug", "issue", "problem", "crash", "down", "slow",
  "blocked", "stuck", "deprecated", "vulnerable", "insecure",
  "timeout", "overloaded", "degraded", "unstable", "corrupt",
  "rejected", "denied", "expired", "invalid", "malformed",
  "conflict", "regression", "leak", "bottleneck", "outage",
]);

type SentimentResult = {
  score: number;       // -1.0 to 1.0
  label: "positive" | "neutral" | "negative";
  confidence: number;  // 0.0 to 1.0
  positiveWords: string[];
  negativeWords: string[];
};

/** Analyze sentiment of a single text */
export function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\W+/).filter((w) => w.length >= 3);

  if (words.length === 0) {
    return { score: 0, label: "neutral", confidence: 0, positiveWords: [], negativeWords: [] };
  }

  const positiveFound: string[] = [];
  const negativeFound: string[] = [];

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveFound.push(word);
    if (NEGATIVE_WORDS.has(word)) negativeFound.push(word);
  }

  const posCount = positiveFound.length;
  const negCount = negativeFound.length;
  const total = posCount + negCount;

  if (total === 0) {
    return { score: 0, label: "neutral", confidence: 0.3, positiveWords: [], negativeWords: [] };
  }

  const rawScore = (posCount - negCount) / total;
  const confidence = Math.min(total / words.length * 3, 1.0);

  let label: SentimentResult["label"] = "neutral";
  if (rawScore > 0.2) label = "positive";
  else if (rawScore < -0.2) label = "negative";

  return {
    score: Math.round(rawScore * 100) / 100,
    label,
    confidence: Math.round(confidence * 100) / 100,
    positiveWords: positiveFound,
    negativeWords: negativeFound,
  };
}

/** Analyze sentiment for multiple signals in batch */
export function analyzeBatch(texts: Array<{ id: string; content: string }>): Array<{
  id: string;
  sentiment: SentimentResult;
}> {
  return texts.map((t) => ({
    id: t.id,
    sentiment: analyzeSentiment(t.content),
  }));
}

/** Get aggregate sentiment for an agent's recent signals */
export function getAgentSentimentProfile(signals: Array<{ content: string }>): {
  averageScore: number;
  dominantLabel: "positive" | "neutral" | "negative";
  distribution: { positive: number; neutral: number; negative: number };
} {
  if (signals.length === 0) {
    return { averageScore: 0, dominantLabel: "neutral", distribution: { positive: 0, neutral: 0, negative: 0 } };
  }

  const results = signals.map((s) => analyzeSentiment(s.content));
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  const dist = { positive: 0, neutral: 0, negative: 0 };
  for (const r of results) dist[r.label]++;

  const dominantLabel = dist.positive >= dist.negative && dist.positive >= dist.neutral
    ? "positive"
    : dist.negative >= dist.neutral
      ? "negative"
      : "neutral";

  return {
    averageScore: Math.round(avgScore * 100) / 100,
    dominantLabel,
    distribution: dist,
  };
}
