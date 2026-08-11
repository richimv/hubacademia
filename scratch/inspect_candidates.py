import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/candidate_papers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== MEDICINE CANDIDATES ===")
for i, item in enumerate(data['medicine']):
    print(f"\n[{i+1}] PMID: {item['pmid']} | Date: {item['pub_date']} | Journal: {item['journal']}")
    print(f"Title: {item['title']}")
    print(f"URL: {item['url']}")
    print(f"Abstract Snippet: {item['abstract'][:200]}...")

print("\n=== EDUCATION CANDIDATES ===")
for i, item in enumerate(data['education']):
    print(f"\n[{i+1}] PMID: {item['pmid']} | Date: {item['pub_date']} | Journal: {item['journal']}")
    print(f"Title: {item['title']}")
    print(f"URL: {item['url']}")
    print(f"Abstract Snippet: {item['abstract'][:200]}...")
