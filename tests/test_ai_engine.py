import pytest
from backend.app.ai.deepfake_detector import detector
from backend.app.ai.speaker_verification import verifier

def test_deepfake_detector_fallback():
    dummy_audio = b"RIFF" + b"\x00" * 500  # Fake header + bytes
    res = detector.analyze_audio_bytes(dummy_audio, filename="test.wav")
    assert "deepfake_probability" in res
    assert "classification" in res
    assert "confidence" in res
    assert "signals" in res


def test_generic_upload_filename_does_not_default_to_genuine():
    dummy_audio = b"RIFF" + b"\x00" * 500
    res = detector.analyze_audio_bytes(dummy_audio, filename="voice_sample.wav")
    assert res["classification"] != "LIKELY GENUINE"
    assert res["classification"] in {"INSUFFICIENT AUDIO QUALITY", "UNCERTAIN", "SUSPICIOUS DEEPFAKE"}


def test_generic_upload_is_conservative_when_no_model_evidence_exists():
    dummy_audio = b"RIFF" + b"\x00" * 1000
    res = detector.analyze_audio_bytes(dummy_audio, filename="recording.wav")
    assert res["deepfake_probability"] <= 60.0
    assert res["classification"] != "LIKELY GENUINE"


def test_speaker_verification_cosine():
    emb1 = [0.1] * 32
    emb2 = [0.1] * 32
    emb3 = [-0.1] * 32

    # Matching vectors
    match_res = verifier.compare_embeddings(emb1, emb2)
    assert match_res["match_score"] >= 95.0
    assert match_res["status"] == "MATCH"

    # Divergent vectors
    mismatch_res = verifier.compare_embeddings(emb1, emb3)
    assert mismatch_res["match_score"] <= 30.0
    assert mismatch_res["status"] == "MISMATCH"
