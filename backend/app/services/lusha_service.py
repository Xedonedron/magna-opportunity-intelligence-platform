"""Lusha REST API Client Service (V3).

Provides direct programmatic integration with Lusha for contact prospecting,
enrichment, and usage monitoring without browser automation or scraping.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

LUSHA_BASE_URL = "https://api.lusha.com/v3"

# Seniority mapping for Lusha V3 filter IDs
SENIORITY_MAPPING: Dict[str, List[int]] = {
    "c_level": [9],          # c-suite
    "vp_director": [8, 6],   # vice president, director
    "head_lead": [6, 5],     # director, manager
    "manager": [5],          # manager
    "specialist": [4],       # senior
}

FUNCTION_KEYWORDS: Dict[str, Dict[str, Any]] = {
    "network": {
        "departments": ["Information Technology", "Engineering & Technical"],
        "job_titles": ["Network", "Infrastructure", "SD-WAN", "IT Infrastructure", "Telecommunication"],
    },
    "security": {
        "departments": ["Information Technology", "Engineering & Technical"],
        "job_titles": ["Cyber Security", "Information Security", "CISO", "Security", "IT Security"],
    },
    "cloud": {
        "departments": ["Information Technology", "Engineering & Technical"],
        "job_titles": ["Cloud", "DevOps", "Infrastructure", "System Administrator", "Data Center"],
    },
    "data": {
        "departments": ["Information Technology", "Engineering & Technical"],
        "job_titles": ["Data", "Analytics", "AI", "Machine Learning", "Business Intelligence"],
    },
}


class LushaService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, "LUSHA_API_KEY", "") or ""
        self.headers = {
            "api_key": self.api_key,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def get_usage(self) -> Dict[str, Any]:
        """Fetch current Lusha account credit usage and limits."""
        if not self.is_configured:
            return {
                "configured": False,
                "credits_remaining": 0,
                "credits_total": 0,
                "credits_used": 0,
                "plan": "unconfigured",
            }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{LUSHA_BASE_URL}/account/usage", headers=self.headers)
            if resp.status_code != 200:
                logger.error(f"[LushaService] Failed to get usage: {resp.status_code} - {resp.text}")
                resp.raise_for_status()
            
            data = resp.json()
            credits_info = data.get("credits", {})
            rate_limits = data.get("rateLimits", {})
            plan_info = data.get("plan", {})
            return {
                "configured": True,
                "plan": plan_info.get("category", "starter"),
                "credits_remaining": credits_info.get("remaining", 0),
                "credits_total": credits_info.get("total", 0),
                "credits_used": credits_info.get("used", 0),
                "renewal_date": plan_info.get("endDate"),
                "rate_limit_per_minute": rate_limits.get("minute", {}).get("limit", 40) if rate_limits.get("minute") else 40,
                "rate_limit_per_day": rate_limits.get("daily", {}).get("limit", 100) if rate_limits.get("daily") else 100,
            }

    async def get_account_usage(self) -> Dict[str, Any]:
        """Alias for get_usage."""
        return await self.get_usage()

    async def search_contacts(
        self,
        company_name: str,
        company_domain: Optional[str] = None,
        country: str = "Indonesia",
        job_function: Optional[str] = None,
        seniority: Optional[str] = None,
        job_titles: Optional[List[str]] = None,
        page: int = 0,
        size: int = 10,
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Search for potential contacts via Lusha Prospecting API.
        Does not consume reveal credits (only low prospecting query cost).
        """
        if not self.is_configured:
            raise ValueError("Lusha API Key is not configured in backend environment.")

        # Minimum page size required by Lusha API is 10
        effective_size = limit if limit is not None else size
        actual_size = max(10, effective_size)

        companies_include: Dict[str, Any] = {
            "names": [company_name.strip()],
        }
        if company_domain and company_domain.strip():
            clean_dom = re.sub(r"^https?://(www\.)?", "", company_domain.strip()).split("/")[0].strip()
            if clean_dom:
                companies_include["domains"] = [clean_dom]
        if country:
            companies_include["locations"] = [{"country": country.strip()}]

        contacts_include: Dict[str, Any] = {}

        # Map seniority
        if seniority and seniority in SENIORITY_MAPPING:
            contacts_include["seniority"] = SENIORITY_MAPPING[seniority]

        # Map function or job titles
        titles: List[str] = []
        if job_titles:
            titles.extend(job_titles)
        elif job_function and job_function in FUNCTION_KEYWORDS:
            fn_cfg = FUNCTION_KEYWORDS[job_function]
            contacts_include["departments"] = fn_cfg["departments"]
            titles.extend(fn_cfg["job_titles"])

        if titles:
            contacts_include["jobTitles"] = titles

        filters: Dict[str, Any] = {
            "companies": {"include": companies_include},
        }
        if contacts_include:
            filters["contacts"] = {"include": contacts_include}

        payload = {
            "pagination": {"page": page, "size": actual_size},
            "filters": filters,
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{LUSHA_BASE_URL}/contacts/prospecting",
                headers=self.headers,
                json=payload,
            )
            raw_data = resp.json() if resp.status_code == 200 else {}
            results = raw_data.get("results", [])
            pagination = raw_data.get("pagination", {})
            total = pagination.get("total", len(results))

            # If 0 results and country filter was applied, retry without strict company location
            # (Allows finding employees of MNCs, branches, or companies registered with foreign HQ e.g. OCBC, Ganesha)
            if resp.status_code == 200 and total == 0 and country:
                companies_include_fb = dict(companies_include)
                companies_include_fb.pop("locations", None)
                payload_fb = {
                    "pagination": {"page": page, "size": actual_size},
                    "filters": {
                        "companies": {"include": companies_include_fb},
                    },
                }
                if contacts_include:
                    payload_fb["filters"]["contacts"] = {"include": contacts_include}

                resp_fb = await client.post(
                    f"{LUSHA_BASE_URL}/contacts/prospecting",
                    headers=self.headers,
                    json=payload_fb,
                )
                if resp_fb.status_code == 200:
                    raw_data = resp_fb.json()
                    results = raw_data.get("results", [])
                    pagination = raw_data.get("pagination", {})
                    total = pagination.get("total", len(results))
                    resp = resp_fb

            if resp.status_code != 200:
                logger.error(f"[LushaService] Prospecting search failed: {resp.status_code} - {resp.text}")
                err_msg = "Gagal melakukan pencarian kontak di Lusha."
                try:
                    err_json = resp.json()
                    if "message" in err_json:
                        err_msg = f"{err_json['message']}"
                except Exception:
                    pass
                return {
                    "success": False,
                    "total": 0,
                    "contacts": [],
                    "available_job_titles": [],
                    "available_departments": [],
                    "page": page,
                    "size": actual_size,
                    "message": err_msg,
                }

            contacts_list = []
            for item in results:
                company_info = item.get("company", {}) or {}
                location_info = item.get("location", {}) or {}
                
                job_title_raw = item.get("jobTitle")
                if isinstance(job_title_raw, dict):
                    job_title_str = job_title_raw.get("title") or "Stakeholder"
                    dept_list = job_title_raw.get("departments", [])
                    seniority_val = job_title_raw.get("seniority")
                    department_str = dept_list[0] if dept_list else None
                elif isinstance(job_title_raw, str):
                    job_title_str = job_title_raw
                    department_str = item.get("department")
                    seniority_val = item.get("seniority")
                else:
                    job_title_str = "Stakeholder"
                    department_str = None
                    seniority_val = None

                full_name_calc = item.get("fullName") or f"{item.get('firstName', '')} {item.get('lastName', '')}".strip() or "Unnamed"
                contacts_list.append({
                    "id": str(item.get("id")),
                    "name": full_name_calc,
                    "first_name": item.get("firstName", ""),
                    "last_name": item.get("lastName", ""),
                    "full_name": full_name_calc,
                    "job_title": job_title_str,
                    "department": department_str,
                    "seniority": seniority_val,
                    "company_name": company_info.get("name") or company_name,
                    "company_domain": company_info.get("domain", ""),
                    "country": location_info.get("country", country),
                    "city": location_info.get("city", ""),
                    "linkedin_url": item.get("linkedinUrl") or item.get("socialUrl", ""),
                    "has_email": bool(item.get("hasEmail", False)),
                    "has_phone": bool(item.get("hasPhone", False)),
                    "is_unlocked": False,
                    "unlocked_email": None,
                    "unlocked_phone": None,
                    "is_saved_in_directory": False,
                    "local_contact_id": None,
                })

            available_job_titles = sorted(list(set(c["job_title"] for c in contacts_list if c.get("job_title"))))
            available_departments = sorted(list(set(c["department"] for c in contacts_list if c.get("department"))))

            return {
                "success": True,
                "total": total,
                "contacts": contacts_list,
                "available_job_titles": available_job_titles,
                "available_departments": available_departments,
                "page": page,
                "size": actual_size,
            }

    async def enrich_contacts(
        self,
        contact_ids: List[str],
        reveal: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Enrich / reveal emails and phone numbers for specific contact IDs.
        Consumes Lusha reveal credits.
        """
        if not self.is_configured:
            raise ValueError("Lusha API Key is not configured in backend environment.")

        reveal_fields = reveal or ["emails", "phones"]
        payload = {
            "ids": contact_ids,
            "reveal": reveal_fields,
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{LUSHA_BASE_URL}/contacts/enrich",
                headers=self.headers,
                json=payload,
            )
            if resp.status_code != 200:
                logger.error(f"[LushaService] Contact enrichment failed: {resp.status_code} - {resp.text}")
                resp.raise_for_status()

            data = resp.json()
            results = data.get("results", [])
            enriched = []
            for item in results:
                raw_emails = item.get("emails", []) or []
                raw_phones = item.get("phoneNumbers", []) or []

                emails = [{"email": e.get("email", ""), "type": e.get("type", "work")} for e in raw_emails if e.get("email")]
                phones = [{"number": p.get("internationalNumber") or p.get("number", ""), "type": p.get("type", "mobile")} for p in raw_phones if (p.get("internationalNumber") or p.get("number"))]

                primary_email = emails[0]["email"] if emails else None
                primary_phone = phones[0]["number"] if phones else None

                enriched.append({
                    "id": str(item.get("id")),
                    "full_name": item.get("fullName") or f"{item.get('firstName', '')} {item.get('lastName', '')}".strip(),
                    "job_title": item.get("jobTitle", ""),
                    "emails": emails,
                    "phones": phones,
                    "primary_email": primary_email,
                    "primary_phone": primary_phone,
                    "linkedin_url": item.get("linkedinUrl", ""),
                })

            return enriched

    async def enrich_contact(
        self,
        contact_id: str,
        reveal: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Convenience method to enrich a single contact ID."""
        results = await self.enrich_contacts([contact_id], reveal=reveal)
        if results:
            first = results[0]
            email_list = [e.get("email") for e in first.get("emails", []) if e.get("email")]
            phone_list = [p.get("number") for p in first.get("phones", []) if p.get("number")]
            return {
                "success": True,
                "contact_id": contact_id,
                "emails": email_list,
                "phones": phone_list,
                "data": first,
                "message": "Kontak berhasil diperkaya dengan data terverifikasi Lusha.",
            }
        return {
            "success": False,
            "contact_id": contact_id,
            "emails": [],
            "phones": [],
            "message": "Data kontak tidak ditemukan atau tidak tersedia.",
        }

    async def search_companies(
        self,
        company_query: str,
        country: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for companies via Lusha Companies Prospecting API.
        Returns a list of matching company profiles.
        """
        if not self.is_configured:
            return []

        payload: Dict[str, Any] = {
            "filters": {
                "companies": {
                    "include": {
                        "names": [company_query]
                    }
                }
            },
            "pagination": {"page": 0, "size": 10},
        }
        if country:
            payload["filters"]["companies"]["include"]["locations"] = [{"country": country}]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{LUSHA_BASE_URL}/companies/prospecting",
                    headers=self.headers,
                    json=payload,
                )
                if resp.status_code != 200:
                    logger.warning(f"[LushaService] Company search returned {resp.status_code}: {resp.text}")
                    return []

                raw = resp.json()
                results = raw.get("results", [])

                # Fallback: if 0 companies found in country (e.g. OCBC, Ganesha), search globally
                if not results and country:
                    payload_fb = {
                        "filters": {
                            "companies": {
                                "include": {
                                    "names": [company_query]
                                }
                            }
                        },
                        "pagination": {"page": 0, "size": 10},
                    }
                    resp_fb = await client.post(
                        f"{LUSHA_BASE_URL}/companies/prospecting",
                        headers=self.headers,
                        json=payload_fb,
                    )
                    if resp_fb.status_code == 200:
                        raw_fb = resp_fb.json()
                        results = raw_fb.get("results", [])
                companies_list = []
                for item in results:
                    loc = item.get("location", {}) or {}
                    companies_list.append({
                        "name": item.get("name", company_query),
                        "domain": item.get("domain", ""),
                        "industry": item.get("industry") or item.get("mainIndustry", ""),
                        "country": loc.get("country", country or ""),
                        "city": loc.get("city", ""),
                        "employee_count": str(item.get("employeeCount", "")),
                        "logo_url": item.get("logoUrl"),
                    })
                return companies_list
        except Exception as e:
            logger.warning(f"[LushaService] Company search failed: {e}")
            return []


lusha_service = LushaService()
