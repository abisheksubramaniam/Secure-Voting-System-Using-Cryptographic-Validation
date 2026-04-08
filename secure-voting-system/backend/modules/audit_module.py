"""
Module: Audit Dashboard
- View encrypted votes, hashes, signatures
- Blockchain explorer
- Filter & search
"""

from flask import Blueprint, request, jsonify, current_app
from utils.database import get_db

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/votes', methods=['GET'])
def audit_votes():
    db = get_db()
    votes = db['votes'].find({})
    for v in votes:
        v.pop('_id', None)
    return jsonify({"votes": votes, "total": len(votes)})


@audit_bp.route('/blockchain', methods=['GET'])
def audit_blockchain():
    blockchain = current_app.config['BLOCKCHAIN']
    return jsonify({
        "chain": blockchain.get_chain_data(),
        "length": len(blockchain.chain),
        "is_valid": blockchain.is_chain_valid()
    })


@audit_bp.route('/logs', methods=['GET'])
def audit_logs():
    db = get_db()
    logs = db['audit_logs'].find({})
    for l in logs:
        l.pop('_id', None)
    logs_sorted = sorted(logs, key=lambda x: x.get('timestamp', ''), reverse=True)
    return jsonify({"logs": logs_sorted[:100], "total": len(logs_sorted)})


@audit_bp.route('/search-vote/<vote_hash>', methods=['GET'])
def search_vote(vote_hash):
    db = get_db()
    blockchain = current_app.config['BLOCKCHAIN']

    vote = db['votes'].find_one({'vote_hash': vote_hash})
    if not vote:
        return jsonify({"found": False}), 404
    vote.pop('_id', None)

    bc = blockchain.find_vote_in_chain(vote_hash)
    return jsonify({"vote": vote, "blockchain": bc, "found": True})
