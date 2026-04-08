"""
Module 3: Vote Casting
- Vote encrypted with RSA-OAEP (hybrid AES-GCM)
- SHA-3-256 vote hash
- Digital signature via RSA-PSS (voter's private key)
- Stored on blockchain
- One-vote-per-voter enforcement
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from utils.database import get_db
from utils.crypto import (
    sha3_256_hash, sign_data, verify_signature,
    encrypt_vote, decrypt_vote, generate_rsa_key_pair
)
from utils.audit import log_action
import json

vote_bp = Blueprint('vote', __name__)

# Admin key pair for encrypting votes (in production: use HSM)
# Generated once at module load; persisted across requests via module-level var
_ADMIN_PRIVATE_PEM = None
_ADMIN_PUBLIC_PEM = None


def get_admin_keys():
    global _ADMIN_PRIVATE_PEM, _ADMIN_PUBLIC_PEM
    if not _ADMIN_PRIVATE_PEM:
        _ADMIN_PRIVATE_PEM, _ADMIN_PUBLIC_PEM = generate_rsa_key_pair()
    return _ADMIN_PRIVATE_PEM, _ADMIN_PUBLIC_PEM


@vote_bp.route('/admin-public-key', methods=['GET'])
def admin_public_key():
    _, pub = get_admin_keys()
    return jsonify({"public_key": pub})


@vote_bp.route('/cast', methods=['POST'])
def cast_vote():
    """
    Cast a vote:
    1. Authenticate voter
    2. Verify they haven't voted
    3. Hash the vote payload
    4. Sign with voter's private key
    5. Encrypt with admin's public key
    6. Add to blockchain
    """
    data = request.get_json()
    db = get_db()
    blockchain = current_app.config['BLOCKCHAIN']
    admin_priv, admin_pub = get_admin_keys()

    voter_id = data.get('voter_id', '').strip()
    candidate_id = data.get('candidate_id', '').strip()
    private_key_pem = data.get('private_key_pem', '').strip()

    if not all([voter_id, candidate_id, private_key_pem]):
        return jsonify({"error": "voter_id, candidate_id, private_key_pem required"}), 400

    # Fetch voter
    voter = db['voters'].find_one({'voter_id': voter_id})
    if not voter:
        return jsonify({"error": "Voter not found"}), 404
    if voter.get('status') != 'verified':
        return jsonify({"error": "Voter not eligible"}), 403

    # Double-vote prevention
    if voter.get('has_voted'):
        return jsonify({"error": "You have already cast your vote. Double voting is not permitted."}), 409

    # Fetch candidate
    candidate = db['candidates'].find_one({'candidate_id': candidate_id, 'status': 'active'})
    if not candidate:
        return jsonify({"error": "Invalid or inactive candidate"}), 400

    # Build vote payload
    vote_payload = {
        "voter_id": voter_id,
        "candidate_id": candidate_id,
        "candidate_name": candidate['name'],
        "party": candidate['party'],
        "timestamp": datetime.utcnow().isoformat()
    }
    vote_json = json.dumps(vote_payload, sort_keys=True)

    # Step 1: Hash the vote
    vote_hash = sha3_256_hash(vote_json)

    # Step 2: Digital signature using voter's private key
    try:
        digital_signature = sign_data(vote_json, private_key_pem)
    except Exception as e:
        return jsonify({"error": f"Signature failed. Ensure private key is correct. {str(e)}"}), 400

    # Step 3: Verify signature with stored public key
    voter_pub = voter.get('public_key_pem', '')
    sig_valid = verify_signature(vote_json, digital_signature, voter_pub)
    if not sig_valid:
        log_action(db, 'VOTE_SIG_MISMATCH', voter_id, 'voter', {'candidate_id': candidate_id})
        return jsonify({"error": "Digital signature verification failed. Key mismatch."}), 400

    # Step 4: Encrypt vote with admin public key
    encrypted_vote = encrypt_vote(vote_payload, admin_pub)

    # Step 5: Hash voter ID for anonymity in blockchain
    voter_id_hash = sha3_256_hash(voter_id + "ANONYMITY_SALT_2024")

    # Step 6: Add to blockchain
    bc_result = blockchain.add_vote_transaction(
        vote_hash=vote_hash,
        voter_id_hash=voter_id_hash,
        candidate_id=candidate_id,
        signature=digital_signature
    )

    # Step 7: Store vote record
    vote_doc = {
        'vote_id': vote_hash[:16],
        'voter_id_hash': voter_id_hash,
        'candidate_id': candidate_id,
        'vote_hash': vote_hash,
        'digital_signature': digital_signature,
        'encrypted_vote': encrypted_vote,
        'blockchain_block': bc_result['block_index'],
        'blockchain_hash': bc_result['block_hash'],
        'merkle_root': bc_result['merkle_root'],
        'verification_status': 'verified',
        'voted_at': datetime.utcnow().isoformat()
    }
    db['votes'].insert_one(vote_doc)

    # Step 8: Mark voter as voted (irreversible)
    db['voters'].update_one(
        {'voter_id': voter_id},
        {'$set': {
            'has_voted': True,
            'vote_tx': vote_hash,
            'voted_at': datetime.utcnow().isoformat()
        }}
    )

    log_action(db, 'VOTE_CAST', voter_id, 'voter', {
        'candidate_id': candidate_id,
        'block': bc_result['block_index']
    })

    return jsonify({
        "success": True,
        "receipt": {
            "vote_id": vote_hash[:16],
            "vote_hash": vote_hash,
            "digital_signature": digital_signature[:64] + "...",
            "encrypted_vote_preview": encrypted_vote[:64] + "...",
            "blockchain_block": bc_result['block_index'],
            "blockchain_hash": bc_result['block_hash'],
            "merkle_root": bc_result['merkle_root'],
            "timestamp": vote_doc['voted_at'],
            "verification_status": "verified",
            "message": "Your vote has been cast, encrypted, signed, and recorded on the blockchain."
        }
    }), 201


@vote_bp.route('/verify/<vote_hash>', methods=['GET'])
def verify_vote(vote_hash):
    """Public: verify a vote exists on the blockchain."""
    db = get_db()
    blockchain = current_app.config['BLOCKCHAIN']

    vote = db['votes'].find_one({'vote_hash': vote_hash})
    if not vote:
        return jsonify({"found": False, "message": "Vote not found"}), 404

    bc_result = blockchain.find_vote_in_chain(vote_hash)
    return jsonify({
        "found": True,
        "vote_hash": vote_hash,
        "blockchain": bc_result,
        "verification_status": vote.get('verification_status'),
        "voted_at": vote.get('voted_at')
    })


@vote_bp.route('/list', methods=['GET'])
def list_votes():
    """Audit: list all encrypted votes (anonymized)."""
    db = get_db()
    votes = db['votes'].find({})
    for v in votes:
        v.pop('_id', None)
    return jsonify({"votes": votes, "total": len(votes)})
