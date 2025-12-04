# PspWrapped

PspWrapped is a privacy-preserving music analytics experience inspired by “Spotify Wrapped.” It allows users to locally encrypt their listening history, process it using Fully Homomorphic Encryption (FHE), and generate an anonymous, personalized year-end summary — without ever revealing their musical preferences to anyone else.

---

## Overview

Music streaming platforms often create annual listening summaries showcasing a user’s top songs, artists, and genres. While entertaining, these summaries depend on centralized data analysis that exposes highly personal listening habits to service providers.  
PspWrapped changes that by offering a **local, encrypted, and privacy-first approach**.

By applying **Fully Homomorphic Encryption**, all computation — including ranking songs, counting genre frequencies, and analyzing listening durations — happens directly on encrypted data. This ensures that users can enjoy detailed insights about their music year while keeping their personal tastes private and secure.

---

## Motivation

The modern music industry thrives on data, but users often trade privacy for personalized experiences. Traditional analytics systems have critical issues:

- Centralized servers process raw user data.
- Sensitive metadata (e.g., listening times, locations) can be tracked or profiled.
- Data sharing between analytics systems risks exposure of individual identities.

PspWrapped was designed to prove that **data insights don’t have to come at the cost of privacy**. With FHE, we can analyze user behavior while it remains encrypted, producing meaningful summaries that even the system itself cannot read.

---

## Core Features

### 1. Local Data Encryption

- **Client-Side Encryption:** Listening data is encrypted locally before any processing.  
- **Zero Data Exposure:** The platform never receives raw or readable listening records.  
- **Offline Privacy Mode:** Users can operate PspWrapped entirely offline if preferred.  

### 2. Encrypted Analytics

- **FHE-Powered Statistics:** Computes top songs, genres, and artists directly on encrypted data.  
- **Anonymous Aggregation:** Global music trends can be aggregated without identifying individuals.  
- **Privacy-Consistent Results:** Outputs reflect genuine statistics without decrypting intermediate steps.  

### 3. Personalized Wrapped Summary

- **Encrypted Summary Generation:** All personalized charts, rankings, and insights are derived in FHE space.  
- **Visualized Locally:** Graphs and cards are generated client-side from decrypted results only visible to the user.  
- **Artistic Themes:** Generate colorful, artistic cards summarizing listening habits — privately.  

### 4. Shareable Without Exposure

- **Anonymous Sharing Mode:** Users can share visual summaries without revealing raw data.  
- **Opt-In Community Stats:** Participate in collective listening trends with privacy guarantees.  
- **One-Way Insights:** Others can view your Wrapped without accessing any listening logs.  

---

## Architecture

PspWrapped consists of modular layers that separate data privacy, computation, and visualization.

### Client Layer

- **Data Import:** Retrieves user’s listening history from local Spotify export or connected account.  
- **Encryption Engine:** Uses FHE libraries to encrypt features such as song frequency, duration, and genre tags.  
- **Secure Cache:** Stores encrypted datasets locally for reuse and incremental updates.  

### Computation Layer

- **FHE Analysis Core:** Performs counting, sorting, and statistical aggregation on ciphertexts.  
- **Noise Management:** Optimizes encrypted operations to maintain precision and minimize overhead.  
- **Result Encoding:** Encapsulates computed metrics into encrypted result packages.  

### Visualization Layer

- **Decryption Interface:** User decrypts only final results using a personal key.  
- **Chart Rendering:** Displays animated visualizations (e.g., top songs, listening streaks).  
- **Custom Themes:** Create unique visual aesthetics without data exposure.  

---

## Why FHE is Central to PspWrapped

Fully Homomorphic Encryption allows mathematical operations to be executed on encrypted data — producing encrypted outputs that can be decrypted later without ever revealing the raw inputs.  

In the context of music analytics, this means:

