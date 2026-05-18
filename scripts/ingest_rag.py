import os
import re
import fitz  # PyMuPDF
import psycopg2
import json
import uuid
from dotenv import load_dotenv
from pinecone import Pinecone
from google.cloud import aiplatform
from google.protobuf import struct_pb2

# Dependencias OCR
from pdf2image import convert_from_path
import pytesseract

# Configuración de ruta Tesseract para Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Cargar variables de entorno
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
load_dotenv(dotenv_path=os.path.join(root_dir, '.env'))

# Configuración Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = "hub-academia-index"
index = pc.Index(index_name)

# Configuración Vertex AI (Embeddings)
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
aiplatform.init(project=PROJECT_ID, location=LOCATION)

def get_embeddings(text):
    """
    Genera embeddings usando Vertex AI 'text-multilingual-embedding-002'.
    Dimensiones: 768.
    """
    from vertexai.language_models import TextEmbeddingInput, TextEmbeddingModel
    model = TextEmbeddingModel.from_pretrained("text-multilingual-embedding-002")
    inputs = [TextEmbeddingInput(text, "RETRIEVAL_DOCUMENT")]
    embeddings = model.get_embeddings(inputs)
    return embeddings[0].values

def extract_metadata(file_path):
    """
    Deduce metadatos y NAMESPACE basados en la carpeta del archivo.
    """
    filename = os.path.basename(file_path)
    parent_folder = os.path.basename(os.path.dirname(file_path)).lower()
    
    # Mapeo de Namespaces (Según Tech Specs)
    namespace = "general"
    if "medicina" in parent_folder or "salud" in parent_folder:
        namespace = "medicine"
    elif "educacion" in parent_folder or "docente" in parent_folder or "minedu" in parent_folder:
        namespace = "education"
    elif "idiomas" in parent_folder or "english" in parent_folder:
        namespace = "languages"

    # Título limpio y año
    year_match = re.search(r'(20\d{2})', filename)
    year = year_match.group(1) if year_match else "Desconocido"
    title = filename.replace(".pdf", "").replace("_", " ")

    return {
        "source": filename,
        "title": title,
        "year": year,
        "namespace": namespace,
        "category": parent_folder
    }

def smart_chunking(file_path):
    """
    Extracción Híbrida (Texto Nativo + OCR) con chunking semántico básico.
    """
    chunks = []
    doc = fitz.open(file_path)
    
    for page_num, page in enumerate(doc):
        text = page.get_text().strip()
        
        # Si la página está vacía o es un escaneo pobre, aplicar OCR
        if len(re.sub(r'\s+', '', text)) < 100:
            try:
                images = convert_from_path(file_path, first_page=page_num+1, last_page=page_num+1, dpi=300, poppler_path=r'C:\poppler\Library\bin')
                if images:
                    text = pytesseract.image_to_string(images[0], lang='spa').strip()
            except Exception as e:
                print(f"   [Error OCR] Pagina {page_num+1}: {e}")
        
        if not text:
            continue

        # Limpieza básica
        text = text.replace('\n', ' ').replace('  ', ' ')
        
        # Dividir páginas largas en chunks de ~1500 chars con solapamiento
        page_chunks = []
        if len(text) > 1500:
            start = 0
            while start < len(text):
                end = start + 1500
                page_chunks.append(text[start:end])
                start += 1200 # Solapamiento de 300 chars
        else:
            page_chunks.append(text)

        for i, content in enumerate(page_chunks):
            chunks.append({
                "content": content,
                "page": page_num + 1,
                "chunk_id": i
            })
            
    doc.close()
    return chunks

def process_and_upload():
    # Carpeta raíz de la biblioteca (puede contener subcarpetas por dominio)
    LIBRARY_ROOT = os.path.join(root_dir, "biblioteca_master")
    
    if not os.path.exists(LIBRARY_ROOT):
        print(f"[Aviso] No se encontro la carpeta: {LIBRARY_ROOT}")
        return

    print(f"Iniciando RAG Ingestion v2.0 (Pinecone + Vertex AI)")

    for root, dirs, files in os.walk(LIBRARY_ROOT):
        for file in files:
            if file.endswith(".pdf"):
                file_path = os.path.join(root, file)
                meta = extract_metadata(file_path)
                
                print(f"[Archivo] Procesando: {meta['title']} -> Namespace: [{meta['namespace']}]")
                
                # Evitar duplicidad: Eliminar fragmentos antiguos del mismo archivo en Pinecone
                try:
                    print(f"   - Limpiando indices antiguos de '{meta['source']}' en Pinecone...")
                    index.delete(filter={"source": meta['source']}, namespace=meta['namespace'])
                    print(f"     [OK] Vectores previos eliminados de forma segura.")
                except Exception as delete_err:
                    print(f"     [Aviso] No se pudieron limpiar vectores antiguos (tal vez el archivo es nuevo): {delete_err}")

                try:
                    chunks = smart_chunking(file_path)
                    print(f"   - Extraidos {len(chunks)} fragmentos.")

                    vectors_to_upsert = []
                    
                    for chunk in chunks:
                        # 1. Generar Vector
                        vector = get_embeddings(chunk['content'])
                        
                        # 2. Preparar ID único
                        vector_id = str(uuid.uuid4())
                        
                        # 3. Preparar Metadatos para Pinecone
                        pinecone_meta = {
                            "text": chunk['content'],
                            "source": meta['source'],
                            "title": meta['title'],
                            "page": chunk['page'],
                            "namespace": meta['namespace'],
                            "category": meta['category']
                        }
                        
                        vectors_to_upsert.append((vector_id, vector, pinecone_meta))
                        
                        # Subir en batches de 50 para estabilidad
                        if len(vectors_to_upsert) >= 50:
                            index.upsert(vectors=vectors_to_upsert, namespace=meta['namespace'])
                            vectors_to_upsert = []
                            print(f"     [OK] Batch de 50 vectores subido.")

                    # Subir remanente
                    if vectors_to_upsert:
                        index.upsert(vectors=vectors_to_upsert, namespace=meta['namespace'])
                        print(f"     [OK] Remanente de {len(vectors_to_upsert)} vectores subido.")

                except Exception as e:
                    print(f"   [Error] Fallo procesando {file}: {e}")

    print("Ingesta Vectorial Completada con exito.")

if __name__ == "__main__":
    process_and_upload()