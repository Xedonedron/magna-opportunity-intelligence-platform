"""
Test: Context-Aware Semantic Solution Matching Engine.
Run: python -m pytest backend/tests/test_solutions_catalog_semantic.py -v
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app.core.solutions_catalog import (
    solutions_catalog, _classify_intent, _word_boundary_match,
    PILLAR_DATA, PILLAR_SECURITY, PILLAR_INFRA, PILLAR_NETWORK,
)


class TestIntentClassifier:
    def test_etl_pipeline_intent(self):
        pillar, env = _classify_intent("BigQuery Dataflow ETL data pipeline streaming")
        assert pillar == PILLAR_DATA
        assert env == "cloud"

    def test_onprem_server_intent(self):
        pillar, env = _classify_intent("Dell PowerEdge server rack storage on-premise")
        assert pillar == PILLAR_INFRA
        assert env == "on_premise"

    def test_campus_lan_intent(self):
        pillar, env = _classify_intent("Cisco Catalyst campus network wifi access point")
        assert pillar == PILLAR_NETWORK
        assert env == "campus_lan"

    def test_pam_security_intent(self):
        pillar, env = _classify_intent("BeyondTrust PAM privileged access management endpoint")
        assert pillar == PILLAR_SECURITY

    def test_hybrid_override(self):
        _, env = _classify_intent("Dell server on-premise hybrid cloud migration")
        assert env == "hybrid"

    def test_workspace_intent(self):
        pillar, _ = _classify_intent("Google Workspace migration Gmail Zimbra email enterprise")
        assert pillar == PILLAR_NETWORK

    def test_maps_intent(self):
        pillar, env = _classify_intent("Google Maps Platform rute armada kurir delivery tracking")
        assert pillar == PILLAR_INFRA
        assert env == "cloud"


class TestWordBoundaryMatch:
    def test_lan_not_in_penjualan(self):
        assert _word_boundary_match("lan", "penjualan produk enterprise") is False

    def test_lan_in_campus_lan(self):
        assert _word_boundary_match("campus lan", "deploy campus lan di gedung baru") is True

    def test_etl_standalone(self):
        assert _word_boundary_match("etl", "build etl pipeline") is True

    def test_pam_standalone(self):
        assert _word_boundary_match("pam", "implement pam for it admin") is True



class TestSolutionMatching:
    def test_etl_pipeline_matches_bigquery(self):
        _, cards = solutions_catalog.match_solutions_with_metadata(
            product="Cloud Data & AI",
            customer_needs="Build ETL data pipeline BigQuery Dataflow streaming",
            limit=5,
        )
        products_flat = [p.lower() for c in cards for p in c.primary_products]
        assert any("bigquery" in p for p in products_flat), f"BigQuery not in {products_flat}"
        assert not any("ngav" in p for p in products_flat), "NGAV should not match ETL"

    def test_onprem_server_suppresses_bigquery(self):
        _, cards = solutions_catalog.match_solutions_with_metadata(
            product="IT Infrastructure",
            customer_needs="Dell server HPE storage on-premise data center fisik rack server",
            limit=5,
        )
        pillars = [c.pillar for c in cards]
        assert PILLAR_DATA not in pillars, f"Data pillar suppressed for on-prem: {pillars}"

    def test_campus_lan_no_false_trigger(self):
        _, cards_bad = solutions_catalog.match_solutions_with_metadata(
            customer_needs="penjualan produk retail marketplace", limit=5,
        )
        for c in cards_bad:
            assert "LAN" not in c.title or "Wireless" not in c.title

    def test_pam_matches_beyondtrust(self):
        _, cards = solutions_catalog.match_solutions_with_metadata(
            product="Cybersecurity",
            customer_needs="BeyondTrust PAM privileged access management endpoint privilege",
            limit=5,
        )
        titles_lower = [c.title.lower() for c in cards]
        assert any("privilege" in t or "pam" in t or "endpoint" in t for t in titles_lower), \
            f"PAM cards not found: {titles_lower}"

    def test_workspace_matching(self):
        _, cards = solutions_catalog.match_solutions_with_metadata(
            customer_needs="Migrasi email Zimbra ke Google Workspace untuk enterprise",
            limit=3,
        )
        assert len(cards) > 0
        assert "Google Workspace" in cards[0].title

    def test_planet_ban_cdc_matching(self):
        _, cards = solutions_catalog.match_solutions_with_metadata(
            customer_needs="Planet Ban retail store CDC Datastream inventory real time 1200 outlet",
            limit=3,
        )
        assert len(cards) > 0
        assert "Planet Ban" in cards[0].title or "CDC" in cards[0].title

    def test_malika_ai_matching(self):
        _, cards = solutions_catalog.match_solutions_with_metadata(
            customer_needs="MALIKA procurement AI vendor document comparison dan search",
            limit=3,
        )
        assert len(cards) > 0
        assert "MALIKA" in cards[0].title

    def test_banking_etl_matching(self):
        _, cards = solutions_catalog.match_solutions_with_metadata(
            customer_needs="Banking 24/7 ETL monitoring managed services Greenplum Talend",
            limit=3,
        )
        assert len(cards) > 0
        assert "ETL Pipeline Monitoring" in cards[0].title

    def test_maps_matching(self):
        _, cards = solutions_catalog.match_solutions_with_metadata(
            customer_needs="Google Maps Platform fleet route optimization kurir logistik tracking",
            limit=3,
        )
        assert len(cards) > 0
        assert "Google Maps Platform" in cards[0].title

    def test_healthcare_lan_matching(self):
        _, cards = solutions_catalog.match_solutions_with_metadata(
            customer_needs="Healthcare hospital wired wireless LAN EMR Wi-Fi 6 WPA3",
            limit=3,
        )
        assert len(cards) > 0
        assert "Healthcare" in cards[0].title

    def test_cards_valid_source_url(self):
        for card in solutions_catalog.get_all_cards():
            if card.source_url:
                assert card.source_url.startswith("https://magnaglobal.id/"), \
                    f"Invalid source_url: {card.source_url}"


class TestBackwardCompat:
    def test_get_solutions_for_prompt_returns_string(self):
        result = solutions_catalog.get_solutions_for_prompt(
            industry="Financial Services", product="Data Analytics",
            customer_needs="fraud detection real-time",
        )
        assert isinstance(result, str)

    def test_schema_case_study_fields_optional(self):
        from app.schemas.kyc import UseCaseItem
        uc = UseCaseItem(
            title="T", description="d", problem_solved="p",
            how_it_works="w", business_impact="b",
            google_products=["BigQuery"], smartnet_solutions=["X"],
        )
        assert uc.case_study_url is None
        assert uc.case_study_title is None
