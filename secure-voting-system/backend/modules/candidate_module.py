"""
Module 2: Candidate Management
- Add/edit/remove candidates
- Party details, symbols
- Admin-only operations
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from utils.database import get_db
from utils.audit import log_action
import uuid

candidate_bp = Blueprint('candidate', __name__)

PARTY_COLORS = {
    "BJP": "#FF9933",
    "INC": "#19AAED",
    "AAP": "#0066B3",
    "DMK": "#FF0000",
    "AIADMK": "#006400",
    "TMC": "#2ECC71",
    "Independent": "#95A5A6",
    "Other": "#8E44AD"
}


@candidate_bp.route('/add', methods=['POST'])
def add_candidate():
    data = request.get_json()
    db = get_db()

    required = ['name', 'party', 'constituency', 'symbol']
    for f in required:
        if not data.get(f):
            return jsonify({"error": f"Missing: {f}"}), 400

    candidate_id = "CAND_" + str(uuid.uuid4())[:8].upper()
    doc = {
        'candidate_id': candidate_id,
        'name': data['name'].strip(),
        'party': data['party'].strip(),
        'constituency': data['constituency'].strip(),
        'symbol': data['symbol'].strip(),
        'manifesto': data.get('manifesto', ''),
        'age': data.get('age', ''),
        'qualification': data.get('qualification', ''),
        'party_color': PARTY_COLORS.get(data['party'], '#6C757D'),
        'vote_count': 0,   # hidden from public; decrypted during result
        'status': 'active',
        'added_at': datetime.utcnow().isoformat()
    }

    db['candidates'].insert_one(doc)
    log_action(db, 'CANDIDATE_ADD', candidate_id, 'admin', {'name': data['name']})

    return jsonify({"success": True, "candidate_id": candidate_id, "candidate": doc}), 201


@candidate_bp.route('/list', methods=['GET'])
def list_candidates():
    db = get_db()
    candidates = db['candidates'].find({'status': 'active'}, {'vote_count': 0})
    for c in candidates:
        c.pop('_id', None)
    return jsonify({"candidates": candidates, "total": len(candidates)})


@candidate_bp.route('/list/all', methods=['GET'])
def list_all_candidates():
    """Admin view with vote counts."""
    db = get_db()
    candidates = db['candidates'].find({})
    for c in candidates:
        c.pop('_id', None)
    return jsonify({"candidates": candidates, "total": len(candidates)})


@candidate_bp.route('/update/<candidate_id>', methods=['PUT'])
def update_candidate(candidate_id):
    data = request.get_json()
    db = get_db()
    candidate = db['candidates'].find_one({'candidate_id': candidate_id})
    if not candidate:
        return jsonify({"error": "Candidate not found"}), 404

    allowed = ['name', 'party', 'constituency', 'symbol', 'manifesto', 'age', 'qualification', 'status']
    update = {k: v for k, v in data.items() if k in allowed}
    db['candidates'].update_one({'candidate_id': candidate_id}, {'$set': update})
    return jsonify({"success": True, "message": "Candidate updated"})


@candidate_bp.route('/delete/<candidate_id>', methods=['DELETE'])
def delete_candidate(candidate_id):
    db = get_db()
    db['candidates'].update_one(
        {'candidate_id': candidate_id},
        {'$set': {'status': 'removed'}}
    )
    return jsonify({"success": True, "message": "Candidate removed"})
