#pragma once
#include <deque>
#include <mutex>
#include <string>
#include <vector>
#include <chrono>
#include <functional>

struct SensorReading {
    std::string type;
    double value;
    std::chrono::system_clock::time_point ts;
};

class Monitor {
public:
    Monitor(size_t windowSize = 10);
    void pushReading(const SensorReading& r);
    void process();
    void setAlertCallback(std::function<void(const std::string&)> cb);
private:
    double movingAverage(const std::string& type);
    std::mutex mu_;
    std::vector<SensorReading> buffer_;
    size_t windowSize_;
    std::function<void(const std::string&)> alertCb_;
};