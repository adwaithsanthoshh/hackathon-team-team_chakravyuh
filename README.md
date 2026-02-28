
## 1️⃣. Project Title

**ReliefLink — Last-Mile Disaster Communication & Coordination Platform**

---

## 2️⃣. Problem Statement

During large-scale disasters, three systemic breakdowns occur simultaneously:

### 1. Telecommunication Failure  
Mobile towers go offline. Internet connectivity becomes unstable or disappears entirely. Survivors cannot communicate reliably with authorities.

### 2. Control Room Overload  
District coordinators are forced to manage rescue operations through:
- Phone calls  
- WhatsApp messages  
- Handwritten notes  
- Fragmented spreadsheets  

Information becomes unstructured. Prioritization becomes manual and error-prone.

### 3. Family Search Congestion  
Relatives outside the disaster zone flood emergency lines trying to locate loved ones.  
Control rooms become overwhelmed, reducing bandwidth for actual rescue coordination.

There is currently no unified system that:

- Works offline at relief camps  
- Structures survivor-reported intelligence  
- Automatically prioritizes rescue locations  
- Reduces control room overload  
- Provides public-facing family tracing  

ReliefLink addresses all three failures together.

---

## 3️⃣. Solution Description

ReliefLink is a three-interface disaster coordination platform deployable at pre-designated relief camps such as panchayat buildings, schools, and community shelters.

It is designed for **offline-first operation**, structured data capture, and intelligent prioritization.

---

### Interface 1: Relief Camp Kiosk

A touch-friendly registration terminal for displaced survivors.

Registration takes under 90 seconds and captures:

- Name and village  
- Family members present  
- Medical conditions or injuries  
- Immediate resource needs  
- Whether anyone remains trapped  
- Location description of trapped individuals  

All data is stored locally using SQLite. No internet is required during operation.

#### Intelligent Rescue Clustering

Free-text trapped-person descriptions are processed using NLP techniques:

- Tokenization and keyword extraction  
- Location similarity detection  
- Clustering of similar reports  
- Ranking by corroboration count  

Instead of viewing hundreds of scattered reports, coordinators see prioritized rescue clusters based on independent confirmations.

---

### Interface 2: Coordinator Operations Dashboard

A centralized operations dashboard for district-level disaster managers.

Features include:

- Live overview of all active relief camps  
- Survivor counts per camp  
- Sync status monitoring  
- AI-ranked rescue priority clusters  
- Medical emergency alerts  
- Resource imbalance detection between camps  
- Real-time registration feed  

If one camp reports surplus supplies and another reports shortage, the system flags the imbalance automatically.

The dashboard transforms fragmented input into structured operational intelligence.

---

### Interface 3: Family Tracing Portal

A public-facing search interface for families outside the disaster zone.

Users can search by:

- Name  
- Village  

The system supports:

- Fuzzy matching  
- Spelling variation tolerance  
- Multilingual transliteration support  

This reduces control room call volume and allows families to directly verify survivor registrations.

---

## 4️⃣. Technology Stack

### Frontend

- React  
- Vite  
- Tailwind CSS  
- React Router DOM  
- Leaflet / React-Leaflet  
- Fuse.js  

### Backend

- Node.js  
- Express  
- SQLite (better-sqlite3)  
- PostgreSQL  
- natural (NLP library)  
- node-cron  

---


## ⚙️ Setup Instructions


## Team Members
-Adwaith Santhosh
-Sangeeth T K
-Shravan Balakrishnan
