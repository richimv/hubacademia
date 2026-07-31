const axios = require('axios');
const ResourceAutoIngestService = require('../src/domain/services/resourceAutoIngestService');

const EXTENDED_PAPER_TOPICS = [
    // MEDICINA
    { query: 'heart failure reduced ejection fraction guideline review', domain: 'medicine' },
    { query: 'atrial fibrillation anticoagulation stroke prevention', domain: 'medicine' },
    { query: 'acute myocardial infarction emergency reperfusion', domain: 'medicine' },
    { query: 'septic shock fluid resuscitation vasopressors clinical trial', domain: 'medicine' },
    { query: 'antimicrobial stewardship multidrug resistant organisms', domain: 'medicine' },
    { query: 'tuberculosis diagnosis multi drug resistant regimens', domain: 'medicine' },
    { query: 'dengue fever severe plasma leakage management', domain: 'medicine' },
    { query: 'covid-19 long-term cardiovascular pulmonary sequelae', domain: 'medicine' },
    { query: 'acute ischemic stroke endovascular thrombectomy outcome', domain: 'medicine' },
    { query: 'epilepsy diagnosis antiepileptic drug management', domain: 'medicine' },
    { query: 'parkinson disease early diagnosis neuroprotection review', domain: 'medicine' },
    { query: 'alzheimer disease biomarker early diagnosis disease modifying', domain: 'medicine' },
    { query: 'breast cancer immunotherapy targeted therapy review', domain: 'medicine' },
    { query: 'cervical cancer human papillomavirus screening prevention', domain: 'medicine' },
    { query: 'gastric cancer early detection endoscopic resection', domain: 'medicine' },
    { query: 'acute lymphoblastic leukemia pediatric protocol review', domain: 'medicine' },
    { query: 'type 2 diabetes SGLT2 inhibitors GLP-1 receptor agonists cardiorenal', domain: 'medicine' },
    { query: 'thyroid nodule hypothyroidism management consensus', domain: 'medicine' },
    { query: 'metabolic syndrome nonalcoholic fatty liver disease MASLD', domain: 'medicine' },
    { query: 'preeclampsia severe features magnesium sulfate delivery timing', domain: 'medicine' },
    { query: 'postpartum hemorrhage active management third stage labor', domain: 'medicine' },
    { query: 'intrauterine growth restriction fetal surveillance ultrasound', domain: 'medicine' },
    { query: 'neonatal sepsis early onset diagnosis antibiotic stewardship', domain: 'medicine' },
    { query: 'pediatric asthma exacerbation emergency guideline', domain: 'medicine' },
    { query: 'acute respiratory distress syndrome mechanical ventilation prone positioning', domain: 'medicine' },
    { query: 'copd exacerbation noninvasive ventilation pharmacotherapy', domain: 'medicine' },
    { query: 'chronic kidney disease SGLT2 inhibitor anemia management', domain: 'medicine' },
    { query: 'acute kidney injury sepsis nephrotoxicity biomarker', domain: 'medicine' },
    { query: 'cirrhosis ascites spontaneous bacterial peritonitis prevention', domain: 'medicine' },
    { query: 'acute pancreatitis severity stratification early enteral nutrition', domain: 'medicine' },
    { query: 'rheumatoid arthritis treat to target biological DMARDs', domain: 'medicine' },
    { query: 'systemic lupus erythematosus nephritis management consensus', domain: 'medicine' },
    { query: 'universal health coverage epidemiology disease burden latin america', domain: 'medicine' },

    // EDUCACIÓN
    { query: 'formative assessment learning feedback student self-regulation', domain: 'education' },
    { query: 'cognitive load theory instructional design multimedia learning', domain: 'education' },
    { query: 'artificial intelligence personalized learning adaptive learning systems', domain: 'education' },
    { query: 'universal design for learning UDL inclusive pedagogy classroom', domain: 'education' },
    { query: 'inquiry based learning science education critical thinking', domain: 'education' },
    { query: 'teacher professional learning communities pedagogical coaching', domain: 'education' },
    { query: 'reading comprehension metacognitive strategy instruction primary school', domain: 'education' }
];

