/**
 * Report Correlation Detector Plugin
 * Links textual open-source intelligence (OSINT, NAVAREA advisories, GDELT news) to active maritime targets.
 */

import type { Finding } from '../../domain/models.ts';
import type { IDetectorPlugin, DetectorContext } from './detectorInterface.ts';

export class ReportCorrelationDetector implements IDetectorPlugin {
  readonly id = 'report_correlation';
  readonly name = 'Intelligence & Maritime Advisory Correlation';
  readonly version = '1.1.0';
  readonly description = 'Correlates named vessel mentions and geographical advisories from news feeds and security centers.';
  readonly defaultWeight = 25;

  evaluate(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];

    for (const report of context.allReports) {
      const reportTimeMs = new Date(report.timestamp).getTime();
      if (reportTimeMs > context.currentTimeMs) continue;

      for (const vessel of context.allVessels) {
        const matchesMmsi = report.entities.mmsis.includes(vessel.mmsi);
        const matchesImo = vessel.imo ? report.entities.imos.includes(vessel.imo) : false;
        const matchesName = report.entities.vessels.some(
          (v) => v.toLowerCase() === vessel.name.toLowerCase()
        );

        if (matchesMmsi || matchesImo || matchesName) {
          findings.push({
            rule_id: this.id,
            rule_version: this.version,
            rule_name: this.name,
            category: 'intelligence',
            description: `Advisory correlation for ${vessel.name}: "${report.title}" (${report.source}).`,
            score_contribution: this.defaultWeight,
            confidence: 0.88,
            evidence: [
              {
                id: `ev-rep-${report.id}-${vessel.id}`,
                title: report.title,
                description: report.summary,
                timestamp: report.timestamp,
                data: {
                  report_id: report.id,
                  source: report.source,
                  threat_level: report.threat_level,
                  entities_linked: report.entities,
                  vessel_mmsi: vessel.mmsi,
                },
              },
            ],
          });
        }
      }
    }

    return findings;
  }
}
