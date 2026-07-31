const axios = require('axios');
const ResourceAutoIngestService = require('../src/domain/services/resourceAutoIngestService');

// Categorías de investigación académica médica y educativa
const PAPER_SEARCH_TOPICS = [
    // MEDICINA
    { query: 'hypertension management consensus review', domain: 'medicine' },
    { query: 'diabetes mellitus type 2 clinical practice guidelines paper', domain: 'medicine' },
    { query: 'sepsis septic shock diagnosis management review', domain: 'medicine' },
    { query: 'preeclampsia maternal fetal outcomes research', domain: 'medicine' },
    { query: 'pediatric pneumonia diagnosis treatment review', domain: 'medicine' },
    { query: 'ischemic stroke acute management neuroprotection', domain: 'medicine' },
    { query: 'breast cancer screening early detection advancement', domain: 'medicine' },
    { query: 'chronic kidney disease progression prevention', domain: 'medicine' },
    { query: 'dengue fever clinical manifestations management', domain: 'medicine' },
    { query: 'heart failure reduced ejection fraction therapy', domain: 'medicine' },
    { query: 'tuberculosis diagnosis treatment resistance review', domain: 'medicine' },
    { query: 'asthma exacerbation clinical management pediatrics adults', domain: 'medicine' },
    { query: 'gastrointestinal bleeding acute management review', domain: 'medicine' },
    { query: 'major depressive disorder evidence based interventions', domain: 'medicine' },
    { query: 'antimicrobial resistance stewardship strategies', domain: 'medicine' },
    { query: 'rheumatoid arthritis early diagnosis biological therapy', domain: 'medicine' },
    { query: 'acute coronary syndrome emergency management', domain: 'medicine' },
    { query: 'cirrhosis portal hypertension complications review', domain: 'medicine' },
    
    // EDUCACIÓN
    { query: 'formative assessment classroom learning outcomes meta-analysis', domain: 'education' },
    { query: 'neuroeducation cognitive science teaching learning strategies', domain: 'education' },
    { query: 'artificial intelligence in education personalized learning systematic review', domain: 'education' },
    { query: 'inclusive education pedagogical strategies special needs students', domain: 'education' },
    { query: 'reading comprehension metacognitive strategies primary secondary education', domain: 'education' },
    { query: 'teacher professional development student achievement impact study', domain: 'education' }
];

// Normas Oficiales Vigentes en la Web (MINSA, OMS, MINEDU)
const OFFICIAL_NORMS = [
    {
        title: 'NTS N° 174-MINSA/2021/DGIESP: Norma Técnica de Salud para la Prevención y Control del COVID-19 en el Perú',
        author: 'Ministerio de Salud del Perú (MINSA)',
        url: 'https://www.gob.pe/institucion/minsa/normas-legales/1770054-nts-n-174-minsa-2021-dgiesp',
        resource_type: 'norma',
        domain: 'medicine',
        content_html: '<p>Norma Técnica Oficial de Salud del Ministerio de Salud del Perú que establece las disposiciones técnicas para la prevención, vigilancia epidemiológica, diagnóstico y tratamiento de la COVID-19 en los establecimientos de salud públicos y privados.</p>'
    },
    {
        title: 'NTS N° 161-MINSA/2020/Dain: Norma Técnica de Salud para la Atención Integral de Salud de la Niña y el Niño',
        author: 'Ministerio de Salud del Perú (MINSA)',
        url: 'https://www.gob.pe/institucion/minsa/normas-legales/459737-161-2020-minsa',
        resource_type: 'norma',
        domain: 'medicine',
        content_html: '<p>Documento normativo del MINSA que regula la atención integral de salud infantil en el Perú, incluyendo controles del crecimiento y desarrollo (CRED), inmunizaciones y nutrición infantil.</p>'
    },
    {
        title: 'Guía de la OMS sobre el Manejo del Dengue: Diagnóstico, Tratamiento, Prevención y Control',
        author: 'Organización Mundial de la Salud (OMS / PAHO)',
        url: 'https://iris.paho.org/handle/10665.2/55866',
        resource_type: 'norma',
        domain: 'medicine',
        content_html: '<p>Directriz oficial y guía técnica de la Organización Mundial de la Salud y Organización Panamericana de la Salud para el manejo clínico clasificado por signos de alarma y control vectorial del Dengue.</p>'
    },
    {
        title: 'Currículo Nacional de la Educación Básica (RVM N° 281-2016-MINEDU y Actualizaciones)',
        author: 'Ministerio de Educación del Perú (MINEDU)',
        url: 'https://www.gob.pe/institucion/minedu/normas-legales/204011-281-2016-minedu',
        resource_type: 'norma',
        domain: 'education',
        content_html: '<p>Marco curricular oficial del Estado Peruano que establece el perfil de egreso, enfoques transversales, competencias y estándares de aprendizaje para la Educación Básica Regular.</p>'
    },
    {
        title: 'Marco del Buen Desempeño Docente para la Educación Básica Regular',
        author: 'Ministerio de Educación del Perú (MINEDU)',
        url: 'https://www.gob.pe/institucion/minedu/informes-publicaciones/2739480-marco-de-buen-desempeno-docente',
        resource_type: 'norma',
        domain: 'education',
        content_html: '<p>Documento normativo que define los dominios, competencias y desempeños del ejercicio docente profesional en las instituciones educativas del Perú.</p>'
    }
];

