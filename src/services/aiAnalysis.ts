export type AIResultStatus = 'POSITIVE' | 'HIGH_CONFIDENCE_POSITIVE' | 'HIGH_CONFIDENCE_NEGATIVE' | 'NEGATIVE' | 'NEEDS_SPECIALIST_REVIEW' | 'CONFIDENT';
export type AIResultSource = 'SIMULATED_AI' | 'DEMO_FIXTURE' | 'MODEL';

export type AIAnalysisResult = {
  status: AIResultStatus;
  source: AIResultSource;
  generatedAt: string;
  evidence: string[];
  explanation: string;
};

export type RetinalAnalysisInput = {
  patientId: string;
  rightImage?: string;
  leftImage?: string;
  availableEyes: string[];
};

type SimulatedOutcomeGroup = 'POSITIVE' | 'CONFIDENT' | 'NEGATIVE' | 'NEEDS_SPECIALIST_REVIEW';
const SIMULATED_OUTCOMES: SimulatedOutcomeGroup[] = [
  'POSITIVE',
  'CONFIDENT',
  'NEGATIVE',
  'NEEDS_SPECIALIST_REVIEW',
];

export function aiResultLabel(status: AIResultStatus | undefined): string {
  switch (status) {
    case 'POSITIVE': return 'Positive finding detected';
    case 'HIGH_CONFIDENCE_POSITIVE': return 'High-confidence positive screening outcome';
    case 'HIGH_CONFIDENCE_NEGATIVE':
    case 'CONFIDENT': return 'High-confidence negative screening outcome';
    case 'NEGATIVE': return 'No concerning finding detected';
    case 'NEEDS_SPECIALIST_REVIEW': return 'Specialist review required';
    default: return 'Screening outcome not recorded';
  }
}

export function aiResultCategoryLabel(status: AIResultStatus | undefined): string {
  switch (status) {
    case 'POSITIVE': return 'Positive';
    case 'HIGH_CONFIDENCE_POSITIVE': return 'High Confident Positive';
    case 'HIGH_CONFIDENCE_NEGATIVE':
    case 'CONFIDENT': return 'High Confidence Negative';
    case 'NEGATIVE': return 'Negative';
    case 'NEEDS_SPECIALIST_REVIEW': return 'Needed for Review';
    default: return 'Not recorded';
  }
}

/**
 * Stable integration seam for retinal analysis. Replace this implementation with
 * the model/API adapter later; callers only depend on AIAnalysisResult.
 */
export async function analyzeRetinalCase(input: RetinalAnalysisInput): Promise<AIAnalysisResult> {
  return simulateAIAnalysis(input);
}

function simulateAIAnalysis(_input: RetinalAnalysisInput): AIAnalysisResult {
  const selectedGroup = SIMULATED_OUTCOMES[Math.floor(Math.random() * SIMULATED_OUTCOMES.length)];
  const status: AIResultStatus = selectedGroup === 'CONFIDENT'
    ? (Math.random() < 0.5 ? 'HIGH_CONFIDENCE_POSITIVE' : 'HIGH_CONFIDENCE_NEGATIVE')
    : selectedGroup;
  return {
    status,
    source: 'SIMULATED_AI',
    generatedAt: new Date().toISOString(),
    evidence: [],
    explanation: 'Temporary randomized demo outcome. It is not a clinical finding or a validated model result.',
  };
}
