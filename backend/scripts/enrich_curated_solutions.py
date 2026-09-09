import json
import os
import re
import time
import urllib.request
from bs4 import BeautifulSoup

def clean_and_enrich():
    curated_file = "backend/app/data/curated_solutions.json"
    with open(curated_file, "r", encoding="utf-8") as f:
        curated = json.load(f)

    print(f"Enriching {len(curated)} curated solutions with clean paragraphs & subheadings...")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    for idx, item in enumerate(curated):
        url = item.get("source_url")
        if not url:
            continue

        print(f"[{idx+1}/{len(curated)}] Fetching {url.split('/')[-1]}...")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                html = resp.read().decode("utf-8")

            soup = BeautifulSoup(html, "html.parser")
            for s in soup(["script", "style", "noscript", "nav", "footer"]):
                s.decompose()

            # Find post container
            article_div = soup.find("div", class_=re.compile(r"elementor-widget-theme-post-content"))
            if not article_div:
                article_div = soup.find("div", class_=re.compile(r"post-content|entry-content"))
            if not article_div:
                article_div = soup

            # Subheadings
            h_tags = article_div.find_all(["h2", "h3"])
            clean_headings = []
            for h in h_tags:
                txt = h.get_text().strip()
                if 10 < len(txt) < 120 and "whatsapp" not in txt.lower() and "click to chat" not in txt.lower() and "about smartnet" not in txt.lower() and "artikel terkait" not in txt.lower():
                    clean_headings.append(txt)

            if clean_headings:
                item["key_subheadings"] = clean_headings[:8]

            # Paragraphs
            p_tags = article_div.find_all("p")
            clean_paras = [p.get_text().strip() for p in p_tags if len(p.get_text().strip()) > 50]
            # Filter out non-content paragraphs
            filtered_paras = [p for p in clean_paras if not any(x in p.lower() for x in ["copyright", "rights reserved", "bagikan artikel", "click to chat", "whatsapp"])]

            if filtered_paras:
                # Use first good paragraph as summary snippet
                lead_para = filtered_paras[0]
                if len(lead_para) > 300:
                    lead_para = lead_para[:300].rsplit(" ", 1)[0] + "..."
                item["summary_snippet"] = lead_para

                # Extract potential pain points from paragraphs mentioning tantangan/kendala/ancaman/risiko
                detected_pain = []
                for p in filtered_paras:
                    lower = p.lower()
                    if any(w in lower for w in ["tantangan", "ancaman", "risiko", "kerugian", "kendala", "kelemahan", "masalah", "kesulitan"]):
                        detected_pain.append(p[:180].rsplit(" ", 1)[0] + "...")
                        if len(detected_pain) >= 3:
                            break
                if detected_pain and len(item.get("pain_points", [])) == 0:
                    item["pain_points"] = detected_pain

            time.sleep(0.15)
        except Exception as e:
            print(f"  Warning: failed to fetch {url}: {e}")

    with open(curated_file, "w", encoding="utf-8") as f:
        json.dump(curated, f, indent=2, ensure_ascii=False)

    print("Enrichment complete! Curated solutions updated with clean text.")

if __name__ == "__main__":
    clean_and_enrich()
