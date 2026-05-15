/*!
 * @file web-curses.cpp
 * @brief curses shim implementations for the Emscripten web build.
 *
 * All symbols live inside namespace curses so main-gcu.cpp can call them
 * via the curses:: prefix without modification.
 */

#include <cstdio>
#include <cstdlib>
#include <cstring>

namespace curses {

#include "curses.h"

int     LINES       = 24;
int     COLS        = 80;
int     COLORS      = 256;
int     COLOR_PAIRS = 256;

static WINDOW _stdscr_storage = {0, 0, 24, 80, 0, 0, A_NORMAL};
static WINDOW _curscr_storage = {0, 0, 24, 80, 0, 0, A_NORMAL};
WINDOW *stdscr = &_stdscr_storage;
WINDOW *curscr = &_curscr_storage;

web_color_pair web_color_pairs[256];
web_rgb        web_color_rgb[256];
bool           web_color_rgb_valid[256];

static void emit_cursor(const WINDOW *win)
{
    char buf[24];
    int n = std::snprintf(buf, sizeof(buf), "\x1b[%d;%dH",
                          win->begy + win->cury + 1,
                          win->begx + win->curx + 1);
    web_term_write(buf, n);
}

static void emit_attr(attr_t attr)
{
    int pair = PAIR_NUMBER(attr);
    bool bold = (attr & A_BOLD) != 0;
    int fg = web_color_pairs[pair].fg;
    char buf[48];
    int n;
    if (web_color_rgb_valid[fg]) {
        int r = (web_color_rgb[fg].r * 255 + 500) / 1000;
        int g = (web_color_rgb[fg].g * 255 + 500) / 1000;
        int b = (web_color_rgb[fg].b * 255 + 500) / 1000;
        n = std::snprintf(buf, sizeof(buf),
                          bold ? "\x1b[1;38;2;%d;%d;%dm" : "\x1b[0;38;2;%d;%d;%dm",
                          r, g, b);
    } else {
        n = std::snprintf(buf, sizeof(buf),
                          bold ? "\x1b[1;38;5;%dm" : "\x1b[0;38;5;%dm", fg);
    }
    web_term_write(buf, n);
}

WINDOW *initscr(void)
{
    web_apply_initial_size();
    web_color_pairs[0] = {0, 0};
    web_term_write("\x1b[?1049h\x1b[2J\x1b[H", 16);
    return stdscr;
}

int endwin(void)
{
    web_term_write("\x1b[0m\x1b[?1049l", 12);
    return OK;
}

int cbreak(void)   { return OK; }
int nocbreak(void) { return OK; }
int echo(void)     { return OK; }
int noecho(void)   { return OK; }
int nl(void)       { return OK; }
int nonl(void)     { return OK; }
int raw(void)      { return OK; }

int start_color(void)      { return OK; }
int has_colors(void)       { return TRUE; }
int can_change_color(void) { return TRUE; }

int init_color(short color, short r, short g, short b)
{
    if (color < 0 || color >= 256) return ERR;
    web_color_rgb[color]       = {r, g, b};
    web_color_rgb_valid[color] = true;
    return OK;
}

int init_pair(short pair, short fg, short bg)
{
    if (pair < 0 || pair >= 256) return ERR;
    web_color_pairs[pair] = {fg, bg};
    return OK;
}

WINDOW *newwin(int nlines, int ncols, int begy, int begx)
{
    auto *w = static_cast<WINDOW *>(std::malloc(sizeof(WINDOW)));
    if (!w) return nullptr;
    *w = {begy, begx, nlines, ncols, 0, 0, A_NORMAL};
    return w;
}

int delwin(WINDOW *win)
{
    if (win && win != stdscr && win != curscr)
        std::free(win);
    return OK;
}

int wclear(WINDOW *win)
{
    win->cury = win->curx = 0;
    emit_cursor(win);
    web_term_write("\x1b[2J", 4);
    return OK;
}

int werase(WINDOW *win) { return wclear(win); }

int wclrtoeol(WINDOW *win)
{
    emit_cursor(win);
    web_term_write("\x1b[K", 3);
    return OK;
}

int wmove(WINDOW *win, int y, int x)
{
    win->cury = y;
    win->curx = x;
    emit_cursor(win);
    return OK;
}

int waddch(WINDOW *win, chtype ch)
{
    char c = static_cast<char>(ch & 0xffu);
    web_term_write(&c, 1);
    win->curx++;
    return OK;
}

int waddnstr(WINDOW *win, const char *str, int n)
{
    if (n < 0) n = static_cast<int>(std::strlen(str));
    web_term_write(str, n);
    win->curx += n;
    return OK;
}

int wattrset(WINDOW *win, attr_t attr)
{
    win->attr = attr;
    emit_attr(attr);
    return OK;
}

int wrefresh(WINDOW *) { return OK; }
int refresh(void)      { return OK; }

int mvcur(int, int, int newy, int newx)
{
    char buf[24];
    int n = std::snprintf(buf, sizeof(buf), "\x1b[%d;%dH", newy + 1, newx + 1);
    web_term_write(buf, n);
    stdscr->cury = newy;
    stdscr->curx = newx;
    return OK;
}

int curs_set(int visibility)
{
    if (visibility)
        web_term_write("\x1b[?25h", 6);
    else
        web_term_write("\x1b[?25l", 6);
    return OK;
}

} // namespace curses

extern "C" void curses_resize(int cols, int rows)
{
    curses::LINES = rows;
    curses::COLS = cols;
    curses::stdscr->rows = rows;
    curses::stdscr->cols = cols;
}
