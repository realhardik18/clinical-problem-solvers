from flask import Flask, request, jsonify
import json
import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from flask_cors import CORS

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

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Missing 'query' parameter"}), 400
        
    embeddings = model.encode([query], batch_size=32, show_progress_bar=False)
    result = index.query(
        vector=embeddings[0].tolist(),
        top_k=5,
        include_metadata=True
    )
    print(result)
    formatted_results = [{
        'id': match['id'],
        'text': match['metadata']['text'],
        'url': match['metadata']['url'],
        'score': match['score'],
        #'transcript_info':chunk_data[match['id'][6:]],
        'start_time': match['metadata']['start_time'],
        'metadata':video_data[match['metadata']['url']],
        'final_dx': dx_data.get(match['metadata']['url'], {}).get('Final Dx')
    } for match in result['matches']]
    
    return jsonify({
        'matches': formatted_results
    })

@app.route('/add',methods=['POST'])
def add():
    video=request.args.get('id')

app.run(debug=True)