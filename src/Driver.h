#pragma once
#include <string>

class Driver {
public:
    explicit Driver(std::string name): name_(std::move(name)) {}
    const std::string& name() const { return name_; }
private:
    std::string name_;
};