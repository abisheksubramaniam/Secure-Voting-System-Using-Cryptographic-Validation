"""
Module 1: Voter Registration
- Unique Voter ID generation
- RSA-4096 key pair creation
- Input validation (Aadhar, PAN, DOB, phone)
- Duplicate prevention via hashed IDs
- Status tracking
"""

from flask import Blueprint, request, jsonify, current_app
import re
from datetime import datetime, date
from utils.database import get_db
from utils.crypto import (
    generate_rsa_key_pair, generate_voter_id,
    hash_sensitive_id, sha3_256_hash
)
from utils.audit import log_action

voter_bp = Blueprint('voter', __name__)


def validate_aadhar(aadhar: str) -> bool:
    return bool(re.match(r'^\d{12}$', aadhar.strip()))


def validate_pan(pan: str) -> bool:
    return bool(re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', pan.strip().upper()))


def validate_phone(phone: str) -> bool:
    return bool(re.match(r'^[6-9]\d{9}$', phone.strip()))


def validate_age(dob_str: str) -> bool:
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age >= 18
    except Exception:
        return False


@voter_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    db = get_db()

    # Required fields
    required = ['name', 'email', 'phone', 'aadhar', 'pan', 'dob', 'address', 'state']
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"Missing field: {field}"}), 400

    name = data['name'].strip()
    email = data['email'].strip().lower()
    phone = data['phone'].strip()
    aadhar = data['aadhar'].strip()
    pan = data['pan'].strip().upper()
    dob = data['dob'].strip()
    address = data['address'].strip()
    state = data['state'].strip()

    # Validation
    errors = {}
    if not validate_aadhar(aadhar):
        errors['aadhar'] = "Aadhar must be 12 digits"
    if not validate_pan(pan):
        errors['pan'] = "PAN format: ABCDE1234F"
    if not validate_phone(phone):
        errors['phone'] = "Phone must be 10 digits starting with 6-9"
    if not validate_age(dob):
        errors['dob'] = "Voter must be at least 18 years old"
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    # Hash sensitive IDs for duplicate detection
    aadhar_hash = hash_sensitive_id(aadhar)
    pan_hash = hash_sensitive_id(pan)
    email_hash = sha3_256_hash(email)

    # Duplicate checks
    if db['voters'].find_one({'aadhar_hash': aadhar_hash}):
        return jsonify({"error": "Aadhar number already registered"}), 409
    if db['voters'].find_one({'pan_hash': pan_hash}):
        return jsonify({"error": "PAN card already registered"}), 409
    if db['voters'].find_one({'email_hash': email_hash}):
        return jsonify({"error": "Email already registered"}), 409

    # Generate cryptographic keys
    private_pem, public_pem = generate_rsa_key_pair()
    voter_id = generate_voter_id(state)

    # Build voter document
    voter_doc = {
        'voter_id': voter_id,
        'name': name,
        'email': email,
        'email_hash': email_hash,
        'phone': phone,
        'aadhar_hash': aadhar_hash,
        'pan_hash': pan_hash,
        'dob': dob,
        'address': address,
        'state': state,
        'public_key_pem': public_pem,
        'private_key_pem': private_pem,   # In production: store encrypted in HSM
        'has_voted': False,
        'vote_tx': None,
        'status': 'verified',
        'registered_at': datetime.utcnow().isoformat()
    }

    result = db['voters'].insert_one(voter_doc)
    log_action(db, 'VOTER_REGISTER', voter_id, 'voter', {'name': name})

    return jsonify({
        "success": True,
        "voter_id": voter_id,
        "public_key": public_pem,
        "private_key": private_pem,  # Shown once; voter must save this
        "message": "Registration successful. Save your private key securely!"
    }), 201


@voter_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    voter_id = data.get('voter_id', '').strip()
    aadhar = data.get('aadhar', '').strip()

    if not voter_id or not aadhar:
        return jsonify({"error": "voter_id and aadhar required"}), 400

    db = get_db()
    aadhar_hash = hash_sensitive_id(aadhar)
    voter = db['voters'].find_one({'voter_id': voter_id, 'aadhar_hash': aadhar_hash})

    if not voter:
        return jsonify({"error": "Invalid credentials"}), 401
    if voter.get('status') == 'suspended':
        return jsonify({"error": "Account suspended"}), 403

    log_action(db, 'VOTER_LOGIN', voter_id, 'voter', {})

    return jsonify({
        "success": True,
        "voter_id": voter['voter_id'],
        "name": voter['name'],
        "has_voted": voter.get('has_voted', False),
        "status": voter.get('status'),
        "public_key": voter.get('public_key_pem')
    })


@voter_bp.route('/profile/<voter_id>', methods=['GET'])
def profile(voter_id):
    db = get_db()
    voter = db['voters'].find_one({'voter_id': voter_id}, {'private_key_pem': 0, 'aadhar_hash': 0, 'pan_hash': 0})
    if not voter:
        return jsonify({"error": "Voter not found"}), 404
    voter.pop('_id', None)
    return jsonify(voter)


@voter_bp.route('/list', methods=['GET'])
def list_voters():
    db = get_db()
    voters = db['voters'].find({}, {
        'private_key_pem': 0, 'aadhar_hash': 0, 'pan_hash': 0, 'email_hash': 0
    })
    for v in voters:
        v.pop('_id', None)
    return jsonify({"voters": voters, "total": len(voters)})
