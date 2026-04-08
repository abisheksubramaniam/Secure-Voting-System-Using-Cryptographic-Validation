================================================================
  SECURE DIGITAL VOTING SYSTEM
  Using Cryptographic Validation
  By Veri Coders
================================================================

A production-ready Secure Digital Voting System with:
  - RSA-4096 Encryption & Digital Signatures (RSA-PSS)
  - SHA-3-256 Hashing for vote integrity
  - AES-256-GCM hybrid encryption
  - Proof-of-Work Blockchain with Merkle Trees
  - 5 Cryptographic Modules
  - Agentic AI VoteBot Assistant
  - Zero double-vote enforcement

================================================================
  SYSTEM REQUIREMENTS
================================================================

  - Python 3.10 or higher
  - pip (Python package manager)
  - A modern web browser (Chrome, Firefox, Edge)
  - Internet connection (for Google Fonts only)

  Optional:
  - Anthropic API key (for full AI VoteBot; works without it too)

================================================================
  PROJECT STRUCTURE
================================================================

  secure-voting-system/
  ├── backend/
  │   ├── app.py                  ← Flask main application
  │   ├── requirements.txt        ← Python dependencies
  │   ├── voting_system.db        ← SQLite DB (auto-created)
  │   ├── modules/
  │   │   ├── voter_module.py     ← Module 1: Voter Registration
  │   │   ├── candidate_module.py ← Module 2: Candidate Management
  │   │   ├── vote_module.py      ← Module 3: Vote Casting
  │   │   ├── audit_module.py     ← Module 4: Audit Dashboard
  │   │   ├── admin_module.py     ← Module 5: Admin Verification
  │   │   └── ai_module.py        ← AI VoteBot
  │   └── utils/
  │       ├── crypto.py           ← RSA-4096, SHA-3, AES-GCM
  │       ├── blockchain.py       ← PoW Blockchain + Merkle Tree
  │       ├── database.py         ← SQLite adapter
  │       └── audit.py            ← Audit logging
  └── frontend/
      ├── index.html              ← Entry point
      └── app.js                  ← Complete SPA (vanilla JS)

================================================================
  QUICK START (STEP BY STEP)
================================================================

STEP 1 — Navigate to project folder
--------------------------------------
  Windows:
    cd secure-voting-system\backend

  Mac / Linux:
    cd secure-voting-system/backend


STEP 2 — Create a Python virtual environment
----------------------------------------------
  Windows:
    python -m venv venv
    venv\Scripts\activate

  Mac / Linux:
    python3 -m venv venv
    source venv/bin/activate

  You should see (venv) at the start of your terminal prompt.


STEP 3 — Install Python dependencies
--------------------------------------
  pip install -r requirements.txt

  This installs:
    - flask==3.0.3          (Web framework)
    - flask-cors==4.0.1     (Cross-origin requests)
    - cryptography==42.0.8  (RSA-4096, AES-GCM, SHA-3)

  Estimated time: 1-3 minutes


STEP 4 — (Optional) Set Anthropic API key for full AI VoteBot
----------------------------------------------------------------
  Windows:
    set ANTHROPIC_API_KEY=your-api-key-here

  Mac / Linux:
    export ANTHROPIC_API_KEY=your-api-key-here

  Without this, VoteBot uses built-in rule-based responses (still works!).


STEP 5 — Start the backend server
------------------------------------
  python app.py

  Expected output:
    * Secure Digital Voting System Starting...
    * Blockchain initialized with 1 blocks
    * Running on http://0.0.0.0:5000


STEP 6 — Open the frontend
-----------------------------
  Open a NEW terminal window (keep backend running).

  Navigate to the frontend folder:
    cd ../frontend       (Mac/Linux)
    cd ..\frontend       (Windows)

  Open index.html in your browser:

  Option A - Simply double-click index.html in your file manager

  Option B - From terminal:
    Windows:   start index.html
    Mac:       open index.html
    Linux:     xdg-open index.html

  Option C - Use Python's built-in server (recommended):
    python3 -m http.server 3000
    Then open: http://localhost:3000


================================================================
  USING THE SYSTEM (DEMO WALKTHROUGH)
================================================================

--- STEP A: Admin adds candidates ---
1. Click "Admin" in the navbar
2. Enter password: admin@SecureVote2024
3. Click "Add Candidate"
4. Fill in: Name, Party, Constituency, Symbol (emoji), Manifesto
5. Click "Add Candidate" button
6. Add 2-3 candidates for a good demo


--- STEP B: Register as a voter ---
1. Click "Register" in the navbar
2. Fill in all fields:
   - Name: Any name
   - Email: any@email.com
   - Phone: 9876543210 (must start with 6-9)
   - Aadhar: 123456789012 (any 12 digits)
   - PAN: ABCDE1234F (exact format)
   - DOB: any date making you 18+
   - State: select any state
   - Address: any address
