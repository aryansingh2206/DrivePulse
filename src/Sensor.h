#pragma once
#include <functional>
#include <string>
#include <atomic>

class Sensor {
public:
    using Callback = std::function<void(const std::string& sensorType, double value)>;
    Sensor(std::string type, Callback cb): type_(std::move(type)), cb_(std::move(cb)), running_(false) {}
    virtual ~Sensor() = default;
    void start();
    void stop();
protected:
    virtual void runLoop() = 0;
    std::string type_;
    Callback cb_;
    std::atomic<bool> running_;
};