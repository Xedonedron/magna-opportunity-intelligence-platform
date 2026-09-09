import json
import re

def clean_elementor_noise(text: str) -> str:
    if not text:
        return ""
    # Remove CSS blocks { ... }
    text = re.sub(r'\{[^{}]*\}', ' ', text)
    # Remove residual style/elementor patterns
    text = re.sub(r'elementor-[a-zA-Z0-9_\-]+', ' ', text)
    text = re.sub(r'data-[a-zA-Z0-9_\-]+="[^"]*"', ' ', text)
    text = re.sub(r'data-[a-zA-Z0-9_\-]+=[^\s>]+', ' ', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'(\.[a-zA-Z0-9_\-:]+|\#[a-zA-Z0-9_\-:]+)', ' ', text)
    # Clean non-alphanumeric leading residue like "> " or quotes
    text = re.sub(r'^[\s>"\'\.:;,\-]+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

with open("backend/app/data/scraped_articles.json", "r", encoding="utf-8") as f:
    scraped_map = {a["url"]: a for a in json.load(f)}

with open("backend/app/data/curated_solutions.json", "r", encoding="utf-8") as f:
    curated = json.load(f)

for item in curated:
    url = item.get("source_url")
    if url in scraped_map:
        raw_content = scraped_map[url].get("content", "")
        clean_text = clean_elementor_noise(raw_content)
        # Take first 250 characters as clean summary
        if len(clean_text) > 250:
            snippet = clean_text[:250].rsplit(" ", 1)[0] + "..."
        else:
            snippet = clean_text
        item["summary_snippet"] = snippet
    else:
        item["summary_snippet"] = clean_elementor_noise(item.get("summary_snippet", ""))

with open("backend/app/data/curated_solutions.json", "w", encoding="utf-8") as f:
    json.dump(curated, f, indent=2, ensure_ascii=False)

print(f"Cleaned {len(curated)} curated solution snippets successfully.")
for item in curated[:3]:
    print(f"- {item['title']}: {item['summary_snippet'][:120]}...")