3. Click "Generate Keys & Register"
4. IMPORTANT: Copy and save your:
   - Voter ID (e.g. TN2024ABCD1234)
   - Private Key (the long RSA key)


--- STEP C: Login and vote ---
1. Click "Login" in the navbar
2. Enter your Voter ID and Aadhar number
3. Click "Login Securely"
4. You'll be redirected to the Vote page
5. Select a candidate
6. Paste your private key in the textarea
7. Click "Cast Vote Securely"
8. You'll receive a cryptographic receipt with:
   - SHA-3-256 vote hash
   - Digital signature preview
   - Blockchain block number
   - Merkle root


--- STEP D: Verify your vote ---
1. Click "Audit" in the navbar
2. Click "Verify Vote" tab
3. Paste your vote hash from the receipt
4. Click "Verify on Blockchain"
5. System confirms your vote is on the blockchain


--- STEP E: Admin decrypts results ---
1. Click "Admin" in navbar (already logged in)
2. Click "Decrypt Results" tab
3. Click "Decrypt Results" button
4. See winner announcement with vote counts
5. Check "Verify Signatures" tab for batch verification
6. Check "Fraud Detection" tab for integrity report


================================================================
  MODULE OVERVIEW
================================================================

MODULE 1 — VOTER REGISTRATION
  Endpoint: POST /api/voter/register
  - Validates: Aadhar (12 digits), PAN (ABCDE1234F), age 18+
  - Hashes sensitive IDs with SHA-3-256 + salt
  - Generates RSA-4096 key pair per voter
  - Creates unique Voter ID: STATE+YEAR+RANDOM
  - Prevents duplicates via hash comparison


MODULE 2 — CANDIDATE MANAGEMENT
  Endpoint: POST /api/candidate/add
  - Admin adds candidates with name, party, symbol
  - Party color mapping for UI
  - CRUD operations with soft-delete


MODULE 3 — VOTE CASTING (Core Cryptographic Module)
  Endpoint: POST /api/vote/cast
  Process:
    1. Voter authenticated (Voter ID + Aadhar hash)
    2. Eligibility checked (not already voted)
    3. Vote payload built as JSON
    4. SHA-3-256 hash computed from vote JSON
    5. Digital signature created: RSA-PSS(SHA-256, private_key)
    6. Signature verified against stored public key
    7. Vote encrypted: AES-256-GCM(vote) + RSA-OAEP(AES_key)
    8. Vote hash added to Proof-of-Work blockchain
    9. Voter marked as voted (irreversible)
   10. Cryptographic receipt returned


MODULE 4 — AUDIT DASHBOARD
  Endpoints: GET /api/audit/votes, /api/audit/blockchain
  - View all encrypted votes (anonymized)
  - SHA-3-256 hashes visible for transparency
  - Digital signature previews
  - Full blockchain explorer
  - Audit log timeline
  - Vote verification by hash


MODULE 5 — ADMIN VERIFICATION & RESULTS
  Endpoints: POST /api/admin/verify-signatures
             POST /api/admin/decrypt-results
  - Batch signature verification for all votes
  - RSA-OAEP decryption using admin private key
  - Result tabulation with percentage
  - Winner declaration
  - Fraud detection (duplicate hashes, chain validity)
  - Blockchain integrity check


================================================================
  CRYPTOGRAPHIC SPECIFICATIONS
================================================================

  Key Generation:    RSA-4096 (public exponent 65537)
  Vote Hashing:      SHA-3-256 (hashlib.sha3_256)
  Sensitive ID Hash: SHA-3-256 with domain salt
  Digital Signature: RSA-PSS with SHA-256, MAX_LENGTH salt
  Vote Encryption:   Hybrid: AES-256-GCM + RSA-OAEP(SHA-256)
  Blockchain Hash:   SHA-3-256 (hashlib.sha3_256)
  PoW Difficulty:    3 leading zeros (configurable)
  Merkle Tree:       SHA-3-256 pairwise hashing
  DB Storage:        SQLite with JSON columns


================================================================
  API ENDPOINTS REFERENCE
