#include <emscripten.h>

EM_JS(void, web_play_sound_js, (const char *name), {
    var s = UTF8ToString(name);
    if (typeof Module._web_on_sound === 'function')
        Module._web_on_sound(s);
})

EM_JS(void, web_play_music_js, (int type, int val), {
    if (typeof Module._web_on_music === 'function')
        Module._web_on_music(type, val);
})

EM_JS(void, web_play_music_scene_js, (const int *types, const int *vals, int n), {
    if (typeof Module._web_on_music_scene === 'function') {
        var pairs = [];
        for (var i = 0; i < n; i++)
            pairs.push([HEAP32[(types >> 2) + i], HEAP32[(vals >> 2) + i]]);
        Module._web_on_music_scene(pairs);
    }
})
