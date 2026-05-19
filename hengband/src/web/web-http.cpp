#include <emscripten.h>
#include <string>
#include "web-http.h"

EM_ASYNC_JS(int, http_post_js,
            (const char *url,
             const char *content_type,
             const void *data, size_t len), {
    try {
        const body = HEAPU8.buffer.slice(data, data + len);
        const res = await fetch(UTF8ToString(url), {
            method: "POST",
            headers: { "Content-Type": UTF8ToString(content_type) },
            body,
        });
        return res.status;
    } catch (e) {
        console.error(e);
        return 0;
    }
});

namespace http {

tl::optional<Response> Client::post(const std::string& url,
                                    const std::string& post_data,
                                    const std::string& media_type)
{
    const int status = http_post_js(url.c_str(), media_type.c_str(),
        post_data.data(), post_data.size());
    if (status == 0) return tl::nullopt;
    return Response{status, ""};
}

} // namespace http
