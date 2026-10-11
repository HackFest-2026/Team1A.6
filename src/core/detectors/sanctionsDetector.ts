/**
 * Sanctions & Flagged Vessel Detector Plugin
 * Matches vessels against OFAC SDN, UN maritime enforcement, and OpenSanctions records.
 */

import type { Finding } from '../../domain/models.ts';
import type { IDetectorPlugin, DetectorContext } from './detectorInterface.ts';

export class SanctionsDetector implements IDetectorPlugin {
  readonly id = 'sanctioned_or_flagged_vessel';
  readonly name = 'Sanctioned / Dark Fleet Entity Match';
  readonly version = '1.0.0';
  readonly description = 'Flags vessels identified in OFAC SDN, UN maritime sanction lists, or shadow-fleet registries.';
  readonly defaultWeight = 45;

  evaluate(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];

    for (const vessel of context.allVessels) {
      if (vessel.is_sanctioned) {
        findings.push({
          rule_id: this.id,
          rule_version: this.version,
          rule_name: this.name,
          category: 'intelligence',
          description: `Vessel ${vessel.name} (MMSI: ${vessel.mmsi}, IMO: ${vessel.imo || 'N/A'}) is matched against active sanctions list: ${vessel.sanction_details || 'OFAC Non-proliferation'}.`,
          score_contribution: this.defaultWeight,
          confidence: 0.99,
          evidence: [
            {
              id: `ev-sanction-${vessel.id}`,
              title: 'OpenSanctions Regulatory Match',
              description: `Vessel identity matches sanctioned profile: Flag [${vessel.flag_country}], Type [${vessel.vessel_type}].`,
              timestamp: new Date(context.currentTimeMs).toISOString(),
              data: {
                vessel_id: vessel.id,
                vessel_name: vessel.name,
                mmsi: vessel.mmsi,
                imo: vessel.imo,
                flag: vessel.flag_country,
                sanction_reason: vessel.sanction_details,
              },
            },
          ],
        });
      }
    }

    return findings;
  }
}
