const path = require('path');
const { spawn } = require('child_process');

/**
 * 🤖 ML SERVICE (PURIFICADO): Puente de Node.js hacia el motor de Machine Learning en Python.
 * Su propósito es EXCLUSIVAMENTE analítica predictiva, clasificación de tendencias y modelos de ML.
 * NO debe contener lógica de generación de texto (LLM), esa lógica se movió a:
 * - AdminAiService.js (Generación Admin)
 * - UserAiService.js (Generación Usuario)
 * - TutorAiService.js (Chat/Tutoría)
 */
class MLService {
    constructor() {
        this.isWindows = process.platform === 'win32';
        this.PYTHON_PATH = this.isWindows ? 'C:/Python313/python.exe' : 'python3';
        this.ML_DIR = path.join(process.cwd(), 'ml_service');
    }

    /**
     * Ejecuta un proceso de análisis Batch en Python.
     */
    async runBatchAnalysis(scriptName = 'run_batch.py') {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(this.ML_DIR, scriptName);
            console.log(`🤖 [MLService] Ejecutando análisis ML: ${scriptPath}`);

            const pyProcess = spawn(this.PYTHON_PATH, [scriptPath], { cwd: process.cwd() });

            pyProcess.stdout.on('data', (data) => console.log(`[ML-PY]: ${data}`));
            pyProcess.stderr.on('data', (data) => console.error(`[ML-PY ERROR]: ${data}`));

            pyProcess.on('close', (code) => {
                if (code === 0) resolve({ success: true });
                else reject(new Error(`Script ML falló con código ${code}`));
            });
        });
    }

    /**
     * Predicción de tendencias de búsqueda.
     */
    async predictTrends(userId) {
        // Implementar llamado a modelo de recomendación en Python aquí
        console.log(`🤖 [MLService] Calculando predicciones para usuario: ${userId}`);
        return [];
    }
}

module.exports = new MLService();