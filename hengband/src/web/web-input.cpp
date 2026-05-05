/*!
 * @file web-input.cpp
 * @brief Key ring buffer, ANSI output bridge, and EMSCRIPTEN_KEEPALIVE exports.
 *
 * web_push_key / web_push_string are callable from JavaScript as
 * Module._web_push_key(charCode) and Module._web_push_string(ptr, len).
 * Terminal output reaches xterm.js via Module._web_on_output, a callback
 * the JS frontend installs before calling Module.callMain().
 */

#include <emscripten.h>
#include <cstring>

static constexpr int KEY_BUF = 1024;
static unsigned char key_q[KEY_BUF];
static volatile int  key_r = 0;
static volatile int  key_w = 0;
static int           nodelay_flag = 0;

static bool key_empty() { return key_r == key_w; }

static void key_push(unsigned char c)
{
    int next = (key_w + 1) % KEY_BUF;
    if (next != key_r) {
        key_q[key_w] = c;
        key_w = next;
    }
}

static unsigned char key_pop()
{
    unsigned char c = key_q[key_r];
    key_r = (key_r + 1) % KEY_BUF;
    return c;
}

EM_JS(void, web_term_write_js, (const char *buf, int len), {
    var bytes = Module.HEAPU8.subarray(buf, buf + len);
    if (typeof Module._web_on_output === 'function')
        Module._web_on_output(bytes.slice());
})

extern "C" {

int web_getch_impl(void)
{
    if (!nodelay_flag) {
        while (key_empty())
            emscripten_sleep(16);
    }
    if (key_empty()) return -1;
    return key_pop();
}

void web_getch_setnd(int nd)
{
    nodelay_flag = nd;
}

void web_term_write(const char *buf, int len)
{
    web_term_write_js(buf, len);
}

EMSCRIPTEN_KEEPALIVE void web_push_key(int key)
{
    key_push(static_cast<unsigned char>(key));
}

EMSCRIPTEN_KEEPALIVE void web_push_string(const char *s, int len)
{
    for (int i = 0; i < len; i++)
        key_push(static_cast<unsigned char>(s[i]));
}

EMSCRIPTEN_KEEPALIVE void web_resize_term(int cols, int rows)
{
    (void)cols;
    (void)rows;
}

} // extern "C"
