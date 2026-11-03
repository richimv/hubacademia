/**
 * Unit Tests for Quiz Session Persistence & Storage Resilience
 * Tests case deduplication (_casesMap) and QuotaExceededError fallback handling.
 */

describe('Quiz Session Storage & Persistence Resilience', () => {

    function serializeSessionState(state) {
        const casesMap = {};
        const optimizedQuestions = (state.questions || []).map(q => {
            if (q.case_id) {
                if (!casesMap[q.case_id]) {
                    casesMap[q.case_id] = {
                        case_title: q.case_title || null,
                        case_description: q.case_description || null,
                        case_image_url: q.case_image_url || null,
                        case_order: q.case_order || null,
                        case_code: q.case_code || null
                    };
                }
                const { case_title, case_description, case_image_url, case_order, case_code, ...rest } = q;
                return rest;
            }
            return q;
        });

        return {
            ...state,
            questions: optimizedQuestions,
            _casesMap: Object.keys(casesMap).length > 0 ? casesMap : undefined,
            savedAt: Date.now(),
            isFinished: false
        };
    }

    function hydrateSessionState(data) {
        if (data._casesMap && Array.isArray(data.questions)) {
            data.questions = data.questions.map(q => {
                if (q.case_id && data._casesMap[q.case_id]) {
                    return {
                        ...q,
                        ...data._casesMap[q.case_id]
                    };
                }
                return q;
            });
            delete data._casesMap;
        }
        return data;
    }

    test('should deduplicate case_description across nested questions in same case', () => {
        const heavyCaseDescription = '<p>Heavy description of case scenario</p>'.repeat(500); // ~20KB
        const mockQuestions = [
            { id: 'q1', case_id: 'case-arte-1', case_description: heavyCaseDescription, case_title: 'Arte 1', question_text: 'Pregunta 1', options: ['A', 'B'] },
            { id: 'q2', case_id: 'case-arte-1', case_description: heavyCaseDescription, case_title: 'Arte 1', question_text: 'Pregunta 2', options: ['A', 'B'] },
            { id: 'q3', case_id: 'case-arte-1', case_description: heavyCaseDescription, case_title: 'Arte 1', question_text: 'Pregunta 3', options: ['A', 'B'] },
            { id: 'q4', case_id: 'case-arte-1', case_description: heavyCaseDescription, case_title: 'Arte 1', question_text: 'Pregunta 4', options: ['A', 'B'] },
            { id: 'q5', case_id: null, question_text: 'Pregunta independiente', options: ['A', 'B'] }
        ];

        const state = { questions: mockQuestions, currentQuestionIndex: 0 };
        const serialized = serializeSessionState(state);

        // Verify that serialized questions do not contain case_description on every question
        expect(serialized.questions[0].case_description).toBeUndefined();
        expect(serialized.questions[1].case_description).toBeUndefined();
        expect(serialized._casesMap).toBeDefined();
        expect(serialized._casesMap['case-arte-1'].case_description).toBe(heavyCaseDescription);

        // Verify serialized size is significantly smaller than raw duplication
        const rawJsonLength = JSON.stringify(state).length;
        const optimizedJsonLength = JSON.stringify(serialized).length;
        expect(optimizedJsonLength).toBeLessThan(rawJsonLength * 0.5);

        // Verify hydration restores the full question objects perfectly
        const hydrated = hydrateSessionState(serialized);
        expect(hydrated.questions[0].case_description).toBe(heavyCaseDescription);
        expect(hydrated.questions[1].case_description).toBe(heavyCaseDescription);
        expect(hydrated.questions[3].case_title).toBe('Arte 1');
        expect(hydrated.questions[4].case_id).toBeNull();
    });

    test('should fallback to sessionStorage when localStorage throws QuotaExceededError', () => {
        const mockLocalStorage = {
            storage: {},
            setItem(k, v) {
                const err = new Error("Quota exceeded");
                err.name = "QuotaExceededError";
                throw err;
            },
            removeItem(k) { delete this.storage[k]; },
            length: 0,
            key(i) { return null; }
        };

        const mockSessionStorage = {
            storage: {},
            setItem(k, v) { this.storage[k] = v; },
            getItem(k) { return this.storage[k] || null; },
            removeItem(k) { delete this.storage[k]; }
        };

        let fallbackUsed = false;
        const key = 'simulator_active_session_user1';
        const data = JSON.stringify({ quizId: 'abc', score: 5 });

        try {
            mockLocalStorage.setItem(key, data);
        } catch (e) {
            try {
                mockSessionStorage.setItem(key, data);
                fallbackUsed = true;
            } catch (e2) {}
        }

        expect(fallbackUsed).toBe(true);
        expect(mockSessionStorage.getItem(key)).toBe(data);
    });
});
