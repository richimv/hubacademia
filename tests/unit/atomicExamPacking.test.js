/**
 * Unit Tests for Case-Aware Atomic Exam Packing (Method B)
 * Verifies that casuísticas are never truncated and that the exam reaches exact target counts.
 */

const docenteService = require('../../src/domain/services/docenteService');
const medicoService = require('../../src/domain/services/medicoService');

describe('Case-Aware Atomic Exam Packing Algorithm', () => {

    // Helper to generate mock questions
    const createMockQuestion = (id, topic, caseId = null, caseOrder = null) => ({
        id: `q-${id}`,
        question_text: `Question ${id} text`,
        options: ['A', 'B', 'C', 'D'],
        correct_option_index: 0,
        explanation: 'Official explanation',
        topic: topic,
        case_id: caseId,
        case_order: caseOrder,
        case_code: caseId ? `CASE-${caseId}` : null,
        case_title: caseId ? `Case Title ${caseId}` : null,
        case_description: caseId ? `Case Description ${caseId}` : null
    });

    describe('DocenteService.packExamQuestions', () => {

        it('packs exactly 10 questions and NEVER cuts a case scenario in half', () => {
            const rawBank = [
                // Case 1: 3 questions (Topic: Comprensión Lectora)
                createMockQuestion('c1-1', 'Comprensión Lectora', 'case-1', 1),
                createMockQuestion('c1-2', 'Comprensión Lectora', 'case-1', 2),
                createMockQuestion('c1-3', 'Comprensión Lectora', 'case-1', 3),

                // Case 2: 2 questions (Topic: Razonamiento Lógico)
                createMockQuestion('c2-1', 'Razonamiento Lógico', 'case-2', 1),
                createMockQuestion('c2-2', 'Razonamiento Lógico', 'case-2', 2),

                // Case 3: 4 questions (Topic: CNEB)
                createMockQuestion('c3-1', 'CNEB', 'case-3', 1),
                createMockQuestion('c3-2', 'CNEB', 'case-3', 2),
                createMockQuestion('c3-3', 'CNEB', 'case-3', 3),
                createMockQuestion('c3-4', 'CNEB', 'case-3', 4),

                // Case 4: 3 questions (Topic: Evaluación Formativa) - Won't fit if 9 slots are taken
                createMockQuestion('c4-1', 'Evaluación Formativa', 'case-4', 1),
                createMockQuestion('c4-2', 'Evaluación Formativa', 'case-4', 2),
                createMockQuestion('c4-3', 'Evaluación Formativa', 'case-4', 3),

                // Solo questions (1 question each)
                createMockQuestion('s-1', 'Comprensión Lectora'),
                createMockQuestion('s-2', 'Razonamiento Lógico'),
                createMockQuestion('s-3', 'CNEB'),
                createMockQuestion('s-4', 'Evaluación Formativa'),
                createMockQuestion('s-5', 'Convivencia Escolar')
            ];

            const activeAreas = ['COMPRENSIÓN LECTORA', 'RAZONAMIENTO LÓGICO', 'CNEB', 'EVALUACIÓN FORMATIVA', 'CONVIVENCIA ESCOLAR'];
            const packed = docenteService.packExamQuestions(rawBank, 10, activeAreas, true);

            // 1. Total length must be EXACTLY 10
            expect(packed.length).toBe(10);

            // 2. Any case scenario included must have ALL its sibling questions present
            const casesInResult = {};
            packed.forEach(q => {
                if (q.case_id) {
                    casesInResult[q.case_id] = (casesInResult[q.case_id] || 0) + 1;
                }
            });

            // Case 1 has 3 questions
            if (casesInResult['case-1']) {
                expect(casesInResult['case-1']).toBe(3);
            }
            // Case 2 has 2 questions
            if (casesInResult['case-2']) {
                expect(casesInResult['case-2']).toBe(2);
            }
            // Case 3 has 4 questions
            if (casesInResult['case-3']) {
                expect(casesInResult['case-3']).toBe(4);
            }
            // Case 4 has 3 questions
            if (casesInResult['case-4']) {
                expect(casesInResult['case-4']).toBe(3);
            }

            // Verify sibling order within each case
            let prevCaseId = null;
            let prevCaseOrder = 0;
            packed.forEach(q => {
                if (q.case_id) {
                    if (q.case_id === prevCaseId) {
                        expect(q.case_order).toBeGreaterThan(prevCaseOrder);
                    }
                    prevCaseId = q.case_id;
                    prevCaseOrder = q.case_order;
                } else {
                    prevCaseId = null;
                    prevCaseOrder = 0;
                }
            });
        });

        it('packs exactly 60 questions for Educación real mock without truncating any cases', () => {
            const rawBank = [];
            // Generate 15 cases of 3 questions each = 45 questions
            for (let c = 1; c <= 15; c++) {
                for (let o = 1; o <= 3; o++) {
                    rawBank.push(createMockQuestion(`c${c}-${o}`, `Área-${(c % 5) + 1}`, `case-${c}`, o));
                }
            }
            // Generate 40 solo questions
            for (let s = 1; s <= 40; s++) {
                rawBank.push(createMockQuestion(`s-${s}`, `Área-${(s % 5) + 1}`));
            }

            const activeAreas = ['ÁREA-1', 'ÁREA-2', 'ÁREA-3', 'ÁREA-4', 'ÁREA-5'];
            const packed = docenteService.packExamQuestions(rawBank, 60, activeAreas, true);

            expect(packed.length).toBe(60);

            // Verify no partial cases
            const caseCounts = {};
            packed.forEach(q => {
                if (q.case_id) {
                    caseCounts[q.case_id] = (caseCounts[q.case_id] || 0) + 1;
                }
            });

            Object.values(caseCounts).forEach(count => {
                expect(count).toBe(3); // Every case has all 3 questions intact
            });
        });

        it('returns all available questions if bank has fewer questions than requested limit', () => {
            const smallBank = [
                createMockQuestion('1', 'Pedagogía'),
                createMockQuestion('2', 'Pedagogía'),
                createMockQuestion('3', 'Pedagogía')
            ];

            const packed = docenteService.packExamQuestions(smallBank, 20, ['PEDAGOGÍA'], true);
            expect(packed.length).toBe(3);
        });

        it('handles scenario of four 3-question cases (12qs) for a 10qs exam without breaking any case', () => {
            const fourTripletsBank = [
                // Caso 1 (3 preguntas)
                createMockQuestion('c1-1', 'Comprensión Lectora', 'case-1', 1),
                createMockQuestion('c1-2', 'Comprensión Lectora', 'case-1', 2),
                createMockQuestion('c1-3', 'Comprensión Lectora', 'case-1', 3),

                // Caso 2 (3 preguntas)
                createMockQuestion('c2-1', 'Razonamiento', 'case-2', 1),
                createMockQuestion('c2-2', 'Razonamiento', 'case-2', 2),
                createMockQuestion('c2-3', 'Razonamiento', 'case-2', 3),

                // Caso 3 (3 preguntas)
                createMockQuestion('c3-1', 'CNEB', 'case-3', 1),
                createMockQuestion('c3-2', 'CNEB', 'case-3', 2),
                createMockQuestion('c3-3', 'CNEB', 'case-3', 3),

                // Caso 4 (3 preguntas) - No cabe completo porque 9 + 3 = 12 > 10
                createMockQuestion('c4-1', 'Didáctica', 'case-4', 1),
                createMockQuestion('c4-2', 'Didáctica', 'case-4', 2),
                createMockQuestion('c4-3', 'Didáctica', 'case-4', 3),
            ];

            const packed = docenteService.packExamQuestions(fourTripletsBank, 10, ['COMPRENSIÓN LECTORA', 'RAZONAMIENTO', 'CNEB', 'DIDÁCTICA'], true);

            // Debe devolver 9 preguntas (3 casos enteros de 3 preguntas cada uno)
            expect(packed.length).toBe(9);

            // Ningún caso debe estar incompleto
            const caseMap = {};
            packed.forEach(q => {
                caseMap[q.case_id] = (caseMap[q.case_id] || 0) + 1;
            });

            // Exactamente 3 casos incluidos, cada uno con sus 3 preguntas completas
            expect(Object.keys(caseMap).length).toBe(3);
            Object.values(caseMap).forEach(count => {
                expect(count).toBe(3);
            });
        });
    });

    describe('MedicoService.packExamQuestions', () => {

        it('packs exactly 100 questions for Medicina real mock without truncating clinical cases', () => {
            const rawBank = [];
            // Generate 25 clinical cases of 2 questions each = 50 questions
            for (let c = 1; c <= 25; c++) {
                for (let o = 1; o <= 2; o++) {
                    rawBank.push(createMockQuestion(`med-c${c}-${o}`, `Clínica-${(c % 4) + 1}`, `case-med-${c}`, o));
                }
            }
            // Generate 80 solo clinical questions
            for (let s = 1; s <= 80; s++) {
                rawBank.push(createMockQuestion(`med-s-${s}`, `Clínica-${(s % 4) + 1}`));
            }

            const activeAreas = ['CLÍNICA-1', 'CLÍNICA-2', 'CLÍNICA-3', 'CLÍNICA-4'];
            const packed = medicoService.packExamQuestions(rawBank, 100, activeAreas, true);

            expect(packed.length).toBe(100);

            // Verify no partial clinical cases
            const caseCounts = {};
            packed.forEach(q => {
                if (q.case_id) {
                    caseCounts[q.case_id] = (caseCounts[q.case_id] || 0) + 1;
                }
            });

            Object.values(caseCounts).forEach(count => {
                expect(count).toBe(2); // Every clinical case has all 2 questions intact
            });
        });

        it('packs exactly 20 questions for Modo Estudio', () => {
            const rawBank = [];
            for (let i = 1; i <= 30; i++) {
                rawBank.push(createMockQuestion(`q-${i}`, 'Medicina Interna'));
            }

            const packed = medicoService.packExamQuestions(rawBank, 20, ['MEDICINA INTERNA'], true);
            expect(packed.length).toBe(20);
        });
    });

    describe('KPI & Score Normalization and Range Segregation', () => {

        it('normalizes score to 20-point scale regardless of whether total is 9, 10, 18, 20, 60 or 100', () => {
            const calcScore20 = (correct, total) => ((correct / total) * 20).toFixed(1);

            // 10q quiz with 9 questions (e.g. 3 cases of 3):
            expect(calcScore20(9, 9)).toBe('20.0');
            expect(calcScore20(8, 9)).toBe('17.8');

            // 10q standard:
            expect(calcScore20(10, 10)).toBe('20.0');
            expect(calcScore20(8, 10)).toBe('16.0');

            // 20q quiz with 18 questions (e.g. 6 cases of 3):
            expect(calcScore20(18, 18)).toBe('20.0');
            expect(calcScore20(15, 18)).toBe('16.7');

            // 60q Real Mock (Educación):
            expect(calcScore20(60, 60)).toBe('20.0');
            expect(calcScore20(45, 60)).toBe('15.0');

            // 100q Real Mock (Salud):
            expect(calcScore20(100, 100)).toBe('20.0');
            expect(calcScore20(75, 100)).toBe('15.0');
        });

        it('correctly classifies total_questions into evolution chart series without ghost overlaps', () => {
            const mockAttempts = [
                { id: '1', total_questions: 9, score_20: '17.8' },   // Rápido (3 cases of 3)
                { id: '2', total_questions: 10, score_20: '16.0' },  // Rápido estándar
                { id: '3', total_questions: 18, score_20: '16.7' },  // Estudio (6 cases of 3)
                { id: '4', total_questions: 20, score_20: '15.0' },  // Estudio estándar
                { id: '5', total_questions: 58, score_20: '14.5' },  // Real Educación
                { id: '6', total_questions: 60, score_20: '15.0' },  // Real Educación estándar
                { id: '7', total_questions: 100, score_20: '16.0' }, // Real Salud estándar
            ];

            const scores10 = mockAttempts.map(d => (d.total_questions <= 15) ? d.score_20 : null);
            const scores20 = mockAttempts.map(d => (d.total_questions > 15 && d.total_questions < 50) ? d.score_20 : null);
            const scoresReal = mockAttempts.map(d => (d.total_questions >= 50) ? d.score_20 : null);

            // scores10 matches 9 and 10 questions
            expect(scores10).toEqual(['17.8', '16.0', null, null, null, null, null]);

            // scores20 matches 18 and 20 questions
            expect(scores20).toEqual([null, null, '16.7', '15.0', null, null, null]);

            // scoresReal matches 58, 60 and 100 questions
            expect(scoresReal).toEqual([null, null, null, null, '14.5', '15.0', '16.0']);
        });
    });
});
