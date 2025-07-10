from flask import Flask, request, jsonify
import json
import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from flask_cors import CORS
import hashlib
import time
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import re
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Pinecone and SentenceTransformer once
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
index = pc.Index('medrag')
model = SentenceTransformer("pritamdeka/BioBERT-mnli-snli-scinli-scitail-mednli-stsb")

with open('chunk-details.json','r') as file:
    chunk_data=json.load(file)

with open('video-data.json','r') as f:
    video_data=json.load(f)

with open('dx.json','r') as f:
    dx_data=json.load(f)

@app.route('/')
def home():
    return {"message":"server is alive"}

def extract_medical_entities(query):
    """
    Uses Gemini Flash 2.5 to extract medical topics, diagnoses, or complaints.
    """
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"topics": [], "diagnoses": [], "complaints": []}

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key
    }
    prompt = (
        "Extract the following from this medical query: "
        "1. Relevant medical topics (as a list of strings), "
        "2. Diagnoses (as a list of strings), "
        "3. Chief complaints or symptoms (as a list of strings). "
        "Respond as a JSON object with keys: topics, diagnoses, complaints. "
        f"Query: \"{query}\""
    )
    data = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    try:
        resp = requests.post(url, headers=headers, json=data, timeout=10)
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        # Extract JSON block from LLM response if wrapped in ```json ... ```
        import re as _re
        import json as _json
        match = _re.search(r"```json\s*(\{.*?\})\s*```", text, _re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            # fallback: try to find any {...} block
            match = _re.search(r"(\{.*\})", text, _re.DOTALL)
            json_str = match.group(1) if match else text
        result = _json.loads(json_str)
        print({
            "topics": result.get("topics", []),
            "diagnoses": result.get("diagnoses", []),
            "complaints": result.get("complaints", [])
        })
        return {
            "topics": result.get("topics", []),
            "diagnoses": result.get("diagnoses", []),
            "complaints": result.get("complaints", [])
        }
    except Exception as e:
        print("Gemini extraction error:", e)
        return {"topics": [], "diagnoses": [], "complaints": []}

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Missing 'query' parameter"}), 400

    # 1. Extract medical entities from query using Gemini
    extracted = extract_medical_entities(query)
    extracted_topics = set([t.lower() for t in extracted.get("topics", [])])
    extracted_diagnoses = set([d.lower() for d in extracted.get("diagnoses", [])])
    extracted_complaints = set([c.lower() for c in extracted.get("complaints", [])])

    # 2. Vector similarity search
    embeddings = model.encode([query], batch_size=32, show_progress_bar=False)
    result = index.query(
        vector=embeddings[0].tolist(),
        top_k=50,
        include_metadata=True
    )
    matches = result.get('matches', [])

    # 3. Metadata filtering/reranking using Gemini extracted data
    metadata_matches = []
    for match in matches:
        meta = match['metadata']
        tags = set([t.lower() for t in meta.get('tags', [])])
        topics = set([str(meta.get('topics', '')).lower()])
        chief_complaint = set([str(meta.get('chief_complaint', '')).lower()])
        dx = set([str(dx_data.get(meta['url'], {}).get('Final Dx', '')).lower()])

        # Use Gemini extracted entities to match metadata
        if (
            extracted_topics & tags or
            extracted_topics & topics or
            extracted_complaints & chief_complaint or
            extracted_diagnoses & dx
        ):
            metadata_matches.append(match)

    # 4. Combine and rerank: boost score for metadata matches
    combined = []
    seen_ids = set()
    for match in metadata_matches:
        match_copy = match.copy()
        match_copy['score'] += 1.0  # Boost score for metadata match
        combined.append(match_copy)
        seen_ids.add(match['id'])
    for match in matches:
        if match['id'] not in seen_ids:
            combined.append(match)

    # 5. Sort by boosted score descending
    combined.sort(key=lambda x: x['score'], reverse=True)

    # 6. Format results
    formatted_results = [{
        'id': match['id'],
        'text': match['metadata']['text'],
        'url': match['metadata']['url'],
        'score': match['score'],
        'start_time': match['metadata']['start_time'],
        'metadata': video_data.get(match['metadata']['url'], {}),
        'final_dx': dx_data.get(match['metadata']['url'], {}).get('Final Dx')
    } for match in combined[:25]]

    return jsonify({
        'matches': formatted_results,
        'gemini_entities': extracted  # Optionally return Gemini extraction for debugging
    })

def get_youtube_video_id(url):
    """
    Extracts the video ID from a YouTube URL.
    """
    regex = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"
    match = re.search(regex, url)
    if match:
        return match.group(1)
    return None

def fetch_transcript(video_url):
    """
    Fetch transcript using youtube-transcript-api.
    """
    video_id = get_youtube_video_id(video_url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return transcript
    except (TranscriptsDisabled, NoTranscriptFound):
        return None

def chunk_transcript(transcript, chunk_size=40):
    """
    Chunk transcript into pieces of ~chunk_size words.
    Each chunk is a dict with text, start, duration, chunk_index.
    """
    chunks = []
    current_chunk = []
    current_start = None
    current_duration = 0
    word_count = 0
    chunk_index = 0

    for entry in transcript:
        words = entry['text'].split()
        if current_start is None:
            current_start = entry['start']
        current_chunk.extend(words)
        current_duration += entry['duration']
        word_count += len(words)
        if word_count >= chunk_size:
            chunk_text = ' '.join(current_chunk)
            chunks.append({
                "text": chunk_text,
                "start_time": current_start,
                "duration": current_duration,
                "chunk_index": chunk_index
            })
            chunk_index += 1
            current_chunk = []
            current_start = None
            current_duration = 0
            word_count = 0
    # Add last chunk if any
    if current_chunk:
        chunk_text = ' '.join(current_chunk)
        chunks.append({
            "text": chunk_text,
            "start_time": current_start if current_start is not None else 0,
            "duration": current_duration,
            "chunk_index": chunk_index
        })
    return chunks

@app.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    youtube_url = data.get('youtubeUrl')
    chief_complaint = data.get('chiefComplaint')
    tags = data.get('tags', [])
    topics = data.get('topics')

    if not youtube_url or not chief_complaint:
        return jsonify({"error": "Missing required fields"}), 400

    # Generate a unique video id (e.g., from URL or timestamp)
    video_id = hashlib.md5(youtube_url.encode()).hexdigest()

    # Fetch transcript
    print("Fetching transcript...")
    transcript = fetch_transcript(youtube_url)
    if transcript is None:
        return jsonify({"error": "Transcript not available for this video."}), 400

    # Chunk transcript
    print("Chunking transcript...")
    chunks = chunk_transcript(transcript, chunk_size=40)

    # Generate embeddings for each chunk
    print("Generating embeddings for chunks...")
    chunk_texts = [chunk['text'] for chunk in chunks]
    embeddings = model.encode(chunk_texts, batch_size=8, show_progress_bar=True)

    # Prepare Pinecone vectors
    vectors = []
    chunk_details = {}
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_id = f"{video_id}-chunk-{i}"
        vectors.append({
            "id": chunk_id,
            "values": embedding.tolist(),
            "metadata": {
                "url": youtube_url,
                "chief_complaint": chief_complaint,
                "tags": tags,
                "topics": topics,
                "text": chunk['text'],
                "start_time": chunk['start_time'],
                "duration": chunk['duration'],
                "chunk_index": chunk['chunk_index']
            }
        })
        chunk_details[chunk_id] = {
            "text": chunk['text'],
            "start_time": chunk['start_time'],
            "duration": chunk['duration'],
            "chunk_index": chunk['chunk_index'],
            "url": youtube_url
        }

    # Batch upload to Pinecone
    print(f"Uploading {len(vectors)} chunks to Pinecone...")
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        index.upsert(batch)
        print(f"Uploaded batch {i//batch_size + 1}")

    # Save chunk details to chunk-details.json
    if os.path.exists('chunk-details.json'):
        with open('chunk-details.json', 'r') as f:
            all_chunk_data = json.load(f)
    else:
        all_chunk_data = {}
    all_chunk_data.update(chunk_details)
    with open('chunk-details.json', 'w') as f:
        json.dump(all_chunk_data, f, indent=2)

    # Save metadata to video-data.json
    metadata = {
        "url": youtube_url,
        "chief_complaint": chief_complaint,
        "tags": tags,
        "topics": topics,
        "added_at": int(time.time())
    }
    video_data[youtube_url] = metadata
    with open('video-data.json', 'w') as f:
        json.dump(video_data, f, indent=2)

    print("Upload complete.")
    return jsonify({"message": "Video and transcript chunks added successfully", "id": video_id, "chunks": len(chunks)})

app.run(debug=True)