"""
AI Assistant Module
Agentic AI for voter guidance using Anthropic API.
"""

from flask import Blueprint, request, jsonify
import urllib.request
import urllib.error
import json
import os

ai_bp = Blueprint('ai', __name__)

SYSTEM_PROMPT = """You are VoteBot, the AI assistant for the Secure Digital Voting System.
You help voters understand:
- How to register (requires Aadhar 12-digit, PAN format ABCDE1234F, age 18+)
- How digital signatures and RSA encryption protect their vote
- How the blockchain ensures vote immutability
- How to cast their vote step-by-step
- How to verify their vote on the blockchain
- Security features: SHA-3-256 hashing, RSA-4096 encryption, digital signatures
Always be clear, concise and reassure voters about the security of the system.
Never ask for or reveal actual private keys, Aadhar numbers, or PAN numbers.
"""


@ai_bp.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message', '').strip()
    history = data.get('history', [])

    if not user_message:
        return jsonify({"error": "Message required"}), 400

    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        # Fallback: rule-based responses when no API key
        return jsonify({"reply": get_rule_based_response(user_message)})

    messages = [{"role": m["role"], "content": m["content"]} for m in history[-10:]]
    messages.append({"role": "user", "content": user_message})

    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 512,
        "system": SYSTEM_PROMPT,
        "messages": messages
    }).encode('utf-8')

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            reply = result['content'][0]['text']
            return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"reply": get_rule_based_response(user_message)})


def get_rule_based_response(msg: str) -> str:
    msg_l = msg.lower()
    if any(w in msg_l for w in ['register', 'sign up', 'how to join']):
        return ("To register: Go to Voter Registration, enter your Name, Email, Phone (starts with 6-9), "
                "Aadhar (12 digits), PAN (format: ABCDE1234F), Date of Birth (18+ required), and Address. "
                "You'll receive a unique Voter ID and RSA-4096 key pair. Save your private key securely!")
    if any(w in msg_l for w in ['vote', 'cast', 'ballot']):
        return ("To vote: Login with your Voter ID + Aadhar → Select a candidate → "
                "Your vote is hashed with SHA-3-256 → Digitally signed with your private RSA key → "
                "Encrypted with the admin's public key → Recorded on the blockchain. One vote per voter!")
    if any(w in msg_l for w in ['encrypt', 'rsa', 'crypto', 'secure', 'safe']):
        return ("Security: Your vote is protected by RSA-4096 encryption + AES-256-GCM hybrid encryption. "
                "A SHA-3-256 hash ensures integrity. Your digital signature (RSA-PSS) proves authenticity. "
                "The blockchain (Proof-of-Work) makes tampering mathematically impossible.")
    if any(w in msg_l for w in ['blockchain', 'verify', 'check', 'receipt']):
        return ("After voting you get a vote hash. Use it in the Audit Dashboard → Search by vote hash "
                "to verify your vote exists on the blockchain. The Merkle root proves your vote is "
                "included in the block without revealing who you voted for.")
    if any(w in msg_l for w in ['result', 'winner', 'count']):
        return ("Results are tabulated by the Admin after decrypting votes with their private key. "
                "All votes are verified for valid signatures before counting. "
                "Only the Admin can decrypt; voters remain anonymous.")
    if any(w in msg_l for w in ['private key', 'key']):
        return ("Your private key is generated during registration. It's shown once — save it! "
                "It's used to sign your vote (proving it's really you). Never share it with anyone. "
                "Without it you cannot cast a vote.")
    return ("Hi! I'm VoteBot 🗳️ I can help you with: registration, voting steps, understanding encryption, "
            "blockchain verification, or security features. What would you like to know?")
