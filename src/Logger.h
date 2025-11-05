#pragma once
#include <fstream>
#include <mutex>
#include <string>

class Logger {
public:
    explicit Logger(const std::string& path);
    ~Logger();
    void logLine(const std::string& line);
private:
    std::ofstream ofs_;
    std::mutex mu_;
};