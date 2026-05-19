#pragma once
#include <string>
#include <tl/optional.hpp>

namespace http {

struct Response {
    int status;
    std::string body;
};

class Client {
public:
    tl::optional<Response> post(const std::string& url,
                                const std::string& post_data,
                                const std::string& media_type);
    tl::optional<std::string> user_agent;  // declared for compatibility; ignored
};

} // namespace http
