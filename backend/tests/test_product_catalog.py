"""
backend/tests/test_product_catalog.py

Unit tests for Magna Structured Product Catalog and Deterministic Metadata Filter.
Verifies 0% false positive constraint (on_prem vs cloud vs hybrid).
"""

import pytest
from app.services.product_catalog_service import (
    ProductCatalogService,
    ProductCatalogItem,
    product_catalog_service,
)


def test_catalog_load_and_counts():
    """Verify catalog loads all products with complete metadata."""
    products = product_catalog_service.get_all_products()
    assert len(products) >= 20

    # Ensure required strategic solutions exist
    greenplum = product_catalog_service.get_product_by_id("magna-edw-greenplum")
    assert greenplum is not None
    assert greenplum.deployment_modes == ["on_prem"]
    assert "VMware Tanzu" in greenplum.vendor_partner or "Dell" in greenplum.vendor_partner

    mssql = product_catalog_service.get_product_by_id("mssql-modernization")
    assert mssql is not None
    assert "on_prem" in mssql.deployment_modes
    assert "hybrid" in mssql.deployment_modes


def test_hard_constraint_zero_false_positive_on_premise():
    """
    CRITICAL RULE:
    When a client strictly demands on-premise infrastructure (physical server, local data center,
    OJK data residency compliance), the catalog filter MUST NOT return ANY cloud-only product
    (e.g., BigQuery, Google Workspace, Google Maps).
    """
    on_prem_needs = (
        "Kebutuhan server fisik lokal di data center sendiri untuk kepatuhan regulasi OJK "
        "dan Bank Indonesia. Biaya egress cloud sebelumnya membengkak sehingga wajib on-premise."
    )

    filtered = product_catalog_service.filter_products(
        customer_needs=on_prem_needs,
        product="Data Warehouse & Server",
        limit=6,
    )

    assert len(filtered) > 0

    # Hard constraint verification: Every single recommended product MUST support on_prem or hybrid
    for p in filtered:
        assert "on_prem" in p.deployment_modes or "hybrid" in p.deployment_modes, (
            f"Product {p.product_id} with modes {p.deployment_modes} violates on-prem constraint!"
        )
        assert p.deployment_modes != ["cloud"], (
            f"Cloud-only product {p.product_id} returned for strict on-premise client!"
        )

    product_ids = {p.product_id for p in filtered}
    # Should include Greenplum or Dell servers or Nutanix HCI
    assert any(pid in product_ids for pid in ["magna-edw-greenplum", "dell-poweredge-servers", "nutanix-hci", "mssql-modernization"])
    # MUST NOT include BigQuery or Workspace
    assert "gcp-bigquery" not in product_ids
    assert "gws-enterprise" not in product_ids
    assert "maps-fleet-location" not in product_ids


def test_hard_constraint_zero_false_positive_cloud():
    """
    When client demands cloud migration to GCP, strictly on-prem products
    (e.g., physical Dell rack servers or Sangfor HCI) must not be recommended.
    """
    cloud_needs = "Ingin migrasi seluruh data warehouse dan workload aplikasi ke Google Cloud Platform (GCP BigQuery dan GKE)."

    filtered = product_catalog_service.filter_products(
        customer_needs=cloud_needs,
        product="Cloud Migration",
        limit=5,
    )

    assert len(filtered) > 0
    for p in filtered:
        assert "cloud" in p.deployment_modes or "hybrid" in p.deployment_modes
        assert p.deployment_modes != ["on_prem"], (
            f"On-premise-only product {p.product_id} returned for cloud client!"
        )

    product_ids = {p.product_id for p in filtered}
    assert any("gcp" in pid for pid in product_ids)
    assert "dell-poweredge-servers" not in product_ids
    assert "sangfor-hci" not in product_ids


def test_detect_deployment_intent():
    """Verify deployment intent heuristic classifier."""
    assert product_catalog_service.detect_deployment_intent(customer_needs="Server fisik data center lokal") == "on_prem"
    assert product_catalog_service.detect_deployment_intent(customer_needs="Kepatuhan regulasi OJK residensi data") == "on_prem"
    assert product_catalog_service.detect_deployment_intent(customer_needs="Migrasi workload ke Google Cloud BigQuery") == "cloud"
    assert product_catalog_service.detect_deployment_intent(customer_needs="Kebutuhan hybrid cloud data mart dan CDC") == "hybrid"
    assert product_catalog_service.detect_deployment_intent(customer_needs="Solusi manajemen dokumen umum") == "any"


def test_format_for_prompt():
    """Verify format_for_prompt produces compact, cache-friendly markdown."""
    products = product_catalog_service.filter_products(
        customer_needs="Peremajaan core switch network dan firewall cabang",
        limit=2,
    )
    prompt_text = product_catalog_service.format_for_prompt(products)
    assert "Verified Magna Product Portfolio Catalog" in prompt_text
    assert "[Product ID:" in prompt_text
    assert "- Nama Solusi" in prompt_text
    assert "- Partner/OEM" in prompt_text