- Song play counts, durations, and artist frequencies are never exposed.  
- Summaries and trends can be calculated even while data stays private.  
- The system cannot infer anything about musical preferences.  

Without FHE, privacy-preserving analytics like this would require trust in the platform’s server. With FHE, trust is replaced by cryptographic guarantees — **users remain the sole owners of their musical identity**.

---

## Usage Flow

1. **Data Retrieval:** The user exports or links their Spotify listening data locally.  
2. **Encryption:** The data is encrypted on the device using FHE.  
3. **Computation:** Encrypted data is analyzed — frequencies, rankings, and totals are computed under encryption.  
4. **Decryption:** The final encrypted summaries are decrypted locally by the user.  
5. **Visualization:** The app renders personalized graphics summarizing the listening year.  

All intermediate computations (counts, averages, rankings) remain encrypted throughout the process.

---

## Security Model

- **End-to-End Encryption:** From import to visualization, no plaintext data leaves the device.  
- **Non-Reversible Aggregation:** Global summaries cannot be reverse-engineered to reveal individual histories.  
- **Key Ownership:** Users retain exclusive control of encryption keys.  
- **Tamper Protection:** Encrypted datasets include integrity proofs ensuring authenticity.  

---

## Design Philosophy

PspWrapped focuses on three key principles:

1. **Privacy by Default:** Encryption is automatic and mandatory.  
2. **Transparency by Design:** The system explicitly shows where and how encrypted computation occurs.  
3. **Delightful Experience:** Data security doesn’t have to be dull — privacy can be beautiful.  

---

## Technology Stack

- **Fully Homomorphic Encryption Engine:** Core computational backend for encrypted analysis.  
- **Secure Client Runtime:** Sandboxed local environment for cryptographic operations.  
- **Visualization Framework:** Dynamic chart and canvas system for personalized graphics.  
- **Metadata Serializer:** Converts listening data into encryption-friendly numeric formats.  
- **Noise Budget Tracker:** Ensures accurate computations under encryption constraints.  

---

## Example Insights

Each user’s PspWrapped summary includes encrypted computations of:

- Most played songs and artists  
- Genre distribution  
- Total listening time  
- Average session length  
- Peak listening periods  
- Favorite decade or mood  
- Unique yearly statistics (e.g., “most looped song”)  

These are computed and visualized **without ever exposing the original listening logs**.

---

## Roadmap

- **Phase 1:** Core FHE analytics pipeline and encrypted top-song ranking.  
- **Phase 2:** Expanded support for collaborative encrypted leaderboards.  
- **Phase 3:** Multi-device synchronization of encrypted histories.  
- **Phase 4:** Encrypted mood and sentiment analytics.  
- **Phase 5:** Fully decentralized FHE sharing network for anonymous Wrapped cards.  

---

## Ethical and Privacy Considerations

PspWrapped embodies the philosophy that personalization and privacy can coexist.  
It enforces **complete data locality**, **no third-party processing**, and **zero knowledge exposure**.  
Users can confidently explore their musical identity knowing that even the platform cannot peek into it.

---

## Limitations

- The accuracy of ranking under encryption depends on parameter tuning and ciphertext precision.  
- Visualization requires limited local decryption of final summaries.  
- Heavy computation may cause delays on low-end devices.  

Ongoing optimization work aims to make encrypted computation faster and more energy-efficient.

---

## Future Vision

PspWrapped envisions a world where users control their data narratives. Instead of platforms owning user insights, individuals can generate and share their encrypted summaries safely.  
With FHE, we can redefine digital creativity — where every statistic, every visual, and every insight is yours and yours alone.

---

## Conclusion

PspWrapped combines the joy of music with the rigor of modern cryptography. It proves that even the most personalized digital experiences can be **private, secure, and user-owned**.  
Through Fully Homomorphic Encryption, it transforms how we celebrate our listening history — turning encrypted data into a story only we can read.

Built with privacy, art, and mathematics — for a musical world that respects your secrets.
