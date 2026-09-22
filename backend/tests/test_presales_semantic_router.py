"""
Test: Two-Stage Hybrid Semantic Router for Presales Solutions.
Run: backend/.venv/Scripts/python.exe -m pytest backend/tests/test_presales_semantic_router.py -v
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app.core.solutions_catalog import solutions_catalog
from app.schemas.kyc import PresalesIntentSlots, PainPointsNeedsOutput


class TestIstiCatalogLoading:
    def test_load_isti_catalog_26_cards(self):
        cards = solutions_catalog.get_all_cards()
        assert len(cards) == 26, f"Expected 26, got {len(cards)}"
        pam = [c for c in cards if c.id == "privileged-access-management-pam"]
        assert len(pam) == 1
        assert pam[0].solution_domain == "privileged_access_management"
        assert "ojk" in pam[0].regulatory_compliance
        assert len(pam[0].probing_questions) > 0
        assert isinstance(pam[0].battlecard_ammo, dict)

    def test_all_cards_have_solution_domain(self):
        for card in solutions_catalog.get_all_cards():
            assert card.solution_domain, f"{card.id} missing solution_domain"


class TestFSIBankingReservation:
    def test_banking_password_sharing_routes_pam_edr(self):
        slots = PresalesIntentSlots(
            solution_domains=["privileged_access_management", "endpoint_security"],
            regulatory_compliance=["ojk", "bi"],
            target_environment="hybrid",
        )
        _, cards, _ = solutions_catalog.route_presales_solutions(
            slots=slots, raw_needs="admin password sharing BeyondTrust",
            industry="Banking", limit=4,
        )
        ids = [c.id for c in cards]
        assert "privileged-access-management-pam" in ids
        assert "next-gen-endpoint-security-edr" in ids
        assert cards[0].id in {"privileged-access-management-pam", "next-gen-endpoint-security-edr"}

    def test_fsi_via_compliance_tags(self):
        slots = PresalesIntentSlots(
            solution_domains=["privileged_access_management"],
            regulatory_compliance=["ojk", "bi"], target_environment="hybrid",
        )
        _, cards, _ = solutions_catalog.route_presales_solutions(
            slots=slots, raw_needs="privileged access management", limit=4,
        )
        assert any(c.id == "privileged-access-management-pam" for c in cards)



class TestLogisticsRouting:
    def test_fleet_maps_routes_geospatial(self):
        slots = PresalesIntentSlots(
            solution_domains=["location_geospatial"],
            regulatory_compliance=["none"], target_environment="cloud",
        )
        _, cards, _ = solutions_catalog.route_presales_solutions(
            slots=slots, raw_needs="rute armada kurir delivery tracking", limit=4,
        )
        assert any(c.id == "google-maps-platform-geospatial" for c in cards)


class TestEmailMigrationRouting:
    def test_zimbra_migration_routes_workspace(self):
        slots = PresalesIntentSlots(
            solution_domains=["enterprise_workplace"],
            regulatory_compliance=["none"], target_environment="cloud",
        )
        _, cards, _ = solutions_catalog.route_presales_solutions(
            slots=slots, raw_needs="migrasi email Zimbra ke Google Workspace", limit=4,
        )
        assert any(c.id == "google-workspace-enterprise-productivity" for c in cards)


class TestBackwardCompatibility:
    def test_match_solutions_with_metadata_still_works(self):
        prompt, cards = solutions_catalog.match_solutions_with_metadata(
            product="Cybersecurity", customer_needs="BeyondTrust PAM", limit=4,
        )
        assert isinstance(prompt, str) and len(cards) > 0

    def test_get_solutions_for_prompt_still_works(self):
        result = solutions_catalog.get_solutions_for_prompt(
            customer_needs="Google Workspace migration email", limit=3,
        )
        assert isinstance(result, str)

    def test_route_returns_three_tuple(self):
        ctx, cards, vague = solutions_catalog.route_presales_solutions(
            slots=PresalesIntentSlots(), raw_needs="general inquiry", limit=4,
        )
        assert isinstance(ctx, str) and isinstance(cards, list) and isinstance(vague, bool)


class TestPresalesIntentSlotsPydantic:
    def test_default_construction(self):
        slots = PresalesIntentSlots()
        assert slots.solution_domains == []
        assert slots.regulatory_compliance == ["none"]
        assert slots.target_environment == "unspecified"
        assert slots.is_vague_input is False

    def test_pain_points_output_has_presales_slots(self):
        out = PainPointsNeedsOutput(
            customer_need_summary="Test", potential_pain_points=["p1"],
        )
        assert hasattr(out, "presales_slots")
        assert out.presales_slots.target_environment == "unspecified"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
