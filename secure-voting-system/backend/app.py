"""
Secure Digital Voting System - Main Application
Cryptographic Validation with RSA-4096, SHA-3, Digital Signatures & Blockchain
"""

from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from modules.voter_module import voter_bp
from modules.candidate_module import candidate_bp
from modules.vote_module import vote_bp
from modules.audit_module import audit_bp
from modules.admin_module import admin_bp
from modules.ai_module import ai_bp
from utils.database import init_db, get_db
from utils.blockchain import Blockchain

app = Flask(__name__, static_folder='../frontend', static_url_path='')

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        from flask import make_response
        res = make_response()
        res.headers['Access-Control-Allow-Origin'] = '*'
        res.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        res.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
        return res

# Initialize Blockchain (singleton)
blockchain = Blockchain()
app.config['BLOCKCHAIN'] = blockchain

# Register Blueprints
app.register_blueprint(voter_bp, url_prefix='/api/voter')
app.register_blueprint(candidate_bp, url_prefix='/api/candidate')
app.register_blueprint(vote_bp, url_prefix='/api/vote')
app.register_blueprint(audit_bp, url_prefix='/api/audit')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(ai_bp, url_prefix='/api/ai')

@app.before_request
def setup():
    """Initialize DB before first request."""
    init_db()

@app.route('/api/health', methods=['GET'])
def health():
    db = get_db()
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "blockchain_length": len(blockchain.chain),
        "db_status": "connected" if db else "disconnected",
        "version": "1.0.0"
    })

@app.route('/api/system/stats', methods=['GET'])
def system_stats():
    db = get_db()
    voters = list(db['voters'].find({}, {'_id': 0, 'private_key_pem': 0}))
    votes = list(db['votes'].find({}, {'_id': 0}))
    candidates = list(db['candidates'].find({}, {'_id': 0}))
    return jsonify({
        "total_voters": len(voters),
        "verified_voters": sum(1 for v in voters if v.get('status') == 'verified'),
        "total_votes": len(votes),
        "total_candidates": len(candidates),
        "blockchain_blocks": len(blockchain.chain),
        "is_chain_valid": blockchain.is_chain_valid()
    })

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    # Serve index.html for SPA routing
    idx = os.path.join(app.static_folder, 'index.html')
    if os.path.exists(idx):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({"message": "Secure Digital Voting System API", "version": "1.0.0"}), 200

if __name__ == '__main__':
    init_db()
    print("🗳️  Secure Digital Voting System Starting...")
    print(f"🔗 Blockchain initialized with {len(blockchain.chain)} blocks")
    app.run(debug=True, host='0.0.0.0', port=5000)
