"""
Bach Cantata Recommender — Phase 2b: Visualization.

Plots the UMAP embedding colored by key/mode. Outputs a PNG.
"""

import json
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

OUTPUT_DIR = Path(__file__).parent / "output"
CLUSTERS_PATH = OUTPUT_DIR / "clusters.json"
FEATURES_PATH = OUTPUT_DIR / "chorale_features.json"


def main():
    with open(CLUSTERS_PATH) as f:
        clusters = json.load(f)

    with open(FEATURES_PATH) as f:
        features_data = json.load(f)

    labels = clusters["labels"]
    embedding = np.array(clusters["embedding"])

    # Color by mode (major=gold, minor=steelblue)
    modes = [entry["features"]["mode"] for entry in features_data]
    colors = ["#C49A3C" if m == 1.0 else "#4A7A96" for m in modes]

    fig, ax = plt.subplots(figsize=(12, 8))
    ax.scatter(embedding[:, 0], embedding[:, 1], c=colors, alpha=0.7, s=40, edgecolors="white", linewidth=0.5)

    # Annotate with BWV numbers
    for i, label in enumerate(labels):
        bwv_short = label.replace("BWV ", "")
        ax.annotate(bwv_short, (embedding[i, 0], embedding[i, 1]),
                    fontsize=6, alpha=0.6, ha="center", va="bottom")

    ax.set_title("Bach Cantata Chorales — UMAP Projection (cosine distance)", fontsize=14)
    ax.set_xlabel("UMAP 1")
    ax.set_ylabel("UMAP 2")

    legend_patches = [
        mpatches.Patch(color="#C49A3C", label="Major"),
        mpatches.Patch(color="#4A7A96", label="Minor"),
    ]
    ax.legend(handles=legend_patches, loc="upper right")

    plt.tight_layout()
    output_path = OUTPUT_DIR / "chorale_map.png"
    plt.savefig(output_path, dpi=150)
    print(f"Saved plot to: {output_path}")
    plt.close()


if __name__ == "__main__":
    main()
