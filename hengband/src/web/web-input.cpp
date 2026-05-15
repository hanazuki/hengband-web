/*!
 * @file web-input.cpp
 * @brief ANSI output bridge and SAB-based input for Worker thread.
 *
 * Input arrives via SharedArrayBuffer (written by the main thread);
 * the Worker blocks in web_getch using Atomics.wait.
 * Output reaches xterm.js via Module._web_on_output, which the Worker
 * initialization code binds to self.postMessage before calling callMain().
 */

#include <emscripten.h>

static constexpr int KEY_RESIZE = 0x19a;

extern "C" void curses_resize(int cols, int rows);

EM_JS(void, web_term_write_js, (const char *buf, int len), {
    var bytes = HEAPU8.subarray(buf, buf + len);
    if (typeof Module._web_on_output === 'function')
        Module._web_on_output(bytes.slice());
})

EM_JS(int, web_getch_js, (int key_resize), {
    const i32 = Module.__sharedI32;
    const u8  = Module.__sharedU8;

    if (!Module.__nodelay) {
        while (true) {
            const wh = Atomics.load(i32, 1);
            const rh = Atomics.load(i32, 2);
            if (rh !== wh) break;
            if (Atomics.load(i32, 3) !== 0) break;
            Atomics.wait(i32, 0, 0);
            Atomics.store(i32, 0, 0);
        }
    }

    if (Atomics.load(i32, 3) !== 0) {
        const cols = Atomics.load(i32, 4);
        const rows = Atomics.load(i32, 5);
        Atomics.store(i32, 3, 0);
        _curses_resize(cols, rows);
        return key_resize;
    }

    const rh = Atomics.load(i32, 2);
    const wh = Atomics.load(i32, 1);
    if (rh === wh) return -1;

    const key = u8[24 + rh];
    Atomics.store(i32, 2, (rh + 1) % 1024);
    return key;
})

EM_JS(void, web_nodelay, (int nd), {
    Module.__nodelay = (nd !== 0);
})

// Called once from initscr() to apply the terminal dimensions that the main thread
// wrote into the SAB before callMain(). Clears resizeFlag so the first getch() does
// not redundantly return KEY_RESIZE for the initial size.
EM_JS(void, web_apply_initial_size, (void), {
    const i32 = Module.__sharedI32;
    if (!i32 || Atomics.load(i32, 3) === 0) return; // resizeFlag
    const cols = Atomics.load(i32, 4);               // newCols
    const rows = Atomics.load(i32, 5);               // newRows
    Atomics.store(i32, 3, 0);
    _curses_resize(cols, rows);
})

extern "C" {

int web_getch(void)
{
    return web_getch_js(KEY_RESIZE);
}

void web_term_write(const char *buf, int len)
{
    web_term_write_js(buf, len);
}

} // extern "C"
