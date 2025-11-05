

# 🚗 **DrivePulse — Smart Driver Fatigue Detection System**

> 🧠 *A real-time, C++-powered driver monitoring simulation with a Node.js backend and live dashboard.*

---

## 📖 Overview

**DrivePulse** is a smart fatigue-detection simulation system designed to monitor key driver metrics — such as blink duration, reaction delay, and steering correction frequency — and issue fatigue alerts when thresholds are exceeded.

It’s built as a **multi-component system** demonstrating end-to-end integration between a C++ data engine and a web-based visualization dashboard.

---

## ⚙️ Architecture

```
C++ Simulator  →  CSV log (sdfs_log.csv)  →  Node.js Server (SSE)
                                              ↓
                                     React-style Frontend (HTML/CSS/JS)
```

### Components:

| Layer           | Tech                    | Description                                                                |
| --------------- | ----------------------- | -------------------------------------------------------------------------- |
| **Data Engine** | C++17                   | Simulates driver behavior data streams (blink rate, steering inputs, etc.) |
| **Backend**     | Node.js (Express + SSE) | Streams real-time data updates to the browser                              |
| **Frontend**    | HTML + CSS + JS         | Visualizes fatigue metrics in a sleek automotive-style dashboard           |
| **Hosting**     | Render                  | Runs both C++ simulator and Node server concurrently                       |

---

## ✨ Features

* 🧩 **C++ Multithreaded Simulation** — generates realistic driving sensor data
* ⚡ **Real-time Dashboard** — live updating table via Server-Sent Events (SSE)
* 💬 **Automatic Fatigue Alerts** — raised when thresholds are exceeded
* 💾 **File-based Communication** — simulator writes to `sdfs_log.csv`, backend streams changes
* 🧠 **Rolling Average Stats** — dashboard shows 30-sample averages for blink, reaction, and steering
* 🌙 **Dark Modern UI** — inspired by luxury automotive dashboards

---

## 🖼️ UI Preview

<img width="1919" height="988" alt="image" src="https://github.com/user-attachments/assets/6cc4cb74-4706-4c06-ac84-45ee869c13a9" />

---

## 🚀 Live Demo

**Frontend + Backend (Render):**
👉 [https://drivepulse.onrender.com](https://drivepulse.onrender.com) *(replace with your actual Render link)*

---

## 🛠️ Local Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/aryansingh2206/DrivePulse.git
cd DrivePulse
```

### 2️⃣ Build the C++ Simulator

Make sure you have `cmake` and `g++` installed.

```bash
mkdir build
cd build
cmake ..
cmake --build .
```

Run it once to verify it writes to `sdfs_log.csv`:

```bash
./SmartDriverFatigueSimulation
```

### 3️⃣ Start the Node Backend

```bash
cd ../frontend
npm install
node server.js
```

Then open:
👉 [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Render Deployment Setup

In Render dashboard:

* **Build Command:**

  ```bash
  rm -rf build && mkdir build && cd build && cmake .. && cmake --build .
  ```
* **Start Command:**

  ```bash
  sleep 2 && ./build/SmartDriverFatigueSimulation & cd frontend && node server.js
  ```

This runs both simulator and server together ✅

---

## 🧮 Key Metrics Monitored

| Metric               | Description              | Fatigue Threshold |
| -------------------- | ------------------------ | ----------------- |
| Blink Duration (ms)  | Average eye blink length | > 300 ms          |
| Blink Frequency (Hz) | Blinks per second        | < 0.25 Hz         |
| Steering Corrections | Adjustments per minute   | > 25              |
| Reaction Delay (ms)  | Driver response time     | > 600 ms          |

---

## 🧱 Tech Stack

**Languages:** C++, JavaScript, HTML, CSS
**Libraries:** STL, Express.js
**Tools:** CMake, Node.js, Render, Git
**Concepts:** Multithreading, File I/O, Server-Sent Events, Real-time Data Streaming

---

## 📚 Project Structure

```
DrivePulse/
│
├── build/                     # Generated C++ build artifacts
├── frontend/
│   ├── public/
│   │   ├── index.html         # Dashboard UI
│   │   ├── style.css          # Modern dark theme
│   │   └── script.js          # Handles live data updates
│   └── server.js              # SSE backend
│
├── src/
│   ├── main.cpp               # Entry point for simulator
│   ├── Sensor.h / .cpp        # Sensor logic
│   ├── Logger.h / .cpp        # Writes CSV logs
│   └── Monitor.h / .cpp       # Fatigue detection logic
│
└── CMakeLists.txt             # C++ build config
```

---

## 🧩 Future Enhancements

* 📹 Integrate camera-based blink detection using OpenCV
* ☁️ Store logs in a cloud database (AWS DynamoDB / Firebase)
* 📈 Add chart visualizations (Chart.js or Recharts)
* 🔐 JWT-based dashboard authentication for multi-driver support

---

## 🧑‍💻 Author

**Aryan Singh**
B.Tech Student • Backend & DevOps Enthusiast
📫 [GitHub](https://github.com/aryansingh2206) | [LinkedIn](https://linkedin.com/in/aryansingh2206)

---

## 🏁 License

MIT License — feel free to fork, modify, and use with credit.

---

### ⭐ If you like this project, give it a star on GitHub!

> “DrivePulse — where safety meets simulation.”

