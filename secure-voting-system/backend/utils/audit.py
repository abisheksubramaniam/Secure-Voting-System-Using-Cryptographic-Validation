"""Audit logging utility."""
from datetime import datetime


def log_action(db, action: str, user_id: str, user_type: str, details: dict):
    try:
        db['audit_logs'].insert_one({
            'action': action,
            'user_id': user_id,
            'user_type': user_type,
            'details': details,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'success'
        })
    except Exception:
        pass  # Non-blocking
