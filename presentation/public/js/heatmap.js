/**
 * Activity Heatmap Manager
 * Renders a 14-day activity bar chart using pure CSS/JS.
 */
class ActivityHeatmap {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        // Usamos la variable global para apuntar directamente al backend, evitando posibles problemas de proxy en Vercel
        this.apiUrl = `${window.AppConfig.API_URL}/api/analytics/heatmap`;
        this.token = localStorage.getItem('authToken');
        this.tooltip = null;
    }

    async init() {
        if (!this.container) return;
        try {
            const data = await this.fetchData();
            this.render(data);
        } catch (error) {
            console.error('Error loading heatmap:', error);
            this.container.innerHTML = '<div style="color:#ef4444; font-size:0.8rem;">Error cargando actividad</div>';
        }
    }

    async fetchData() {
        const res = await fetch(this.apiUrl, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (!res.ok) throw new Error('API Error');
        const json = await res.json();
        return json.heatmap || {};
    }

    render(data) {
        this.container.innerHTML = '';
        data = data || {};

        const isMobile = window.innerWidth <= 480;
        const daysToShow = 14;
        const maxBarHeight = isMobile ? 80 : 120; // Más compacto en móviles

        // 1. Encontrar el "Mejor Día" para escalar las barras
        let maxCount = 1; 
        for (const date in data) {
            if (data[date] > maxCount) maxCount = data[date];
        }

        // 2. Gestión de Tooltip único para la instancia
        if (!this.tooltip) {
            this.tooltip = document.createElement('div');
            Object.assign(this.tooltip.style, {
                position: 'fixed',
                background: '#0f172a',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                display: 'none',
                pointerEvents: 'none',
                zIndex: '2147483647',
                border: '1px solid #334155',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                fontWeight: '600'
            });
            document.body.appendChild(this.tooltip);
        }
        const tooltip = this.tooltip;

        // 3. Contenedor Principal del Gráfico
        const wrapper = document.createElement('div');
        Object.assign(wrapper.style, {
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: isMobile ? '3px' : '8px',
            height: `${maxBarHeight + 30}px`,
            padding: '10px 0 0 0',
            width: '100%',
            position: 'relative'
        });

        // 4. Generar Fechas
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - daysToShow + 1);

        for (let i = 0; i < daysToShow; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);

            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const count = data[dateStr] || 0;

            const col = document.createElement('div');
            Object.assign(col.style, {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flex: '1',
                minWidth: isMobile ? '10px' : '15px',
                maxWidth: '40px',
                position: 'relative'
            });

            const heightPx = count === 0 ? 4 : Math.max(10, (count / maxCount) * maxBarHeight);
            
            // Lógica de Color mejorada (Escala de intensidad)
            let color = 'rgba(255, 255, 255, 0.1)';
            if (count > 0) {
                const ratio = count / maxCount;
                if (ratio < 0.3) color = '#3b82f6'; // Azul
                else if (ratio < 0.7) color = '#8b5cf6'; // Violeta
                else color = '#a855f7'; // Púrpura intenso
            }

            const bar = document.createElement('div');
            Object.assign(bar.style, {
                width: '100%',
                height: `${heightPx}px`,
                backgroundColor: color,
                borderRadius: '4px 4px 2px 2px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                boxShadow: count > 0 ? `0 -2px 10px ${color}40` : 'none'
            });

            // Eventos Tooltip
            bar.onmouseenter = (e) => {
                bar.style.filter = 'brightness(1.3)';
                bar.style.transform = 'scaleY(1.05)';
                tooltip.style.display = 'block';
                const dateLabel = currentDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                tooltip.innerHTML = `<span style="color:#94a3b8">${dateLabel}:</span> ${count} repasos`;
            };
            bar.onmousemove = (e) => {
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY - 30) + 'px';
            };
            bar.onmouseleave = () => {
                bar.style.filter = 'brightness(1)';
                bar.style.transform = 'scaleY(1)';
                tooltip.style.display = 'none';
            };

            const label = document.createElement('span');
            Object.assign(label.style, {
                fontSize: isMobile ? '0.6rem' : '0.7rem',
                fontWeight: '700',
                color: (i === daysToShow - 1) ? '#fff' : '#64748b',
                marginTop: '8px'
            });
            const daysArr = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
            label.innerText = daysArr[currentDate.getDay()];

            col.appendChild(bar);
            col.appendChild(label);
            wrapper.appendChild(col);
        }

        // Título de la Sección
        const title = document.createElement('div');
        title.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <h3 style="margin:0; font-size:1rem; color:#f8fafc; display:flex; align-items:center; gap:8px;">
                     <i class="fas fa-calendar-check" style="color: #a855f7;"></i> Retención y Constancia
                </h3>
                <span style="font-size:0.7rem; background: rgba(255, 255, 255, 0.08); color:#94a3b8; padding: 2px 10px; border-radius: 12px; font-weight: 700; text-transform: uppercase;">14 Días</span>
            </div>
        `;

        // Sección de Info y KPI
        const info = document.createElement('div');
        info.style.marginTop = '20px';
        info.style.paddingTop = '15px';
        info.style.borderTop = '1px solid rgba(255,255,255,0.05)';
        info.style.textAlign = 'left';

        info.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:15px;">
                <div style="flex:1;">
                    <h4 style="margin:0 0 5px 0; font-size:0.85rem; color:#f1f5f9;">KPI de Constancia Global</h4>
                    <p style="margin:0; font-size:0.75rem; color:#94a3b8; line-height:1.4;">
                        Mide tu regularidad de estudio en <strong>todos tus mazos</strong>. Mantener la constancia fortalece la memoria a largo plazo.
                    </p>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                    <span style="font-size:0.65rem; color:#64748b; text-transform:uppercase; font-weight:800;">Intensidad</span>
                    <div style="display:flex; gap:3px;">
                        <div style="width:10px; height:10px; background:rgba(255,255,255,0.1); border-radius:2px;"></div>
                        <div style="width:10px; height:10px; background:#3b82f6; border-radius:2px;"></div>
                        <div style="width:10px; height:10px; background:#8b5cf6; border-radius:2px;"></div>
                        <div style="width:10px; height:10px; background:#a855f7; border-radius:2px;"></div>
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(title);
        this.container.appendChild(wrapper);
        this.container.appendChild(info);
    }
}

// Global Export
window.ActivityHeatmap = ActivityHeatmap;
