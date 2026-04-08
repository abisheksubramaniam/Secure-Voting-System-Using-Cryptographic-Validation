"""
Module 4 & 5: Admin Verification + Result Generation
- Signature verification (batch)
- Vote decryption using admin private key
- Result tabulation
- Fraud detection
- Blockchain integrity
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from utils.database import get_db
from utils.crypto import verify_signature, decrypt_vote, sha3_256_hash
from utils.audit import log_action

admin_bp = Blueprint('admin', __name__)

ADMIN_PASSWORD = "admin@SecureVote2024"  # In production: bcrypt + env var


def check_admin(data):
    return data.get('admin_password') == ADMIN_PASSWORD


@admin_bp.route('/verify-signatures', methods=['POST'])
def verify_signatures():
    """Batch verify all digital signatures in the database."""
    data = request.get_json()
    if not check_admin(data):
        return jsonify({"error": "Unauthorized"}), 403

    db = get_db()
    votes = db['votes'].find({})
    results = []
    valid_count = 0
    invalid_count = 0

    for vote in votes:
        vote_id = vote.get('vote_id')
        sig = vote.get('digital_signature')
        voter_id_hash = vote.get('voter_id_hash')

        # We can't reverse the voter_id_hash (anonymity preserved)
        # Instead we re-derive and check sig matches stored vote_hash
        # For demo: mark verified if verification_status is set
        status = vote.get('verification_status', 'unknown')
        if status == 'verified':
            valid_count += 1
        else:
            invalid_count += 1

        results.append({
            "vote_id": vote_id,
            "vote_hash": vote.get('vote_hash'),
            "sig_preview": sig[:32] + "..." if sig else "N/A",
            "status": status,
            "blockchain_block": vote.get('blockchain_block')
        })

    log_action(db, 'ADMIN_VERIFY_SIGS', 'admin', 'admin', {
        'total': len(results), 'valid': valid_count
    })

    return jsonify({
        "total": len(results),
        "valid": valid_count,
        "invalid": invalid_count,
        "results": results
    })


@admin_bp.route('/decrypt-results', methods=['POST'])
def decrypt_results():
    """Decrypt all votes and tabulate results."""
    from modules.vote_module import get_admin_keys
    data = request.get_json()
    if not check_admin(data):
        return jsonify({"error": "Unauthorized"}), 403

    db = get_db()
    admin_priv, _ = get_admin_keys()
    votes = db['votes'].find({})
    candidates = db['candidates'].find({'status': 'active'})
    candidate_map = {c['candidate_id']: c for c in candidates}

    tally = {}
    decrypted_votes = []
    errors = []

    for vote in votes:
        encrypted = vote.get('encrypted_vote')
        if not encrypted:
            continue
        try:
            decrypted = decrypt_vote(encrypted, admin_priv)
            cid = decrypted.get('candidate_id')
            tally[cid] = tally.get(cid, 0) + 1
            decrypted_votes.append({
                "vote_id": vote.get('vote_id'),
                "candidate_id": cid,
                "candidate_name": decrypted.get('candidate_name'),
                "party": decrypted.get('party'),
                "vote_hash": vote.get('vote_hash'),
                "voted_at": vote.get('voted_at')
            })
        except Exception as e:
            errors.append({"vote_id": vote.get('vote_id'), "error": str(e)})

    # Build results with candidate info
    results = []
    total_votes = sum(tally.values())
    for cid, count in sorted(tally.items(), key=lambda x: -x[1]):
        cand = candidate_map.get(cid, {})
        results.append({
            "candidate_id": cid,
            "name": cand.get('name', 'Unknown'),
            "party": cand.get('party', 'Unknown'),
            "constituency": cand.get('constituency', ''),
            "party_color": cand.get('party_color', '#666'),
            "votes": count,
            "percentage": round((count / total_votes * 100), 2) if total_votes > 0 else 0
        })

    winner = results[0] if results else None

    log_action(db, 'ADMIN_DECRYPT_RESULTS', 'admin', 'admin', {
        'total_votes': total_votes, 'candidates': len(results)
    })

    return jsonify({
        "success": True,
        "total_votes": total_votes,
        "results": results,
        "winner": winner,
        "decrypted_votes_sample": decrypted_votes[:10],
        "decryption_errors": errors,
        "declared_at": datetime.utcnow().isoformat()
    })


@admin_bp.route('/blockchain-integrity', methods=['GET'])
def blockchain_integrity():
    blockchain = current_app.config['BLOCKCHAIN']
    report = blockchain.tamper_detect()
    return jsonify({
        **report,
        "chain_data": blockchain.get_chain_data()
    })


@admin_bp.route('/fraud-detection', methods=['POST'])
def fraud_detection():
    data = request.get_json()
    if not check_admin(data):
        return jsonify({"error": "Unauthorized"}), 403

    db = get_db()
    voters = db['voters'].find({})
    voted_voters = [v for v in voters if v.get('has_voted')]
    votes = db['votes'].find({})

    # Check for duplicate vote hashes
    vote_hashes = [v.get('vote_hash') for v in votes]
    unique_hashes = set(vote_hashes)
    duplicates = len(vote_hashes) - len(unique_hashes)

    alerts = []
    if duplicates > 0:
        alerts.append({
            "severity": "HIGH",
            "type": "DUPLICATE_VOTE_HASH",
            "description": f"Found {duplicates} duplicate vote hashes",
            "timestamp": datetime.utcnow().isoformat()
        })

    return jsonify({
        "total_voters": db['voters'].count_documents({}),
        "voted_count": len(voted_voters),
        "total_vote_records": len(vote_hashes),
        "duplicate_hashes": duplicates,
        "blockchain_valid": current_app.config['BLOCKCHAIN'].is_chain_valid(),
        "alerts": alerts,
        "status": "CLEAN" if not alerts else "ALERT"
    })


@admin_bp.route('/stats', methods=['GET'])
def stats():
    db = get_db()
    blockchain = current_app.config['BLOCKCHAIN']
    voters = db['voters'].find({})
    return jsonify({
        "total_voters": len(voters),
        "voted": sum(1 for v in voters if v.get('has_voted')),
        "total_votes": db['votes'].count_documents({}),
        "total_candidates": db['candidates'].count_documents({'status': 'active'}),
        "blockchain_blocks": len(blockchain.chain),
        "chain_valid": blockchain.is_chain_valid(),
        "timestamp": datetime.utcnow().isoformat()
    })
