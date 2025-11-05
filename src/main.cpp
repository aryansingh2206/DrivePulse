#include "Driver.h"
#include "Sensor.h"
#include "Monitor.h"
#include "Logger.h"

#include <thread>
#include <random>
#include <chrono>
#include <sstream>
#include <iomanip>
#include <iostream>

class BlinkSensor : public Sensor {
public:
    BlinkSensor(Callback cb): Sensor("blink_sensor", cb) {}
protected:
    void runLoop() override {
        std::random_device rd; std::mt19937 gen(rd());
        std::normal_distribution<> durDist(200.0, 80.0);
        std::normal_distribution<> freqDist(0.4, 0.2);
        while (running_) {
            double dur = std::max(50.0, durDist(gen));
            double freq = std::max(0.05, freqDist(gen));
            cb_("blink_duration_ms", dur);
            cb_("blink_freq_hz", freq);
            std::this_thread::sleep_for(std::chrono::milliseconds(500));
        }
    }
};

class SteeringSensor : public Sensor {
public:
    SteeringSensor(Callback cb): Sensor("steering_sensor", cb) {}
protected:
    void runLoop() override {
        std::random_device rd; std::mt19937 gen(rd());
        std::poisson_distribution<> corrDist(5);
        while (running_) {
            double corr = static_cast<double>(corrDist(gen)) * 2.0;
            cb_("steering_corrections_per_minute", corr);
            std::this_thread::sleep_for(std::chrono::seconds(30));
        }
    }
};

class ReactionSensor : public Sensor {
public:
    ReactionSensor(Callback cb): Sensor("reaction_sensor", cb) {}
protected:
    void runLoop() override {
        std::random_device rd; std::mt19937 gen(rd());
        std::normal_distribution<> delayDist(350.0, 120.0);
        while (running_) {
            double d = std::max(100.0, delayDist(gen));
            cb_("reaction_delay_ms", d);
            std::this_thread::sleep_for(std::chrono::seconds(5));
        }
    }
};

static std::string nowTs() {
    using namespace std::chrono;
    auto t = system_clock::now();
    auto in_time_t = system_clock::to_time_t(t);
    std::ostringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %H:%M:%S");
    return ss.str();
}

int main() {
    Driver driver("TestDriver");
    Monitor monitor(8);
    Logger logger("sdfs_log.csv");

    auto sensorCb = [&](const std::string& type, double value){
        SensorReading r{type, value, std::chrono::system_clock::now()};
        monitor.pushReading(r);
        std::ostringstream line;
        line << nowTs() << "," << type << "," << value << "," << "driver=" << driver.name();
        logger.logLine(line.str());
    };

    monitor.setAlertCallback([&](const std::string& msg){
        std::ostringstream line;
        line << nowTs() << ",ALERT,0," << msg;
        logger.logLine(line.str());
        std::cout << "*** ALERT: " << msg << "\n";
    });

    BlinkSensor blink(sensorCb);
    SteeringSensor steer(sensorCb);
    ReactionSensor react(sensorCb);

    blink.start();
    steer.start();
    react.start();

    for (int i = 0; i < 60; ++i) {
        std::this_thread::sleep_for(std::chrono::seconds(5));
        monitor.process();
    }

    blink.stop();
    steer.stop();
    react.stop();

    std::cout << "Simulation ended. Logs: sdfs_log.csv\n";
    return 0;
}