================================================================

  VOTER
    POST  /api/voter/register     Register new voter
    POST  /api/voter/login        Voter authentication
    GET   /api/voter/profile/:id  Get voter profile
    GET   /api/voter/list         List all voters (anonymized)

  CANDIDATE
    POST  /api/candidate/add           Add candidate (admin)
    GET   /api/candidate/list          Public candidate list
    GET   /api/candidate/list/all      Admin list with votes
    PUT   /api/candidate/update/:id    Update candidate
    DELETE /api/candidate/delete/:id  Remove candidate

  VOTE
    POST  /api/vote/cast           Cast encrypted vote
    GET   /api/vote/verify/:hash   Verify vote on blockchain
    GET   /api/vote/list           List all votes (audit)
    GET   /api/vote/admin-public-key  Get admin encryption key

  AUDIT
    GET   /api/audit/votes         All encrypted votes
    GET   /api/audit/blockchain    Full blockchain
    GET   /api/audit/logs          Audit event logs
    GET   /api/audit/search-vote/:hash  Search by hash

  ADMIN
    POST  /api/admin/verify-signatures    Batch verify sigs
    POST  /api/admin/decrypt-results      Decrypt & tabulate
    POST  /api/admin/fraud-detection      Run fraud scan
    GET   /api/admin/blockchain-integrity Chain check
    GET   /api/admin/stats                System statistics

  AI
    POST  /api/ai/chat             VoteBot conversation

  SYSTEM
    GET   /api/health              Health check
    GET   /api/system/stats        Dashboard statistics


================================================================
  ADMIN CREDENTIALS
================================================================

  Admin Password: admin@SecureVote2024

  (Change this in backend/modules/admin_module.py line 19
   ADMIN_PASSWORD variable for production use)


================================================================
  TROUBLESHOOTING
================================================================

Problem: "ModuleNotFoundError: No module named 'flask'"
Fix:     Make sure virtual environment is activated and
         you ran: pip install -r requirements.txt

Problem: "Address already in use" (port 5000)
Fix:     Kill the existing process or change port:
         python app.py --port 5001

Problem: "CORS error" in browser console
Fix:     Make sure backend is running on http://localhost:5000
         flask-cors is installed (check requirements.txt)

Problem: "Invalid signature" when voting
Fix:     Paste the COMPLETE private key including:
         -----BEGIN PRIVATE KEY-----
         ... (all the base64 content) ...
         -----END PRIVATE KEY-----

Problem: Vote decryption fails in admin
Fix:     The admin keys are generated fresh each server restart.
         Vote and decrypt in the same server session.
         In production: use persistent HSM key storage.

Problem: Frontend shows blank / errors
Fix:     Check browser console (F12)
         Ensure backend is running and accessible
         Try: python3 -m http.server 3000 (in frontend folder)


================================================================
  SECURITY NOTES FOR PRESENTATION
================================================================

  1. PRIVATE KEY: In this demo, the private key is shown to the
     voter once. In production, it would be stored in a Hardware
     Security Module (HSM) or encrypted with a PIN.

  2. ADMIN KEY: The admin RSA key pair is generated fresh each
     session. In production, it would be persistent and stored
     in a secure key vault.

  3. AADHAR/PAN: These are SHA-3-256 hashed with a domain salt
     before storage. The original numbers are NEVER stored.

  4. VOTER ANONYMITY: The blockchain stores SHA-3-256(voter_id +
     anonymity_salt). The candidate choice is encrypted. No one
     can link a blockchain entry to a specific voter.

  5. DOUBLE VOTE: Once has_voted=True is set, the system rejects
     all future vote attempts for that voter_id. The flag is
     checked before any signature verification.

  6. BLOCKCHAIN INTEGRITY: Each block contains the previous
     block's hash. Tampering any block invalidates all
     subsequent blocks, detectable via is_chain_valid().


================================================================
  PRESENTATION CHECKLIST
================================================================

  [ ] Backend server running (python app.py)
  [ ] Frontend open in browser
  [ ] At least 2 candidates added via Admin panel
  [ ] Demo voter registered (save the private key!)
  [ ] Test vote cast successfully
  [ ] Audit dashboard shows encrypted data
  [ ] Admin decryption shows results
  [ ] Blockchain explorer shows blocks
  [ ] VoteBot AI responding to questions


================================================================
  TECHNOLOGY STACK
================================================================

  Backend:
    - Python 3.10+
    - Flask 3.0 (REST API)
    - Flask-CORS (Cross-origin support)
    - cryptography 42.x (RSA-4096, AES-GCM)
    - SQLite (zero-dependency database)
    - hashlib (SHA-3-256 built-in)

  Frontend:
    - Vanilla JavaScript (ES2022+)
    - HTML5 / CSS3
    - Google Fonts (Space Grotesk, JetBrains Mono)
    - No frameworks — pure JS SPA

  AI:
    - Anthropic Claude API (claude-sonnet-4-20250514)
    - Rule-based fallback (no API key needed)

================================================================
  PROJECT BY: VERI CODERS
  TITLE: Secure Digital Voting System Using Cryptographic Validation
================================================================
