"""Combine all parts, validate against MOIP schema, and dump to backend/app/data/curated_solutions_isti.json"""
import json
import os

SCHEMA_PILLARS = {
    "Cybersecurity Suite",
    "Cloud Infrastructure & Modernization",
    "Data Analytics & AI",
    "Network & Enterprise Workplace"
}

SCHEMA_DOMAINS = {
    "privileged_access_management",
    "endpoint_security",
    "cloud_infrastructure",
    "kubernetes_modernization",
    "data_analytics_ai",
    "network_firewall_zero_trust",
    "campus_lan_wireless",
    "backup_disaster_recovery",
    "compliance_governance",
    "general_enterprise_it",
    "enterprise_workplace",
    "location_geospatial"
}

SCHEMA_REGULATIONS = {"ojk", "bi", "uu_pdp", "pci_dss", "iso27001", "none"}
SCHEMA_ENVIRONMENTS = {"on_premise", "cloud", "hybrid", "campus_lan", "unspecified"}

REQUIRED_FIELDS = [
    "id", "title", "pillar", "tier", "solution_domain",
    "regulatory_compliance", "target_environment", "primary_products",
    "all_products", "target_industries", "source_url", "pain_points",
    "key_subheadings", "business_impact", "summary_snippet",
    "probing_questions", "battlecard_ammo"
]

all_solutions = []
seen_ids = set()

has_parts = any(os.path.exists(f"backend/scripts/part{i}.json") for i in range(1, 14))
output_path = "backend/app/data/curated_solutions_isti.json"

if has_parts:
    for i in range(1, 14):
        part_path = f"backend/scripts/part{i}.json"
        if not os.path.exists(part_path):
            print(f"Warning: {part_path} missing")
            continue
        with open(part_path, "r", encoding="utf-8") as f:
            all_solutions.extend(json.load(f))
else:
    # Direct validation of output file
    if os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            all_solutions = json.load(f)
    else:
        raise FileNotFoundError(f"Neither parts nor {output_path} found!")

for item in all_solutions:
    # Validate required fields
    for rf in REQUIRED_FIELDS:
        assert rf in item, f"Missing field {rf} in {item.get('id')}"
    
    # Validate enums
    assert item["pillar"] in SCHEMA_PILLARS, f"Invalid pillar {item['pillar']} in {item['id']}"
    assert item["solution_domain"] in SCHEMA_DOMAINS, f"Invalid domain {item['solution_domain']} in {item['id']}"
    assert item["target_environment"] in SCHEMA_ENVIRONMENTS, f"Invalid env {item['target_environment']} in {item['id']}"
    assert item["tier"] in {1, 2}, f"Invalid tier {item['tier']} in {item['id']}"
    
    for reg in item["regulatory_compliance"]:
        assert reg in SCHEMA_REGULATIONS, f"Invalid reg {reg} in {item['id']}"
        
    assert isinstance(item["primary_products"], list) and len(item["primary_products"]) > 0
    assert isinstance(item["all_products"], list) and len(item["all_products"]) > 0
    assert isinstance(item["pain_points"], list) and len(item["pain_points"]) >= 2
    assert isinstance(item["probing_questions"], list) and len(item["probing_questions"]) >= 2
    
    b_ammo = item["battlecard_ammo"]
    assert "key_differentiators" in b_ammo and len(b_ammo["key_differentiators"]) > 10
    assert "objection_handling" in b_ammo and len(b_ammo["objection_handling"]) > 10
    assert "market_stats" in b_ammo and len(b_ammo["market_stats"]) > 10
    
    assert item["id"] not in seen_ids, f"Duplicate ID: {item['id']}"
    seen_ids.add(item["id"])

if has_parts:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_solutions, f, indent=2, ensure_ascii=False)
    print(f"SUCCESS: Combined {len(all_solutions)} solutions into {output_path}")
else:
    print(f"SUCCESS: Validated {len(all_solutions)} existing solutions in {output_path}")
