"""
VoiceArmor Impersonation Risk Engine (Upgraded v1.2)
Calculates dynamic 0-100 Impersonation Risk Score based on:
1. Calibrated Deepfake Probability (40%)
2. Speaker Mismatch Score (25%)
3. Replay & Channel Manipulation Risk (20%)
4. Audio Quality Penalty (5%)
5. Sensitive Action Context Sensitivity (10%)

Maps risk score to security alert levels and context-aware security enforcement.
"""

from typing import Dict, Any, Optional, List


class RiskEngine:
    WEIGHT_DEEPFAKE = 0.40
    WEIGHT_SPEAKER_MISMATCH = 0.25
    WEIGHT_REPLAY = 0.20
    WEIGHT_QUALITY = 0.05
    WEIGHT_CONTEXT = 0.10

    SENSITIVE_ACTION_RISK_MAP = {
        "MONITORING": 0,
        "MONEY_TRANSFER": 35,
        "OTP_REQUEST": 25,
        "PASSWORD_RESET": 25,
        "EXECUTIVE_APPROVAL": 35,
        "CONFIDENTIAL_INFO": 25
    }

    def __init__(self, low_thresh: int = 20, mod_thresh: int = 50, high_thresh: int = 75):
        self.low_thresh = low_thresh
        self.mod_thresh = mod_thresh
        self.high_thresh = high_thresh

    def calculate_risk(
        self,
        deepfake_probability: float,  # 0.0 to 100.0
        detection_confidence: float = 90.0,
        classification: Optional[str] = None,
        speaker_match_score: Optional[float] = None,
        signals: Optional[Dict[str, float]] = None,
        replay_info: Optional[Dict[str, Any]] = None,
        quality_gate_info: Optional[Dict[str, Any]] = None,
        sensitive_action: str = "MONITORING"
    ) -> Dict[str, Any]:
        signals = signals or {}
        replay_info = replay_info or {}
        quality_gate_info = quality_gate_info or {}

        if classification is None:
            if deepfake_probability >= 65.0:
                classification = "SUSPICIOUS DEEPFAKE"
            elif deepfake_probability <= 35.0:
                classification = "LIKELY GENUINE"
            else:
                classification = "UNCERTAIN"

        # 0. Handle Insufficient Quality / Speech case
        if classification == "INSUFFICIENT AUDIO QUALITY" or (quality_gate_info and not quality_gate_info.get("is_usable", True)):
            return {
                "impersonation_risk_score": 15,
                "risk_level": "LOW",
                "color_code": "GRAY",
                "recommended_action": "INSUFFICIENT AUDIO QUALITY",
                "action_description": quality_gate_info.get("message", "Please provide a longer or clearer voice sample."),
                "is_restricted": False,
                "verification_required": False,
                "sub_scores": {"deepfake_risk": 5.0, "speaker_mismatch_risk": 0.0, "replay_risk": 0.0, "context_risk_boost": 0.0},
                "explanations": ["⚠️ Audio sample quality or duration is insufficient for definitive security classification."]
            }

        # 1. Deepfake Sub-Score
        df_score = deepfake_probability

        # 2. Speaker Mismatch Sub-Score
        if speaker_match_score is not None:
            sm_score = max(0.0, 100.0 - speaker_match_score)
        else:
            sm_score = 45.0 if deepfake_probability > 50.0 else 8.0

        # 3. Replay & Channel Manipulation Sub-Score
        rep_score = float(replay_info.get("replay_score", 65.0 if deepfake_probability > 50.0 else 10.0))

        # 4. Quality Penalty Sub-Score
        snr_db = float(quality_gate_info.get("snr_db", 20.0))
        quality_score = max(0.0, min(100.0, (20.0 - snr_db) * 4.0))

        # 5. Contextual Action Risk Sub-Score
        action_key = sensitive_action.upper().replace(" ", "_")
        context_score = float(self.SENSITIVE_ACTION_RISK_MAP.get(action_key, 0))

        # Combined Weighted Calculation
        raw_risk = (
            self.WEIGHT_DEEPFAKE * df_score +
            self.WEIGHT_SPEAKER_MISMATCH * sm_score +
            self.WEIGHT_REPLAY * rep_score +
            self.WEIGHT_QUALITY * quality_score +
            self.WEIGHT_CONTEXT * context_score
        )

        # Context Multiplier Boost if high deepfake prob combined with sensitive request
        if (classification == "SUSPICIOUS DEEPFAKE" or deepfake_probability > 60.0) and context_score > 0:
            raw_risk += context_score * 0.45

        final_score = int(round(max(0.0, min(100.0, raw_risk))))

        # Determine Security Action based on Risk Level & Classification
        if final_score <= self.low_thresh and classification == "LIKELY GENUINE":
            level = "LOW"
            color_code = "GREEN"
            action = "MONITOR"
            action_description = "Acoustic features indicate genuine human voice. Continue standard call channel."
            restricted = False
            verification_required = False
        elif final_score <= self.mod_thresh or classification == "UNCERTAIN":
            level = "MODERATE"
            color_code = "YELLOW"
            action = "WARN"
            action_description = "Borderline acoustic metrics or moderate context risk. System advises caution."
            restricted = False
            verification_required = False
        elif final_score <= self.high_thresh:
            level = "HIGH"
            color_code = "ORANGE"
            action = "REQUIRE SECONDARY VERIFICATION"
            action_description = "High impersonation risk detected. Mandatory Voice Challenge Phrase or out-of-band auth required."
            restricted = False
            verification_required = True
        else:
            level = "CRITICAL"
            color_code = "RED"
            action = "ALERT + RESTRICT SENSITIVE ACTION"
            action_description = "Critical Voice Impersonation Threat detected! Sensitive operation restricted automatically."
            restricted = True
            verification_required = True

        explanations = self._generate_risk_explanations(
            classification, deepfake_probability, detection_confidence, speaker_match_score, sensitive_action, final_score
        )

        return {
            "impersonation_risk_score": final_score,
            "risk_level": level,
            "color_code": color_code,
            "recommended_action": action,
            "action_description": action_description,
            "is_restricted": restricted,
            "verification_required": verification_required,
            "sub_scores": {
                "deepfake_risk": round(df_score, 1),
                "speaker_mismatch_risk": round(sm_score, 1),
                "replay_risk": round(rep_score, 1),
                "context_risk_boost": round(context_score, 1)
            },
            "explanations": explanations
        }

    def _generate_risk_explanations(
        self, classification: str, df_prob: float, conf: float, sm_score: Optional[float], sensitive_action: str, risk_score: int
    ) -> List[str]:
        exps = []
        if classification == "LIKELY GENUINE":
            exps.append(f"✓ Calibrated deepfake probability is low ({df_prob:.1f}%) with high confidence ({conf:.1f}%).")
        elif classification == "SUSPICIOUS DEEPFAKE":
            exps.append(f"🚨 Calibrated deepfake probability is elevated ({df_prob:.1f}%) with {conf:.1f}% detection confidence.")
        else:
            exps.append(f"ℹ Borderline classification ({df_prob:.1f}% deepfake prob). Insufficient evidence for definitive verdict.")

        if sm_score is not None:
            if sm_score < 40.0:
                exps.append(f"⚠️ Speaker voice similarity ({sm_score:.1f}%) is far below enrolled profile threshold.")
            elif sm_score >= 80.0:
                exps.append(f"✓ Speaker identity match verified ({sm_score:.1f}% similarity).")

        if sensitive_action != "MONITORING":
            exps.append(f"🔐 Operation requested: '{sensitive_action}'. Context security boost applied.")

        return exps


# Singleton instance
risk_engine = RiskEngine()
