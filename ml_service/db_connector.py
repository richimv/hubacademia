# ml_service/db_connector.py
import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# ✅ CORRECCIÓN: Usar el nombre específico para Python
DATABASE_URL = os.getenv("PYTHON_DATABASE_URL")
_ENGINE = None

def get_db_engine():
    global _ENGINE
    if not DATABASE_URL:
        # El mensaje de error ya lo tenías bien, ahora el código coincide
        raise ValueError("❌ Error: PYTHON_DATABASE_URL no configurada en .env")
    
    if _ENGINE is None:
        _ENGINE = create_engine(
            DATABASE_URL,
            pool_size=3,
            max_overflow=2,
            pool_timeout=30,
            pool_recycle=1800,
            pool_pre_ping=True
        )
    return _ENGINE
    
def get_courses_data():
    """
    Descarga cursos con temas (sin secciones/carreras legacy).
    """
    query = """
    SELECT 
        c.id, 
        c.name,  
        'course' as type,
        string_agg(DISTINCT t.name, ' ') as topics_soup,
        COALESCE(
            json_agg(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL),
            '[]'
        ) as topics
    FROM courses c
    LEFT JOIN course_topics ct ON c.id = ct.course_id
    LEFT JOIN topics t ON ct.topic_id = t.id
    GROUP BY c.id, c.name;
    """
    try:
        engine = get_db_engine()
        df = pd.read_sql(query, engine)
        print(f"📊 [DB] Cursos cargados: {len(df)}")
        return df
    except Exception as e:
        print(f"❌ [DB] Error descargando cursos: {e}")
        return pd.DataFrame()

def get_books_data():
    """
    Descarga libros (resources) con temas.
    """
    query = """
    SELECT 
        r.id, 
        r.title as name, 
        r.author,
        NULL::text AS publisher,
        'book' as type,
        string_agg(DISTINCT t.name, ' ') as topics_soup,
        COALESCE(
            json_agg(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL),
            '[]'
        ) as topics
    FROM resources r
    LEFT JOIN topic_resources tr ON r.id = tr.resource_id
    LEFT JOIN topics t ON tr.topic_id = t.id
    WHERE r.resource_type = 'book'
    GROUP BY r.id, r.title, r.author;
    """
    try:
        engine = get_db_engine()
        df = pd.read_sql(query, engine)
        print(f"📚 [DB] Libros cargados: {len(df)}")
        return df
    except Exception as e:
        print(f"❌ [DB] Error descargando libros: {e}")
        return pd.DataFrame()

def get_search_trends_data(days=30):
    """Historial de búsquedas crudo para análisis de tendencias"""
    safe_days = max(1, min(int(days), 365))
    query = text("""
    SELECT query, results_count, created_at 
    FROM search_history 
    WHERE created_at >= NOW() - (:days * INTERVAL '1 day')
    AND query IS NOT NULL
    """)
    try:
        engine = get_db_engine()
        return pd.read_sql(query, engine, params={"days": safe_days})
    except Exception as e:
        print(f"❌ [DB] Error historial: {e}")
        return pd.DataFrame()

def get_all_topics():
    """Catálogo completo de temas"""
    try:
        engine = get_db_engine()
        return pd.read_sql("SELECT name FROM topics", engine)
    except:
        return pd.DataFrame()
