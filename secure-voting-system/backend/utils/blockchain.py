"""
Blockchain Implementation
Proof-of-Work consensus, Merkle tree, immutable vote ledger.
"""

import hashlib
import json
import time
from datetime import datetime
from utils.crypto import sha3_256_hash, compute_merkle_root


class Block:
    def __init__(self, index: int, transactions: list, previous_hash: str,
                 difficulty: int = 4, miner: str = "system"):
        self.index = index
        self.timestamp = datetime.utcnow().isoformat()
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.difficulty = difficulty
        self.miner = miner
        self.nonce = 0
        self.merkle_root = compute_merkle_root(
            [t.get('vote_hash', str(t)) for t in transactions] if transactions
            else ["EMPTY"]
        )
        self.hash = self.mine()

    def compute_hash(self) -> str:
        block_str = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "merkle_root": self.merkle_root,
            "nonce": self.nonce
        }, sort_keys=True, default=str)
        return hashlib.sha3_256(block_str.encode()).hexdigest()

    def mine(self) -> str:
        target = "0" * self.difficulty
        while True:
            h = self.compute_hash()
            if h.startswith(target):
                return h
            self.nonce += 1

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "merkle_root": self.merkle_root,
            "nonce": self.nonce,
            "hash": self.hash,
            "difficulty": self.difficulty,
            "miner": self.miner,
            "tx_count": len(self.transactions)
        }


class Blockchain:
    DIFFICULTY = 3   # Lower for demo speed; raise to 4-5 for production

    def __init__(self):
        self.chain: list[Block] = []
        self.pending_transactions: list[dict] = []
        self._create_genesis_block()

    def _create_genesis_block(self):
        genesis = Block(
            index=0,
            transactions=[{
                "type": "genesis",
                "message": "Secure Digital Voting System - Genesis Block",
                "timestamp": datetime.utcnow().isoformat(),
                "vote_hash": sha3_256_hash("GENESIS")
            }],
            previous_hash="0" * 64,
            difficulty=self.DIFFICULTY,
            miner="system"
        )
        self.chain.append(genesis)

    @property
    def last_block(self) -> Block:
        return self.chain[-1]

    def add_vote_transaction(self, vote_hash: str, voter_id_hash: str,
                              candidate_id: str, signature: str) -> dict:
        """Add a vote as a pending transaction."""
        tx = {
            "type": "vote",
            "vote_hash": vote_hash,
            "voter_id_hash": voter_id_hash,
            "candidate_id": candidate_id,
            "signature_preview": signature[:32] + "...",
            "timestamp": datetime.utcnow().isoformat()
        }
        self.pending_transactions.append(tx)
        # Auto-mine if we have transactions
        block = self.mine_pending_transactions()
        return {
            "block_index": block.index,
            "block_hash": block.hash,
            "merkle_root": block.merkle_root,
            "transaction": tx
        }

    def mine_pending_transactions(self, miner: str = "system") -> Block:
        """Mine a new block with pending transactions."""
        if not self.pending_transactions:
            self.pending_transactions.append({
                "type": "empty_block",
                "vote_hash": sha3_256_hash("EMPTY_" + str(time.time()))
            })
        block = Block(
            index=len(self.chain),
            transactions=self.pending_transactions.copy(),
            previous_hash=self.last_block.hash,
            difficulty=self.DIFFICULTY,
            miner=miner
        )
        self.chain.append(block)
        self.pending_transactions = []
        return block

    def is_chain_valid(self) -> bool:
        """Validate entire blockchain integrity."""
        for i in range(1, len(self.chain)):
            curr = self.chain[i]
            prev = self.chain[i - 1]
            if curr.previous_hash != prev.hash:
                return False
            recomputed = curr.compute_hash()
            # Verify PoW (nonce already baked in)
            if not recomputed.startswith("0" * self.DIFFICULTY):
                return False
        return True

    def get_chain_data(self) -> list:
        return [b.to_dict() for b in self.chain]

    def find_vote_in_chain(self, vote_hash: str) -> dict | None:
        for block in self.chain:
            for tx in block.transactions:
                if tx.get('vote_hash') == vote_hash:
                    return {
                        "found": True,
                        "block_index": block.index,
                        "block_hash": block.hash,
                        "merkle_root": block.merkle_root,
                        "timestamp": block.timestamp
                    }
        return None

    def tamper_detect(self) -> dict:
        issues = []
        for i in range(1, len(self.chain)):
            curr = self.chain[i]
            prev = self.chain[i - 1]
            if curr.previous_hash != prev.hash:
                issues.append(f"Block {i}: previous_hash mismatch")
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "chain_length": len(self.chain)
        }
