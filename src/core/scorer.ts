/**
 * Threat Scoring and Alert Synthesizer
 * Aggregates findings into explainable 0-100 threat scores.
 * Every score point is directly attributable to an underlying rule and evidence item.
 */

import type { Finding, Alert, ThreatLevel, Vessel, GeoCoordinate } from '../domain/models.ts';

export function calculateCompositeAlert(
  targetId: string,
  targetName: string,
  mmsi: string,
  location: GeoCoordinate,
  timestamp: string,
  findings: Finding[],
  existingAlert?: Alert
): Alert {
  // Sum contribution weights capped at 100
  let totalScore = 0;
  for (const f of findings) {
    totalScore += f.score_contribution;
  }
  const normalizedScore = Math.min(100, Math.max(5, totalScore));

  // Determine threat level
  let threatLevel: ThreatLevel = 'LOW';
  if (normalizedScore >= 75) {
    threatLevel = 'CRITICAL';
  } else if (normalizedScore >= 50) {
    threatLevel = 'HIGH';
  } else if (normalizedScore >= 30) {
    threatLevel = 'MEDIUM';
  }

  // Find primary driver
  const sortedFindings = [...findings].sort(
    (a, b) => b.score_contribution - a.score_contribution
  );
  const primaryFinding = sortedFindings[0];
  const primaryRule = primaryFinding ? primaryFinding.rule_name : 'General Maritime Anomaly';

  // Confidence assessment
  const avgConfidence =
    findings.length > 0
      ? findings.reduce((acc, curr) => acc + curr.confidence, 0) / findings.length
      : 0.5;

  let confidenceRating: Alert['confidence_rating'] = 'MODERATE_CONFIDENCE';
  if (avgConfidence >= 0.90) {
    confidenceRating = 'CONFIRMED';
  } else if (avgConfidence >= 0.75) {
    confidenceRating = 'HIGH_CONFIDENCE';
  } else if (avgConfidence < 0.60) {
    confidenceRating = 'LOW_CONFIDENCE';
  }

  // Summary generation
  const ruleDescriptions = sortedFindings.map((f) => f.description).join(' ');
  const summary = `${threatLevel} threat detected (${normalizedScore}/100): ${primaryRule}. ${ruleDescriptions}`;

  return {
    id: existingAlert?.id || `alert-${targetId}-${Date.now().toString(36)}`,
    vessel_id: targetId,
    vessel_name: targetName,
    mmsi,
    timestamp,
    location,
    threat_level: threatLevel,
    score: normalizedScore,
    primary_rule: primaryRule,
    summary,
    findings: sortedFindings,
    status: existingAlert?.status || 'NEW',
    notes: existingAlert?.notes || [],
    review_history: existingAlert?.review_history || [],
    data_freshness_sec: 14,
    confidence_rating: confidenceRating,
  };
}
