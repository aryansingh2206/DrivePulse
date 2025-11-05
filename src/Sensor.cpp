#include "Sensor.h"
#include <thread>

void Sensor::start() {
    if (running_) return;
    running_ = true;
    std::thread([this]{ runLoop(); }).detach();
}

void Sensor::stop() {
    running_ = false;
}