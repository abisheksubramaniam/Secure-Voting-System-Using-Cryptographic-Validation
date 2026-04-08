"""
Cryptographic Utilities
RSA-4096 key generation, SHA-3-256 hashing, Digital signatures (PSS),
AES-256 encryption for vote data.
"""

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import hashlib
import base64
import os
import json


# ─────────────────────────────────────────────
# RSA KEY GENERATION
# ─────────────────────────────────────────────

def generate_rsa_key_pair():
    """Generate RSA-4096 key pair. Returns (private_key_pem, public_key_pem)."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096,
        backend=default_backend()
    )
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    return private_pem, public_pem


def load_private_key(pem_str: str) -> RSAPrivateKey:
    return serialization.load_pem_private_key(
        pem_str.encode('utf-8'), password=None, backend=default_backend()
    )


def load_public_key(pem_str: str) -> RSAPublicKey:
    return serialization.load_pem_public_key(
        pem_str.encode('utf-8'), backend=default_backend()
    )


# ─────────────────────────────────────────────
# HASHING
# ─────────────────────────────────────────────

def sha3_256_hash(data: str) -> str:
    """Compute SHA-3-256 hash of string data."""
    return hashlib.sha3_256(data.encode('utf-8')).hexdigest()


def sha3_256_hash_bytes(data: bytes) -> str:
    return hashlib.sha3_256(data).hexdigest()


def hash_sensitive_id(value: str) -> str:
    """Hash a sensitive ID (Aadhar, PAN) with a salt."""
    salt = "SVCS_SALT_2024_SECURE_VOTING"
    return sha3_256_hash(salt + value.strip().upper())


# ─────────────────────────────────────────────
# DIGITAL SIGNATURES (RSA-PSS)
# ─────────────────────────────────────────────

def sign_data(data: str, private_key_pem: str) -> str:
    """Create RSA-PSS digital signature. Returns base64-encoded signature."""
    private_key = load_private_key(private_key_pem)
    signature = private_key.sign(
        data.encode('utf-8'),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return base64.b64encode(signature).decode('utf-8')


def verify_signature(data: str, signature_b64: str, public_key_pem: str) -> bool:
    """Verify RSA-PSS digital signature."""
    try:
        public_key = load_public_key(public_key_pem)
        signature = base64.b64decode(signature_b64)
        public_key.verify(
            signature,
            data.encode('utf-8'),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except (InvalidSignature, Exception):
        return False


# ─────────────────────────────────────────────
# VOTE ENCRYPTION / DECRYPTION (RSA-OAEP)
# ─────────────────────────────────────────────

def encrypt_vote(vote_data: dict, public_key_pem: str) -> str:
    """Encrypt vote dict with RSA-OAEP using admin public key."""
    public_key = load_public_key(public_key_pem)
    plaintext = json.dumps(vote_data).encode('utf-8')

    # RSA can only encrypt small chunks; use hybrid encryption
    # Generate ephemeral AES-256-GCM key
    aes_key = os.urandom(32)
    nonce = os.urandom(12)
    aesgcm = AESGCM(aes_key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    # Encrypt AES key with RSA-OAEP
    encrypted_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    package = {
        'encrypted_key': base64.b64encode(encrypted_key).decode(),
        'nonce': base64.b64encode(nonce).decode(),
        'ciphertext': base64.b64encode(ciphertext).decode()
    }
    return base64.b64encode(json.dumps(package).encode()).decode()


def decrypt_vote(encrypted_b64: str, private_key_pem: str) -> dict:
    """Decrypt vote using admin private key."""
    private_key = load_private_key(private_key_pem)
    package = json.loads(base64.b64decode(encrypted_b64).decode())

    aes_key = private_key.decrypt(
        base64.b64decode(package['encrypted_key']),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    nonce = base64.b64decode(package['nonce'])
    ciphertext = base64.b64decode(package['ciphertext'])

    aesgcm = AESGCM(aes_key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode())


# ─────────────────────────────────────────────
# VOTER ID GENERATION
# ─────────────────────────────────────────────

def generate_voter_id(state_code: str = "TN") -> str:
    """Generate unique Voter ID: STATE+YEAR+RANDOM."""
    import random, string
    year = __import__('datetime').datetime.utcnow().year
    uid = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"{state_code.upper()}{year}{uid}"


# ─────────────────────────────────────────────
# MERKLE TREE
# ─────────────────────────────────────────────

def compute_merkle_root(hashes_list: list) -> str:
    """Compute Merkle root from list of hash strings."""
    if not hashes_list:
        return sha3_256_hash("EMPTY")
    layer = list(hashes_list)
    while len(layer) > 1:
        if len(layer) % 2 == 1:
            layer.append(layer[-1])  # duplicate last if odd
        layer = [
            sha3_256_hash(layer[i] + layer[i + 1])
            for i in range(0, len(layer), 2)
        ]
    return layer[0]
