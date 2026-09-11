class DashboardManager {
    constructor() {
        this.apiUrl = `${window.AppConfig.API_URL}/api/admin/dashboard-stats`;
        this.aiUrl = `${window.AppConfig.API_URL}/api/admin/run-ai`; // Endpoint para activar Python
        this.charts = {}; // Store chart instances
        this.currentChartData = null;

        this.init();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Configurar el botón "Actualizar IA"
        const btnUpdate = document.getElementById('btn-update-ai');
        if (btnUpdate) {
            btnUpdate.addEventListener('click', (e) => {
                e.preventDefault();
                this.triggerAiUpdate(btnUpdate);
            });
        }

        // Suscripción reactiva ante cambios de tema (Dark / Light)
        if (window.themeManager && typeof window.themeManager.onThemeChange === 'function') {
            window.themeManager.onThemeChange(() => {
                if (this.currentChartData) {
                    this.renderCharts(this.currentChartData);
                }
            });
        }
        window.addEventListener('hub:theme-change', () => {
            if (this.currentChartData) {
                this.renderCharts(this.currentChartData);
            }
        });
    }

    async init() {
        try {
            const data = await this.fetchData();

            // 1. Renderizar KPIs (Pasamos el objeto completo que contiene kpi y realTime)
            this.renderKPIs(data);

            // 2. Renderizar Gráficos
            this.renderCharts(data.charts);

            // 3. Renderizar IA (Nuevo)
            this.renderAiSection(data.ai);

            // Mostrar contenido, ocultar loader
            const loadingEl = document.getElementById('loading');
            const mainContentEl = document.getElementById('main-content');
            if (loadingEl) loadingEl.style.display = 'none';
            if (mainContentEl) mainContentEl.style.display = 'block';
        } catch (error) {
            console.error('Fatal Error:', error);
            if (error.message === 'Unauthorized') return; // NetworkService maneja el logout

            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div style="text-align: center; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle fa-2x"></i>
                        <p style="margin-top: 1rem;">Error cargando datos: ${this._escapeHtml(error.message)}</p>
                        <button onclick="window.location.reload()" class="btn btn-secondary-action" style="margin-top:1rem">Reintentar</button>
                    </div>
                `;
            }
        }
    }

    async fetchData() {
        const [statsRes, realTimeRes] = await Promise.all([
            window.NetworkService.fetch(this.apiUrl),
            window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/analytics/real-time`)
        ]);

        if (!statsRes.ok || !realTimeRes.ok) {
            if (statsRes.status === 401) window.location.href = '/login';
            throw new Error(`API Error ${statsRes.status}`);
        }

        const stats = await statsRes.json();
        const realTime = await realTimeRes.json();

        return { ...stats, realTime };
    }

    renderKPIs(data) {
        const kpi = data.kpi || data;
        
        this.animateValue('kpi-users', kpi.totalUsers || 0);
        this.animateValue('kpi-premium', kpi.premiumUsers || 0);
        this.animateValue('kpi-searches', kpi.totalSearches || 0);
        this.animateValue('kpi-chat', kpi.totalChatMessages || 0);

        if (data.realTime) {
            this.animateValue('kpi-live', data.realTime.activeNow || 0);
        }
        if (kpi.uniqueVisitors !== undefined) {
            this.animateValue('kpi-daily-visitors', kpi.uniqueVisitors || 0);
        }
    }

    animateValue(id, value) {
        const obj = document.getElementById(id);
        if (!obj) return;
        obj.textContent = new Intl.NumberFormat('es-PE').format(value);
    }

    renderCharts(data) {
        if (!data) return;
        this.currentChartData = data;
        this.createBarChart('chart-courses', data.topCourses, 'Cursos Populares', '#3b82f6');
        this.createBarChart('chart-books', data.topResources, 'Recursos Populares', '#10b981');
    }

    renderAiSection(aiData) {
        const container = document.getElementById('ai-insights-container');
        if (!container) return;

        if (!aiData) {
            container.innerHTML = `
                <div class="ai-loading-card">
                    <i class="fas fa-robot"></i> Sin análisis reciente.
                    <br><small style="color: var(--text-muted);">Haz clic en "Actualizar IA" para generar predicciones.</small>
                </div>`;
            return;
        }

        const createCard = (title, icon, pred, typeIcon) => {
            const predictionName = pred ? (pred.predictedCourse || pred.predictedBook || pred.predictedResource) : null;

            if (!predictionName) {
                return `
                <div class="ai-card" style="display:flex; flex-direction:column; justify-content:center; align-items:center; opacity:0.75;">
                   <div style="font-size:3rem; margin-bottom:1rem; color: var(--border-color);">${typeIcon}</div>
                   <div style="color: var(--text-muted);">Sin suficientes datos para ${title}</div>
                </div>`;
            }

            const confidencePercent = Math.max(0, Math.min(100, Math.round(Number(pred.confidence || 0) * 100)));
            const safePredictionName = this._escapeHtml(predictionName);
            const safeReason = this._escapeHtml(pred.reason || 'Sin explicación disponible.');
            const safeSearchCount = Number.isFinite(Number(pred.searchCount)) ? Math.max(0, Number(pred.searchCount)) : 0;

            return `
            <div class="ai-card">
                <div class="ai-header">
                    <div class="ai-title"><i class="${icon}"></i> ${title}</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem;">
                        Basado en ${safeSearchCount} búsquedas
                    </div>
                </div>
                
                <div class="ai-prediction">
                    ${typeIcon} ${safePredictionName}
                </div>
                
                <div class="ai-reason">
                    "${safeReason}"
                </div>

                <div class="confidence-section" style="margin-top:auto;">
                    <div style="display:flex; justify-content:space-between; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">
                        <span>Confianza</span>
                        <span>${confidencePercent}%</span>
                    </div>
                    <div class="confidence-bar-bg">
                        <div class="confidence-bar-fill" style="width: ${confidencePercent}%"></div>
                    </div>
                </div>
            </div>
            `;
        };

        const courseCard = createCard('Curso Tendencia', 'fas fa-graduation-cap', aiData.course_prediction, '🚀');
        const bookCard = createCard('Libro Tendencia', 'fas fa-book', aiData.book_prediction, '📚');

        container.innerHTML = `<div class="ai-grid">${courseCard}${bookCard}</div>`;
    }

    async triggerAiUpdate(btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Analizando...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        try {
            const res = await window.NetworkService.fetch(this.aiUrl, {
                method: 'POST'
            });

            if (res.ok) {
                await this.init();
                if (window.uiManager) window.uiManager.showToast('¡Análisis de IA completado exitosamente!', 'success');
            } else {
                const err = await res.json();
                if (window.uiManager) window.uiManager.showToast('Error: ' + (err.error || 'Falló el análisis'), 'error');
            }
        } catch (e) {
            console.error(e);
            if (window.uiManager) window.uiManager.showToast('Error de conexión con el servidor de IA.', 'warning');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

    _escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    createBarChart(canvasId, items, label, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const ctx = canvas.getContext('2d');

        // Handle Empty Data
        if (!items || items.length === 0) {
            return;
        }

        const labels = items.map(i => i.name.length > 25 ? i.name.substring(0, 25) + '...' : i.name);
        const values = items.map(i => parseInt(i.visits));

        // Detección reactiva de tema (Dark vs Light)
        const isDark = window.themeManager
            ? window.themeManager.isDark()
            : (!document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-theme') === 'dark');

        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const textMuted = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';
        const tooltipBg = isDark ? '#18181b' : '#ffffff';
        const tooltipText = isDark ? '#f8fafc' : '#0f172a';
        const tooltipBody = isDark ? '#cbd5e1' : '#475569';
        const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)';

        // Save new instance
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Visitas',
                    data: values,
                    backgroundColor: color,
                    borderRadius: 6,
                    barThickness: 20
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: tooltipText,
                        bodyColor: tooltipBody,
                        borderColor: tooltipBorder,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textMuted }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { size: 12, weight: '500' } }
                    }
                }
            }
        });
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});
