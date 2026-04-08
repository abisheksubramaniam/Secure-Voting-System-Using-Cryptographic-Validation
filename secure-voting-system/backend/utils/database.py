"""
Database utility using SQLite for zero-dependency setup.
All data stored in JSON-compatible format inside SQLite.
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'voting_system.db')
_db_initialized = False


def get_db():
    """Get a database connection with row_factory for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return _DictDB(conn)


class _DictDB:
    """Thin wrapper providing a MongoDB-like dict interface over SQLite."""

    def __init__(self, conn):
        self._conn = conn
        self._tables = {
            'voters': VotersCollection(conn),
            'candidates': CandidatesCollection(conn),
            'votes': VotesCollection(conn),
            'blockchain': BlockchainCollection(conn),
            'audit_logs': AuditLogsCollection(conn),
        }

    def __getitem__(self, table):
        return self._tables[table]

    def close(self):
        self._conn.close()


class BaseCollection:
    def __init__(self, conn, table):
        self._conn = conn
        self._table = table

    def _serialize(self, doc):
        return json.dumps(doc, default=str)

    def _deserialize(self, row):
        if row is None:
            return None
        d = dict(row)
        data = json.loads(d.get('data', '{}'))
        data['_id'] = d.get('id')
        return data

    def find(self, query=None, projection=None):
        cur = self._conn.execute(f"SELECT * FROM {self._table}")
        rows = [self._deserialize(r) for r in cur.fetchall()]
        if query:
            rows = [r for r in rows if self._matches(r, query)]
        if projection:
            exclude = [k for k, v in projection.items() if v == 0]
            rows = [{k: v for k, v in r.items() if k not in exclude} for r in rows]
        return rows

    def find_one(self, query):
        results = self.find(query)
        return results[0] if results else None

    def insert_one(self, doc):
        import uuid
        doc_id = str(uuid.uuid4())
        doc['created_at'] = datetime.utcnow().isoformat()
        cur = self._conn.execute(
            f"INSERT INTO {self._table} (id, data) VALUES (?, ?)",
            (doc_id, self._serialize(doc))
        )
        self._conn.commit()
        doc['_id'] = doc_id
        return type('InsertResult', (), {'inserted_id': doc_id})()

    def update_one(self, query, update):
        doc = self.find_one(query)
        if not doc:
            return
        doc_id = doc.pop('_id', None)
        if '$set' in update:
            doc.update(update['$set'])
        doc['updated_at'] = datetime.utcnow().isoformat()
        self._conn.execute(
            f"UPDATE {self._table} SET data=? WHERE id=?",
            (self._serialize(doc), doc_id)
        )
        self._conn.commit()

    def delete_one(self, query):
        doc = self.find_one(query)
        if doc:
            self._conn.execute(f"DELETE FROM {self._table} WHERE id=?", (doc['_id'],))
            self._conn.commit()

    def count_documents(self, query=None):
        return len(self.find(query or {}))

    def _matches(self, doc, query):
        for key, val in query.items():
            if isinstance(val, dict):
                dval = doc.get(key)
                for op, opval in val.items():
                    if op == '$ne' and dval == opval:
                        return False
                    if op == '$in' and dval not in opval:
                        return False
            elif doc.get(key) != val:
                return False
        return True


class VotersCollection(BaseCollection):
    def __init__(self, conn):
        super().__init__(conn, 'voters')


class CandidatesCollection(BaseCollection):
    def __init__(self, conn):
        super().__init__(conn, 'candidates')


class VotesCollection(BaseCollection):
    def __init__(self, conn):
        super().__init__(conn, 'votes')


class BlockchainCollection(BaseCollection):
    def __init__(self, conn):
        super().__init__(conn, 'blockchain')


class AuditLogsCollection(BaseCollection):
    def __init__(self, conn):
        super().__init__(conn, 'audit_logs')


def init_db():
    global _db_initialized
    if _db_initialized:
        return
    conn = sqlite3.connect(DB_PATH)
    tables = ['voters', 'candidates', 'votes', 'blockchain', 'audit_logs']
    for t in tables:
        conn.execute(f"""
            CREATE TABLE IF NOT EXISTS {t} (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            )
        """)
    conn.commit()
    conn.close()
    _db_initialized = True
    print("✅ Database initialized successfully")
