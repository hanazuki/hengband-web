/*!
 * @file curses.h
 * @brief Minimal ncurses-compatible shim for Emscripten WASM builds.
 *
 * main-gcu.cpp wraps this via: namespace curses { #include <curses.h> }
 * Input helpers use extern "C" so they resolve in any namespace context.
 */
#pragma once

#include <cstdio>
#include <cstdlib>
#include <cstring>

extern "C" {
    int  web_getch_impl(void);
    void web_getch_setnd(int nd);
    void web_term_write(const char *buf, int len);
}

#define USE_GETCH 1

#define getch()        web_getch_impl()
#define nodelay(w, f)  web_getch_setnd(f)

typedef unsigned int chtype;
typedef unsigned int attr_t;
#define NCURSES_ATTR_T attr_t

struct WINDOW {
    int    begy, begx;
    int    rows, cols;
    int    cury, curx;
    attr_t attr;
};

#define ERR   (-1)
#define OK    (0)
#ifndef TRUE
#define TRUE  (1)
#endif
#ifndef FALSE
#define FALSE (0)
#endif

enum {
    COLOR_BLACK   = 0,
    COLOR_RED     = 1,
    COLOR_GREEN   = 2,
    COLOR_YELLOW  = 3,
    COLOR_BLUE    = 4,
    COLOR_MAGENTA = 5,
    COLOR_CYAN    = 6,
    COLOR_WHITE   = 7,
};

#define A_NORMAL   (0u)
#define A_BOLD     (1u << 0)
#define A_BRIGHT   A_BOLD
#define WA_NORMAL  A_NORMAL

#define COLOR_PAIR(n)   ((attr_t)(unsigned)(n) << 8)
#define PAIR_NUMBER(a)  ((int)(((a) >> 8) & 0xffffu))

#define getcury(w)  ((w)->cury)
#define getcurx(w)  ((w)->curx)

extern int     LINES;
extern int     COLS;
extern int     COLORS;
extern int     COLOR_PAIRS;
extern WINDOW *stdscr;
extern WINDOW *curscr;

struct web_color_pair { short fg; short bg; };
struct web_rgb        { int r; int g; int b; };  /* 0-1000 scale (ncurses convention) */

extern web_color_pair web_color_pairs[256];
extern web_rgb        web_color_rgb[256];
extern bool           web_color_rgb_valid[256];

WINDOW *initscr(void);
int     endwin(void);
int     cbreak(void);
int     nocbreak(void);
int     echo(void);
int     noecho(void);
int     nl(void);
int     nonl(void);
int     raw(void);
int     start_color(void);
int     has_colors(void);
int     can_change_color(void);
int     init_color(short color, short r, short g, short b);
int     init_pair(short pair, short fg, short bg);
WINDOW *newwin(int nlines, int ncols, int begy, int begx);
int     delwin(WINDOW *win);
int     wclear(WINDOW *win);
int     werase(WINDOW *win);
int     wclrtoeol(WINDOW *win);
int     wmove(WINDOW *win, int y, int x);
int     waddch(WINDOW *win, chtype ch);
int     waddnstr(WINDOW *win, const char *str, int n);
int     wattrset(WINDOW *win, attr_t attr);
int     wrefresh(WINDOW *win);
int     refresh(void);
int     mvcur(int oldy, int oldx, int newy, int newx);
int     curs_set(int visibility);
