"""
Bach Cantata Recommender — Phase 1: Feature extraction from music21 chorale corpus.

Extracts a feature vector from each cantata chorale and saves the matrix as JSON.
"""

import json
import re
from pathlib import Path

import numpy as np
from music21 import corpus, pitch, interval, key

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def get_cantata_chorales():
    """Find all cantata chorales in the music21 corpus (BWV 1-200 range)."""
    paths = corpus.getComposer("bach")
    cantata_chorales = []
    for p in paths:
        name = str(p)
        match = re.search(r"bwv(\d+)\.(\d+)", name)
        if match:
            bwv = int(match.group(1))
            movement = int(match.group(2))
            if 1 <= bwv <= 200:
                cantata_chorales.append({
                    "path": name,
                    "bwv": bwv,
                    "movement": movement,
                })
    return sorted(cantata_chorales, key=lambda x: (x["bwv"], x["movement"]))


def extract_features(score):
    """Extract a feature vector from a parsed music21 score."""
    features = {}

    # Key and mode
    k = score.analyze("key")
    features["key_tonic_pc"] = k.tonic.pitchClass  # 0-11
    features["mode"] = 1.0 if k.mode == "major" else 0.0

    # Collect all notes
    all_notes = list(score.recurse().notes)
    if not all_notes:
        return None

    pitches = [n.pitch for n in all_notes if hasattr(n, "pitch")]
    if not pitches:
        return None

    # Pitch class histogram (12-dim, normalized)
    pc_hist = np.zeros(12)
    for p in pitches:
        pc_hist[p.pitchClass] += 1
    pc_total = pc_hist.sum()
    if pc_total > 0:
        pc_hist = pc_hist / pc_total
    for i in range(12):
        features[f"pc_{i}"] = pc_hist[i]

    # Interval histogram (melodic intervals in semitones, 0-12)
    intervals = []
    for i in range(1, len(pitches)):
        semitones = abs(pitches[i].midi - pitches[i - 1].midi)
        intervals.append(min(semitones, 12))  # cap at octave
    int_hist = np.zeros(13)
    for iv in intervals:
        int_hist[iv] += 1
    int_total = int_hist.sum()
    if int_total > 0:
        int_hist = int_hist / int_total
    for i in range(13):
        features[f"interval_{i}"] = int_hist[i]

    # Chromaticism score
    scale_pitches = set()
    for p in k.getScale().getPitches(k.tonic, pitch.Pitch(k.tonic.nameWithOctave).transpose(12)):
        scale_pitches.add(p.pitchClass)
    non_diatonic = sum(1 for p in pitches if p.pitchClass not in scale_pitches)
    features["chromaticism"] = non_diatonic / len(pitches)

    # Rhythmic density (notes per quarter-note beat)
    total_duration = score.duration.quarterLength
    if total_duration > 0:
        features["rhythmic_density"] = len(pitches) / total_duration
    else:
        features["rhythmic_density"] = 0.0

    # Voice range spread (highest - lowest pitch in semitones)
    midi_values = [p.midi for p in pitches]
    features["range_spread"] = max(midi_values) - min(midi_values)

    # Average pitch (centroid)
    features["pitch_centroid"] = np.mean(midi_values)

    # Stepwise motion ratio (intervals of 1-2 semitones vs larger)
    if intervals:
        stepwise = sum(1 for iv in intervals if iv <= 2)
        features["stepwise_ratio"] = stepwise / len(intervals)
    else:
        features["stepwise_ratio"] = 0.0

    return features


def main():
    print("Scanning music21 corpus for cantata chorales...")
    chorales = get_cantata_chorales()
    print(f"Found {len(chorales)} chorale movements from cantatas BWV 1-200.")

    results = []
    errors = []

    for i, entry in enumerate(chorales):
        bwv = entry["bwv"]
        mvt = entry["movement"]
        label = f"BWV {bwv}.{mvt}"
        print(f"  [{i+1}/{len(chorales)}] {label}...", end=" ")

        try:
            score = corpus.parse(entry["path"])
            features = extract_features(score)
            if features:
                results.append({
                    "bwv": bwv,
                    "movement": mvt,
                    "label": label,
                    "features": features,
                })
                print("OK")
            else:
                print("SKIP (no notes)")
                errors.append(label)
        except Exception as e:
            print(f"ERROR ({e})")
            errors.append(label)

    # Save results
    output_path = OUTPUT_DIR / "chorale_features.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDone. Extracted features for {len(results)} chorales.")
    print(f"Saved to: {output_path}")
    if errors:
        print(f"Skipped/errored: {len(errors)} — {errors[:10]}...")


if __name__ == "__main__":
    main()
