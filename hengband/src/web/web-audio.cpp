#include <emscripten.h>

EM_JS(void, web_play_sound_js, (const char *name), {
    var s = UTF8ToString(name);
    if (typeof Module._web_on_sound === 'function')
        Module._web_on_sound(s);
})
