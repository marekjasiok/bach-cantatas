"""
Bach Cantata Recommender — Phase 2: Clustering and distance computation.

Reads the feature matrix from Phase 1, normalizes, computes pairwise distances,
runs UMAP for 2D visualization, and outputs results.
"""

import json
from pathlib import Path

import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_distances
import umap

OUTPUT_DIR = Path(__file__).parent / "output"
FEATURES_PATH = OUTPUT_DIR / "chorale_features.json"


def load_feature_matrix():
    """Load features JSON and return labels + numpy matrix."""
    with open(FEATURES_PATH) as f:
        data = json.load(f)

    labels = [entry["label"] for entry in data]
    bwv_numbers = [entry["bwv"] for entry in data]

    # Get all feature keys from first entry
    feature_keys = sorted(data[0]["features"].keys())

    # Build matrix
    matrix = np.array([
        [entry["features"][k] for k in feature_keys]
        for entry in data
    ])

    return labels, bwv_numbers, feature_keys, matrix


def find_neighbors(labels, distances, n=5):
    """For each chorale, find the n nearest neighbors."""
    neighbors = {}
    for i, label in enumerate(labels):
        sorted_indices = np.argsort(distances[i])
        # Skip self (index 0)
        nearest = [(labels[j], float(distances[i][j])) for j in sorted_indices[1:n+1]]
        neighbors[label] = nearest
    return neighbors


def main():
    print("Loading feature matrix...")
    labels, bwv_numbers, feature_keys, matrix = load_feature_matrix()
    print(f"  {len(labels)} chorales, {len(feature_keys)} features each.")

    # Normalize
    scaler = StandardScaler()
    matrix_scaled = scaler.fit_transform(matrix)

    # Pairwise cosine distances
    print("Computing pairwise distances...")
    distances = cosine_distances(matrix_scaled)

    # Find nearest neighbors
    print("Finding nearest neighbors...")
    neighbors = find_neighbors(labels, distances, n=5)

    # UMAP embedding for visualization
    print("Running UMAP...")
    reducer = umap.UMAP(n_components=2, metric="cosine", random_state=42)
    embedding = reducer.fit_transform(matrix_scaled)

    # Save outputs
    output = {
        "labels": labels,
        "bwv_numbers": bwv_numbers,
        "embedding": embedding.tolist(),
        "neighbors": neighbors,
    }

    output_path = OUTPUT_DIR / "clusters.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Saved to: {output_path}")

    # Print a sample
    print("\n--- Sample: nearest neighbors ---")
    sample_keys = list(neighbors.keys())[:10]
    for label in sample_keys:
        nbs = neighbors[label]
        nb_str = ", ".join(f"{n[0]} ({n[1]:.3f})" for n in nbs)
        print(f"  {label} → {nb_str}")


if __name__ == "__main__":
    main()
