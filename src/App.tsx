/**
 * NAVAL SENTINEL — MARITIME INTELLIGENCE & THREAT DETECTION PLATFORM
 * Simplified 3-Task Command & Control Architecture (Monitor, Investigate, Analyse)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MaritimeOperationalState,
  AlertStatus,
} from './domain/models.ts';

import { NavigationSidebar, AppViewId } from './components/NavigationSidebar.tsx';
import { OverviewDashboard } from './components/OverviewDashboard.tsx';
import {
  TacticalMapRedesigned,
  MapLayerConfig,
  DEFAULT_MAP_LAYERS,
} from './components/TacticalMapRedesigned.tsx';
import { InvestigationWorkspace } from './components/InvestigationWorkspace.tsx';
import { DetectionParametersPanel } from './components/DetectionParametersPanel.tsx';
import { ThreatAnalyticsView } from './components/ThreatAnalyticsView.tsx';
import { ModelEvaluationView } from './components/ModelEvaluationView.tsx';
import { ScenarioReplayBar } from './components/ScenarioReplayBar.tsx';

// Preserved modal integrations
import { BriefingModal } from './components/BriefingModal.tsx';
import { NlQueryModal } from './components/NlQueryModal.tsx';
import { PresentationMode } from './components/PresentationMode.tsx';
import { SarInferenceModal } from './components/SarInferenceModal.tsx';
import { ArmyUavWorkspace } from './components/ArmyUavWorkspace.tsx';
import { SystemVerificationView } from './components/SystemVerificationView.tsx';
import { ScenarioLabWorkspace } from './components/ScenarioLabWorkspace.tsx';

export default function App() {
  const [operationalState, setOperationalState] = useState<MaritimeOperationalState | null>(null);
  const [activeView, setActiveView] = useState<AppViewId>('overview');
  const [isReplayVisible, setIsReplayVisible] = useState<boolean>(false);

  // Replay timeline bounds
  const [replayBounds, setReplayBounds] = useState<{
    start: number;
    end: number;
    current: number;
    speed: number;
    isLive: boolean;
  }>({
    start: new Date('2026-10-06T00:00:00Z').getTime(),
    end: new Date('2026-10-08T06:00:00Z').getTime(),
    current: new Date('2026-10-08T06:00:00Z').getTime(),
    speed: 1.0,
    isLive: false,
  });

  // Selected target and investigated alert state
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>('vessel-sea-dragon');
  const [investigatingAlertId, setInvestigatingAlertId] = useState<string | null>('alert-001');

  // Map layer configurations
  const [layers, setLayers] = useState<MapLayerConfig>(DEFAULT_MAP_LAYERS);

  // Modal dialog states
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isNlQueryOpen, setIsNlQueryOpen] = useState(false);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [isParametersOpen, setIsParametersOpen] = useState(false);
  const [isSarModalOpen, setIsSarModalOpen] = useState(false);

  // Fetch current state from backend
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      const json = await res.json();
      if (json.success) {
        setOperationalState(json.data);
        if (json.replay) {
          setReplayBounds(json.replay);
        }
      }
    } catch (err) {
      console.error('Failed to fetch operational state:', err);
    }
  }, []);

  // Sync Global Fishing Watch events
  const handleSyncGfw = async () => {
    try {
      const res = await fetch('/api/gfw/events?type=encounter&start=2026-10-01&end=2026-10-08');
      const json = await res.json();
      if (json.success) {
        fetchState();
      }
    } catch (err) {
      console.error('Failed to sync GFW events:', err);
    }
  };


  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Handle Timeline Seek
  const handleSeek = async (timeMs: number) => {
    try {
      const res = await fetch('/api/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeMs }),
      });
      const json = await res.json();
      if (json.success) {
        setReplayBounds(json.replay);
        setOperationalState(json.state);
      }
    } catch (err) {
      console.error('Failed to seek replay:', err);
    }
  };

  // Handle Playback Speed Change
  const handleSpeedChange = async (speed: number) => {
    try {
      const res = await fetch('/api/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed }),
      });
      const json = await res.json();
      if (json.success) {
        setReplayBounds(json.replay);
      }
    } catch (err) {
      console.error('Failed to change replay speed:', err);
    }
  };

  // Handle Toggle Live
  const handleToggleLive = async (isLive: boolean) => {
    try {
      const res = await fetch('/api/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLive }),
      });
      const json = await res.json();
      if (json.success) {
        setReplayBounds(json.replay);
        setOperationalState(json.state);
      }
    } catch (err) {
      console.error('Failed to toggle live state:', err);
    }
  };

  // Handle Human-in-the-Loop Analyst Adjudication
  const handleReviewDecision = async (alertId: string, action: AlertStatus, note: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note, analyst: 'Watch Commander' }),
      });
      const json = await res.json();
      if (json.success) {
        setOperationalState(json.state);
      }
    } catch (err) {
      console.error('Failed to record review decision:', err);
    }
  };

  // Handle AI Briefing generation
  const handleGenerateBriefing = async (): Promise<string> => {
    const res = await fetch('/api/gemini/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    return json.briefing || 'No briefing returned.';
  };

  // Active target / alert selectors
  const activeAlertForInvestigation =
    operationalState?.alerts.find(
      (a) => a.id === investigatingAlertId || a.vessel_id === investigatingAlertId
    ) ||
    operationalState?.alerts[0] ||
    null;

  const associatedVesselForInvestigation = activeAlertForInvestigation
    ? operationalState?.vessels.find((v) => v.id === activeAlertForInvestigation.vessel_id) ||
      operationalState?.vessels[0] ||
      null
    : null;

  return (
    <div className="flex h-screen w-screen bg-[#050811] text-slate-100 overflow-hidden font-sans">
      {/* 1. Left Streamlined Three-Destination Sidebar */}
      <NavigationSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        activeThreatCount={operationalState?.kpis.active_threats || 0}
        darkVesselCount={operationalState?.kpis.dark_vessels_detected || 0}
        onOpenBriefing={() => setIsBriefingOpen(true)}
        onOpenNlQuery={() => setIsNlQueryOpen(true)}
        onOpenEvaluation={() => setIsEvaluationOpen(true)}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onOpenParameters={() => setIsParametersOpen(true)}
        onOpenSarInference={() => setIsSarModalOpen(true)}
        onSyncGfw={handleSyncGfw}
        isReplayVisible={isReplayVisible}
        onToggleReplay={() => setIsReplayVisible(!isReplayVisible)}
      />

      {/* 2. Main Application Workspace Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="flex-1 flex overflow-hidden relative">
          {/* SCREEN 1: "OVERVIEW" — MONITOR MARITIME SITUATION */}
          {activeView === 'overview' && (
            <OverviewDashboard
              state={operationalState}
              selectedTargetId={selectedTargetId}
              onSelectTarget={setSelectedTargetId}
              onInvestigateAlert={(alertId) => {
                setInvestigatingAlertId(alertId);
                setActiveView('investigations');
              }}
              layers={layers}
              onUpdateLayers={setLayers}
              onOpenParameters={() => setIsParametersOpen(true)}
              onOpenBriefing={() => setIsBriefingOpen(true)}
              onNavigateToInvestigations={() => setActiveView('investigations')}
            />
          )}

          {/* SCREEN 2: "INVESTIGATIONS" — EXAMINE SUSPICIOUS VESSELS & EVIDENCE */}
          {activeView === 'investigations' && (
            <InvestigationWorkspace
              alert={activeAlertForInvestigation}
              vessel={associatedVesselForInvestigation}
              reports={operationalState?.reports || []}
              detections={operationalState?.detections || []}
              onClose={() => setActiveView('overview')}
              onReviewDecision={handleReviewDecision}
              isStandalone={true}
              alertsList={operationalState?.alerts || []}
              onSelectAlert={(alertId) => setInvestigatingAlertId(alertId)}
            />
          )}

          {/* SCREEN 3: "ANALYTICS" — TRENDS, SITREP REPORTING & MODEL EVALUATION */}
          {activeView === 'analytics' && (
            <ThreatAnalyticsView
              state={operationalState}
              onGenerateBriefing={handleGenerateBriefing}
            />
          )}

          {/* SCREEN 4: "ARMY / UAV" — VISDRONE RECONNAISSANCE & TRACKING */}
          {activeView === 'army_uav' && (
            <ArmyUavWorkspace
              onAddDetectionsToMap={(_dets) => {
                fetchState();
              }}
            />
          )}

          {/* SCREEN 5: "VERIFICATION" — EVALUATOR SYSTEM AUDIT & BENCHMARKS */}
          {activeView === 'verification' && (
            <SystemVerificationView />
          )}

          {/* SCREEN 6: "SCENARIO LAB" — SCENARIOS A-F UPLOAD & EVALUATION CENTER */}
          {activeView === 'scenario_lab' && (
            <ScenarioLabWorkspace
              onNavigateToMap={(_coords) => {
                setActiveView('overview');
              }}
            />
          )}
        </div>

        {/* Compact Scenario Replay Scrubber (Toggled via Tools menu) */}
        {isReplayVisible && (
          <ScenarioReplayBar
            startTimeMs={replayBounds.start}
            endTimeMs={replayBounds.end}
            currentTimeMs={replayBounds.current}
            isLive={replayBounds.isLive}
            onSeek={handleSeek}
            onToggleLive={handleToggleLive}
            speed={replayBounds.speed}
            onSpeedChange={handleSpeedChange}
          />
        )}
      </div>

      {/* Modal Tool Overlays Accessible via Secondary Tools Menu */}
      <DetectionParametersPanel
        isOpen={isParametersOpen}
        onClose={() => setIsParametersOpen(false)}
      />

      <BriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        onGenerateBriefing={handleGenerateBriefing}
      />

      <NlQueryModal
        isOpen={isNlQueryOpen}
        onClose={() => setIsNlQueryOpen(false)}
        onApplyParsedFilter={(parsed) => {
          setActiveView('overview');
        }}
      />

      <ModelEvaluationView
        isOpen={isEvaluationOpen}
        onClose={() => setIsEvaluationOpen(false)}
        isStandalone={false}
      />

      <SarInferenceModal
        isOpen={isSarModalOpen}
        onClose={() => setIsSarModalOpen(false)}
        onInferenceComplete={() => {
          setIsSarModalOpen(false);
          fetchState();
        }}
      />

      <PresentationMode
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        onJumpToScenarioStep={(timeMs, targetId) => {
          handleSeek(timeMs);
          setSelectedTargetId(targetId);
          setActiveView('overview');
        }}
      />
    </div>
  );
}
