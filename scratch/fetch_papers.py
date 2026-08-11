import urllib.request
import xml.etree.ElementTree as ET
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def search_pubmed(term, retmax=20):
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={urllib.parse.quote(term)}&retmode=json&retmax={retmax}"
    req = urllib.request.Request(url, headers={'User-Agent': 'HubAcademiaCurator/1.0'})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        return data['esearchresult']['idlist']

def fetch_details(pmids):
    if not pmids:
        return []
    ids_str = ",".join(pmids)
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={ids_str}&retmode=xml"
    req = urllib.request.Request(url, headers={'User-Agent': 'HubAcademiaCurator/1.0'})
    with urllib.request.urlopen(req) as resp:
        xml_data = resp.read()
    
    root = ET.fromstring(xml_data)
    results = []
    
    for article in root.findall('.//PubmedArticle'):
        pmid_el = article.find('.//PMID')
        pmid = pmid_el.text if pmid_el is not None else ""
        
        title_el = article.find('.//ArticleTitle')
        title = ""
        if title_el is not None:
            title = "".join(title_el.itertext()).strip()
        
        abstract_nodes = article.findall('.//AbstractText')
        abstract_parts = []
        for node in abstract_nodes:
            label = node.attrib.get('Label', '')
            text = "".join(node.itertext()).strip()
            if label:
                abstract_parts.append(f"{label}: {text}")
            else:
                abstract_parts.append(text)
        abstract = " ".join(abstract_parts)
        
        journal_el = article.find('.//Journal/Title')
        journal = journal_el.text if journal_el is not None else "PubMed"
        
        # MedlineJournalInfo / Title
        medline_ta = article.find('.//MedlineJournalInfo/MedlineTA')
        if medline_ta is not None and medline_ta.text:
            source_name = medline_ta.text
        else:
            source_name = journal
            
        pub_date = article.find('.//ArticleDate')
        if pub_date is None:
            pub_date = article.find('.//JournalIssue/PubDate')
        
        year = pub_date.find('Year').text if pub_date is not None and pub_date.find('Year') is not None else "2026"
        month = pub_date.find('Month').text if pub_date is not None and pub_date.find('Month') is not None else "08"
        day = pub_date.find('Day').text if pub_date is not None and pub_date.find('Day') is not None else "04"
        
        results.append({
            'pmid': pmid,
            'title': title,
            'abstract': abstract,
            'journal': journal,
            'source_name': source_name,
            'pub_date': f"{year}-{month}-{day}",
            'url': f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
        })
    return results

print("Fetching Medicine candidates...")
med_ids = search_pubmed("(cardiology OR oncology OR neurology OR immunology OR therapy OR clinical OR artificial intelligence) AND 2026/08/04:2026/08/11[pdat]", 20)
med_papers = fetch_details(med_ids)

print("Fetching Education candidates...")
edu_ids = search_pubmed("(education OR pedagogy OR learning OR medical education OR educational OR teaching) AND 2026/08/04:2026/08/11[pdat]", 20)
edu_papers = fetch_details(edu_ids)

output = {
    'medicine': [p for p in med_papers if p['abstract'] and len(p['abstract']) > 150],
    'education': [p for p in edu_papers if p['abstract'] and len(p['abstract']) > 150]
}

with open("scratch/candidate_papers.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Saved {len(output['medicine'])} medicine candidates and {len(output['education'])} education candidates to scratch/candidate_papers.json")
