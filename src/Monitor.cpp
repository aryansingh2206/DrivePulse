#include "Monitor.h"
#include <algorithm>
#include <numeric>
#include <iostream>

Monitor::Monitor(size_t windowSize): windowSize_(windowSize) {}

void Monitor::pushReading(const SensorReading& r) {
    std::lock_guard<std::mutex> lk(mu_);
    buffer_.push_back(r);
    if (buffer_.size() > 1000) buffer_.erase(buffer_.begin(), buffer_.begin() + (buffer_.size() - 1000));
}

double Monitor::movingAverage(const std::string& type) {
    std::lock_guard<std::mutex> lk(mu_);
    std::vector<double> vals;
    for (auto it = buffer_.rbegin(); it != buffer_.rend(); ++it) {
        if (it->type == type) {
            vals.push_back(it->value);
            if (vals.size() >= windowSize_) break;
        }
    }
    if (vals.empty()) return 0.0;
    double sum = std::accumulate(vals.begin(), vals.end(), 0.0);
    return sum / vals.size();
}

void Monitor::setAlertCallback(std::function<void(const std::string&)> cb) {
    alertCb_ = std::move(cb);
}

void Monitor::process() {
    double blinkDurAvg = movingAverage("blink_duration_ms");
    double blinkFreqAvg = movingAverage("blink_freq_hz");
    double steeringCorrAvg = movingAverage("steering_corrections_per_minute");
    double reactionDelayAvg = movingAverage("reaction_delay_ms");

    bool fatigue = false;
    if ((blinkDurAvg > 300.0 && blinkFreqAvg < 0.25) ||
        steeringCorrAvg > 25.0 ||
        reactionDelayAvg > 600.0) {
        fatigue = true;
    }

    if (fatigue && alertCb_) {
        std::string msg = "FATIGUE_DETECTED: blinkDurAvg=" + std::to_string(blinkDurAvg) +
                          ", blinkFreqAvg=" + std::to_string(blinkFreqAvg) +
                          ", steeringCorrAvg=" + std::to_string(steeringCorrAvg) +
                          ", reactionDelayAvg=" + std::to_string(reactionDelayAvg);
        alertCb_(msg);
    }

    std::cout << "[Monitor] blinkDurAvg=" << blinkDurAvg
              << " ms, blinkFreqAvg=" << blinkFreqAvg
              << " Hz, steeringCorrAvg=" << steeringCorrAvg
              << " per-min, reactionDelayAvg=" << reactionDelayAvg << " ms\n";
}