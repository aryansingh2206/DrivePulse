#include "Logger.h"
#include <iostream>

Logger::Logger(const std::string& path) {
    ofs_.open(path, std::ios::out | std::ios::app);
    if (!ofs_) {
        std::cerr << "Failed to open log file: " << path << "\n";
    } else {
        ofs_ << "timestamp,type,value,info\n";
    }
}

Logger::~Logger() {
    if (ofs_.is_open()) ofs_.close();
}

void Logger::logLine(const std::string& line) {
    std::lock_guard<std::mutex> lk(mu_);
    if (ofs_) ofs_ << line << '\n';
}