async function fetchPubMedPapers(queryItem, max = 2) {
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
                const authors = item.authors ? item.authors.map(a => a.name).slice(0, 4).join(', ') : 'Investigadores Académicos';
                const journal = item.source || 'Journal Scientific Publication';
                const year = item.pubdate ? item.pubdate.split(' ')[0] : '2023';
                
                papers.push({
                    title: cleanTitle,
                    author: `${authors} (${journal}, ${year})`,
                    url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/`,
                    resource_type: 'paper',
                    domain: queryItem.domain,
                    content_html: `<p><strong>Publicación Científica Peer-Reviewed (PubMed Central ${pmcId})</strong></p><p>${cleanTitle}</p><p><em>Revista / Fuente:</em> ${journal} (${year})</p><p><em>Autores:</em> ${authors}</p>`
                });
            }
        }
        return papers;
    } catch (e) {
        console.warn(`⚠️ Error buscando papers para "${queryItem.query}":`, e.message);
        return [];
    }
}

async function main() {
    console.log('🔍 Iniciando curaduría e investigación científica para Hub Academia...');
    
    let discoveredPapers = [];
    
    for (const topic of PAPER_SEARCH_TOPICS) {
        console.log(`📡 Consultando PubMed Central para: "${topic.query}" [${topic.domain}]`);
        const results = await fetchPubMedPapers(topic, 2);
        discoveredPapers.push(...results);
        // Evitar rate limit de NCBI
        await new Promise(r => setTimeout(r, 400));
    }
    
    console.log(`\n📊 Resumen de hallazgos descubiertos:`);
    console.log(`   - Papers Científicos de Investigación: ${discoveredPapers.length}`);
    console.log(`   - Normas Oficiales Vigentes: ${OFFICIAL_NORMS.length}`);
    
    const totalDiscovered = discoveredPapers.length + OFFICIAL_NORMS.length;
    const paperPercentage = ((discoveredPapers.length / totalDiscovered) * 100).toFixed(1);
    console.log(`   - Porcentaje de Papers: ${paperPercentage}% (Requisito >= 80%)\n`);
    
    const fullPayload = [...discoveredPapers, ...OFFICIAL_NORMS];
    
    console.log(`🚀 Ejecutando Service de Ingesta Automática con Verificación HTTP / Soft 404...`);
    const service = new ResourceAutoIngestService();
    const result = await service.ingestBatch(fullPayload);
    
    console.log('\n====================================================');
    console.log(`✅ RESULTADOS DE LA CURADURÍA CIENTÍFICA:`);
    console.log(`   - Creados y Verificados: ${result.createdCount}`);
    console.log(`   - Omitidos / Duplicados / Inaccesibles: ${result.skippedCount}`);
    console.log('====================================================\n');
    
    if (result.created.length > 0) {
        console.log('📄 Detalle de recursos nuevos incorporados:');
        let paperCount = 0;
        let normaCount = 0;
        result.created.forEach(r => {
            if (r.resource_type === 'paper') paperCount++;
            if (r.resource_type === 'norma') normaCount++;
            console.log(`   + [${r.resource_type.toUpperCase()}] (${r.domain}) ${r.title}`);
        });
        
        console.log(`\n📈 Ingesta finalizada: ${paperCount} Papers y ${normaCount} Normas.`);
    }
}

main().catch(err => {
    console.error('❌ Error en el proceso de curaduría:', err);
    process.exit(1);
});