// Normas Oficiales complementarias y vigentes
const COMPLEMENTARY_NORMS = [
    {
        title: 'NTS N° 154-MINSA/2019/DGIESP: Norma Técnica de Salud para la Prevención y Control de la Tuberculosis en el Perú',
        author: 'Ministerio de Salud del Perú (MINSA)',
        url: 'https://www.gob.pe/institucion/minsa/normas-legales/281691-nts-n-154-minsa-2019-dgiesp',
        resource_type: 'norma',
        domain: 'medicine',
        content_html: '<p>Norma Técnica Oficial de Salud del MINSA para la vigilancia, diagnóstico con pruebas moleculares y esquema de tratamiento estandarizado de la Tuberculosis sensible y resistente en el Perú.</p>'
    },
    {
        title: 'NTS N° 127-MINSA/2016/DGIESP: Norma Técnica de Salud para la Evaluación, Calificación y Certificación de la Persona con Discapacidad',
        author: 'Ministerio de Salud del Perú (MINSA)',
        url: 'https://www.gob.pe/institucion/minsa/normas-legales/227566-127-2016-minsa',
        resource_type: 'norma',
        domain: 'medicine',
        content_html: '<p>Norma Técnica de Salud que establece los criterios médicos estandarizados y los baremos para la certificación de la discapacidad en el sistema público y privado de salud.</p>'
    },
    {
        title: 'Directiva N° 001-2024-MINEDU: Lineamientos para el Desarrollo del Año Escolar en las Instituciones y Programas Educativos',
        author: 'Ministerio de Educación del Perú (MINEDU)',
        url: 'https://www.gob.pe/institucion/minedu/normas-legales/4925000-001-2024-minedu',
        resource_type: 'norma',
        domain: 'education',
        content_html: '<p>Documento normativo del MINEDU que orienta la planificación, gestión pedagógica, calendarización escolar y bienestar estudiantil en la Educación Básica Regular.</p>'
    }
];

async function fetchPubMedPapers(queryItem, max = 3) {
    try {
        const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(queryItem.query)}&retmode=json&retmax=${max}`;
        const searchRes = await axios.get(searchUrl, { timeout: 10000 });
        const idList = searchRes.data?.esearchresult?.idlist || [];
        
        if (idList.length === 0) return [];
        
        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${idList.join(',')}&retmode=json`;
        const summaryRes = await axios.get(summaryUrl, { timeout: 10000 });
        const result = summaryRes.data?.result || {};
        
        const papers = [];
        for (const id of idList) {
            const item = result[id];
            if (item && item.title) {
                const pmcId = 'PMC' + id;
                const cleanTitle = item.title.replace(/<[^>]+>/g, '').trim();
                const authors = item.authors ? item.authors.map(a => a.name).slice(0, 4).join(', ') : 'Investigadores Científicos';
                const journal = item.source || 'Revista Académica Científica';
                const year = item.pubdate ? item.pubdate.split(' ')[0] : '2024';
                
                papers.push({
                    title: cleanTitle,
                    author: `${authors} (${journal}, ${year})`,
                    url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/`,
                    resource_type: 'paper',
                    domain: queryItem.domain,
                    content_html: `<p><strong>Artículo Científico Arbitrado (PMC ID: ${pmcId})</strong></p><p><strong>Título:</strong> ${cleanTitle}</p><p><strong>Revista:</strong> ${journal} (${year})</p><p><strong>Autores:</strong> ${authors}</p><p>Publicación científica peer-reviewed disponible en acceso abierto para la comunidad académica de Hub Academia.</p>`
                });
            }
        }
        return papers;
    } catch (e) {
        console.warn(`⚠️ Error consultando NCBI PMC para "${queryItem.query}":`, e.message);
        return [];
    }
}

async function main() {
    console.log('🚀 Iniciando fase ampliada de curaduría científica de PAPERS y NORMAS para Hub Academia...');
    
    let discoveredPapers = [];
    
    for (const topic of EXTENDED_PAPER_TOPICS) {
        console.log(`📡 Consultando PubMed Central: "${topic.query}" [${topic.domain}]`);
        const results = await fetchPubMedPapers(topic, 3);
        discoveredPapers.push(...results);
        await new Promise(r => setTimeout(r, 350));
    }
    
    console.log(`\n📊 Hallazgos en esta iteración:`);
    console.log(`   - Papers Científicos: ${discoveredPapers.length}`);
    console.log(`   - Normas Oficiales: ${COMPLEMENTARY_NORMS.length}`);
    
    const fullPayload = [...discoveredPapers, ...COMPLEMENTARY_NORMS];
    
    console.log(`\n⚙️ Ejecutando ingesta masiva con verificación de URLs vivas (Soft-404 Guard)...`);
    const service = new ResourceAutoIngestService();
    const result = await service.ingestBatch(fullPayload);
    
    console.log('\n====================================================');
    console.log(`✅ RESULTADOS DE LA INGESTA EXTENDIDA:`);
    console.log(`   - Recursos Nuevos Creados: ${result.createdCount}`);
    console.log(`   - Omitidos (Duplicados / URLs ya registradas): ${result.skippedCount}`);
    console.log('====================================================\n');
}

main().catch(err => {
    console.error('❌ Error en el proceso de curaduría extendida:', err);
    process.exit(1);
});
