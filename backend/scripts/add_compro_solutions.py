#!/usr/bin/env python3
"""Add Compro SMG enterprise use case solutions to curated_solutions.json"""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _compro_cards import WORKSPACE_UPGRADE, NEW_CARDS

path = "backend/app/data/curated_solutions.json"
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

for i, card in enumerate(data):
    if card["id"] == "wujudkan-kerja-kreatif-dan-kolaboratif-dengan-google-workspace":
        data[i] = WORKSPACE_UPGRADE
        print(f"Updated workspace card at index {i}")
        break

data.extend(NEW_CARDS)
print(f"Total cards: {len(data)}")

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print("JSON saved")
